<?php
require("lib/context.php");
require_once("lib/object_commons/object_route.php");

const TASK_METHOD_CHECKS = [
    "DELETE"=>[
        "duo_arg",
        "project_exists",
        "user_is_part_of_project",
        "user_is_admin_of_project",
        "task_exists",
    ],
    "GET"=>[
        "duo_arg",
        "project_exists",
        "user_is_part_of_project",
        "task_exists",
    ],
    "PATCH"=>[
        "duo_arg",
        "project_exists",
        "user_is_part_of_project",
        "task_exists",
        "task_edit_validation",
    ],
    "POST"=>[
        "solo_arg",
        "project_exists",
        "user_is_part_of_project",
        "user_is_admin_of_project",
    ]
];

function fetchall_tasks(string $author_id, string $project_id, bool $is_team_admin) {
    if (!$is_team_admin) {
        // user only, get all tasks for user
        $data = db_employee_fetch_assigned_tasks_in($author_id, $project_id);

        // FOR PRODUCTION WE SHOULD FETCH ONLY SHARED ASSIGNMENTS
        $asssignments = db_project_fetch_assignments($project_id);

        respond_ok(array(
            "contains_assignments"=>true,
            "tasks"=>$data,
            "assignments"=>$asssignments
        ));
    } else {
        $tasks = db_task_fetchall($project_id);
        $asssignments = db_project_fetch_assignments($project_id);
        respond_ok(array(
            "contains_assignments"=>true,
            "tasks"=>$tasks,
            "assignments"=>$asssignments
        ));
    }
}

function r_task_assignments(RequestContext $ctx, string $args) {
    $resource_specifiers = explode_args_into_array($args);
    
    // ensure resources specifiers are valid hex
    foreach ($resource_specifiers as $specifier) {
        if (!@hex2bin($specifier)) {
            respond_bad_request(
                "Url resource specifiers are expected to be valid hex (offender ". $specifier .")",
                ERROR_REQUEST_URL_PATH_PARAMS_INVALID,
            );
        }        
    }

    // ensure that user is part of project
    object_check_project_exists($ctx, $resource_specifiers);
    object_check_user_is_part_of_project($ctx, $resource_specifiers);

    // ensure task exists
    object_check_task_exists($ctx, $resource_specifiers);

    $task_id = $resource_specifiers[1];
    
    if ($ctx->request_method == "GET") {
        respond_ok(array(
            "assignments"=>db_task_fetch_assignments($task_id)
        ));
    }
    else if ($ctx->request_method == "PUT") {
        $ctx->body_require_fields(["assignments"]);
        $assignments = $ctx->request_body["assignments"];

        // ensure assignments is an array
        if (!is_array($assignments)) {
            respond_bad_request(
                "Assignments must be an array of employee ids",
                ERROR_BODY_FIELD_INVALID_TYPE,
            );
        }

        // convert assignments to binary
        $assignments = array_unique($assignments);
        $bin_assignments = array_map(
            function($id) {

                $bin_id = @hex2bin($id);

                if (!$bin_id) {
                    respond_bad_request(
                        "Expected all employee ids to be valid hex ids (offender :'". $id ."')",
                        ERROR_BODY_SNOWFLAKE_INVALID,
                    );
                } else {
                    return $bin_id;
                }
            },
            $assignments
        );



        if (count($assignments) > 0) {

            $fetched = db_employee_fetch_by_ids($bin_assignments);

            if ($fetched["found"] != $fetched["requested"]) {
                respond_bad_request(
                    "Expected all assignments to be valid employee ids (found ". $fetched["found"] ."/". $fetched["requested"] .")",
                    ERROR_BODY_SNOWFLAKE_INVALID,
                );
            }

        }


        // todo:
        // assigned = fetch_current_assignments

        $current_assignments = array_map(function($emp) {return $emp["employee"]["empID"];}, db_task_fetch_assignments($task_id));


        // to_assign = assignments - fetched

        $to_assign = array_diff($assignments, $current_assignments);
    
        // to_unassign = fetched - assignments

        $to_unassign = array_diff($current_assignments, $assignments);

        // unassign(to_unassigned)
        // db_assign(to_assign)

        $author_id = $ctx->session->hex_associated_user_id;

        if (count($to_unassign) > 0) {
            db_task_unassign_bulk($task_id, $to_unassign);
            notification_task_unassigned_bulk($task_id, $author_id, $to_unassign);
        }

        if (count($to_assign) > 0) {
            db_task_assign_bulk($task_id, $to_assign);
            notification_task_assigned_bulk($task_id, $author_id, $to_assign);
        }

        // dispatch notification assigned
        // dispatch notification unassigned

        respond_ok(array(
            "assigned"=>$to_assign,
            "unassigned"=>$to_unassign,
        ));
    }

}


