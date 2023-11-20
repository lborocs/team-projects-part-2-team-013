<?php
require_once("context.php");


function hash_pass(string $password) {
    return password_hash(
        $password,
        PASSWORD_BCRYPT,
        ["cost"=>PASSWORD_HASHING_COST]
    );
}

function r_debug(RequestContext $ctx, string $args) {
    respond_debug($args . ":". hash_pass($args));
}

register_route(new Route(
    ["GET", "POST", "DELETE", "PATCH"],
    "/debug",
    "r_debug",
    0,
    [
        "URL_PATH_ARGS_REQUIRED",
        "URL_PATH_ARGS_LEGAL",
    ]
));

contextual_run();

?>