<?php
require("lib/context.php");
require("lib/object_commons/object_checks.php");

function r_manager_popular_posts(RequestContext $ctx, string $args) {

    $delta = $_GET["delta"] ?? POST_ACCESS_DELTA;

    if (!is_numeric($delta)) {
        respond_bad_request("Expected numeric delta", ERROR_QUERY_PARAMS_INVALID);
    }

    $accesses = db_post_accesses_fetchall($delta);

    respond_ok(array(
        "posts"=>$accesses
    ));

}

function r_manager_popular_tags() {

    $delta = $_GET["delta"] ?? POST_ACCESS_DELTA;

    if (!is_numeric($delta)) {
        respond_bad_request("Expected numeric delta", ERROR_QUERY_PARAMS_INVALID);
    }

    $tagviews = db_tag_fetch_popular($delta);

    respond_ok(array(
        "tags"=>$tagviews
    ));
}

function r_manager_most_subscribed_posts() {
    $posts = db_post_fetch_most_subscribed();

    respond_ok(array(
        "posts"=>$posts
    ));
}

function r_manager_most_helpful_posts() {
    $posts = db_post_fetch_most_helpful();

    respond_ok(array(
        "posts"=>$posts
    ));
}

function r_manager_least_helpful_posts() {
    $posts = db_post_fetch_least_helpful();

    respond_ok(array(
        "posts"=>$posts
    ));
}


function r_manager_employee_projects(RequestContext $ctx, string $args) {

    $search = SearchParams::from_query_params(TABLE_PROJECTS, additionalCols: ["lastAccessed"]);

    $emp_id = employee_id_from_args($args, $ctx);

    if ($emp_id !== $ctx->session->hex_associated_user_id) {
        object_check_employee_exists($ctx, [$emp_id]);
    }

    $projects = db_employee_fetch_projects_in($emp_id, $search);

    respond_ok(array(
        "projects"=>$projects
    ));

}



register_route(new Route(
    ["GET"],
    "/mostviewedposts",
    "r_manager_popular_posts",
    AUTH_LEVEL_MANAGER,
    []
));

register_route(new Route(
    ["GET"],
    "/mostviewedtags",
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

register_route(new Route(
    ["GET"],
    "/mostsubscribedposts",
    "r_manager_most_subscribed_posts",
    AUTH_LEVEL_MANAGER,
    []
));

register_route(new Route(
    ["GET"],
    "/mosthelpfulposts",
    "r_manager_most_helpful_posts",
    AUTH_LEVEL_MANAGER,
    []
));
register_route(new Route(
    ["GET"],
    "/leasthelpfulposts",
    "r_manager_least_helpful_posts",
    AUTH_LEVEL_MANAGER,
    []
));


contextual_run();
?>