<?php
require_once("const.php");
require_once("secrets.php");
require_once("lib/assets/asset.php");
require_once("lib/object_commons/models.php");
require_once("lib/response.php");

// p: forces persistency
// this decreases response times by over a second
try {
    $db = new mysqli("p:" . MYSQL_SERVER, MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_DATABASE);
} catch (Exception $e) {
    respond_infrastructure_error("Failed to connect to database", ERROR_DATABASE_CONNECTION_FAILED);
}


// generic

const DEBUG_PRINT = false;

function _encode_field(string $type, $value) {

    if ($value === null) {
        return null;
    }

    if (substr($type, 0, 2) == "a-") {
        $new_type = substr($type, 2);
        return array_map(
            function ($v) use ($new_type) {
                return _encode_field($new_type, $v);
            },
            explode(DB_ARRAY_DELIMITER, $value)
        );
    }

    if ($type == "integer" && gettype($value) == "string") {
        return intval($value);
    } 


    if ($type == "binary") {
        return bin2hex($value);
    } else {
        return $value;
    };
}


function _get_common_name(Column $column, string $name) {

    if ($column->dont_friendly_name) {
        return $name;
    }

    if (
        $column->parent->column_prefix &&
        substr($name, 0, strlen($column->parent->column_prefix)) == $column->parent->column_prefix
    ) {
        $friendly_name = substr($name, strlen($column->parent->column_prefix));

        if (ctype_upper($friendly_name[0])) {
            return strtolower($friendly_name[0]) . substr($friendly_name, 1);
        }
        return $friendly_name;
    }
    return $name;
}


function _copy_database_cells($columns, $row, Array $greedy_skip) {
    $collected = [];

    foreach ($columns as $column) {
        $name = $column->name;
        $type = $column->type;

        if (!array_key_exists($name, $row) || array_key_exists($name, $greedy_skip)) {
            if (DEBUG_PRINT) {error_log("skipping " . $name . " from ". $column->parent->name);}
            continue;
        }


        $common_name = _get_common_name($column, $name);

        $collected[$common_name] = _encode_field($type, $row[$name]);

        if (DEBUG_PRINT) {error_log("collected " . $name . " as " . $common_name . " from ". $column->parent->name);}

        // if the column has a foreign key constraint, dont remove it so it can be referenced
        if (count($column->get_constraints("ForeignKeyConstraint")) == 0) {
            unset($row[$name]);
        } else {
            [$row, $collected] = _parse_foreign_keys($column, $row, $collected, $greedy_skip);
        }
    }
    return [$row, $collected];
}

function _parse_foreign_keys(Column $column, $row, Array $output, Array $greedy_skip) {

    $name = $column->name;
    $type = $column->type;


    foreach ($column->constraints as $constraint) {
        if (!is_a($constraint, "ForeignKeyConstraint")) {
            continue;
        }


        $foreign_table = $constraint->foreign_table;
        $foreign_column = $constraint->foreign_column;

        if (DEBUG_PRINT) {error_log("parsing foreign key ". $name . " -> ". $foreign_table->name);}


        // consume the foreign key first so it doesnt get lost
        $foreign_key = _encode_field($type, $row[$name]);

        $common_name = _get_common_name($column, $name);

        // if we share the same name as the foreign column
        // (e.g) empID = empID
        // we should use the friendly name:
        // employee = {empID: "123", firstName: "aidan"}
        // instead of
        // empID = {empID: "123", firstName: "aidan"}
        $original_name = $name;
        if ($name == $foreign_column->name) {
            if (DEBUG_PRINT) {error_log("using foreign table friendly name for reference ". $column->name . " -> ". $foreign_column->name);}
            unset($output[$name]);
            $name = $foreign_table->friendly_name;
        } else {
            unset($output[$name]);
            if (DEBUG_PRINT) {error_log("using common name " . $common_name . " for reference ". $column->name . " -> ". $foreign_column->name);}
            $name = $common_name;
        }


        // no point parsing a null foreign key
        // but we do want to use the friendly name
        if ($row[$original_name] === null) {
            $output[$name] = null;
            continue;
        }

        [$row, $output[$name]] = _copy_database_cells($foreign_table->columns, $row, $greedy_skip);
        $output[$name][$foreign_column->name] = $foreign_key;


        
    }

    return [$row, $output];
}


function parse_database_row(Array $row, Table $table, Array $additional_collectables=[], Array $greedy_skip=[]) {

    [$row, $output] = _copy_database_cells($table->columns, $row, $greedy_skip);

    if (DEBUG_PRINT && count($row) > 0) {error_log("left with ". var_export($row, true));}

    foreach ($additional_collectables as $name=>$type) {
        $output[$name] = _encode_field($type, $row[$name]);
    }

    return $output;
}

function parse_union_row(Array $row, Union $union, Array $additional_collectables=[], Array $greedy_skip=[]) {
    $table = $union->parent;
    $type = $union->determine_format_from_row($row);

    if (DEBUG_PRINT) {error_log("parsing union row ". $table->name . "{". $type->name . "}");}
    if (DEBUG_PRINT) {error_log("row: ". var_export($row, true));}

    [$row, $output] = _copy_database_cells($table->columns, $row, $greedy_skip);

    $inner = parse_database_row($row, $type, $additional_collectables, $greedy_skip);

    $output[$union->friendly_name] = $inner;

    return $output;

}

function create_array_binding(int $num) {
    // substr removes the trailing ', ' from the end
    return substr_replace(str_repeat("?, ", $num), "", -2);
}

function create_chunked_array_binding(int $chunks, int $chunk_size) {
    return substr_replace(
        str_repeat("(" . create_array_binding($chunk_size) . "), ", $chunks),
        "", -2
    );
}

function db_generic_new(Table $table, array $values, string $bind_format) {
    global $db;


    $stmt = "INSERT INTO ". $table->name ." VALUES ("
    . create_array_binding(count($values))
    .");";

    $query = $db->prepare(
        $stmt
    );

    if (DEBUG_PRINT) {error_log("db_generic_new: " . $stmt . "; ->" . implode(", ", $values));}

    $query->bind_param(
        $bind_format,
        ...$values
    );

    $res = $query->execute();

    if (!$res) {
        respond_database_failure(true);
    }

    return true;
}

