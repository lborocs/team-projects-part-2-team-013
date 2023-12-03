<?php
require_once("const.php");
require_once("secrets.php");
require_once("lib/assets/asset.php");
require_once("lib/object_commons/models.php");

// p: forces persistency
// this decrease response times by over a second
$db = new mysqli("p:" . MYSQL_SERVER, MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_DATABASE);

// generic

function _encode_field(string $type, $value) {

    if ($value == null) {
        return null;
    }

    if ($type == "binary") {
        return bin2hex($value);
    } else {
        return $value;
    };
}


function _copy_database_cells($columns, $row) {
    $collected = [];

    foreach ($columns as $column) {
        $name = $column->name;
        $type = $column->type;

        if (!array_key_exists($name, $row)) {
            continue;
        }

        //error_log("collecting " . $name . " from ". $column->parent->name);

        $collected[$name] = _encode_field($type, $row[$name]);


        // if the column has a foreign key constraint, dont remove it so it can be referenced
        if (count(array_filter($column->constraints, function($constraint) {
            return is_a($constraint, "ForeignKeyConstraint");
        })) == 0) {
            unset($row[$name]);
        }
    }
    return [$row, $collected];
}


function parse_database_row($row, $table) {

    [$row, $output] = _copy_database_cells($table->columns, $row);


    foreach ($table->columns as $column) {
        $name = $column->name;
        $type = $column->type;

        // skip over columns not returned
        if (!array_key_exists($name, $row)) {
            continue; 
        }
        
        // collate foreign keys into sub objects
        foreach ($column->constraints as $constraint) {
            if (!is_a($constraint, "ForeignKeyConstraint")) {
                continue;
            }

            $foreign_table = $constraint->foreign_table;
            $foreign_column = $constraint->foreign_column;

            //error_log("parsing foreign key ". $name . " -> ". $foreign_table->name);


            // consume the foreign key first so it doesnt get lost
            $foreign_key = _encode_field($type, $row[$name]);

            // if we share the same name as the foreign column
            // (e.g) empID = empID
            // we should use the friendly name:
            // employee = {empID: "123", firstName: "aidan"}
            // instead of
            // empID = {empID: "123", firstName: "aidan"}
            if ($name == $foreign_column->name) {
                //error_log("using friendly name for reference ". $column->name . " -> ". $foreign_column->name);
                unset($output[$name]);
                $name = $foreign_table->friendly_name;
            }

            // no point parsing a null foreign key
            // but we do want to use the friendly name
            if ($row[$name] == null) {
                $output[$name] = null;
                continue;
            }


            [$row, $output[$name]] = _copy_database_cells($foreign_table->columns, $row);
            $output[$name][$foreign_column->name] = $foreign_key;
            
        }

    }

    return $output;
}


// DEPRECATED FUNCTION
// function encode_binary_fields(array $row) {
//     foreach ($row as $key=>$value) {

//         if (gettype($value) != "string") {
//             continue;
//         }

//         // TODO: UUIDS COULD BE VALID UTF8
//         if (strlen($value) == UUID_LENGTH) {
//             if (!preg_match('//u', $value)) { // checks for not utf8
//                 $row[$key] = bin2hex($row[$key]);
//             }            
//         } 
//     }
//     return $row;
// }



