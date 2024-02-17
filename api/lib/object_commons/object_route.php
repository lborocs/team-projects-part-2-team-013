<?php
require_once("lib/object_commons/models.php");
require_once("lib/object_commons/object_checks.php");
require_once("lib/notifications/notification.php");
require_once("lib/database.php");

// this code is to abstract general object manpulation routes, e.g routes like task and project
const OBJECT_GENERAL_ALLOWED_METHODS = ["POST", "GET", "PATCH", "DELETE"];


const OBJECT_GENERIC_NEW_FUNCS = [
    "`TASKS`"=>"_new_task",
    "`POSTS`"=>"_new_post",
    "`PROJECTS`"=>"_new_project",
    "`EMPLOYEE_PERSONALS`"=>"_new_personal",
    "`TAGS`"=>"_new_tag"
];

const OBJECT_GENERIC_FETCH_FUNCS = [
    "`TASKS`"=>"_fetch_task",
    "`POSTS`"=>"_fetch_post",
    "`PROJECTS`"=>"_fetch_project",
    "`EMPLOYEE_PERSONALS`"=>"_fetch_personal",
];

const OBJECT_GENERIC_EDIT_FUNCS = [
    "`TASKS`"=>"_edit_task",
    "`POSTS`"=>"_edit_post",
    "`EMPLOYEE_PERSONALS`"=>"_edit_personal",
    "`PROJECTS`"=>"_edit_project",
    "`TAGS`"=>"_use_common_edit",
    "`EMPLOYEE_PERSONALS`"=>"_use_common_edit"
];

const OBJECT_GENERIC_DELETE_FUNCS = [
    "`TASKS`"=>"_delete_task",
    "`PROJECTS`"=>"_delete_project",
    "`POSTS`"=>"_delete_post",
    "`EMPLOYEE_PERSONALS`"=>"_delete_personal",
    "`TAGS`"=>"_delete_tag",
];


function ensure_no_unchanged_fields(Array $old, Array $new) {
    foreach ($old as $key => $value) {
        if (array_key_exists($key, $new) && $new[$key] == $value) {
            respond_bad_request(
                "Field $key is unchanged and should not be provided",
                ERROR_BODY_INVALID
            );
        }
    }
}



function object_manipulation_generic(array $method_checks, Table $model, RequestContext $ctx, string $args, array $allowed_fields = []) {
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
    $session = $ctx->session;

    // if we have no session then this is not a valid route
    if (is_null($session)) {
        respond_illegal_implementation("Generic route called without session");
    }


    // ensure the every body field corresponds to a valid model field
    if ($ctx->method_allows_body()) {
        _ensure_body_validity($model, $ctx, $allowed_fields);
    }

    foreach ($method_checks[$ctx->request_method] as $check) {
        ("object_check_" . $check)($ctx, $id_selectors);
    }

    if ($ctx->request_method == "GET") {
        _generic_fetch($ctx, $model, $id_selectors);
    }

    if ($ctx->request_method == "DELETE") {
        _generic_delete($ctx, $model, $id_selectors);
    }

    if ($ctx->request_method == "POST") {


        // here we just check that we have each mandatory field
        // we expect that the fields are valid for the model
        // and no other fields are present

        foreach ($model->columns as $column) {

            if ($column->is_server_generated) {
                continue;
            }

            $field = $column->name;
            
            if (!array_key_exists($field ,$ctx->request_body)) {

                if ($column->is_nullable) {
                    $ctx->request_body[$field] = null;
                    continue;
                }

                $common = _get_common_name($column, $field);
                respond_bad_request(
                    "Expected field $common to be set",
                    ERROR_BODY_MISSING_REQUIRED_FIELD
                );
            }
        }



        // we have all fields so we can insert into the database

        _generic_new($ctx, $model, $ctx->request_body, $id_selectors);
    }

    if ($ctx->request_method == "PATCH") {
        // we expect that the fields are valid for the model
        // and no other fields are present
        // but we also must check that fields are editable


        if ($ctx->request_body == []) {
            respond_bad_request(
                "Expected at least one field to be updated",
                ERROR_BODY_MISSING_REQUIRED_FIELD
            );
        }

        foreach ($ctx->request_body as $user_field => $user_value) {
            $column = $model->get_column($user_field);

            if (!$column->is_editable) {
                respond_bad_request(
                    "Field $field is not editable",
                    ERROR_BODY_UNEXPECTED_FIELD
                );
            }
        }

        _generic_edit($ctx, $model, $ctx->request_body, $id_selectors);
    }

}

