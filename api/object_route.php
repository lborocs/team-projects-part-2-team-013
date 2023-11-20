<?php
require_once("models.php");
require_once("object_checks.php");

// this code is to abstract general object manpulation routes, e.g routes like task and project
const OBJECT_GENERAL_ALLOWED_METHODS = ["POST", "GET", "PATCH", "DELETE"];

const TABLE_NAMES = [
    TABLE_EMPLOYEES=>"EMPLOYEES",
    TABLE_POSTS=>"POSTS",
    TABLE_PROJECTS=>"PROJECTS",
    TABLE_TASKS=>"TASKS",
    TABLE_PERSONALS=>"EMPLOYEE_PERSONALS",
];

const OBJECT_GENERIC_NEW_FUNCS = [
    TABLE_TASKS=>"_new_task",
    TABLE_POSTS=>"_new_post",
    TABLE_PROJECTS=>"_new_project",
    TABLE_PERSONALS=>"_new_personal"
];

const OBJECT_GENERIC_FETCH_FUNCS = [
    TABLE_TASKS=>"_fetch_task",
    TABLE_POSTS=>"_fetch_post",
    TABLE_PROJECTS=>"_fetch_project",
];

const OBJECT_GENERIC_EDIT_FUNCS = [
    TABLE_TASKS=>"_edit_task",
    TABLE_POSTS=>"_edit_post",
    TABLE_PROJECTS=>"_edit_project",
];

const OBJECT_GENERIC_DELETE_FUNCS = [
    TABLE_TASKS=>"_delete_task",
    TABLE_PROJECTS=>"_delete_project",
    TABLE_POSTS=>"_delete_post",
    TABLE_PERSONALS=>"_delete_personal"
];


function object_manipulation_generic(array $method_checks, array $model, int $table_specifier, RequestContext $ctx, string $args) {
    // generically verify and manipulate an object, then call its non generic function

    // only support a single resource
    $id_selectors = explode_args_into_array($args);
    foreach ($id_selectors as $id) {
        if (!@hex2bin($id)) {
            respond_bad_request(
                "Url resource specifiers are expected to be valid hex",
                ERROR_REQUEST_URL_PATH_PARAMS_INVALID,
            );
        }
    }

    // if we have no session then this is not a valid route
    if (is_null($ctx->session)) {
        respond_illegal_implementation("Generic route called without session");
    }

    $session = $ctx->session;

    // ensure the every body field corresponds to a valid model field
    if ($ctx->method_allows_body()) {
        _ensure_body_validity($model, $ctx->request_body);
    }

    foreach ($method_checks[$ctx->request_method] as $check) {
        ("object_check_" . $check)($ctx, $id_selectors);
    }

    if ($ctx->request_method == "GET") {
        _generic_fetch($ctx, $table_specifier, $id_selectors);
    }

    if ($ctx->request_method == "DELETE") {
        _generic_delete($ctx, $table_specifier, $id_selectors);
    }

    if ($ctx->request_method == "POST") {
        // new object

        // here we only need to validate length because the body
        // check would have errored on any fields that are not expected

        // foreach mandatory field
        foreach ($model as $key=>$value) {
            if (substr($value, -1) != "?") {
                if (!key_exists($key, $ctx->request_body)) {
                    respond_bad_request(
                        "Missing mandatory field '". $key . "' (of type ". $value . ")",
                        ERROR_BODY_MISSING_REQUIRED_FIELD
                    );
                }
            }
        }

        // we have all fields so we can insert into the database

        _generic_new($ctx, $table_specifier, $ctx->request_body, $id_selectors);
    }

    if ($ctx->request_method == "PATCH") {
        // we have already ensured that fields are valid for the model

        _generic_edit($ctx, $table_specifier, $ctx->request_body, $id_selectors);
    }

}

