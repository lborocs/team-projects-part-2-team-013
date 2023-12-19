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

    $search_term = urldecode($_GET["q"] ?? "");

    $tag_term = $_GET["tags"] ?? null;

    $tags = null;
    if ($tag_term !== null) {
        $tags = explode(",", urldecode($tag_term));

        $tags = array_unique($tags);
        
    
        foreach ($tags as $tag) {
            if (gettype($tag) != "string" || !@hex2bin($tag)) {
                respond_bad_request("Expected param tags to be an array of hex strings", ERROR_BODY_FIELD_INVALID_TYPE);
            }
        }
    }

    $posts = db_post_fetchall($search_term, $tags);

    respond_ok(array(
        "posts"=>$posts
    ));

}

function r_post_post(RequestContext $ctx, string $args) {
    // PUT MANAGES TAGS
    if ($ctx->request_method == "PUT") {
        $param = explode_args_into_array($args);

        if (count($param) != 2) {
            respond_bad_request("Expected a post id and a subroute for method PUT", ERROR_REQUEST_URL_PATH_PARAMS_INVALID);
        }

        [$post_id, $args] = $param;


        if ($post_id === null) {
            respond_bad_request("Expected a post id for method PUT", ERROR_REQUEST_URL_PATH_PARAMS_REQUIRED);
        }

        object_check_post_exists($ctx, [$post_id]);


        switch ($args) {
            case "tags":
                r_post_post_tags($ctx, $args, $post_id);
                break;
            default:
                respond_route_not_found(
                    "Expected a valid subroute for method PUT valid methods are [/tags]",
                    ERROR_REQUEST_URL_PATH_PARAMS_INVALID
                );
        }
    } else {
        object_manipulation_generic(POST_METHOD_CHECKS, TABLE_POSTS, $ctx, $args);
    }

}

//post PUT

function r_post_post_tags(RequestContext $ctx, string $args, string $post_id) {

    $ctx->body_require_fields(["tags"]);

    $tags = $ctx->request_body["tags"];

    if (!is_array($tags)) {
        respond_bad_request("Expected field tags to be an array", ERROR_BODY_FIELD_INVALID_TYPE);
    }

    $tags = array_unique($tags);

    foreach ($tags as $tag) {
        if (gettype($tag) != "string" || !@hex2bin($tag)) {
            respond_bad_request("Expected field tags to be an array of hex strings", ERROR_BODY_FIELD_INVALID_TYPE);
        }
    }

    object_check_user_is_post_admin($ctx, []);


    db_post_set_tags($post_id, $tags);
    respond_no_content();
}

function r_post_post_meta(RequestContext $ctx, string $args) {

    [$post_id] = explode_args_into_array($args);

    object_check_post_exists($ctx, [$post_id]);

    if ($ctx->request_method == "PUT") {

        

        _ensure_body_validity(TABLE_EMPLOYEE_POST_META, $ctx);

        if (count($ctx->request_body) != 2) {
            respond_bad_request("PUT endpoints require all fields to be set (expected subscribed and feedback)", ERROR_BODY_MISSING_REQUIRED_FIELD);
        }

        db_post_meta_set(
            $post_id,
            $ctx->session->hex_associated_user_id,
            $ctx->request_body
        );

        respond_no_content();
    
    } else if ($ctx->request_method == "GET") {

        $meta = db_post_meta_fetch($post_id, $ctx->session->hex_associated_user_id);

        if ($meta === false) {
            respond_resource_not_found("No employee post meta set");
        } else {
            respond_ok(array(
                "meta"=>$meta
            ));
        }
    }
    
}


function r_post_tag(RequestContext $ctx, string $args) {
    object_manipulation_generic(TAG_METHOD_CHECKS, TABLE_TAGS, $ctx, $args);
}

function r_post_tags(RequestContext $ctx, string $args) {

    $tags = db_tag_fetchall();

    respond_ok(array(
        "tags"=>$tags
    ));
}

register_route(new Route(
    ["GET"],
    "/posts",
    "r_post_fetchall_posts",
    1,
));

register_route(new Route(
    array_merge(OBJECT_GENERAL_ALLOWED_METHODS, ["PUT"]),
    "/post",
    "r_post_post",
    1,
    [
        "REQUIRES_BODY",
        "URL_PATH_ARGS_LEGAL",
    ]
));

register_route(new Route(
    ["GET", "PUT"],
    "/meta",
    "r_post_post_meta",
    1,
    [
        "REQUIRES_BODY",
        "URL_PATH_ARGS_LEGAL",
        "URL_PATH_ARGS_REQUIRED"
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

register_route(new Route(
    ["GET"],
    "/tags",
    "r_post_tags",
    1,
));

contextual_run();
?>