function _ensure_body_validity(Table $model, RequestContext $ctx, array $allowed_fields=[]) {
    $ctx->request_body = prepend_col_prefixes($model, $ctx->request_body);
    $body = $ctx->request_body;

    // this function ensures that every field in the body
    // is a valid field in the model
    // it also checks the types and parses ids
    // and runs through constraints


    foreach ($body as $user_field => $user_value) {

        if (in_array($user_field, $allowed_fields)) {
            continue;
        }

        $column = $model->get_column($user_field);

        // if user sent unexpected column
        if (is_null($column) || $column->is_server_generated) {
            respond_bad_request(
                "Field $user_field is not a valid field for this object",
                ERROR_BODY_UNEXPECTED_FIELD
            );
        }

        // if users sent null value for non nullable field
        if (is_null($user_value)) {
            if (!$column->is_nullable) {
                respond_bad_request(
                    "Field $user_field is not nullable",
                    ERROR_BODY_MISSING_REQUIRED_FIELD
                );
            } else {
                continue;
            }
        }

        // if user sent invalid type (check for snowflake or bool or whatever)
        $user_type = gettype($user_value);
        $column_type = $column->type;

        if ($column_type == "binary") {
            if ($user_type != "string") {
                respond_bad_request(
                    "Field $user_field is not a string, binary fields should be a hex string",
                    ERROR_BODY_FIELD_INVALID_TYPE
                );
            }

            if (!@hex2bin($user_value)) {
                respond_bad_request(
                    "Field $user_field is not a valid hex string",
                    ERROR_BODY_FIELD_INVALID_TYPE
                );
            }
        } elseif ($column_type == "boolean") {
            if ($user_type != "integer") {
                respond_bad_request(
                    "Field $user_field is not an integer, boolean fields should be 0 or 1",
                    ERROR_BODY_FIELD_INVALID_TYPE
                );
            } elseif ($user_value != 0 && $user_value != 1) {
                respond_bad_request(
                    "Field $user_field is not a valid boolean, boolean fields should be 0 or 1",
                    ERROR_BODY_FIELD_INVALID_TYPE
                );
            }
        } elseif ($column_type != $user_type) {
            respond_bad_request(
                "Field $user_field is not a valid $column_type",
                ERROR_BODY_FIELD_INVALID_TYPE
            );
        }

        if ($column_type == "string") {
            ensure_html_is_clean($user_value);
        }

        foreach ($column->constraints as $constraint) {
            $constraint->validate($user_field, $user_value);
        }
        
    }

    
}

// fetch and delete dont take body data

function _generic_fetch(RequestContext $ctx, Table $table, array $url_specifiers) {
    $table_specifier = $table->name;
    $func =  OBJECT_GENERIC_FETCH_FUNCS[$table_specifier] ?? respond_illegal_implementation("Object generic fetch func missing");
    return $func($ctx, $url_specifiers);
}

function _generic_delete(RequestContext $ctx, Table $table, array $url_specifiers) {
    $table_specifier = $table->name;
    $func =  OBJECT_GENERIC_DELETE_FUNCS[$table_specifier] ?? respond_illegal_implementation("Object generic delete func missing");
    return $func($ctx, $url_specifiers);
}

// new and delete take body data

function _generic_new(RequestContext $ctx, Table $table, array $data, array $url_specifiers) {
    $table_specifier = $table->name;
    $func =  OBJECT_GENERIC_NEW_FUNCS[$table_specifier] ?? respond_illegal_implementation("Object generic new func missing");
    return $func($ctx, $data, $url_specifiers);
}

function _generic_edit(RequestContext $ctx, Table $table, array $data, array $url_specifiers) {
    $table_specifier = $table->name;
    $func =  OBJECT_GENERIC_EDIT_FUNCS[$table_specifier] ?? respond_illegal_implementation("Object generic edit func missing");

    if ($func === "_use_common_edit") {
        return _use_common_edit($table, $data, $url_specifiers);
    }
    return $func($ctx, $data, $url_specifiers);    
}

function _use_common_edit(Table $table, array $data, array $url_specifiers) {
    $primary_keys = $table->name_url_specifiers($url_specifiers);
    db_generic_edit($table, $data, $primary_keys);
    respond_no_content();
}

?>