function db_generic_edit(Table $table, array $values, array $keys) {
    
    global $db;

    $stmt = "UPDATE ". $table->name ." SET ";

    $bindings = [];

    foreach ($values as $u_field=>$u_value) {

        $col = $table->get_column($u_field);

        if ($col->type == "binary" && $u_value !== null) {
            $u_value = hex2bin($u_value);
        }
        
        $stmt .= $u_field ." = ?, ";
        array_push($bindings, $u_value);
    }

    $stmt = substr_replace($stmt, "", -2); // remove trailing ', '

    foreach($table->get_primary_keys() as $p_key) {
        $key_value = $keys[$p_key->name];

        if ($p_key->type == "binary") {
            $key_value = hex2bin($key_value);
        }

        array_push($bindings, $key_value);

        $stmt .= " WHERE ". $p_key->name ." = ? AND";
    }

    $stmt = substr_replace($stmt, "", -4); // remove trailing 'AND'

    if (DEBUG_PRINT) {error_log("db_generic_edit: " . $stmt . "; ->" . implode(", ", $bindings));}

    $query = $db->prepare($stmt);
    $query->bind_param(
        str_repeat("s", count($bindings)),
        ...$bindings
    );

    $result = $query->execute();

    if (!$result) {
        respond_database_failure(true);
    }

    return $result;


}

//assets

function db_asset_delete(string $asset_id) {
    global $db;

    $bin_id = hex2bin($asset_id);

    $query = $db->prepare(
        "DELETE FROM `ASSETS` WHERE assetID = ?"
    );
    $query->bind_param("s", $bin_id);
    $result = $query->execute();

    return $query->affected_rows > 0;
}

function db_asset_new(
    string $asset_id,
    string $owner_id,
    int $type,
    string $content_type
) {
    global $db;

    $bin_a_id = hex2bin($asset_id);
    $bin_o_id = hex2bin($owner_id);

    $query = $db->prepare(
        "INSERT INTO `ASSETS` VALUES (?, ?, ?, ?)"
    );

    $query->bind_param(
        "ssis",
        $bin_a_id,
        $bin_o_id,
        $type,
        $content_type,
    );

    $res = $query->execute();

    return $res;
}

function db_asset_fetch(string $asset_id) {
    global $db;

    $bin_a_id = hex2bin($asset_id);

    $query = $db->prepare(
        "SELECT * FROM `ASSETS` WHERE assetID = ?"
    );
    $query->bind_param("s", $bin_a_id);
    $query->execute();
    $res = $query->get_result();

    if (!$res) {
        respond_database_failure();
    }
    
    if ($res->num_rows == 0) {
        return false;
    }

    $row = $res->fetch_assoc();
    return parse_database_row($row, TABLE_ASSETS);
}


// posts

function db_post_fetchall(string $search_term, ?Array $tags, ?int $is_technical) {

    global $db;

    $search = "%" . strtolower($search_term) . "%";

    $binds = [];

    if ($is_technical === null) {
        $technical_term = "";
    } else {
        $technical_term = "AND `POSTS`.postIsTechnical = ? ";
        $binds[] = $is_technical;
    }

    $tag_term = null;
    if ($tags) {
        $tags = array_map("hex2bin", $tags);
        $binds = array_merge($binds, $tags);

        $tag_term = "AND `POST_TAGS`.tagID IN (" . create_array_binding(count($tags)) . ")";
    } else {
        $tags = [];
    }
    

    $query = $db->prepare(
        "SELECT 
            `POSTS`.postID, `POSTS`.postTitle, `POSTS`.postAuthor, `POSTS`.postCreatedAt, `POSTS`.postIsTechnical,
            `EMPLOYEES`.*, `ASSETS`.contentType,
            GROUP_CONCAT(DISTINCT tagList.tagID SEPARATOR '" . DB_ARRAY_DELIMITER . "') as tags,
	        COUNT(`POST_VIEWS`.empID) as views
        FROM `POSTS`
        JOIN `EMPLOYEES`
            ON `POSTS`.postAuthor = `EMPLOYEES`.empID
        LEFT JOIN `ASSETS`
            ON `EMPLOYEES`.avatar = `ASSETS`.assetID
        LEFT JOIN `POST_TAGS`
            ON `POSTS`.postID = `POST_TAGS`.postID
        LEFT JOIN `POST_VIEWS` 
            ON `POST_VIEWS`.postID = `POSTS`.postID
        LEFT JOIN (SELECT * FROM `POST_TAGS`) as tagList
            ON tagList.postID = `POSTS`.postID
        WHERE LOWER(`POSTS`.postTitle) LIKE ? "
        . $technical_term
        . $tag_term . "
        GROUP BY `POSTS`.postID
        ORDER BY views DESC
        LIMIT " . SEARCH_FETCH_DEFAULT
    );

    $query->bind_param(
        "s" . (is_null($is_technical) ? "" : "i") . str_repeat("s", count($tags)),
        $search,
        ...$binds,
    );

    $result = $query->execute();

    // select error
    if (!$result) {
        respond_database_failure();
    }

    // query and check we have 1 row
    $res = $query->get_result();
    if (!$res->num_rows) {
        return [];
    }

    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_database_row(
            $row,
            TABLE_POSTS,
            [
                "tags"=>"a-binary",
                "views"=>"integer",
            ]
        );
        array_push($data, $encoded);
    }
    return $data;
}

function db_post_meta_set(string $post_id, string $user_id, Array $body) {
    global $db;

    $bin_p_id = hex2bin($post_id);
    $bin_u_id = hex2bin($user_id);

    $subscribed = $body["postMetaSubscribed"];
    $feedback = $body["postMetaFeedback"];

    $query = $db->prepare(
        "INSERT INTO `EMPLOYEE_POST_META` VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE postMetaFeedback = ?, postMetaSubscribed = ?"
    );

    $query->bind_param(
        "ssiiii",
        $bin_u_id,
        $bin_p_id,
        $feedback,
        $subscribed,
        $feedback,
        $subscribed,
    );

    $res = $query->execute();

    if (!$res) {
        respond_database_failure(true);
    }
    return $query->affected_rows > 0;
}

function db_post_meta_fetch(string $post_id, string $user_id) {
    global $db;

    $bin_p_id = hex2bin($post_id);
    $bin_u_id = hex2bin($user_id);

    $query = $db->prepare(
        "SELECT * FROM `EMPLOYEE_POST_META` WHERE empID = ? AND postID = ?"
    );
    $query->bind_param("ss", $bin_u_id, $bin_p_id);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }

    // query and check we have 1 row
    $res = $query->get_result();
    if ($res->num_rows != 1) {
        return false;
    }
    return parse_database_row($res->fetch_assoc(), TABLE_EMPLOYEE_POST_META); // row 0
}

