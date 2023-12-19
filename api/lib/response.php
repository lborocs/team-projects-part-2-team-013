<?php
require_once("lib/const.php");

function get_system_load() {
    if (function_exists("sys_getloadavg")) {
        return sys_getloadavg();
    } else {
        return "Load info not available.";
    }

}

function format_stack_trace() {
    $stack = debug_backtrace();
    $formatted = [];
    
    foreach ($stack as $frame) {

        if (array_key_exists("file", $frame)) {
            $file = substr($frame["file"], strpos($frame["file"], "api"));
            $file = str_replace("\\", ".", $file);
        } else {
            $file = "?";
        }

        array_push(
            $formatted,
            $file . ":" . ($frame["line"] ?? "?") . " -- " . format_func_args($frame["function"], $frame["args"])
        );
    }
    $trace = array_reverse($formatted);
    array_pop($trace);
    return $trace;

}

function format_func_args(string $func, array $args) {
    return $func . "(" . implode(', ', array_map('get_debug_type', $args)) . ")";
}



function respond(bool $success, Array $data, int $status_code) {
    global $t_start;
    header("Content-type: application/json");
    $debug = array(
        "request_time"=>(microtime(true)-$t_start),
        "sys_load"=>get_system_load(),
        "stacktrace"=>format_stack_trace(),
    );
    $json = json_encode(array("success"=>$success, "data"=>$data,"_trace"=>$debug), JSON_ENCODE_FLAGS);

    if ($json == false) {
        // catch json encoding error
        http_response_code(500);
        error_log("json encoding error while encoding ". var_export($data, true));

        die(json_encode(array(
            "success"=>false,
            "data"=>array(
                "code"=>ERROR_JSON_ENCODING_ERROR,
                "message"=>"Json error : " . json_last_error_msg(),
            )
        )));
    } else {
        http_response_code($status_code);
        die($json);
    }
    
};

function respond_error(string $message, int $error_code, int $status_code) {
    respond(false, Array("code"=>$error_code, "message"=>$message), $status_code);
};


function respond_no_content() {
    http_response_code(204);
    die();
}

function respond_ok(Array $data) {
    respond(true, $data, 200);
};

function respond_not_implemented() {
    respond_error("Requested functionality not implemented", ERROR_NOT_YET_IMPLEMENTED, 501);
}

function respond_illegal_implementation(string $message) {
    respond_error(
        $message,
        ERROR_ILLEGAL_IMPLEMENTATION,
        501
    );
}

function respond_internal_error(int $code) {
    respond_error("Internal server error occured", $code, 500);
}

function respond_bad_request(string $message, int $code) {
    respond_error($message, $code, 400);
}

function respond_not_authenticated(
    string $message="Authentication required for this endpoint",
    int $code=ERROR_NOT_AUTHENTICATED
) {
    respond_error($message, $code, 401);
}

function respond_insufficient_authorization() {
    respond_error("Authorization not sufficient for this action", ERROR_INSUFFICIENT_AUTHORIZATION, 403);
}

function respond_route_not_found(string $route) {
    respond_error("Route '". $route . "' not found", ERROR_ROUTE_NOT_FOUND, 404);
}

function respond_resource_not_found(string $resource) {
    respond_error("Resource '". $resource . "' not found (or you may not have access)", ERROR_RESOURCE_NOT_FOUND, 404);
}

function respond_session_tampering() {
    respond_error("Session tampering detected", ERROR_NOT_AUTHENTICATED, 401);
}

function respond_request_method_disallowed($allowed_methods) {
    respond_error(
        "This route only supports the ". implode(", ", $allowed_methods) . " methods",
        ERROR_REQUEST_METHOD_DISALLOWED,
        405,
    );
}

function respond_database_failure(bool $inserting=false) {
    if ($inserting) {
        respond_internal_error(ERROR_DB_INSERTION_FAILED);
    } else {
        respond_internal_error(ERROR_DB_GENERAL_FAILURE);
    }
}

function respond_infrastructure_error(string $message, int $code) {
    respond_error($message, $code, 503);
}

function respond_debug($object) {
    respond(true, Array("debug_info"=>$object), 418);
}


?>