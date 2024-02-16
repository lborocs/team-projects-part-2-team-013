<?php
require_once("lib/database.php");
require_once("lib/response.php");

function _check_arg_count(array $resource_ids, int $count) {
    if (count($resource_ids) != $count) {
        respond_bad_request(
            "This method expects exactly . " . $count . " resource specifier(s)",
            ERROR_REQUEST_URL_PATH_PARAMS_UNEXPECTED_AMOUNT
        );
    }
}

function object_check_no_arg(RequestContext $ctx, array $resource_ids) {
    _check_arg_count($resource_ids, 0);
}

function object_check_solo_arg(RequestContext $ctx, array $resource_ids) {
    _check_arg_count($resource_ids, 1);
}

function object_check_duo_arg(RequestContext $ctx, array $resource_ids) {
    _check_arg_count($resource_ids, 2);
}

function object_check_not_implemented(RequestContext $ctx, array $resource_ids) {
    respond_not_implemented();
}

function object_check_post_exists(RequestContext $ctx, array $resource_ids) {
    $post = db_post_fetch($resource_ids[0], $ctx->session->hex_associated_user_id);
    
    if ($post == false) {
        respond_resource_not_found("post ". $resource_ids[0]);
    }

    $ctx->post = $post;
}

function object_check_user_is_post_admin(RequestContext $ctx, array $resource_ids) {
    if ($ctx->session->auth_level < AUTH_LEVEL_MANAGER && $ctx->session->hex_associated_user_id != $ctx->post["author"]["empID"]) {
        respond_insufficient_authorization();
    }
}

function object_check_user_is_manager(RequestContext $ctx, array $resource_ids) {
    if ($ctx->session->auth_level < AUTH_LEVEL_MANAGER) {
        respond_insufficient_authorization();
    }
}


function object_check_project_exists(RequestContext $ctx, array $resource_ids) {
    $project_id = $resource_ids[0];

    $project = db_project_fetch($project_id);


    if ($project == false) {
        respond_resource_not_found("project ". $project_id);
    };
    $ctx->project = $project;
}

function object_check_user_is_part_of_project(RequestContext $ctx, array $resource_ids) {
    
    // requires project_exists
    
    $project_id = $resource_ids[0];
    $author = $ctx->session->hex_associated_user_id;
    
    // if the author is a manager or leader they are always part of the project
    if ($ctx->session->auth_level > AUTH_LEVEL_USER || $author == $ctx->project["teamLeader"]["empID"]) {
        return;
    }

    // otherwise we must check the database for tasks

    if (!db_employee_in_project($ctx->session->hex_associated_user_id, $project_id)) {
        respond_resource_not_found("project ". $project_id);
    }
}

function object_check_user_is_admin_of_project(RequestContext $ctx, array $resource_ids) {
    
    // requires project_exists
    // requires user_is_part_of_project
    
    // this function requires the part of check to ensure that a 404 is returned in the case
    // that a user does not have permission to access it
    // this function checks they have permission to edit the project

    $author = $ctx->session->hex_associated_user_id;


    if ($ctx->session->auth_level < AUTH_LEVEL_MANAGER && $author != $ctx->project["teamLeader"]["empID"]) {
        respond_insufficient_authorization();
    }
}

function object_check_task_exists(RequestContext $ctx, array $resource_ids) {
    // check task exists
    // also cache it

    $task_id = $resource_ids[1];

    $task = db_task_fetch($task_id);

    if (is_null($task)) {
        respond_resource_not_found("task ". $task_id);
    }

    $ctx->task = $task;

}

function object_check_user_has_access_to_task(RequestContext $ctx, array $resource_ids) {
    // requires task exists

    if ($ctx->session->auth_level >= AUTH_LEVEL_MANAGER) {
        return;
    }



    if (!db_employee_assigned_to_task($ctx->session->hex_associated_user_id, $ctx->task["taskID"])) {
        respond_insufficient_authorization();
    }
}

function object_check_user_assigned_to_task(RequestContext $ctx, array $resource_ids) {
    // requires task exists
    // requires user_has_access_to_task

    // if the user is not a manager then they must be assigned to the task
    // because otherwise the access check would have failed
    if ($ctx->session->auth_level > AUTH_LEVEL_MANAGER) {
        return;
    }

    if (!db_employee_assigned_to_task($resource_ids[1], $ctx->session->hex_associated_user_id)) {
        respond_bad_request("You are not assigned to this task", ERROR_BAD_REQUEST);
    }
}

function object_check_task_edit_validation(RequestContext $ctx, array $resource_ids) {

    // requires task exists

    $data = $ctx->request_body;
    $bin_id = hex2bin($ctx->session->hex_associated_user_id);

    // check if we are only editing state

    if (count($data) == 1 && array_key_exists("taskStatus", $data)) {

        // if we are only editing state then they only need to be a user
        if ($ctx->task->assignedTo == $bin_id) {
            return;
        }
    }
    // we are not editing only state so check admin of project

   object_check_user_is_admin_of_project($ctx, $resource_ids);

}

function object_check_employee_exists(RequestContext $ctx, array $resource_ids) {

    $emp = db_employee_fetch($resource_ids[0]);

    if (!$emp) {
        respond_resource_not_found("employee ". $resource_ids[0]);
    }
    $ctx->employee = $emp;
}

function object_check_user_has_personal_access(RequestContext $ctx, array $resource_ids) {

    // requires employee exists

    // if its self assigned
    if ($ctx->employee["empID"] == $ctx->session->hex_associated_user_id) {
        return;
    }
    // managers can do what they like
    elseif ($ctx->session->auth_level >= AUTH_LEVEL_MANAGER) {
        return;
    }
    
    respond_insufficient_authorization();
}

function object_check_personal_exists(RequestContext $ctx, array $resource_ids) {
    $personal_id = $resource_ids[1];

    $personal = db_personal_fetch($personal_id);

    if (!$personal) {
        respond_resource_not_found("personal " . $personal_id);
    }

    $ctx->personal = $personal;

}

function object_check_user_can_create_posts(RequestContext $ctx, array $resource_ids) {
    $settings = db_global_settings_get($ctx->session->hex_associated_user_id);

    $level = $settings["postsEnabled"];

    if ($level == 1 && $ctx->session->auth_level > AUTH_LEVEL_MANAGER) {
        respond_functionality_disabled("Creatings posts is currently disabled");
    }
    if ($level == 2) {
        respond_functionality_disabled("Creatings posts is currently disabled");
    }
}

function object_check_user_can_create_tags(RequestContext $ctx, array $resource_ids) {
    $settings = db_global_settings_get($ctx->session->hex_associated_user_id);

    $level = $settings["tagsEnabled"];

    if ($level == 1 && $ctx->session->auth_level > AUTH_LEVEL_MANAGER) {
        respond_functionality_disabled("Creating tags is currently disabled");
    }
    if ($level == 2) {
        respond_functionality_disabled("Creating tags is currently disabled");
    }
}


?>