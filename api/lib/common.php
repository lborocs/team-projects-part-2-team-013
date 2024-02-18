<?php

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
    public bool $no_track = false;
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

        $this->no_track = array_key_exists("X-No-Track", apache_request_headers());

        // authentication

        $auth_header = $_SERVER["HTTP_AUTHORIZATION"] ?? apache_request_headers()["Authorization"] ?? null;

        if (!is_null($auth_header)) {

            $session = Session::decrypt($auth_header);

            $session->ensure_still_valid();

            $this->session = $session;
            $this->auth_level = $session->auth_level;

        } else {
            $this->auth_level = AUTH_LEVEL_UNAUTHENTICATED;
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

enum SortDirection {
    case ASC;
    case DESC;
}

class SearchParams {
    public Table $table;
    public int $limit=SEARCH_FETCH_DEFAULT;
    public int $page=1;
    public ?string $query=null;
    public $sort=null;
    public SortDirection $sort_direction;

    function __construct(
        Table $table,
        int $limit,
        int $page,
        ?string $query,
        $sort,
        ?SortDirection $sort_direction,
    ) {
        $this->table = $table;
        $this->limit = $limit;
        $this->page = $page;
        $this->query = $query;
        $this->sort = $sort;

        if (is_null($sort_direction)) {
            $sort_direction = SortDirection::ASC;
        }
        $this->sort_direction = $sort_direction;
    }

    static function from_query_params(Table $table, Array $p=null, Array $additionalCols=[]) {

        if (is_null($p)) {
            $p = $_GET;
        }

        $limit = $p["limit"] ?? SEARCH_FETCH_DEFAULT;
        if (!is_numeric($limit) || $limit < SEARCH_FETCH_FLOOR || $limit > SEARCH_FETCH_CEILING) {
            respond_bad_request(
                "Limit must be a positive integer at least " . SEARCH_FETCH_FLOOR . " and at most " . SEARCH_FETCH_CEILING,
                ERROR_QUERY_PARAMS_INVALID
            );
        }


        $page = $p["page"] ?? 1;
        if (!is_numeric($page) || $page < 1) {
            respond_bad_request("Page must be a positive integer greater than 0", ERROR_QUERY_PARAMS_INVALID);
        }

        $query = $p["q"] ?? null;
        $query = "%$query%";
        $sort = $p["sort_by"] ?? null;
        
        if (!is_null($sort)) {
            if (!in_array($sort, $additionalCols)) {
                $prefixed = array_keys(prepend_col_prefixes($table, [$sort=>null]));
                $sort = $prefixed[0] ?? respond_bad_request("Sort column does not exist (array)", ERROR_QUERY_PARAMS_INVALID);
                $sort = $table->get_column($sort) ?? respond_bad_request("Sort column does not exist", ERROR_QUERY_PARAMS_INVALID);
            }

        }

        $sort_direction = match ($p["sort_direction"] ?? null) {
            "asc" => SortDirection::ASC,
            "desc" => SortDirection::DESC,
            null => null,
            default => respond_bad_request("Sort direction must be either 'asc' or 'desc'", ERROR_QUERY_PARAMS_INVALID),
        };

        return new SearchParams(
            $table,
            $limit,
            $page,
            $query,
            $sort,
            $sort_direction,
        );
    }

    function get_fq_sort() {

        if (gettype($this->sort) == "string") {
            return $this->sort;
        } else {
            return $this->table->name . "." . $this->sort->name;
        }
    }

    function to_sql() {
        // we dont deal with the where cause thats up to the db
        // as it may want to search multiple columns
        $sql = "";

        if (!is_null($this->sort)) {
            $sql .= "ORDER BY " . $this->get_fq_sort();
            $sql .= match ($this->sort_direction) {
                SortDirection::ASC => " ASC",
                SortDirection::DESC => " DESC",
            };
        }

        $sql .= " LIMIT " . $this->limit . " OFFSET " . (($this->page - 1) * $this->limit);

        return $sql;

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


function employee_id_from_args(string $args, RequestContext $ctx, bool $allow_none=false) {

    if ($args == "" && $allow_none) {
        return null;

    } elseif ($args == "@me") {

        $emp_id = $ctx->session->hex_associated_user_id;

    } else {
        $emp_id = $args;
        if (!@hex2bin($emp_id)) {
            respond_bad_request(
                "Url resource specifiers are expected to be valid hex",
                ERROR_REQUEST_URL_PATH_PARAMS_INVALID,
            );
        }
    }
    return $emp_id;
}

?>