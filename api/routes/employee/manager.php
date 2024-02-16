<?php
require("lib/context.php");
require("lib/object_commons/object_checks.php");

function r_manager_popular_posts(RequestContext $ctx, string $args) {
    $accesses = db_post_accesses_fetchall();

    respond_ok(array(
        "posts"=>$accesses
    ));

}

function r_manager_popular_tags() {
    $tagviews = db_tag_fetch_popular();

    respond_ok(array(
        "tags"=>$tagviews
    ));
}


function r_manager_employee_projects(RequestContext $ctx, string $args) {

    $search = SearchParams::from_query_params(TABLE_PROJECTS, additionalCols: ["lastAccessed"]);


    if ($args == "@me") {
        $emp_id = $ctx->session->hex_associated_user_id;
    } else {
        $emp_id = $args;
        if (!@hex2bin($emp_id)) {
            respond_bad_request(
                "Url resource specifiers are expected to be valid hex",
                ERROR_REQUEST_URL_PATH_PARAMS_INVALID,
            );
        }
    }

    object_check_employee_exists($ctx, [$emp_id]);

    $projects = db_employee_fetch_projects_in($emp_id, $search);

    respond_ok(array(
        "projects"=>$projects
    ));

}



register_route(new Route(
    ["GET"],
    "/frequentedposts",
    "r_manager_popular_posts",
    AUTH_LEVEL_MANAGER,
    []
));

register_route(new Route(
    ["GET"],
    "/frequentedtags",
    "r_manager_popular_tags",
    AUTH_LEVEL_MANAGER,
    []
));

register_route(new Route(
    ["GET"],
    "/employeeprojects",
    "r_manager_employee_projects",
    AUTH_LEVEL_MANAGER,
    ["URL_PATH_ARGS_LEGAL", "URL_PATH_ARGS_ALLOWED"]
));

contextual_run();
?>