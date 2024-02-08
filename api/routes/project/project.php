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
    if ($ctx->session->auth_level > AUTH_LEVEL_USER) {
        $projects = db_project_fetchall($search_term, $ctx->session->hex_associated_user_id);
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
    object_manipulation_generic(PROJECT_MODEL_CHECKS, TABLE_PROJECTS, $ctx, $args);
}


function _new_project(RequestContext $ctx, array $body, array $url_specifiers) {
    $author_id = $ctx->session->hex_associated_user_id;

    $projID = generate_uuid();
    $projName = $body["projectName"];
    $description = $body["projectDescription"] ?? null;
    $createdBy = hex2bin($author_id);
    $teamLeader = hex2bin($body["projectTeamLeader"]);
    $createdAt = timestamp();
    $dueDate = $body["projectDueDate"] ?? null;

    if (db_generic_new(
        TABLE_PROJECTS ,
        [
            $projID,
            $projName,
            $description,
            $createdBy,
            $teamLeader,
            $createdAt,
            $dueDate
        ],
        "sssssss"
    )) {

        $body["projID"] = $projID;
        $body["projectCreatedBy"] = $createdBy;
        $body["projectTeamLeader"] = $teamLeader;
        $body["projectCreatedAt"] = $createdAt;

        respond_ok(parse_database_row($body, TABLE_PROJECTS));
    } else {
        respond_internal_error(ERROR_DB_INSERTION_FAILED);
    }
}


function _delete_project(RequestContext $ctx, array $url_specifiers) {
    respond_not_implemented();
}

function _edit_project(RequestContext $ctx, array $body, array $url_specifiers) {


    _use_common_edit(TABLE_PROJECTS, $body, $url_specifiers);
}

function _fetch_project(RequestContext $ctx, array $url_specifiers) {
    db_project_accesses_set($ctx->project["projID"], $ctx->session->hex_associated_user_id);
    respond_ok($ctx->project);
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