function db_post_bind_assets($post_id, $assets) {

    global $db;

    $bin_p_id = hex2bin($post_id);
    $bin_values = array_map(
        function ($asset) use ($bin_p_id) {
            return [$bin_p_id, hex2bin($asset["asset"]), $asset["index"]];
        },
        $assets
    );

    $query = $db->prepare(
        "INSERT INTO `POST_ASSET` VALUES " . create_chunked_array_binding(count($assets), 3)
    );

    $query->bind_param(
        str_repeat("sss", count($assets)),
        ...array_merge(...$bin_values)
    );

    $res = $query->execute();

    return $res;

}


function db_post_delete(string $post_id) {
    global $db;

    $bin_id = hex2bin($post_id);

    $query = $db->prepare(
        "DELETE FROM `POSTS` WHERE postID = ?"
    );
    $query->bind_param("s", $bin_id);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }

    return $query->affected_rows > 0;
}



function db_post_set_tags(string $post_id, Array $tags) {
    global $db;

    $bin_p_id = hex2bin($post_id);

    $bin_tag_ids = array_merge(...array_map(function ($tag) use ($bin_p_id) {
        return [hex2bin($tag), $bin_p_id];
    }, $tags));


    $delete_query = $db->prepare(
        "DELETE FROM `POST_TAGS` WHERE postID = ?",
    );
    $delete_query->execute([$bin_p_id]);

    if (count($tags) == 0) {
        return true;
    }

    $query = $db->prepare(
        "INSERT INTO `POST_TAGS` VALUES " . create_chunked_array_binding(count($tags), 2)
    );
    $query->bind_param(
        str_repeat("ss", count($tags)),
        ...$bin_tag_ids
    );

    if (!$query->execute()) {
        respond_database_failure();
    }

    return $query->affected_rows > 0;
}

function db_post_accesses_add(string $emp_id, string $post_id) {
    global $db;

    $bin_e_id = hex2bin($emp_id);
    $bin_p_id = hex2bin($post_id);
    $time = timestamp();

    $query = $db->prepare(
        "INSERT INTO `POST_VIEWS` VALUES (?, ?, ?)"
    );
    $query->bind_param("ssi", $bin_e_id, $bin_p_id, $time);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }
}

function db_post_accesses_fetchall(int $delta) {
    global $db;
    $epoch = timestamp() - $delta;
    $query = $db->prepare(
        "SELECT `POSTS`.postID, `POSTS`.postTitle, `POSTS`.postAuthor, `POSTS`.postCreatedAt, `POSTS`.postIsTechnical,
            COUNT(postViewAccessedAt) as views,
            GROUP_CONCAT(DISTINCT `POST_TAGS`.tagID SEPARATOR '" . DB_ARRAY_DELIMITER . "') as tags
        FROM POST_VIEWS
        LEFT JOIN POSTS
            ON `POSTS`.postID = `POST_VIEWS`.postID
        LEFT JOIN `POST_TAGS`
            ON `POSTS`.postID = `POST_TAGS`.postID
        WHERE postViewAccessedAt > ?
        GROUP BY `POSTS`.postID
        ORDER BY views DESC
        LIMIT " . DATA_FETCH_LIMIT
    );

    $query->bind_param(
        "i",
        $epoch
    );

    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }

    $res = $query->get_result();

    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_database_row($row, TABLE_POSTS, [
            "views"=>"integer",
            "tags"=>"a-binary",
        ]);
        array_push($data, $encoded);
    }
    return $data;

}

function db_post_fetch_most_subscribed() {
    global $db;

    $query = $db->prepare(
        "SELECT `POSTS`.postID, `POSTS`.postTitle, `POSTS`.postAuthor, `POSTS`.postCreatedAt, `POSTS`.postIsTechnical,
        GROUP_CONCAT(DISTINCT `POST_TAGS`.tagID SEPARATOR '" . DB_ARRAY_DELIMITER . "') as tags,
        COUNT(`EMPLOYEE_POST_META`.empID) as subscriptions
        FROM `POSTS`
        LEFT JOIN `POST_TAGS`
            ON `POSTS`.postID = `POST_TAGS`.postID
        LEFT JOIN `EMPLOYEE_POST_META`
            ON `EMPLOYEE_POST_META`.postID = `POSTS`.postID AND `EMPLOYEE_POST_META`.postMetaSubscribed = 1
        GROUP BY `POSTS`.postID
        ORDER BY subscriptions DESC
        LIMIT " . DATA_FETCH_LIMIT
    );

    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }

    $res = $query->get_result();

    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_database_row($row, TABLE_POSTS, [
            "subscriptions"=>"integer",
            "tags"=>"a-binary",
        ]);
        array_push($data, $encoded);
    }
    return $data;
}

function db_post_fetch_most_helpful() {
    global $db;

    $query = $db->prepare(
        "SELECT `POSTS`.postID, `POSTS`.postTitle, `POSTS`.postAuthor, `POSTS`.postCreatedAt, `POSTS`.postIsTechnical,
        GROUP_CONCAT(DISTINCT `POST_TAGS`.tagID SEPARATOR '" . DB_ARRAY_DELIMITER . "') as tags,
        COUNT(`EMPLOYEE_POST_META`.empID) as helpful
        FROM `POSTS`
        LEFT JOIN `POST_TAGS`
            ON `POSTS`.postID = `POST_TAGS`.postID
        LEFT JOIN `EMPLOYEE_POST_META`
            ON `EMPLOYEE_POST_META`.postID = `POSTS`.postID AND `EMPLOYEE_POST_META`.postMetaFeedback = 1
        GROUP BY `POSTS`.postID
        ORDER BY helpful DESC
        LIMIT " . DATA_FETCH_LIMIT
    );

    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }

    $res = $query->get_result();

    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_database_row($row, TABLE_POSTS, [
            "helpful"=>"integer",
            "tags"=>"a-binary",
        ]);
        array_push($data, $encoded);
    }
    return $data;
}


