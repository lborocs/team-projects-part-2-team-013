<?php
require_once("const.php");

// p: forces persistency
// this decrease response times by over a second
$db = new mysqli("p:" . MYSQL_SERVER, MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_DATABASE);

// generic

function encode_binary_fields(array $row) {
    foreach ($row as $key=>$value) {

        if (gettype($value) != "string") {
            continue;
        }

        if (strlen($value) == UUID_LENGTH) {
            if (!preg_match('//u', $value)) { // checks for not utf8
                $row[$key] = bin2hex($row[$key]);
            }            
        } 
    }
    return $row;
}



function db_generic_new(int $table_specifier, array $values, string $bind_format) {
    global $db;

    $table = TABLE_NAMES[$table_specifier];

    $query = $db->prepare(
        "INSERT INTO `". $table ."` VALUES ("
        . substr_replace(str_repeat("?, ", count($values)), "", -2)
        .");"
    );
    $query->bind_param(
        $bind_format,
        ...$values
    );

    return $query->execute();
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
        $encoded = encode_binary_fields($row);
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
        $encoded = encode_binary_fields($row);
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

    return encode_binary_fields($post);
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
        "SELECT empID, firstName, lastName, isManager FROM `EMPLOYEES`"
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
        $encoded = encode_binary_fields($row);
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
        $encoded = encode_binary_fields($row);
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
    return encode_binary_fields($row);
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
        $encoded = encode_binary_fields($row);
        array_push($data, $encoded);
    }

    return $data;
}

function db_employee_fetch_projects_in(string $user_id) {
    global $db;

    $bin_u_id = hex2bin($user_id);

    $query = $db->prepare(
        "SELECT DISTINCT PROJECTS.* FROM PROJECTS, EMPLOYEE_TASKS, TASKS
        WHERE (EMPLOYEE_TASKS.empID = ?
        AND TASKS.archived = 0
        AND EMPLOYEE_TASKS.taskID = TASKS.taskID AND TASKS.projID = PROJECTS.projID)
        OR PROJECTS.teamLeader = ?"
    );
    $query->bind_param("ss", $bin_u_id, $bin_u_id);
    $query->execute();
    $res = $query->get_result();

    if (!$res) {
        respond_database_failure();
    }
    
    $data = [];
    while ($row = $res->fetch_assoc()) {
        $encoded = encode_binary_fields($row);
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

function db_account_password_changed_since(string $employee_id, int $timestmap) {
    return false;
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

    return encode_binary_fields($data);
}

function db_project_fetchall() {
    global $db;


    $query = $db->prepare(
        "SELECT * FROM `PROJECTS`"
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
        $encoded = encode_binary_fields($row);
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
        $encoded = encode_binary_fields($row);
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
        $encoded = encode_binary_fields($row);
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
        $encoded = encode_binary_fields($row);
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