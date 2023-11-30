<?php
// generic tables

const OBJECT_SNOWFLAKE_VALIDITY_FUNCTIONS = [
    "EMP"=>"db_employee_fetch",
];

const TASK_STATE_TODO = 0;
const TASK_STATE_INPROGRESS = 1;
const TASK_STATE_COMPLETED = 3;

const TASK_VALID_STATES = [TASK_STATE_TODO, TASK_STATE_INPROGRESS, TASK_STATE_COMPLETED];


const TABLE_EMPLOYEES = 0;
const TABLE_POSTS = 1;
const TABLE_PROJECTS = 2;
const TABLE_TASKS = 3;
const TABLE_PERSONALS = 4;

// editable fields

// field=> 

const MODEL_EMPLOYEE = [
    "firstName"=>"string",
    "lastName"=>"string",
    "email"=>"string",
    "isManager"=>"boolean",
];

const MODEL_POST = [
    "title"=>"string",
    "content"=>"string",
    "isTechnical"=>"boolean"
];

const MODEL_PROJECT = [
    "projName"=>"string",
    "description"=>"string?",
    "teamLeader"=>"ID_EMP"
];

const MODEL_TASK = [
    "title"=>"string",
    "description"=>"string?",
    "state"=>"integer",
    "dueDate"=>"integer?",
];

const MODEL_PERSONALS = [
    "state"=>"integer",
    "title"=>"string",
    "content"=>"string?",
    "dueDate"=>"integer?"
];

?>