function db_post_fetch(string $hex_post_id, string $fetcher_id) {
    global $db;

    $bin_fetcher_id = hex2bin($fetcher_id);
    $bin_post_id = hex2bin($hex_post_id);

    $query = $db->prepare(
        "SELECT `POSTS`.*, `EMPLOYEES`.*, `ASSETS`.contentType,
            GROUP_CONCAT(DISTINCT `TAGS`.tagID SEPARATOR '" . DB_ARRAY_DELIMITER . "') as tags,
            `EMPLOYEE_POST_META`.postMetaFeedback as feedback,
            `EMPLOYEE_POST_META`.postMetaSubscribed as subscribed
        FROM `POSTS`
        JOIN `EMPLOYEES`
            ON `POSTS`.postAuthor = `EMPLOYEES`.empID
        LEFT JOIN `ASSETS`
            ON `EMPLOYEES`.avatar = `ASSETS`.assetID
        LEFT JOIN `POST_TAGS`
            ON `POSTS`.postID = `POST_TAGS`.postID
        LEFT JOIN `TAGS` 
            ON `POST_TAGS`.tagID = `TAGS`.tagID
        LEFT JOIN `EMPLOYEE_POST_META`
            ON `EMPLOYEE_POST_META`.postID = `POSTS`.postID
            AND `EMPLOYEE_POST_META`.empID = ?
        WHERE POSTS.postID = ?
        GROUP BY `POSTS`.postID
        "
    );
    $query->bind_param("ss",
        $bin_fetcher_id,
        $bin_post_id
);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }

    // query and check we have 1 row
    $res = $query->get_result();
    if ($res->num_rows != 1) {
        return false;
    }
    $post = $res->fetch_assoc(); // row 0

    return parse_database_row(
        $post,
        TABLE_POSTS,
        [
            "tags"=>"a-binary",
            "subscribed"=>"integer",
            "feedback"=>"integer",
        ]
    );
}


function db_post_fetch_assets($post_id) {
    global $db;

    $bin_p_id = hex2bin($post_id);

    $query = $db->prepare(
        "SELECT
            `ASSETS`.assetID, `POST_ASSET`.postAssetIndex, `ASSETS`.contentType
        FROM `POST_ASSET`, `ASSETS`
        WHERE postID = ? AND `POST_ASSET`.assetID = `ASSETS`.assetID"
    );
    $query->bind_param("s", $bin_p_id);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }

    $res = $query->get_result();
    
    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_database_row($row, TABLE_POST_ASSET);
        array_push($data, $encoded);
    }
    return $data;
}


// employee

function db_employee_new(
    $first_name,
    string $last_name,
) {
    global $db;

    $bin_e_id = generate_uuid();

    $query = $db->prepare(
        "INSERT INTO `EMPLOYEES` VALUES (?, ?, ?, '0', NULL, '0')"
    );

    $query->bind_param(
        "sss",
        $bin_e_id,
        $first_name,
        $last_name,
    );

    $res = $query->execute();

    if (!$res) {
        respond_database_failure(true);
    }
    return bin2hex($bin_e_id);
}


function db_employee_fetchall(string $search_term) {
    global $db;


    $query = $db->prepare(
        "SELECT `EMPLOYEES`.*, `ACCOUNTS`.email, `ASSETS`.contentType
        FROM `EMPLOYEES`
        LEFT JOIN `ASSETS`
            ON `EMPLOYEES`.avatar = `ASSETS`.assetID
        JOIN `ACCOUNTS`
            ON `EMPLOYEES`.empID = `ACCOUNTS`.empID
        WHERE (
            LOWER(`EMPLOYEES`.firstName) LIKE ?
            OR LOWER(`EMPLOYEES`.lastName) LIKE ?
            OR LOWER(`ACCOUNTS`.email) LIKE ?
        )
        LIMIT 10
        "
    );

    $search = "%" . strtolower($search_term) . "%";

    $query->bind_param(
        "sss",
        $search,
        $search,
        $search,
    );

    $result = $query->execute();

    // select error
    if (!$result) {
        respond_database_failure();
    }

    // query and check we have 1 row
    $res = $query->get_result();
    if (!$res->num_rows) {
        return [];
    }

    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_database_row($row, TABLE_EMPLOYEES, ["email"=>"string"]);
        array_push($data, $encoded);
    }
    return $data;
}


function db_employee_fetch_by_ids(array $binary_ids) {

    global $db;
    $num = count($binary_ids);

    $stmt = "SELECT EMPLOYEES.*, `ASSETS`.contentType FROM `EMPLOYEES`
    LEFT JOIN `ASSETS`
        ON `EMPLOYEES`.avatar = `ASSETS`.assetID
    WHERE `EMPLOYEES`.empID IN ("
    . create_array_binding($num) .
    ")";

    $query = $db->prepare($stmt);
    $query->bind_param(str_repeat("s", $num), ...$binary_ids);
    $query->execute();
    $res = $query->get_result();

    if (!$res) {
        respond_database_failure();
    }

    $employees = [];
    $num_found = 0;
    while ($row = $res->fetch_assoc()) {
        $num_found++;
        $hex_id = bin2hex($row["empID"]);
        $employees[$hex_id] = parse_database_row($row, TABLE_EMPLOYEES);
    }

    return array(
        "requested"=>$num,
        "found"=>$num_found,
        "employees"=>$employees
    );
}

function db_employee_fetch_personals($user_id) {
    global $db;

    $bin_u_id = hex2bin($user_id);

    $query = $db->prepare(
        "SELECT * FROM EMPLOYEE_PERSONALS WHERE personalAssignedTo = ?"
    );
    $query->bind_param("s", $bin_u_id);
    $query->execute();
    $res = $query->get_result();

    if (!$res) {
        respond_database_failure();
    }
    
    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_database_row($row, TABLE_PERSONALS);
        array_push($data, $encoded);
    }
    return $data;
}


function db_employee_fetch(string $user_id) { //checks if employee_id is in EMPLOYEES table
    global $db;

    $bin_u_id = hex2bin($user_id);

    $query = $db->prepare(
        "SELECT `EMPLOYEES`.*, `ASSETS`.contentType FROM `EMPLOYEES` LEFT JOIN `ASSETS`
        ON `EMPLOYEES`.avatar = `ASSETS`.assetID
        WHERE `EMPLOYEES`.empID = ?
        "
    );
    $query->bind_param("s", $bin_u_id);
    $query->execute();
    $result = $query->get_result();

    if (!$result) {
        respond_database_failure();
    }
    
    if ($result->num_rows == 0) {
        return false;
    }

    $row = $result->fetch_assoc();
    return parse_database_row($row, TABLE_EMPLOYEES);
}

function db_employee_fetch_with_email(string $emp_id) {

    global $db;

    $bin_e_id = hex2bin($emp_id);

    $query = $db->prepare(
        "SELECT `EMPLOYEES`.*, `ACCOUNTS`.email, `ASSETS`.contentType
        FROM `EMPLOYEES`
        LEFT JOIN `ASSETS`
            ON `EMPLOYEES`.avatar = `ASSETS`.assetID
        JOIN `ACCOUNTS`
            ON `EMPLOYEES`.empID = `ACCOUNTS`.empID
        WHERE `EMPLOYEES`.empID = ?
        "
    );

    $query->bind_param("s", $bin_e_id);
    $query->execute();
    $res = $query->get_result();

    if (!$res) {
        respond_database_failure();
    }

    if ($res->num_rows == 0) {
        return false;
    }

    $row = $res->fetch_assoc();
    return parse_database_row($row, TABLE_EMPLOYEES, ["email"=>"string"]);


}


