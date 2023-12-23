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

// common obj functions

// POSTS

function _new_post(RequestContext $ctx, array $body, array $url_specifiers) {
    $author_id = $ctx->session->hex_associated_user_id;

    ensure_html_is_clean($body["postContent"]);

    $postID = generate_uuid();
    $title = $body["postTitle"];
    $content = $body["postContent"];
    $createdBy = hex2bin($author_id);
    $createdAt = time();
    $isTechnical = $body["postIsTechnical"];

    if (db_generic_new(
        TABLE_POSTS ,
        [
            $postID,
            $title,
            $content,
            $createdBy,
            $createdAt,
            $isTechnical
        ],
        "sssssi"
    )) {

        $body["postID"] = $postID;
        $body["postAuthor"] = $createdBy;
        $body["postCreatedAt"] = $createdAt;

        respond_ok(parse_database_row($body, TABLE_POSTS));
    } else {
        respond_internal_error(ERROR_DB_INSERTION_FAILED);
    }
}

function _edit_post(RequestContext $ctx, array $body, array $url_specifiers) {
    if (array_key_exists("postContent", $body)) {
        ensure_html_is_clean($body["postContent"]);
    }
        notification_post_edited($url_specifiers[0], $ctx->session->hex_associated_user_id);
    _use_common_edit(TABLE_POSTS, $body, $url_specifiers);
}

function _delete_post(RequestContext $ctx, array $url_specifiers) {
    respond_not_implemented();
}

function _fetch_post(RequestContext $ctx, array $url_specifiers) {
    db_post_accesses_add($ctx->session->hex_associated_user_id, $ctx->post["postID"]);
    respond_ok($ctx->post);
}

// TAGS

function _new_tag(RequestContext $ctx, array $body, array $url_specifiers) {

    $name = $body["tagName"];
    $colour = $body["tagColour"];

    $tagID = generate_uuid();

    if (db_generic_new(
        TABLE_TAGS ,
        [
            $tagID,
            $name,
            $colour
        ],
        "sss"
    )) {
        $body["tagID"] = $tagID;
        respond_ok(parse_database_row($body, TABLE_TAGS));
    } else {
        respond_internal_error(ERROR_DB_INSERTION_FAILED);
    }
}

function _delete_tag(RequestContext $ctx, array $url_specifiers) {
    if (db_tag_delete($url_specifiers[0])) {
        respond_no_content();
    } else {
        respond_resource_not_found("tag ". $url_specifiers[0]);
    }
}

contextual_run();
?>