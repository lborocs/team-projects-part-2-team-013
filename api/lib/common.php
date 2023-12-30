<?php

// workaround for json SOMETIMES!!! not supporting apostrophes
const JSON_ENCODE_FLAGS = JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_INVALID_UTF8_SUBSTITUTE;


require_once("lib/const.php");
require_once("lib/auth.php");
require_once("lib/database.php");
require_once("lib/response.php");


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

function timestamp() {

    if (PHP_INT_SIZE < 8) {
        throw new RuntimeException("PHP_INT_SIZE is too small to store a timestamp");
    }

    return (int) (microtime(true) * 1000);
}

function ensure_html_is_clean(string $html) {
    // ensure no classes
    // ensure no ids
    // ensure no draggable
    // no src
    // no href
    if (preg_match("/<[^>]*(class|id|draggable|src|href)=[\s\S]*/i", $html)) {
        respond_bad_request("HTML contains disallowed content", ERROR_HTML_ILLEGAL_FORMAT);
    }

    // csp checks for unsafe scripts and inline attributes

}

?>