function db_employee_in_project(string $user_id, string $project_id) {
    global $db;

    $bin_p_id = hex2bin($project_id);
    $bin_u_id = hex2bin($user_id);

    $query = $db->prepare(
        "SELECT 1 FROM PROJECTS WHERE projID = ? AND projectTeamLeader = ?
        UNION
        SELECT 1 FROM `EMPLOYEE_TASKS`, `TASKS`
        WHERE `EMPLOYEE_TASKS`.empID = ?
            AND `TASKS`.taskArchived = 0
            AND `EMPLOYEE_TASKS`.taskID = `TASKS`.taskID AND `TASKS`.projID = ?
        LIMIT 1"
    );
    $query->bind_param("ssss", $bin_p_id, $bin_u_id, $bin_u_id, $bin_p_id);
    $query->execute();
    $result = $query->get_result();

    if (!$result) {
        respond_database_failure();
    }
    
    return $result->num_rows > 0;
}

function db_employee_assigned_to_task(string $task_id, string $employee_id) {
    global $db;

    $bin_t_id = hex2bin($task_id);
    $bin_e_id = hex2bin($employee_id);

    $query = $db->prepare(
        "SELECT 1 FROM `EMPLOYEE_TASKS` WHERE taskID = ? AND empID = ?"
    );
    $query->bind_param("ss", $bin_t_id, $bin_e_id);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }

    return $query->get_result()->num_rows > 0;
}

function db_employee_fetch_assigned_tasks_in(string $user_id, string $project_id, int $archived_only) {
    $bin_p_id = hex2bin($project_id);
    $bin_u_id = hex2bin($user_id);

    global $db;

    $query = $db->prepare(
        "SELECT TASKS.* FROM TASKS, EMPLOYEE_TASKS
        WHERE `TASKS`.projID = ? AND `EMPLOYEE_TASKS`.empID = ?
        AND `TASKS`.taskArchived = ?
        AND `EMPLOYEE_TASKS`.taskID = `TASKS`.taskID 
        "
    );

    $query->bind_param(
        "ssi",
        $bin_p_id,
        $bin_u_id,
        $archived_only
    );
    $result = $query->execute();
    
    // select  error)
    if (!$result) {
        respond_database_failure();
    }

    // query and check we have 1 row
    $res = $query->get_result();
    if ($res->num_rows == 0) {
        return [];
    }

    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_database_row($row, TABLE_TASKS);
        array_push($data, $encoded);
    }

    return $data;
}

function db_employee_fetch_projects_in(string $user_id, SearchParams $search) {
    global $db;


    $bin_u_id = hex2bin($user_id);
    $search_term = "%" . strtolower($search->query ?? "") . "%";

    $query = $db->prepare(
        "SELECT DISTINCT PROJECTS.*, `PROJECT_ACCESSED`.projectAccessTime as lastAccessed FROM PROJECTS
        LEFT JOIN `TASKS`
            ON `TASKS`.projID = `PROJECTS`.projID
            AND `TASKS`.taskArchived = 0
        LEFT JOIN `EMPLOYEE_TASKS`
            ON `EMPLOYEE_TASKS`.taskID = `TASKS`.taskID
            AND `TASKS`.projID = `PROJECTS`.projID
        LEFT JOIN `PROJECT_ACCESSED`
            ON `PROJECT_ACCESSED`.projID = `PROJECTS`.projID
            AND `PROJECT_ACCESSED`.empID = ?
        WHERE
            `PROJECTS`.projectName LIKE ?
        AND (
            (
                `EMPLOYEE_TASKS`.empID = ?
                AND `EMPLOYEE_TASKS`.taskID = `TASKS`.taskID
                AND `TASKS`.projID = `PROJECTS`.projID
            )
            OR `PROJECTS`.projectTeamLeader = ?
        )" .$search->to_sql()
    );
    $query->bind_param(
        "ssss",
        $bin_u_id,
        $search_term,
        $bin_u_id,
        $bin_u_id
    );
    $query->execute();
    $res = $query->get_result();

    if (!$res) {
        respond_database_failure();
    }
    
    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_database_row($row, TABLE_PROJECTS, ["lastAccessed"=>"integer"]);
        array_push($data, $encoded);
    }
    return $data;
}

function db_employee_delete_associated_data(string $emp_id) {

    global $db;

    $queries = [
        "DELETE FROM `EMPLOYEE_PREFERENCES` WHERE empID = ?",
        "DELETE FROM `EMPLOYEE_PERSONALS` WHERE personalAssignedTo = ?",
        "UPDATE `EMPLOYEES` SET firstName = null, lastName = 'ghost', employeeDeleted = 1 WHERE empID = ?"
    ];

    $bin_id = hex2bin($emp_id);

    $final = true;
    
    foreach ($queries as $query) {
        $query = $db->prepare($query);
        $query->bind_param("s", $bin_id);
        $final &= $query->execute();
    }

    return $final;
}

// account

function db_account_fetch(string $email) {
    global $db;

    $query = $db->prepare(
        "SELECT `ACCOUNTS`.*, `EMPLOYEES`.*
        FROM `ACCOUNTS`, `EMPLOYEES`
        WHERE `ACCOUNTS`.email = ?
        AND `ACCOUNTS`.empID = `EMPLOYEES`.empID"
    );
    $query->bind_param("s", $email);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }

    // query and check we have 1 row
    $res = $query->get_result();
    if ($res->num_rows != 1) {
        return false;
    }
    return parse_database_row($res->fetch_assoc(), TABLE_ACCOUNTS,["isManager"=>"boolean"]); // row 0
}

function db_account_delete(string $emp_id) {
    global $db;

    $bin_id = hex2bin($emp_id);

    $query = $db->prepare(
        "DELETE FROM `ACCOUNTS` WHERE empID = ?"
    );
    $query->bind_param("s", $bin_id);
    $result = $query->execute();

    return $query->affected_rows > 0;
}

function db_account_fetch_by_id(string $hex_id) {
    global $db;

    $bin_id = hex2bin($hex_id);

    $query = $db->prepare(
        "SELECT ACCOUNTS.*, `EMPLOYEES`.*
        FROM `ACCOUNTS`, `EMPLOYEES` 
        WHERE `ACCOUNTS`.empID = ? AND `ACCOUNTS`.empID = `EMPLOYEES`.empID"
    );
    $query->bind_param("s", $bin_id);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }

    // query and check we have 1 row
    $res = $query->get_result();
    if ($res->num_rows != 1) {
        return false;
    }
    return parse_database_row($res->fetch_assoc(), TABLE_ACCOUNTS,["isManager"=>"boolean"]);
}

