<?php
require_once("../database.php");

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

function object_check_post_exists(RequestContext $ctx, array $resource_ids) {
    $post = db_post_fetch($resource_ids[0]);
    
    if ($post == false) {
        respond_resource_not_found("post ". $resource_ids[0]);
    }

    $ctx->post = $post;
}

function object_check_user_is_post_admin(RequestContext $ctx, array $resource_ids) {
    respond_not_implemented();
}

function object_check_user_is_manager(RequestContext $ctx, array $resource_ids) {
    return $ctx->session->auth_level >= 2;
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
    if ($ctx->session->auth_level > 1 || $author == $ctx->project["teamLeader"]) {
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

    if ($ctx->session->auth_level < 2 && $author != $ctx->project["teamLeader"]) {
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

function object_check_task_edit_validation(RequestContext $ctx, array $resource_ids) {

    // requires task exists

    $data = $ctx->request_body;
    $bin_id = hex2bin($ctx->session->hex_associated_user_id);

    // check if we are only editing state

    if (count($data) == 1 && array_key_exists("status", $data)) {
        // check if state is valid
        if (array_key_exists($data["status"], TASK_VALID_STATES)) {
            // if we are only editing state then they only need to be a user
            if ($ctx->task->assignedTo == $bin_id) {
                return;
            }
        } else {
            respond_bad_request(
                "Task state field is not a valid state",
                ERROR_BODY_UPDATE_INVALID_DATA
            );
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
    elseif ($ctx->session->auth_level >= 2) {
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
?>