function _ensure_body_validity(array $model, array $body) {
    // this function ensures that every field in the body
    // is a valid field in the model
    // it also checks the types and parses ids


    foreach ($body as $key => $value) {
        $expected_type = $model[$key] ?? respond_bad_request(
            "Unexpected field '" . $key . "'",
            ERROR_BODY_UNEXPECTED_FIELD
        );

        // if the expected type is an id we must uphold
        // referential integrity

        if (substr($expected_type, -1) == "?") {
            if (is_null($value)) {
                continue;
            } else {
                $expected_type = substr_replace($expected_type, "", -1);
            }
        }


        if (substr($expected_type, 0, 3) == "ID_") {
            
            // convert hex id to binary
            // supress warning on failure
            $binary_id = @hex2bin($value);
           
            if ($binary_id == false) {
                respond_bad_request(
                    $key . " is not valid hex string",
                    ERROR_BODY_SNOWFLAKE_INVALID
                );
            }

            // use the mapping to find the database validty function
            $schema = substr($expected_type, 3);
            if (!OBJECT_SNOWFLAKE_VALIDITY_FUNCTIONS[$schema]($value)) {
                respond_bad_request(
                    $key . " " . $value . " does not reference a valid object",
                    ERROR_BODY_SNOWFLAKE_DOESNT_REFERENCE
                );
            }
        } else {
            // here we have a non id field and we can simply check the type,
            // we could have an additional constraints
            $value_type = gettype($value);

            if ($expected_type == "boolean" && $value_type == "integer") {
                if ($value == 0 || $value == 1) {
                    continue;
                } else {
                    respond_bad_request(
                        "Expected " . $key . " to be a integer bool 0/1",
                        ERROR_BODY_FIELD_INVALID_TYPE
                    );
                }
            }

            if ($value_type != $expected_type) {
                respond_bad_request(
                    "Expected " . $key . " to be of type " . $expected_type . " (got ". $value_type . ")",
                    ERROR_BODY_FIELD_INVALID_TYPE
                );
            }
        }
    }
}

// fetch and delete dont take body data

function _generic_fetch(RequestContext $ctx, int $table_specifier, array $url_specifiers) {
    $func =  OBJECT_GENERIC_FETCH_FUNCS[$table_specifier] ?? respond_illegal_implementation("Object generic fetch func missing");
    return $func($ctx, $url_specifiers);
}

function _generic_delete(RequestContext $ctx, int $table_specifier, array $url_specifiers) {
    $func =  OBJECT_GENERIC_DELETE_FUNCS[$table_specifier] ?? respond_illegal_implementation("Object generic delete func missing");
    return $func($ctx, $url_specifiers);
}

// new and delete take body data

function _generic_new(RequestContext $ctx, int $table_specifier, array $data, array $url_specifiers) {
    $func =  OBJECT_GENERIC_NEW_FUNCS[$table_specifier] ?? respond_illegal_implementation("Object generic new func missing");
    return $func($ctx, $data, $url_specifiers);
}

function _generic_edit(RequestContext $ctx, int $table_specifier, array $data, array $url_specifiers) {
    $func =  OBJECT_GENERIC_EDIT_FUNCS[$table_specifier] ?? respond_illegal_implementation("Object generic edit func missing");
    return $func($ctx, $data, $url_specifiers);
}

// task funcs

function _fetch_task(RequestContext $ctx, array $url_specifiers) {
    // task is already fetched from the task_exists check
    respond_ok($ctx->task);
}

function _new_task(RequestContext $ctx, array $data, array $url_specifiers) {
    $author_id = $ctx->session->hex_associated_user_id;

    $taskID = random_bytes(UUID_LENGTH);
    $projectID = hex2bin($url_specifiers[0]);
    $createdBy = hex2bin($author_id);
    $title = $data["title"];
    $description = $data["description"] ?? null;
    $state = $data["state"];
    $dueDate = $data["dueDate"] ?? null;
    $archived = false;
    $createdAt = time();

    if (db_generic_new(
        TABLE_TASKS ,
        [
            $taskID,
            $projectID,
            $createdBy,
            $title,
            $description,
            $state,
            $archived,
            $createdAt,
            $dueDate,
        ],
        "sssssiiii"
    )) {

        $data["taskID"] = bin2hex($taskID);
        $data["projectID"] = $url_specifiers[0];
        $data["createdby"] = $author_id;
        $data["archived"] = false;
        $data["createdAt"] = $createdAt;

        respond_ok($data);
    } else {
        respond_database_failure(true);
    }
}