function db_account_insert(
    string $employee_id,
    string $email,
    string $password_hash
) {
    global $db;

    $bin_e_id = hex2bin($employee_id);
    $created_at = timestamp();

    $query = $db->prepare(
        "INSERT INTO `ACCOUNTS` VALUES (?, ?, ?, ?, ?)"
    );

    $query->bind_param(
        "sssii",
        $bin_e_id,
        $email,
        $password_hash,
        $created_at,
        $created_at
    );

    $res = $query->execute();

    if (!$res) {
        respond_database_failure(true);
    }

}

function db_account_password_change(string $user_id, string $new_password_hash) {
    global $db;

    $bin_e_id = hex2bin($user_id);
    $updated_at = timestamp();

    $query = $db->prepare(
        "UPDATE `ACCOUNTS` SET `passwordHash` = ?, `passwordLastChanged` = ? WHERE `empID` = ?"
    );

    $query->bind_param(
        "sis",
        $new_password_hash,
        $updated_at,
        $bin_e_id
    );

    $res = $query->execute();

    if (!$res) {
        respond_database_failure(true);
    }
    
    return $query->affected_rows > 0;
}

// projects

function db_project_accesses_set(string $project_id, string $user_id) {
    global $db;

    $bin_p_id = hex2bin($project_id);
    $bin_u_id = hex2bin($user_id);
    $time = timestamp();

    $query = $db->prepare(
        "INSERT INTO PROJECT_ACCESSED VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE projectAccessTime = ?"
    );

    $query->bind_param(
        "ssii",
        $bin_p_id,
        $bin_u_id,
        $time,
        $time
    );

    $res = $query->execute();

    if (DEBUG_PRINT) {error_log("setting project accessed, affected rows: " . $query->affected_rows);}

    if (!$res) {
        respond_database_failure(true);
    }
}

function db_project_fetch(string $project_id) {
    global $db;

    $bin_id = hex2bin($project_id);

    $query = $db->prepare(
        "SELECT * FROM `PROJECTS` WHERE projID = ? AND projectArchived = 0"
    );
    $query->bind_param("s", $bin_id);
    $result = $query->execute();

    // select error
    if (!$result) {
        respond_database_failure();
    }

    // query and check we have 1 row
    $res = $query->get_result();
    if (!$res->num_rows) {
        return false;
    }
    $data = $res->fetch_assoc();

    return parse_database_row($data, TABLE_PROJECTS);
}


function db_project_archive(string $project_id) {
    global $db;

    $bin_id = hex2bin($project_id);

    $query = $db->prepare(
        "UPDATE `PROJECTS` SET `projectArchived` = '1' WHERE `PROJECTS`.projID = ?"
    );
    $query->bind_param("s", $bin_id);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }

    return $query->affected_rows > 0;
}




function db_project_fetchall(SearchParams $search, string $emp_id) {
    global $db;

    $bin_e_id = hex2bin($emp_id);

    $search_term = "%" . strtolower($search->query ?? "") . "%";

    $query = $db->prepare(
        "SELECT `PROJECTS`.*, `PROJECT_ACCESSED`.projectAccessTime as lastAccessed FROM `PROJECTS`
        LEFT JOIN `PROJECT_ACCESSED` ON
            `PROJECT_ACCESSED`.projID = `PROJECTS`.projID
            AND `PROJECT_ACCESSED`.empID = ?
        WHERE `PROJECTS`.projectName LIKE ? 
        AND `PROJECTS`.projectArchived = 0 "
        . $search->to_sql()
    );
    $query->bind_param(
        "ss",
        $bin_e_id,
        $search_term
    );
    $result = $query->execute();

    // select error
    if (!$result) {
        respond_database_failure();
    }

    // query and check we have 1 row
    $res = $query->get_result();
    if (!$res->num_rows) {
        return [];
    }

    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_database_row($row, TABLE_PROJECTS, ["lastAccessed"=>"integer"]);
        array_push($data, $encoded);
    }
    return $data;
}

// tasks

function db_task_archive(string $task_id) {
    global $db;

    $bin_id = hex2bin($task_id);

    
    $query = $db->prepare(
        "UPDATE `TASKS` SET `taskArchived` = '1' WHERE `TASKS`.taskID = ?"
    );
    $query->bind_param("s", $bin_id);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }

}

function db_task_fetch(string $task_id) {
    $bin_id = hex2bin($task_id);
    global $db;

    $query = $db->prepare(
        "SELECT * FROM `TASKS` WHERE taskID = ?"
    );
    $query->bind_param("s", $bin_id);
    $result = $query->execute();
    
    // select 0 (or error)
    if (!$result) {
        respond_database_failure();
    }

    // query and check we have 1 row
    $res = $query->get_result();

    if ($res->num_rows == 0) {
        return false;
    }

    return parse_database_row($res->fetch_assoc(), TABLE_TASKS);
}

function db_task_fetchall(string $project_id, $archived_only) {
    $bin_p_id = hex2bin($project_id);

    global $db;

    $query = $db->prepare(
        "SELECT TASKS.* FROM TASKS
        WHERE `TASKS`.projID = ?
        AND `TASKS`.taskArchived = ?
        "
    );

    $query->bind_param(
        "si",
        $bin_p_id,
        $archived_only
    );
    $result = $query->execute();
    
    // select  error)
    if (!$result) {
        respond_database_failure();
    }

    // query and check we have 1 row
    $res = $query->get_result();
    if ($res->num_rows == 0) {
        return [];
    }

    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_database_row($row, TABLE_TASKS);
        array_push($data, $encoded);
    }

    return $data;
}

function db_task_assign_bulk(string $task_id, Array $employee_ids) {
    
    global $db;

    $values = array_merge(...array_map(function ($emp_id) use ($task_id) {
        return [hex2bin($emp_id), hex2bin($task_id), 0];
    }, $employee_ids));

    $query = $db->prepare(
        "INSERT INTO `EMPLOYEE_TASKS` VALUES " . create_chunked_array_binding(count($employee_ids), 3)
    );

    $query->bind_param(
        str_repeat("ssi", count($employee_ids)),
        ...$values
    );

    if (!$query->execute()) {
        respond_database_failure();
    }

    return $query->affected_rows > 0;

}


