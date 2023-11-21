<?php
// for request time
$t_start = microtime(true);
set_exception_handler("global_exception_handler");
require_once("common.php");


$routes = Array();

function global_exception_handler(Throwable $exception) {
    $printed = $exception->__toString();
    error_log($printed);
    respond(false, Array(
        "message"=>"Unhandled internal exception thrown",
        "code"=>ERROR_UNHANDLED_EXCEPTION_THROWN,
        "exception_data" => Array(
            "message"=>$exception->getMessage(),
            "file"=>$exception->getFile(),
            "line"=>$exception->getLine(),
            "info"=>base64_encode($printed),
        ),
    ), 520);
};


function register_route(Route $route) {
    global $routes;
    $routes[$route->route] = $route;
};

function contextual_run() {
    global $routes;
    $ctx = new RequestContext();
    $routing_params = get_first_path($ctx->request_uri);
    $routing_path = $routing_params[0];

    // 404 if route not registered
    if (!array_key_exists($routing_path, $routes)) {
        respond_route_not_found($routing_path);
    }


    $route = $routes[$routing_path];

    $args = $routing_params[1] ?? null;

    // options should return allow headers and no more.
    if ($ctx->request_method == "OPTIONS") {
        header("Access-Control-Allow-Methods: ". implode(", ", $route->allowed_methods));
        header("Access-Control-Allow-Headers: content-type");
        respond_no_content();
    }

    header("Allow: ". implode(", ", $route->allowed_methods));


    // http method checks
    if (!in_array($ctx->request_method, $route->allowed_methods)) {
        respond_request_method_disallowed($route->allowed_methods);
    }

    // authentication checks
    if ($ctx->auth_level < $route->required_auth_level) {
        if ($ctx->auth_level == 0) {
            // 401 Unauthorized for missing auth
            respond_not_authenticated();
        } else {
            // 403 Forbidden for correct auth but not enough clearance
            respond_insufficient_authorization();
        }
    };

    // route flag checks
    if (in_array("REQUIRES_BODY", $route->route_flags)) {
        if ($ctx->method_allows_body() && is_null($ctx->request_body)) {
            respond_bad_request(
                "Requested route requires a HTTP body",
                ERROR_BODY_REQUIRED,
            );
        }
    }

    if (!(is_null($args) || in_array("URL_PATH_ARGS_LEGAL", $route->route_flags))) {
        respond_bad_request(
            "This route expects no url path paramaters",
            ERROR_REQUEST_URL_PATH_PARAMS_DISALLOWED
        );
    }

    if (is_null($args) && in_array("URL_PATH_ARGS_REQUIRED", $route->route_flags)) {
        respond_bad_request(
            "This route expects atleast some url path paramaters",
            ERROR_REQUEST_URL_PATH_PARAMS_REQUIRED
        );
    }

    // all checks passed
    $route->run($ctx, $args ?? "");
    respond_illegal_implementation("Api route left dangling, catching lack of response after run call");
};

?>