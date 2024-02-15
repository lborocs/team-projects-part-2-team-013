<?php
require("lib/context.php");
require_once("lib/object_commons/object_route.php");
require_once("lib/assets/asset.php");


const PERSONALS_METHOD_CHECKS = [
    "DELETE"=>[
        "duo_arg",
        "employee_exists",
        "user_has_personal_access",
        "personal_exists",
    ],
    "GET"=>[
        "duo_arg",
        "employee_exists",
        "user_has_personal_access",
        "personal_exists"

    ],
    "POST"=>[
        "solo_arg",
        "employee_exists",
        "user_has_personal_access"

    ],
    "PATCH"=>[
        "duo_arg",
        "employee_exists",
        "user_has_personal_access",
        "personal_exists"

    ],
];


function r_employee_manage(RequestContext $ctx, string $args) {


    if ($args == "@me") {
        $emp_id = $ctx->session->hex_associated_user_id;
    } else {
        $emp_id = $args;
        if (!@hex2bin($emp_id)) {
            respond_bad_request(
                "Employee id is expected to be a valid hex",
                ERROR_REQUEST_URL_PATH_PARAMS_INVALID
            );
        }
    }

    $employee = db_employee_fetch_with_email($emp_id);

    if (!$employee) {
        respond_resource_not_found(
            "Employee " . $emp_id
        );
    }


    if ($ctx->request_method == "GET") {


        respond_ok(
            array(
                "employee"=>$employee
            )
        );
    } elseif ($ctx->request_method == "PATCH") {

        $body = $ctx->request_body;

        if (count($body) == 0) {
            respond_bad_request(
                "No fields to edit",
                ERROR_BODY_FIELD_INVALID_DATA
            );
        }

        $editing_self = $emp_id == $ctx->session->hex_associated_user_id;
        $is_manager = $ctx->session->auth_level > AUTH_LEVEL_USER;


        // only managers can edit others
        if (!$editing_self && !$is_manager) {
            respond_insufficient_authorization();
        }

        _ensure_body_validity(TABLE_EMPLOYEES, $ctx, ["avatar"]);


        if (array_key_exists("isManager", $body) && !$is_manager) {
            respond_insufficient_authorization();
        }

        // managers cant demote themselves
        if (array_key_exists("isManager", $body) && $editing_self) {
            respond_bad_request(
                "You cannot change your own manager status",
                ERROR_BODY_FIELD_INVALID_DATA
            );
        }

        $employee = db_employee_fetch($emp_id);

        if (array_key_exists("avatar", $body)) {
            // check if the avatar is a valid asset

            if ($body["avatar"] !== null) {

                $bytes = base64_decode($body["avatar"], true);
                if ($bytes === false) {
                    respond_bad_request(
                        "Avatar is not valid base64",
                        ERROR_BODY_FIELD_INVALID_DATA
                    );
                }

                $pre_mime = image_validation_and_mime($bytes, ASSET_TYPE::USER_AVATAR);

            }

            // delete old avatar
            if ($employee["avatar"]["assetID"]) {
                $old_av = db_asset_fetch($employee["avatar"]["assetID"]);
                if ($old_av) {
                    Asset::from_db($old_av)->delete();
                }
            }


            if ($body["avatar"] !== null) {


                // create new avatar
                $new_av = Asset::create(
                    $bytes,
                    ASSET_TYPE::USER_AVATAR,
                    $emp_id,
                    $pre_mime
                );
                $body["avatar"] = $new_av->asset_id;
            }
        }


        if (!$editing_self) {
            // force the user to relog to update their account
            auth_invalidate_account($emp_id);
        }

        _use_common_edit(TABLE_EMPLOYEES, $body, [$emp_id]);


    } elseif ($ctx->request_method == "DELETE") {
        respond_not_implemented();
    } else {
        respond_not_implemented();
    }
}



function r_employee_personals(RequestContext $ctx, string $args) {
    $method = $ctx->request_method;
    $author = $ctx->session->hex_associated_user_id;

    if ($method == "GET") {

        $personals = db_employee_fetch_personals($author);

        respond_ok(
            array(
                "personals"=>$personals
            )
        );
    }
}

function r_employee_personal(RequestContext $ctx, string $args) {
    object_manipulation_generic(PERSONALS_METHOD_CHECKS, TABLE_PERSONALS, $ctx, $args);
}

function r_employee_all(RequestContext $ctx, string $args) {
    
    $search_term = urldecode($_GET["q"] ?? "");

    $employees=db_employee_fetchall($search_term);
    respond_ok(array(
        "employees"=>$employees
    ));
}

function r_employee_bulk(RequestContext $ctx, string $args) {

    // get query params
    if (isset($_GET["ids"]) && $_GET["ids"] != "") {
        $ids = explode(",", $_GET["ids"]);
    }
    // default to current user
    else {
        $ids = [$ctx->session->hex_associated_user_id];
    }
    

    if (count($ids) > 50) {
        respond_error(
            "Bulk id request only supports 50 ids at a time",
            ERROR_QUERY_PARAMS_TOO_LARGE,
            413
        );
    }

    $binary_ids = [];
    foreach ($ids as $id) {
        $b_id = @hex2bin($id);

        if ($b_id != false) {
            array_push($binary_ids, $b_id);
        } else {
            respond_bad_request(
                "Ids are expected to be valid hex (found '". $id . "')",
                ERROR_BODY_SNOWFLAKE_INVALID,
            );
        }
    }


    $data = db_employee_fetch_by_ids($binary_ids);


    respond_ok(
        $data
    );
}


// personals

function _new_personal(RequestContext $ctx, array $body, array $url_specifiers) {
    $author_id = $ctx->session->hex_associated_user_id;

    $itemID = generate_uuid();
    $assignedTo = hex2bin($author_id);
    $state = $body["personalState"];
    $dueDate = $body["personalDueDate"] ?? null;
    $title = $body["personalTitle"];
    $content = $body["personalContent"] ?? null;

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

        $body["itemID"] = $itemID;
        $body["personalAssignedTo"] = $assignedTo;

        respond_ok(parse_database_row($body, TABLE_PERSONALS));
    } else {
        respond_internal_error(ERROR_DB_INSERTION_FAILED);
    }
}


function _delete_personal(RequestContext $ctx, array $url_specifiers) {
    db_personal_delete($url_specifiers[1]);
    respond_no_content();
}

function _fetch_personal(RequestContext $ctx, array $url_specifiers) {
    respond_ok($ctx->personal);
}


register_route(new Route(
    ["GET", "PATCH", "DELETE"],
    "/employee",
    "r_employee_manage",
    1,
    ["REQUIRES_BODY", "URL_PATH_ARGS_LEGAL", "URL_PATH_ARGS_REQUIRED"]
));
register_route(new Route(["GET"], "/bulk", "r_employee_bulk", 1, []));
register_route(new Route(["GET"], "/personals", "r_employee_personals", 1, []));
register_route(new Route(
    OBJECT_GENERAL_ALLOWED_METHODS,
    "/personal",
    "r_employee_personal",
    1,
    [
        "REQUIRES_BODY",
        "URL_PATH_ARGS_LEGAL",
        "URL_PATH_ARGS_REQUIRED"
    ]
));

register_route(new Route(
    ["GET"],
    "/all",
    "r_employee_all",
    1,
    []
));

contextual_run();
?>