function db_task_unassign_bulk(string $task_id, Array $employee_ids) {

    global $db;

    $values = array_merge(...array_map(function ($emp_id) use ($task_id) {
        return [hex2bin($emp_id), hex2bin($task_id)];
    }, $employee_ids));

    $query = $db->prepare(
        "DELETE FROM `EMPLOYEE_TASKS` WHERE (empID, taskID) IN (" . create_chunked_array_binding(count($employee_ids), 2) . ")"
    );

    $query->bind_param(
        str_repeat("ss", count($employee_ids)),
        ...$values
    );

    if (!$query->execute()) {
        respond_database_failure();
    }

    return $query->affected_rows > 0;
}

function db_task_assign_set_manhours(string $task_id, string $emp_id, int $manhours) {
    global $db;

    $bin_t_id = hex2bin($task_id);
    $bin_e_id = hex2bin($emp_id);

    $query = $db->prepare(
        "UPDATE `EMPLOYEE_TASKS` SET `employeeTaskManHours` = ? WHERE `taskID` = ? AND `empID` = ?"
    );
    $query->bind_param("iss", $manhours, $bin_t_id, $bin_e_id);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }

    return $query->affected_rows > 0;
}

function db_task_fetch_assignments(string $task_id) {
    $bin_t_id = hex2bin($task_id);

    global $db;

    $query = $db->prepare(
        "SELECT `EMPLOYEE_TASKS`.* FROM `TASKS`, `EMPLOYEE_TASKS`
        WHERE
        `EMPLOYEE_TASKS`.taskID = `TASKS`.taskID
        AND `TASKS`.taskID = ?
        "
    );

    $query->bind_param(
        "s",
        $bin_t_id
    );
    $result = $query->execute();

    // select  error
    if (!$result) {
        respond_database_failure();
    }

    $res = $query->get_result();

    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_database_row($row, TABLE_EMPLOYEE_TASKS);
        array_push($data, $encoded);
    }

    return $data;
}



function db_project_fetch_assignments(string $project_id, int $archived_only) {
    $bin_p_id = hex2bin($project_id);

    global $db;

    $query = $db->prepare(
        "SELECT `EMPLOYEE_TASKS`.* FROM `TASKS`, `EMPLOYEE_TASKS`
        WHERE `EMPLOYEE_TASKS`.taskID = `TASKS`.taskID AND
        `TASKS`.taskArchived = ? AND
        `TASKS`.projID = ?
        "
    );

    $query->bind_param(
        "is",
        $archived_only,
        $bin_p_id
    );
    $result = $query->execute();
    
    // select  error)
    if (!$result) {
        respond_database_failure();
    }

    // query and check we have 1 row
    $res = $query->get_result();
    if ($res->num_rows == 0) {
        return [];
    }

    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_database_row($row, TABLE_EMPLOYEE_TASKS);
        array_push($data, $encoded);
    }

    return $data;
}

function db_personal_delete(string $personal_id) {
    global $db;

    $bin_p_id = hex2bin($personal_id);

    $query = $db->prepare(
        "DELETE FROM `EMPLOYEE_PERSONALS` WHERE itemID = ?"
    );
    $query->bind_param("s", $bin_p_id);
    $query->execute();
    return $query->affected_rows > 0;

}

function db_personal_fetch(string $personal_id) {
    global $db;

    $bin_p_id = hex2bin($personal_id);

    $query = $db->prepare(
        "SELECT * FROM `EMPLOYEE_PERSONALS` WHERE itemID = ?"
    );
    $query->bind_param("s", $bin_p_id);
    $query->execute();
    $res = $query->get_result();

    if (!$res) {
        respond_database_failure();
    }
    
    if ($res->num_rows == 0) {
        return false;
    }
    
    return parse_database_row($res->fetch_assoc(), TABLE_PERSONALS);
}

// tags

function db_tag_delete(string $tag_id) {
    global $db;

    $bin_t_id = hex2bin($tag_id);

    $query = $db->prepare(
        "DELETE FROM `TAGS` WHERE tagID = ?"
    );
    $query->bind_param("s", $bin_t_id);
    $query->execute();

    return $query->affected_rows > 0;

}

function db_tag_fetchall() {
    global $db;

    $query = $db->prepare(
        "SELECT `TAGS`.*, `POST_TAGS`.tagID IS NOT NULL AS hasPosts
        FROM `TAGS`
        LEFT JOIN `POST_TAGS`
            ON `TAGS`.tagID = `POST_TAGS`.tagID
        GROUP BY `TAGS`.tagID
        "
    );
    $query->execute();
    $res = $query->get_result();

    if (!$res) {
        respond_database_failure();
    }

    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_database_row($row, TABLE_TAGS, ["hasPosts"=>"integer"]);
        array_push($data, $encoded);
    }
    return $data;
}

function db_tag_fetch_popular(int $delta) {
    global $db;

    $epoch = timestamp() - $delta;

    $query = $db->prepare(
        "SELECT `TAGS`.*, `POPULAR_TAGS`.views FROM `TAGS`
        LEFT JOIN (
            SELECT `POST_TAGS`.tagID, COUNT(`POST_TAGS`.tagID) as views
            FROM `POST_TAGS`
            LEFT JOIN `POST_VIEWS`
                ON `POST_TAGS`.postID = `POST_VIEWS`.postID
            WHERE `POST_VIEWS`.postViewAccessedAt > ?
            GROUP BY `POST_TAGS`.tagID
            ORDER BY views DESC
        ) as `POPULAR_TAGS`
        ON `POPULAR_TAGS`.tagID = `TAGS`.tagID
        ORDER BY views DESC
        LIMIT " . DATA_FETCH_LIMIT
    );
    
    $query->bind_param("i", $epoch);
    $query->execute();
    $res = $query->get_result();


    if (!$res) {
        respond_database_failure();
    }

    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_database_row($row, TABLE_TAGS, ["views"=>"integer"]);
        array_push($data, $encoded);
    }
    return $data;
}

// NOTIFS