function _delete_task(RequestContext $ctx, array $url_specifiers) {
    db_task_archive($url_specifiers[1]);
    respond_no_content();
}

function _edit_task(RequestContext $ctx, array $url_specifiers) {
    respond_not_implemented();
}

// project

function _new_project(RequestContext $ctx, array $body, array $url_specifiers) {
    $author_id = $ctx->session->hex_associated_user_id;

    $projID = random_bytes(UUID_LENGTH);
    $projName = $body["projName"];
    $description = $body["description"];
    $createdBy = hex2bin($author_id);
    $teamLeader = hex2bin($body["teamLeader"]);
    $createdAt = time();

    if (db_generic_new(
        TABLE_PROJECTS ,
        [
            $projID,
            $projName,
            $description,
            $createdBy,
            $teamLeader,
            $createdAt,
        ],
        "ssssss"
    )) {

        $body["projID"] = bin2hex($projID);
        $body["createdBy"] = $author_id;
        $body["teamLeader"] = bin2hex($teamLeader);
        $body["createdAt"] = $createdAt;

        respond_ok($body);
    } else {
        respond_internal_error(ERROR_DB_INSERTION_FAILED);
    }
}

function _edit_project(RequestContext $ctx, array $body, array $url_specifiers) {
    respond_not_implemented();
}

function _delete_project(RequestContext $ctx, array $url_specifiers) {
    respond_not_implemented();
}

function _fetch_project(RequestContext $ctx, array $url_specifiers) {
    respond_ok($ctx->project);
}

// posts

function _new_post(RequestContext $ctx, array $body, array $url_specifiers) {
    $author_id = $ctx->session->hex_associated_user_id;

    $postID = random_bytes(UUID_LENGTH);
    $title = $body["title"];
    $content = $body["content"];
    $createdBy = hex2bin($author_id);
    $createdAt = time();
    $isTechnical = $body["isTechnical"];

    if (db_generic_new(
        TABLE_POSTS ,
        [
            $postID,
            $title,
            $content,
            $createdBy,
            $createdAt,
            $isTechnical
        ],
        "sssssi"
    )) {

        $body["postID"] = bin2hex($postID);
        $body["createdBy"] = $author_id;
        $body["createdAt"] = $createdAt;

        respond_ok($body);
    } else {
        respond_internal_error(ERROR_DB_INSERTION_FAILED);
    }
}

function _edit_post(RequestContext $ctx, array $body, array $url_specifiers) {
    respond_not_implemented();
}

function _delete_post(RequestContext $ctx, array $url_specifiers) {
    respond_not_implemented();
}

function _fetch_post(RequestContext $ctx, array $url_specifiers) {
    db_post_accesses_add($ctx->session->hex_associated_user_id, $ctx->post["postID"]);
    respond_ok($ctx->post);
}

// personals

function _new_personal(RequestContext $ctx, array $body, array $url_specifiers) {
    $author_id = $ctx->session->hex_associated_user_id;

    $itemID = random_bytes(UUID_LENGTH);
    $assignedTo = hex2bin($url_specifiers[0]);
    $state = $body["state"];
    $dueDate = $body["dueDate"] ?? null;
    $title = $body["title"];
    $content = $body["content"] ?? null;

    if (db_generic_new(
        TABLE_PERSONALS ,
        [
            $itemID,
            $assignedTo,
            $state,
            $dueDate,
            $title,
            $content
        ],
        "ssiiss"
    )) {

        $body["itemID"] = bin2hex($itemID);
        $body["assignedTo"] = $url_specifiers[0];

        respond_ok($body);
    } else {
        respond_internal_error(ERROR_DB_INSERTION_FAILED);
    }
}

function _edit_personal(RequestContext $ctx, array $body, array $url_specifiers) {
    respond_not_implemented();
}

function _delete_personal(RequestContext $ctx, array $url_specifiers) {
    db_personal_delete($url_specifiers[1]);
    respond_no_content();
}

function _fetch_personal(RequestContext $ctx, array $url_specifiers) {

    respond_ok($ctx->personal);
}

?>