<?php
require("lib/context.php");
require_once("lib/object_commons/object_route.php");

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

const TAG_METHOD_CHECKS = [
    "GET"=>[
        "not_implemented",
    ],
    "POST"=>[
        "no_arg",
    ],
    "PATCH"=>[
        "not_implemented",
    ],
    "DELETE"=>[
        "user_is_manager",
    ]
];

function r_post_fetchall_posts(RequestContext $ctx, string $args) {

    $posts = db_post_fetchall();

    respond_ok(array(
        "posts"=>$posts
    ));

}

function r_post_post(RequestContext $ctx, string $args) {
    object_manipulation_generic(POST_METHOD_CHECKS, TABLE_POSTS, $ctx, $args);
}

function r_post_tag(RequestContext $ctx, string $args) {
    object_manipulation_generic(TAG_METHOD_CHECKS, TABLE_TAGS, $ctx, $args);
}

register_route(new Route(
    ["GET"],
    "/posts",
    "r_post_fetchall_posts",
    1,
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


register_route(new Route(
    OBJECT_GENERAL_ALLOWED_METHODS,
    "/tag",
    "r_post_tag",
    1,
    [
        "REQUIRES_BODY",
        "URL_PATH_ARGS_LEGAL",
    ]
));

contextual_run();
?>