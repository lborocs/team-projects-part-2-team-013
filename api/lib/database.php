<?php
require_once("const.php");
require_once("secrets.php");
require_once("lib/assets/asset.php");
require_once("lib/object_commons/models.php");

// p: forces persistency
// this decreases response times by over a second
$db = new mysqli("p:" . MYSQL_SERVER, MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_DATABASE);

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

        if ($col->type == "binary") {
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

// posts

function db_post_fetchall(string $search_term, ?Array $tags) {

    global $db;

    $search = "%" . strtolower($search_term) . "%";

    $tag_term = null;

    if ($tags) {
        $tags = array_map("hex2bin", $tags);

        $tag_term = "AND `POST_TAGS`.tagID IN (" . create_array_binding(count($tags)) . ")";
    } else {
        $tags = [];
    }
    

    $query = $db->prepare("
        SELECT 
            POSTS.postID, POSTS.postTitle, POSTS.postAuthor, POSTS.postCreatedAt, POSTS.postIsTechnical,
            `EMPLOYEES`.*, `ASSETS`.contentType,
            GROUP_CONCAT(DISTINCT `TAGS`.tagID SEPARATOR '" . DB_ARRAY_DELIMITER . "') as tags,
	        COUNT(`POST_VIEWS`.empID) as views
        FROM `POSTS`
        JOIN `EMPLOYEES`
            ON `POSTS`.postAuthor = `EMPLOYEES`.empID
        LEFT JOIN `ASSETS`
            ON `EMPLOYEES`.avatar = `ASSETS`.assetID
            AND `ASSETS`.assetType = " . ASSET_TYPE::USER_AVATAR . "
        LEFT JOIN `POST_TAGS`
            ON `POSTS`.postID = `POST_TAGS`.postID
        LEFT JOIN `TAGS` 
            ON `POST_TAGS`.tagID = `TAGS`.tagID
        LEFT JOIN `POST_VIEWS` 
            ON `POST_VIEWS`.postID = `POSTS`.postID
        WHERE LOWER(`POSTS`.postTitle) LIKE ? " . $tag_term . "
        GROUP BY `POSTS`.postID
        ORDER BY views DESC
        LIMIT " . SEARCH_FETCH_LIMIT
    );

    $query->bind_param(
        str_repeat("s", count($tags) + 1),
        $search,
        ...$tags
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
    $time = time();

    $query = $db->prepare(
        "INSERT INTO `POST_VIEWS` VALUES (?, ?, ?)"
    );
    $query->bind_param("ssi", $bin_e_id, $bin_p_id, $time);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }
}

function db_post_accesses_fetchall() {
    global $db;
    $epoch = time() - POST_ACCESS_DELTA;
    $query = $db->prepare(
        "SELECT empID, postID, COUNT(postViewAccessedAt) as views 
        FROM POST_VIEWS WHERE postViewAccessedAt > ?
        GROUP BY empID, postID
        ORDER BY views DESC
        "
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
        $encoded = parse_database_row($row, TABLE_POST_VIEWS, ["views"=>"integer"]);
        array_push($data, $encoded);
    }
    return $data;

}


function db_post_fetch(string $hex_post_id) {
    global $db;

    $bin_id = hex2bin($hex_post_id);

    $query = $db->prepare(
        "SELECT `POSTS`.*, `EMPLOYEES`.*, `ASSETS`.contentType, GROUP_CONCAT(`TAGS`.tagID SEPARATOR '" . DB_ARRAY_DELIMITER . "') as tags
        FROM `POSTS`
        JOIN `EMPLOYEES`
            ON `POSTS`.postAuthor = `EMPLOYEES`.empID
        LEFT JOIN `ASSETS`
            ON `EMPLOYEES`.avatar = `ASSETS`.assetID
            AND `ASSETS`.assetType = " . ASSET_TYPE::USER_AVATAR . "
        LEFT JOIN `POST_TAGS`
            ON `POSTS`.postID = `POST_TAGS`.postID
        LEFT JOIN `TAGS` 
            ON `POST_TAGS`.tagID = `TAGS`.tagID
        WHERE POSTS.postID = ?
        GROUP BY `POSTS`.postID
        "
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
    $post = $res->fetch_assoc(); // row 0

    return parse_database_row($post, TABLE_POSTS, ["tags"=>"a-binary"]);
}


// employee

function db_employee_new(
    $first_name,
    string $last_name,
) {
    global $db;

    $bin_e_id = generate_uuid();

    $query = $db->prepare(
        "INSERT INTO `EMPLOYEES` VALUES (?, ?, ?, '0', NULL)"
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
            AND `ASSETS`.assetType = " . ASSET_TYPE::USER_AVATAR . "
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

    $stmt = "SELECT EMPLOYEES.*, `ACCOUNTS`.email, `ASSETS`.contentType FROM `EMPLOYEES`
    LEFT JOIN `ASSETS`
    ON `EMPLOYEES`.avatar = `ASSETS`.assetID AND `ASSETS`.assetType = " . ASSET_TYPE::USER_AVATAR . "
    JOIN `ACCOUNTS`
    ON EMPLOYEES.empID = ACCOUNTS.empID
    WHERE EMPLOYEES.empID IN ("
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

function db_employee_in_project(string $user_id, string $project_id) {
    global $db;

    $bin_p_id = hex2bin($project_id);
    $bin_u_id = hex2bin($user_id);

    $query = $db->prepare(
        "SELECT 1 FROM `EMPLOYEE_TASKS`, `TASKS`
        WHERE `EMPLOYEE_TASKS`.empID = ?
        AND `TASKS`.taskArchived = 0
        AND `EMPLOYEE_TASKS`.taskID = `TASKS`.taskID AND `TASKS`.projID = ?
        LIMIT 1"
    );
    $query->bind_param("ss", $bin_u_id, $bin_p_id);
    $query->execute();
    $result = $query->get_result();

    if (!$result) {
        respond_database_failure();
    }
    
    return $result->num_rows > 0;
}

function db_employee_fetch_assigned_tasks_in(string $user_id, string $project_id) {
    $bin_p_id = hex2bin($project_id);
    $bin_u_id = hex2bin($user_id);

    global $db;

    $query = $db->prepare(
        "SELECT TASKS.* FROM TASKS, EMPLOYEE_TASKS
        WHERE `TASKS`.projID = ? AND `EMPLOYEE_TASKS`.empID = ?
        AND `TASKS`.taskArchived = 0
        AND `EMPLOYEE_TASKS`.taskID = `TASKS`.taskID 
        "
    );

    $query->bind_param("ss", $bin_p_id, $bin_u_id);
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

function db_employee_fetch_projects_in(string $user_id, $search_term) {
    global $db;

    $search_term = "%" . strtolower($search_term) . "%";

    $bin_u_id = hex2bin($user_id);

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
        LOWER(`PROJECTS`.projectName) LIKE ?
        AND (
            (
                `EMPLOYEE_TASKS`.empID = ?
                AND `EMPLOYEE_TASKS`.taskID = `TASKS`.taskID
                AND `TASKS`.projID = `PROJECTS`.projID
            )
            OR `PROJECTS`.projectTeamLeader = ?
        )
        ORDER BY lastAccessed DESC
        LIMIT " . SEARCH_FETCH_LIMIT
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

// account

function db_account_fetch(string $email) {
    global $db;

    $query = $db->prepare(
        "SELECT `ACCOUNTS`.*, `EMPLOYEES`.isManager 
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
    return $res->fetch_assoc(); // row 0
}

function db_account_fetch_by_id(string $hex_id) {
    global $db;

    $bin_id = hex2bin($hex_id);

    $query = $db->prepare(
        "SELECT ACCOUNTS.*, `EMPLOYEES`.isManager 
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
    return parse_database_row($res->fetch_assoc(), TABLE_ACCOUNTS);
}

function db_account_insert(
    string $employee_id,
    string $email,
    string $password_hash
) {
    global $db;

    $bin_e_id = hex2bin($employee_id);
    $created_at = time();

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
    $updated_at = time();

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
    $time = time();

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
        "SELECT * FROM `PROJECTS` WHERE projID = ?"
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

function db_project_fetchall(string $search_term, string $emp_id) {
    global $db;

    // like functionality and case insensitive
    $search_term = "%" . strtolower($search_term) . "%";

    $bin_e_id = hex2bin($emp_id);


    $query = $db->prepare(
        "SELECT `PROJECTS`.*, `PROJECT_ACCESSED`.projectAccessTime as lastAccessed FROM `PROJECTS`
        LEFT JOIN `PROJECT_ACCESSED` ON
            `PROJECT_ACCESSED`.projID = `PROJECTS`.projID
            AND `PROJECT_ACCESSED`.empID = ?
        WHERE LOWER(`PROJECTS`.projectName) LIKE ?
        ORDER BY lastAccessed DESC
        LIMIT ". SEARCH_FETCH_LIMIT
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
    return $res->fetch_assoc(); // row 0
}

function db_task_fetchall(string $project_id) {
    $bin_p_id = hex2bin($project_id);

    global $db;

    $query = $db->prepare(
        "SELECT TASKS.* FROM TASKS
        WHERE `TASKS`.projID = ?
        AND `TASKS`.taskArchived = 0
        "
    );

    $query->bind_param("s", $bin_p_id);
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

function db_task_assign_bulk(string $task_id, Array $bin_employee_ids) {
    respond_not_implemented();
}


function db_task_unassign_bulk(string $task_id, Array $bin_employee_ids) {
    respond_not_implemented();
}

function db_task_fetch_assignments(string $task_id) {
    $bin_t_id = hex2bin($task_id);

    global $db;

    $query = $db->prepare(
        "SELECT `EMPLOYEE_TASKS`.* FROM `TASKS`, `EMPLOYEE_TASKS`
        WHERE `EMPLOYEE_TASKS.`taskID = `TASKS`.taskID AND
        `TASKS`.taskArchived = 0
        AND `TASKS`.taskID = ?
        "
    );

    $query->bind_param("s", $bin_t_id);
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



function db_project_fetch_assignments(string $project_id) {
    $bin_p_id = hex2bin($project_id);

    global $db;

    $query = $db->prepare(
        "SELECT `EMPLOYEE_TASKS`.* FROM `TASKS`, `EMPLOYEE_TASKS`
        WHERE `EMPLOYEE_TASKS`.taskID = `TASKS`.taskID AND
        `TASKS`.taskArchived = 0 AND
        `TASKS`.projID = ?
        "
    );

    $query->bind_param("s", $bin_p_id);
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
    
    return $res->fetch_assoc();
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
        "SELECT * FROM `TAGS`"
    );
    $query->execute();
    $res = $query->get_result();

    if (!$res) {
        respond_database_failure();
    }

    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_database_row($row, TABLE_TAGS);
        array_push($data, $encoded);
    }
    return $data;

}

// NOTIFS

function db_notifications_fetch($employee_id) {

    global $db;

    $bin_e_id = hex2bin($employee_id);

    $query = $db->prepare(
        "
        SELECT POST_UPDATE.*, `POSTS`.postTitle, `TASK_UPDATE`.*, `TASKS`.*,
        `NOTIFICATIONS`.*
        FROM `NOTIFICATIONS`
        LEFT JOIN `EMPLOYEES` ON
            `EMPLOYEES`.empID = ?
        LEFT JOIN `ASSETS` ON
            `EMPLOYEES`.avatar = `ASSETS`.assetID AND
            `ASSETS`.assetType = " . ASSET_TYPE::USER_AVATAR . "
        LEFT JOIN `EMPLOYEE_POST_META` ON
            `EMPLOYEE_POST_META`.empID = `EMPLOYEES`.empID AND
            `EMPLOYEE_POST_META`.postMetaSubscribed = '1'
        LEFT JOIN `POST_UPDATE` ON
            `NOTIFICATIONS`.eventID = `POST_UPDATE`.eventID AND
            `POST_UPDATE`.postID = `EMPLOYEE_POST_META`.postID
        LEFT JOIN `POSTS` ON
            `POSTS`.postID = `POST_UPDATE`.postID
        LEFT JOIN `TASK_UPDATE` ON
            `NOTIFICATIONS`.eventID = `TASK_UPDATE`.eventID AND
            (
                `TASK_UPDATE`.taskUpdateConcerns = `EMPLOYEES`.empID OR
                `TASK_UPDATE`.taskUpdateConcerns IS NULL
            )
        LEFT JOIN `TASKS` ON
            `TASKS`.taskID = `TASK_UPDATE`.taskID
        ORDER BY `NOTIFICATIONS`.notificationTime DESC
        "
    );

    $query->bind_param("s", $bin_e_id);
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

function db_post_updates_add(string $notification_id, string $post_id, string $author_id) {
    global $db;

    $bin_n_id = hex2bin($notification_id);
    $bin_a_id = hex2bin($author_id);
    $bin_p_id = hex2bin($post_id);

    $query = $db->prepare(
        "INSERT INTO `POST_UPDATE` VALUES (?, ?, ?)"
    );
    $query->bind_param("sss", $bin_n_id, $bin_p_id, $bin_a_id);
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

    $len = count($bin_fields);
    $query = "
    INSERT INTO `TASK_UPDATE` VALUES
    " . create_chunked_array_binding($len, 4);

    $query = $db->prepare($query);
    $query->bind_param(
        str_repeat("sssi", $len),
        ...$bin_fields
    );

    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }
}

function db_notification_create(int $type) {
    global $db;

    $bin_n_id = generate_uuid();
    $time = time();

    $query = $db->prepare(
        "INSERT INTO `NOTIFICATIONS` VALUES (?, ?, ?)"
    );
    $query->bind_param("sii", $bin_n_id, $type, $time);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }

    return bin2hex($bin_n_id);
}


?>