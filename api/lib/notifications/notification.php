<?php
require_once("lib/database.php");
require_once("lib/object_commons/models.php");


const _NOTIF_FUNCS = [
    NOTIFICATION_TYPE::POST_UPDATE => "db_post_updates_add",
    NOTIFICATION_TYPE::TASK_UPDATE => "db_task_updates_add",
];

const _NOTIF_FUNCS_BULK = [
    NOTIFICATION_TYPE::TASK_UPDATE => "db_task_updates_add_bulk",
];


function _create_notification(int $type, ...$fields) {

    $notification_id = db_notification_create($type);

    $func = _NOTIF_FUNCS[$type];

    $func($notification_id, ...$fields);
    return $notification_id;
}

function _create_notification_bulk(int $type, Array $array_of_fields) {
    $notification_id = db_notification_create($type);

    $func = _NOTIF_FUNCS_BULK[$type];

    $func($notification_id, $array_of_fields);
    
    return $notification_id;
}

function notification_task_edit(string $task_id) {
    return _create_notification(NOTIFICATION_TYPE::TASK_UPDATE, $task_id, null, TASK_UPDATE_TYPE::EDITED);
}

function notification_task_assigned_bulk(string $task_id, Array $assignees) {

    $fields = array_map(function($assignee_id) use ($task_id) {
        return [$task_id, $assignee_id, TASK_UPDATE_TYPE::ASSIGNED];
    }, $assignees);

    return _create_notification_bulk(NOTIFICATION_TYPE::TASK_UPDATE, $fields);
}

function notification_task_unassigned_bulk(string $task_id, Array $assignees) {

    $fields = array_map(function($assignee_id) use ($task_id) {
        return [$task_id, $assignee_id, TASK_UPDATE_TYPE::UNASSIGNED];
    }, $assignees);

    return _create_notification_bulk(NOTIFICATION_TYPE::TASK_UPDATE, $fields);
}

function notification_post_edited(string $post_id, string $edited_by) {
    return _create_notification(NOTIFICATION_TYPE::POST_UPDATE, $post_id, $edited_by);
}


?>