function r_project_task(RequestContext $ctx, string $args) {
    object_manipulation_generic(TASK_METHOD_CHECKS, TABLE_TASKS, $ctx, $args);
}

function r_project_fetchall_tasks(RequestContext $ctx, string $args) {
    $resource_specifiers = explode_args_into_array($args);
    
    // check only 1 arg
    object_check_solo_arg($ctx, $resource_specifiers);

    // ensure it is hex
    if (!@hex2bin($resource_specifiers[0])) {
        respond_bad_request(
            "Url resource specifiers are expected to be valid hex",
            ERROR_REQUEST_URL_PATH_PARAMS_INVALID,
        );
    }

    // ensure that user is part of project
    object_check_project_exists($ctx, $resource_specifiers);
    object_check_user_is_part_of_project($ctx, $resource_specifiers);

    // if we are a team admin then return associated employee data too
    $is_team_admin =  ($ctx->session->auth_level >= AUTH_LEVEL_MANAGER || $ctx->session->hex_associated_user_id == $ctx->project["teamLeader"]["empID"]);
    fetchall_tasks($ctx->session->hex_associated_user_id, $resource_specifiers[0], $is_team_admin);

}

register_route(new Route(
    ["GET"],
    "/tasks",
    "r_project_fetchall_tasks",
    1,
    [
        "URL_PATH_ARGS_LEGAL",
        "URL_PATH_ARGS_REQUIRED"
    ]
));

register_route(new Route(
    OBJECT_GENERAL_ALLOWED_METHODS,
    "/task",
    "r_project_task",
    1,
    [
        "REQUIRES_BODY",
        "URL_PATH_ARGS_LEGAL",
        "URL_PATH_ARGS_REQUIRED"
    ]
));

register_route(new Route(
    ["GET", "PUT"],
    "/assignments",
    "r_task_assignments",
    1,
    [
        "URL_PATH_ARGS_LEGAL",
        "URL_PATH_ARGS_REQUIRED"
    ]
    )
);


function _fetch_task(RequestContext $ctx, array $url_specifiers) {
    // task is already fetched from the task_exists check
    respond_ok($ctx->task);
}

function _new_task(RequestContext $ctx, array $data, array $url_specifiers) {
    $author_id = $ctx->session->hex_associated_user_id;

    $taskID = generate_uuid();
    $projectID = hex2bin($url_specifiers[0]);
    $createdBy = hex2bin($author_id);
    $title = $data["taskTitle"];
    $description = $data["taskDescription"] ?? null;
    $state = $data["taskState"];
    $dueDate = $data["taskDueDate"] ?? null;
    $archived = false;
    $createdAt = timestamp();
    $expectedManHours = $data["taskExpectedManHours"];

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
            $expectedManHours,
        ],
        "sssssiiiii"
    )) {

        $data["taskID"] = $taskID;
        $data["projectID"] = $projectID;
        $data["taskCreatedby"] = $createdBy;
        $data["taskArchived"] = false;
        $data["taskCreatedAt"] = $createdAt;


        respond_ok(parse_database_row($data, TABLE_TASKS));
    } else {
        respond_database_failure(true);
    }
}

function _delete_task(RequestContext $ctx, array $url_specifiers) {
    db_task_archive($url_specifiers[1]);
    respond_no_content();
}

function _edit_task(RequestContext $ctx, array $data, array $url_specifiers) {
    // only dispatch notification if something other than task state changes
    if (count($data) > 1 || !array_key_exists("taskState", $data)) {
        notification_task_edit($url_specifiers[1], $ctx->session->hex_associated_user_id);
    }
    _use_common_edit(TABLE_TASKS, $data, $url_specifiers);
}

contextual_run();
?>