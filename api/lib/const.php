<?php
// error codes

// 401 Unauthorized and 403 Forbidden
const ERROR_NOT_AUTHENTICATED = 1000;
const ERROR_INSUFFICIENT_AUTHORIZATION = 1001;
const ERROR_SESSION_EXPIRED = 1004;
const ERROR_SESSION_REVOKED = 1005;
const ERROR_LOGIN_DETAILS_INCORRECT = 1006;
const ERROR_ONE_TIME_PIN_REQUIRED = 1007;


// 400 bad request (405 method not allowed)
const ERROR_BAD_REQUEST = 2000;
const ERROR_BODY_INVALID = 2001;
const ERROR_BODY_MISSING_REQUIRED_FIELD = 2002;
const ERROR_BODY_FIELD_INVALID_TYPE = 2003;
const ERROR_BODY_REQUIRED = 2004;
const ERROR_REQUEST_METHOD_DISALLOWED = 2005;
const ERROR_REQUEST_URL_PATH_PARAMS_REQUIRED = 2006;
const ERROR_REQUEST_URL_PATH_PARAMS_DISALLOWED = 2007;
const ERROR_REQUEST_URL_PATH_PARAMS_UNEXPECTED_AMOUNT = 2008;
const ERROR_REQUEST_URL_PATH_PARAMS_INVALID = 2010;
const ERROR_BODY_UNEXPECTED_FIELD = 2011;
const ERROR_BODY_FIELD_INVALID_DATA = 2012;
const ERROR_BODY_SNOWFLAKE_INVALID = 2013;
const ERROR_BODY_SNOWFLAKE_DOESNT_REFERENCE = 2014;
const ERROR_QUERY_PARAMS_TOO_LARGE = 2015;
const ERROR_UNSUPPORTED_MIME_TYPE = 2016;
const ERROR_ACCOUNT_ALREADY_EXISTS = 2017;
const ERROR_SIGNUP_TOKEN_INVALID = 2018;
const ERROR_ASSET_FILE_SIZE_TOO_LARGE = 2019;
CONST ERROR_ASSET_DIMENSIONS_TOO_LARGE = 2020;
const ERROR_ASSET_DIMENSIONS_TOO_SMALL = 2021;
const ERROR_ASSET_BAD_ASPECT_RATIO = 2022;
const ERROR_HTML_ILLEGAL_FORMAT = 2023;
const ERROR_QUERY_PARAMS_INVALID = 2024;


// 404 not found
const ERROR_ROUTE_NOT_FOUND = 4001;
const ERROR_RESOURCE_NOT_FOUND = 4002;
const ERROR_WEBSERVER_FAILED_TO_FIND_SCRIPT = 4003;


// 500 internal errors
const ERROR_UNHANDLED_EXCEPTION_THROWN = 3000;
const ERROR_SESSION_CANT_UNPACK = 3001;
const ERROR_CRYPTO_FAILURE = 3002;
const ERROR_DB_INSERTION_FAILED = 3004;
const ERROR_DB_GENERAL_FAILURE = 3005;
const ERROR_SESSION_VALIDATION_SERVER_DOWN = 3006;
const ERROR_CLOUD_UPLOAD_FAILED = 3007;
const ERROR_CLOUD_DELETE_FAILED = 3008;
const ERROR_DATABASE_CONNECTION_FAILED = 3009;
const ERROR_MAILJET_FAILED_TO_SEND_EMAIL = 3010;
const ERROR_JSON_ENCODING_ERROR = 3997;
const ERROR_NOT_YET_IMPLEMENTED = 3998;
const ERROR_ILLEGAL_IMPLEMENTATION = 3999;



// constants

const AUTH_LEVEL_UNAUTHENTICATED = 0;
const AUTH_LEVEL_USER = 1;
const AUTH_LEVEL_MANAGER = 2;


const REQUEST_METHODS_ALLOWED_BODIES = ["PUT", "POST", "PATCH"];
const PASSWORD_HASHING_COST = 11;
const SESSION_INACTIVITY_EPOCH = 60 * 30 * 1000; // 60s * 30m * 1000ms
const SESSION_RENEW_LIMIT = 5;
const PASSWORD_RESET_TIMEOUT = SESSION_INACTIVITY_EPOCH;
const UUID_LENGTH = 16;
const POST_ACCESS_DELTA = 60 * 60 * 24 * 30 * 1000; // 60s * 60m * 24h * 30d * 1000ms
const DATA_FETCH_LIMIT = 100;
const DB_ARRAY_DELIMITER = ";";

// searching
const SEARCH_FETCH_FLOOR = 10;
const SEARCH_FETCH_CEILING = 100;
const SEARCH_FETCH_DEFAULT = 25;

// account constraints
const ACCOUNT_PASSWORD_MAX_LENGTH = 72;
const ACCOUNT_PASSWORD_MIN_LENGTH = 10;
const ACCOUNT_EMAIL_MAX_LENGTH = 255;
const PASSWORD_SPECIAL_CHARS_REGEX = "/[!@#$%^&*()\-_=+{};:,<.>'`\"\ ]/";
const PASSWORD_BANNED_PHRASES = ["password","makeitall"];


// preferences
const PREFERENCES_MAX_LENGTH = 1024; // 1KB
const DEFAULT_EMPLOYEE_PREFERENCES = [
    'sidebarIsOpen' => false,
    'taskView' => 'board',
    'taskSort' => 'none',
    'taskOrder' => 'desc', 
        'taskFilters.managerMine' => false,
        'taskFilters.group' => false,
        'taskFilters.single' => false,
        'taskFilters.finished' => false,
        'taskFilters.inProgress' => false,
        'taskFilters.notStarted' => false,
        'taskFilters.overdue' => false,
        'taskFilters.notOverdue' => false,
    'projectSort' => 'none',
    'projectOrder' => 'desc',
        'projectFilters.managerMine' => false,
        'projectFilters.teamLeader' => false,
        'projectFilters.overdue' => false,
        'projectFilters.notOverdue' => false,
];

?>
