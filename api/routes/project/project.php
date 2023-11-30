<?php
require("lib/context.php");
require_once("lib/object_commons/object_route.php");

const PROJECT_MODEL_CHECKS = [
    "DELETE"=>[
        "solo_arg",
        "project_exists",
        "user_is_part_of_project",
        "user_is_admin_of_project",
    ],
    "GET"=>[
        "solo_arg",
        "project_exists",
        "user_is_part_of_project",
    ],
    "PATCH"=>[
        "solo_arg",
        "project_exists",
        "user_is_part_of_project",
        "user_is_admin_of_project",
    ],
    "POST"=>[
        "no_arg",
        "user_is_manager"
    ],
    
];



function r_project_fetchall_projects(RequestContext $ctx, string $args) {

    $search_term = urldecode($_GET["q"] ?? "");

    // managers can get all projects
    if ($ctx->session->auth_level > 1) {
        $projects = db_project_fetchall($search_term);
        respond_ok(
            array(
                "projects"=>$projects,
            )
        );
    }
    // users can only get projects they are assigned to
    else {
        $projects = db_employee_fetch_projects_in($ctx->session->hex_associated_user_id, $search_term);
        respond_ok(
            array(
                "projects"=>$projects,
            )
        );
    }

}

function r_project_project(RequestContext $ctx, string $args) {
    object_manipulation_generic(PROJECT_MODEL_CHECKS, MODEL_PROJECT, TABLE_PROJECTS, $ctx, $args);
}

register_route(new Route(
    ["GET"],
    "/projects",
    "r_project_fetchall_projects",
    1,
    [] // no flags...
));

register_route(new Route(
    OBJECT_GENERAL_ALLOWED_METHODS,
    "/project",
    "r_project_project",
    1,
    [
        "REQUIRES_BODY",
        "URL_PATH_ARGS_LEGAL",
    ]
));

contextual_run();
?>