function db_notifications_fetch($employee_id) {

    global $db;

    $bin_e_id = hex2bin($employee_id);


    // select notifications and join on the possible union bodies
    // then we determine the union from the type and then parse the row
    // as normal, discarding the rest of the event types (other union bodies)

    $query = $db->prepare(
        "SELECT DISTINCT 
        -- post type
            POST_UPDATE.*, `POSTS`.postTitle, `POSTS`.postAuthor,
        -- task type
            `TASK_UPDATE`.*, `TASKS`.*, `PROJECTS`.*,
        -- union header
            `NOTIFICATIONS`.*
        FROM `NOTIFICATIONS`
        LEFT JOIN `EMPLOYEES` ON
            `EMPLOYEES`.empID = ?
        -- check that the we are subscribed to the post
        LEFT JOIN `EMPLOYEE_POST_META` ON
            `EMPLOYEE_POST_META`.empID = `EMPLOYEES`.empID AND
            `EMPLOYEE_POST_META`.postMetaSubscribed = '1'

        LEFT JOIN `POST_UPDATE` ON
            `NOTIFICATIONS`.eventID = `POST_UPDATE`.eventID AND
            `POST_UPDATE`.postID = `EMPLOYEE_POST_META`.postID
        -- auxilary info for POST_UPDATE
        LEFT JOIN `POSTS` ON
            `POSTS`.postID = `POST_UPDATE`.postID

        -- check that we are assigned to a task OR the update concerns us
        LEFT JOIN `EMPLOYEE_TASKS` ON
            `EMPLOYEE_TASKS`.empID = `EMPLOYEES`.empID
        LEFT JOIN `TASK_UPDATE` ON
            `NOTIFICATIONS`.eventID = `TASK_UPDATE`.eventID
            AND (
                `TASK_UPDATE`.taskUpdateConcerns = `EMPLOYEES`.empID
                OR (
                    `TASK_UPDATE`.taskUpdateConcerns IS NULL
                    AND `TASK_UPDATE`.taskID = `EMPLOYEE_TASKS`.taskID
                )
            )
        -- auxilary info for TASK_UPADTE
        LEFT JOIN `TASKS` ON
            `TASKS`.taskID = `TASK_UPDATE`.taskID
        LEFT JOIN `PROJECTS` ON
            `PROJECTS`.projID = `TASKS`.projID

        -- check for each row there is atleast 1 notification
        WHERE (
            `TASK_UPDATE`.eventID IS NOT NULL
            OR `POST_UPDATE`.eventID IS NOT NULL
        )
        ORDER BY `NOTIFICATIONS`.notificationTime DESC
        "
    );
    // WHERE clause checks we have atleast 1 notification per row that pertains to us
    // as we are using left join we join null on a notification not belonging to us
    // instead of ignoring the row

    $query->bind_param(
        "s",
        $bin_e_id
    );
    $query->execute();
    $res = $query->get_result();

    if (!$res) {
        respond_database_failure();
    }

    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_union_row($row, UNION_NOTIFICATIONS);
        array_push($data, $encoded);
    }
    return $data;

}

function db_post_updates_add(string $notification_id, string $post_id) {
    global $db;

    $bin_n_id = hex2bin($notification_id);
    $bin_p_id = hex2bin($post_id);

    $query = $db->prepare(
        "INSERT INTO `POST_UPDATE` VALUES (?, ?)"
    );
    $query->bind_param("ss", $bin_n_id, $bin_p_id);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }
}

function db_task_updates_add(string $notification_id, string $task_id, ?string $concerns, int $detail) {
    global $db;

    $bin_n_id = hex2bin($notification_id);
    $bin_t_id = hex2bin($task_id);

    if ($concerns !== null) {
        $bin_concerns = hex2bin($concerns);
    } else {
        $bin_concerns = null;
    }

    $query = $db->prepare(
        "INSERT INTO `TASK_UPDATE` VALUES (?, ?, ?, ?)"
    );
    $query->bind_param("sssi", $bin_n_id, $bin_t_id, $bin_concerns, $detail);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }
    
}

function db_task_updates_add_bulk(string $notification_id, Array $fields) {
    global $db;

    $bin_n_id = hex2bin($notification_id);

    $bin_fields = array_merge(...array_map(function ($field) use ($bin_n_id) {

        return [$bin_n_id, hex2bin($field[0]), hex2bin($field[1]), $field[2]];
    }, $fields));

    $query = "
    INSERT INTO `TASK_UPDATE` VALUES
    " . create_chunked_array_binding(count($fields), 4);

    $query = $db->prepare($query);
    $query->bind_param(
        str_repeat("sssi", count($fields)),
        ...$bin_fields
    );

    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }
}

function db_notification_create(int $type, string $user_id) {
    global $db;

    $bin_n_id = generate_uuid();
    $bin_u_id = hex2bin($user_id);
    $time = timestamp();

    $query = $db->prepare(
        "INSERT INTO `NOTIFICATIONS` VALUES (?, ?, ?, ?)"
    );
    $query->bind_param("siis", $bin_n_id, $type, $time, $bin_u_id);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }

    return bin2hex($bin_n_id);
}


function db_preferences_fetch(string $user_id) {
    global $db;

    $bin_u_id = hex2bin($user_id);

    $query = $db->prepare(
        "SELECT * FROM `EMPLOYEE_PREFERENCES` WHERE empID = ?"
    );
    $query->bind_param("s", $bin_u_id);
    $query->execute();
    $res = $query->get_result();

    if (!$res) {
        respond_database_failure();
    }
    
    if ($res->num_rows == 0) {
        return false;
    }
    
    $row = $res->fetch_assoc();

    return $row["preferences"];
}

function db_preferences_set(string $user_id, $preferences) {
    global $db;

    $bin_u_id = hex2bin($user_id);

    // insert on duplicate key update
    $query = $db->prepare(
        "INSERT INTO `EMPLOYEE_PREFERENCES` VALUES (?, ?) ON DUPLICATE KEY UPDATE preferences = ?"
    );

    $query->bind_param("sss", $bin_u_id, $preferences, $preferences);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }
}

function db_preferences_delete(string $user_id) {
    global $db;

    $bin_u_id = hex2bin($user_id);

    $query = $db->prepare(
        "DELETE FROM `EMPLOYEE_PREFERENCES` WHERE `empID` = ?"
    );

    $query->bind_param("s", $bin_u_id);
    $query->execute();
    return $query->affected_rows > 0;
}


function db_global_settings_get() {
    global $db;

    $query = $db->prepare(
        "SELECT * FROM `GLOBAL_SETTINGS`"
    );
    $query->execute();
    $res = $query->get_result();

    if (!$res) {
        respond_database_failure();
    }
    
    if ($res->num_rows == 0) {
        return false;
    }
    
    $row = $res->fetch_assoc();

    return parse_database_row($row, TABLE_GLOBAL_SETTINGS);
}

function db_global_settings_set(int $avatars, int $posts, int $tags) {
    global $db;

    $query = $db->prepare(
        "UPDATE `GLOBAL_SETTINGS` SET avatarsEnabled = ?, postsEnabled = ?, tagsEnabled = ?"
    );

    $query->bind_param(
        "iii",
        $avatars,
        $posts,
        $tags,
    );
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }

    return $query->affected_rows > 0;
}


?>