<?php

// workaround for json SOMETIMES!!! not supporting apostrophes
const JSON_ENCODE_FLAGS = JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_INVALID_UTF8_SUBSTITUTE;


require_once("lib/const.php");
require_once("lib/auth.php");
require_once("lib/database.php");


class Route {
    public Array $allowed_methods;
    private string $callable;
    public int $required_auth_level;
    public string $route;
    public Array $route_flags;

    function __construct(
        Array $allowed_methods,
        string $route,
        string $callable,
        int $required_auth_level,
        ?Array $route_flags=[],
    ) {
        $this->allowed_methods = $allowed_methods;
        $this->callable = $callable;
        $this->route = $route;
        $this->required_auth_level = $required_auth_level;
        $this->route_flags = $route_flags;
    }

    function run(RequestContext $ctx, string $args) {
        $func = $this->callable;
        $func($ctx, $args);
    }
};


class RequestContext extends stdClass {
    public int $auth_level;
    public ?Array $request_body = null;
    public string $request_method;
    public string $request_uri;
    public ?Session $session = null;

    function __construct() {
        $this->request_method = $_SERVER['REQUEST_METHOD'];

        $request_uri = substr($_SERVER["REQUEST_URI"], strlen($_SERVER["SCRIPT_NAME"]));
        $request_uri = strtok($request_uri, "?"); // ignore ?q=123 kwargs

        // edge case of blank path can be either "" or "/"
        if ($request_uri == "") {
            $this->request_uri = "/";
        } else {
            $this->request_uri = $request_uri;
        }

        // authentication

        $auth_header = $_SERVER["HTTP_AUTHORIZATION"] ?? apache_request_headers()["Authorization"] ?? null;

        if (!is_null($auth_header)) {

            $session = Session::decrypt($auth_header);

            $session->ensure_still_valid();

            $this->session = $session;
            $this->auth_level = $session->auth_level;

        } else {
            $this->auth_level = 0;
        }
        

        $body = file_get_contents('php://input');

        // parse request body
        if ($this->method_allows_body() && $body) {
            $json = json_decode($body, true);

            // only error if the body is invalid json, not for null bodies
            if (is_null($json) && json_last_error() !== JSON_ERROR_NONE) {
                respond_bad_request(
                    "Request body is invalid JSON : " . json_last_error_msg(),
                    ERROR_BODY_INVALID,
                );
            }
            $this->request_body = $json;
        }

    }

    function method_allows_body() {
        return in_array($this->request_method, REQUEST_METHODS_ALLOWED_BODIES);
    }
    
    function body_require_fields(Array $fields) {
        foreach ($fields as $key) {
            if (!array_key_exists($key, $this->request_body)) {
                respond_bad_request(
                    "Missing required '" . $key . "' field",
                    ERROR_BODY_MISSING_REQUIRED_FIELD
                );
            }
        }
    }

    function body_require_fields_as_types(Array $field_values, bool $allow_null=false) {
        $this->body_require_fields(array_keys($field_values));
        foreach ($field_values as $key => $value) {
            if (gettype($this->request_body[$key]) != $value) {
                respond_bad_request(
                    "Required field is not of required type (expected '" . $key . "' to be " . $value .")",
                    ERROR_BODY_FIELD_INVALID_TYPE
                );  
            }
            
        }
    }

}


function generate_uuid() {
    $id = random_bytes(UUID_LENGTH);
    if (str_contains($id, DB_ARRAY_DELIMITER)) {
        return generate_uuid();
    }

    return $id;
}


function get_first_path(string $path) {
    $split = explode("/", $path, 3);

    return ["/" . ($split[1] ?? null), ($split[2] ?? null)];
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

function explode_args_into_array(string $args) {
    if (str_ends_with($args, "/")) {
        // if it ends with a trailing / remove it before it splits
        $args = substr($args, 0, strlen($args) - 1);
    }
    $arr = explode("/", $args);
    if (count($arr) == 1 and $arr[0] == "") {
        return [];
    } else {
        return $arr;
    }
}

function get_system_load() {
    if (function_exists("sys_getloadavg")) {
        return sys_getloadavg();
    } else {
        return "Load info not available.";
    }

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