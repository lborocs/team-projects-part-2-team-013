<?php
require("lib/context.php");
require_once("lib/object_commons/object_route.php");


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