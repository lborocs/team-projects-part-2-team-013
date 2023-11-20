<?php
require("../context.php");
require("../object_route.php");

const POST_METHOD_CHECKS = [
    "DELETE"=>[
        "solo_arg",
        "post_exists",
        "user_is_post_admin",
    ],
    "GET"=>[
        "solo_arg",
        "post_exists",
    ],
    "PATCH"=>[
        "solo_arg",
        "post_exists",
        "user_is_post_admin",
    ],
    "POST"=>[
        "no_arg",
    ]
];

function r_post_fetchall_posts(RequestContext $ctx, string $args) {

    $posts = db_post_fetchall();

    respond_ok(array(
        "posts"=>$posts
    ));

}

function r_post_post(RequestContext $ctx, string $args) {
    object_manipulation_generic(POST_METHOD_CHECKS, MODEL_POST, TABLE_POSTS, $ctx, $args);
}

register_route(new Route(
    ["GET"],
    "/posts",
    "r_post_fetchall_posts",
    1,
    [] // no flags...
));

register_route(new Route(
    OBJECT_GENERAL_ALLOWED_METHODS,
    "/post",
    "r_post_post",
    1,
    [
        "REQUIRES_BODY",
        "URL_PATH_ARGS_LEGAL",
    ]
));

contextual_run();
?>