function db_generic_new(Table $table, array $values, string $bind_format) {
    global $db;


    $query = $db->prepare(
        "INSERT INTO ". $table->name ." VALUES ("
        . substr_replace(str_repeat("?, ", count($values)), "", -2)
        .");"
    );
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

    // error_log("db_generic_edit: " . $stmt . "; ->" . implode(", ", $bindings));

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

    return $result;
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

function db_post_fetchall() {

    global $db;

    $query = $db->prepare(
        "SELECT POSTS.postID, POSTS.title, POSTS.createdBy, EMPLOYEES.firstName, EMPLOYEES.lastName, POSTS.createdAt, POSTS.isTechnical
        FROM `POSTS`, `EMPLOYEES`
        WHERE POSTS.createdBy = EMPLOYEES.empID
        "
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
        $encoded = parse_database_row($row, TABLE_POSTS);
        array_push($data, $encoded);
    }
    return $data;
}

function db_post_accesses_add(string $emp_id, string $post_id) {
    global $db;

    $bin_e_id = hex2bin($emp_id);
    $bin_p_id = hex2bin($post_id);
    $time = time();

    $query = $db->prepare(
        "INSERT INTO `FORUM_ACCESSES` VALUES (?, ?, ?)"
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
        "SELECT empID, postID, COUNT(timeAccessed) as views 
        FROM FORUM_ACCESSES WHERE timeAccessed > ?
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
        $encoded = parse_database_row($row, TABLE_FORUM_ACCESSES);
        array_push($data, $encoded);
    }
    return $data;

}


function db_post_fetch(string $hex_post_id) {
    global $db;

    $bin_id = hex2bin($hex_post_id);

    $query = $db->prepare(
        "SELECT POSTS.*, EMPLOYEES.firstName, EMPLOYEES.lastName FROM POSTS, EMPLOYEES
        WHERE POSTS.postID = ?
        AND POSTS.createdBy = EMPLOYEES.empID
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

    return parse_database_row($post, TABLE_POSTS);
}


// employee

function db_employee_new(
    $first_name,
    string $last_name,
) {
    global $db;

    $bin_e_id = random_bytes(UUID_LENGTH);

    $query = $db->prepare(
        "INSERT INTO `EMPLOYEES` VALUES (?, ?, ?, '0')"
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


function db_employee_fetchall() {
    global $db;


    $query = $db->prepare(
        "SELECT * FROM `EMPLOYEES` LEFT JOIN `ASSETS`
        ON EMPLOYEES.avatar = ASSETS.assetID
        AND ASSETS.type = " . ASSET_TYPE::USER_AVATAR . "
        "
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
        $encoded = parse_database_row($row, TABLE_EMPLOYEES);
        array_push($data, $encoded);
    }
    return $data;
}


function db_employee_fetch_by_ids(array $binary_ids) {

    global $db;
    $num = count($binary_ids);

    $stmt = "SELECT EMPLOYEES.*, ACCOUNTS.email FROM EMPLOYEES, ACCOUNTS WHERE
    EMPLOYEES.empID = ACCOUNTS.empID AND EMPLOYEES.empID IN ("
    . substr_replace(str_repeat("?, ", $num) ,"", -2) . // remove the trailing ', ' from the end
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
        unset($row["empID"]);
        $employees[$hex_id] = $row;
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
        "SELECT * FROM EMPLOYEE_PERSONALS WHERE assignedTo = ?"
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
        "SELECT * FROM `EMPLOYEES` WHERE empID = ?"
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
        WHERE EMPLOYEE_TASKS.empID = ?
        AND TASKS.archived = 0
        AND EMPLOYEE_TASKS.taskID = TASKS.taskID AND TASKS.projID = ?
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
        WHERE TASKS.projID = ? AND EMPLOYEE_TASKS.empID = ?
        AND TASKS.archived = 0
        AND EMPLOYEE_TASKS.taskID = TASKS.taskID 
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
        "SELECT DISTINCT PROJECTS.* FROM PROJECTS, EMPLOYEE_TASKS, TASKS
        WHERE 
        `PROJECTS`.projName LIKE ?
        AND (
            (
                EMPLOYEE_TASKS.empID = ?
                AND TASKS.archived = 0
                AND EMPLOYEE_TASKS.taskID = TASKS.taskID AND TASKS.projID = PROJECTS.projID
            )
            OR PROJECTS.teamLeader = ?
        )"
    );
    $query->bind_param("sss", $search_term, $bin_u_id, $bin_u_id);
    $query->execute();
    $res = $query->get_result();

    if (!$res) {
        respond_database_failure();
    }
    
    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = parse_database_row($row, TABLE_PROJECTS);
        array_push($data, $encoded);
    }
    return $data;
}

// account

function db_account_fetch(string $email) {
    global $db;

    $query = $db->prepare(
        "SELECT ACCOUNTS.*, EMPLOYEES.isManager 
        FROM ACCOUNTS, EMPLOYEES 
        WHERE ACCOUNTS.email = ? AND ACCOUNTS.empID = EMPLOYEES.empID"
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
        "SELECT ACCOUNTS.*, EMPLOYEES.isManager 
        FROM ACCOUNTS, EMPLOYEES 
        WHERE ACCOUNTS.empID = ? AND ACCOUNTS.empID = EMPLOYEES.empID"
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
    return $res->fetch_assoc(); // row 0
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

// projects

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

function db_project_fetchall($search_term) {
    global $db;

    // like functionality and case insensitive
    $search_term = "%" . strtolower($search_term) . "%";


    $query = $db->prepare(
        "SELECT * FROM `PROJECTS` WHERE LOWER(`PROJECTS`.projName) LIKE ? LIMIT ". SEARCH_FETCH_LIMIT
    );
    $query->bind_param("s", $search_term);
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
        $encoded = parse_database_row($row, TABLE_PROJECTS);
        array_push($data, $encoded);
    }
    return $data;
}

// tasks

function db_task_archive(string $task_id) {
    global $db;

    $bin_id = hex2bin($task_id);

    
    $query = $db->prepare(
        "UPDATE `TASKS` SET `archived` = '1' WHERE `TASKS`.taskID = ?"
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
        WHERE TASKS.projID = ?
        AND TASKS.archived = 0
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

function db_task_overwrite_assignments(string $task_id, array $bin_assignments) {
    global $db;

    $bin_t_id = hex2bin($task_id);

    $query = $db->prepare(
        "DELETE FROM `EMPLOYEE_TASKS` WHERE taskID = ?"
    );
    $query->bind_param("s", $bin_t_id);
    $result = $query->execute();

    if (!$result) {
        respond_database_failure();
    }

    if (count($bin_assignments) == 0) {
        return;
    }


    $query = $db->prepare(
        "INSERT INTO `EMPLOYEE_TASKS` (empID, taskID) VALUES " .
        substr_replace(str_repeat("(?, ?), ", count($bin_assignments)), "", -2)
    );

    $flattened = [];

    foreach ($bin_assignments as $item) {
        array_push($flattened, $item);
        array_push($flattened, $bin_t_id);
    };

    $query->bind_param(
        str_repeat("s", count($flattened)),
        ...$flattened
    );

    $result = $query->execute();

    if (!$result) {
        respond_database_failure(true);
    }
    
}

function db_task_fetch_assignments(string $task_id) {
    $bin_t_id = hex2bin($task_id);

    global $db;

    $query = $db->prepare(
        "SELECT EMPLOYEE_TASKS.* FROM TASKS, `EMPLOYEE_TASKS`
        WHERE EMPLOYEE_TASKS.taskID = TASKS.taskID AND
        TASKS.archived = 0
        AND TASKS.taskID = ?
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
        "SELECT EMPLOYEE_TASKS.* FROM TASKS, `EMPLOYEE_TASKS`
        WHERE EMPLOYEE_TASKS.taskID = TASKS.taskID AND
        TASKS.archived = 0 AND
        TASKS.projID = ?
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
        "DELETE FROM EMPLOYEE_PERSONALS WHERE itemID = ?"
    );
    $query->bind_param("s", $bin_p_id);
    $query->execute();

}

function db_personal_fetch(string $personal_id) {
    global $db;

    $bin_p_id = hex2bin($personal_id);

    $query = $db->prepare(
        "SELECT * FROM EMPLOYEE_PERSONALS WHERE itemID = ?"
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
?>