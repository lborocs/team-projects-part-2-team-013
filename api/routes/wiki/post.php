<?php
require("lib/context.php");
require_once("lib/object_commons/object_route.php");
require_once("lib/assets/asset.php");

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
        "user_can_create_posts"
    ]
];

const TAG_METHOD_CHECKS = [
    "GET"=>[
        "not_implemented",
    ],
    "POST"=>[
        "no_arg",
        "user_can_create_tags"
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

    $is_technical = $_GET["is_technical"] ?? null;

    if (
        !is_null($is_technical) &&
        ($is_technical !== "0" && $is_technical !== "1")
    ) {
        respond_bad_request("Expected query param is_technical to be 0 or 1", ERROR_BODY_FIELD_INVALID_TYPE);
    }

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

    $posts = db_post_fetchall($search_term, $tags, $is_technical);

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
        object_manipulation_generic(POST_METHOD_CHECKS, TABLE_POSTS, $ctx, $args, ["images"]);
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

        

        _ensure_body_validity(TABLE_EMPLOYEE_POST_META, $ctx, []);

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
        "IDEMPOTENT_ON_NO_TRACK"
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

function post_body_get_image_indexes(string $content) {

    $json = json_decode($content, true);

    $indexes = [];

    foreach ($json["ops"] as $op) {
        if (
            is_array($op) &&
            array_key_exists("insert", $op) &&
            is_array($op["insert"]) &&
            array_key_exists("image", $op["insert"])
        ) {
            $indexes[] = $op["insert"]["image"];
        }
    }

    return $indexes;
}


function edit_post_images($bucket_id, string $before, string $after, array $before_assets, array $to_add) {
    $before_indexes = post_body_get_image_indexes($before);
    $after_indexes = post_body_get_image_indexes($after);

    $indexes_to_delete = array_diff($before_indexes, $after_indexes);
    $indexes_to_add = array_diff($after_indexes, $before_indexes);

    $assets_to_delete = [];

    $asset_map = [];
    foreach ($before_assets as $asset) {
        $asset_map[$asset["index"]] = $asset;
    }

    foreach ($indexes_to_delete as $index) {
        $assets_to_delete[] = $asset_map[$index];
    }

    foreach ($indexes_to_add as $index) {
        if (!array_key_exists($index, $to_add)) {
            respond_bad_request(
                "Expected a key for image '$index' in the images map",
                ERROR_BODY_INVALID
            );
        }
    }

    $assets_to_add = create_post_assets($indexes_to_add, $to_add, $bucket_id);

    foreach ($assets_to_delete as $asset) {
        Asset::from_db($asset)->delete();
    }

    db_post_bind_assets($bucket_id, $assets_to_add);

}


function create_post_assets(array $indexes, array $uploads, $bucket_id) {

    if (count($indexes) != count($uploads)) {
        respond_bad_request("Expected the number of images to match the number of unique image indexes", ERROR_BODY_INVALID);
    }

    foreach ($indexes as $index) {
        if (!array_key_exists($index, $uploads)) {
            respond_bad_request(
                "Expected a key for image '$index' in the images map",
                ERROR_BODY_MISSING_REQUIRED_FIELD
            );
        }
    }

    // array_keys and array_values arent guaranteed to preserve order
    // or even return the same order :)
    $key_array = [];
    $value_array = [];


    // so here we create 2 arrays
    // of keys and values
    // $key_array   = [index1, index2, index3]
    // $value_array = [image1, image2, image3]

    foreach ($indexes as $index) {
        $key_array[] = $index;
        $decoded = base64_decode($uploads[$index]);
        if ($decoded === false) {
            respond_bad_request(
                "Expected image to be base64 encoded (offender: $index)",
                ERROR_BODY_FIELD_INVALID_TYPE
            );
        }
        $value_array[] = $decoded;
    }


    $asset_array = Asset::from_multiple_bytes($value_array, ASSET_TYPE::POST_MEDIA, $bucket_id);


    $parsed = [];

    foreach ($key_array as $key => $index) {
        $parsed[$key] = array("asset"=>$asset_array[$key]->asset_id, "index"=>$index);
    }

    return $parsed;


}


// POSTS

function _new_post(RequestContext $ctx, array $body, array $url_specifiers) {
    $author_id = $ctx->session->hex_associated_user_id;

    ensure_html_is_clean($body["postContent"]);


    $postID = generate_uuid();

    $hex_id = bin2hex($postID);

    $indexes = post_body_get_image_indexes($body["postContent"]);

    $assets = create_post_assets($indexes, $body["images"] ?? [], $hex_id);

    $title = $body["postTitle"];
    $content = $body["postContent"];
    $createdBy = hex2bin($author_id);
    $createdAt = timestamp();
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

        if (count($assets) > 0) {
            if (!db_post_bind_assets($hex_id, $assets)) {
                error_log("Failed to bind assets to post $hex_id");
            }
        }


        respond_ok(parse_database_row($body, TABLE_POSTS));
    } else {
        respond_internal_error(ERROR_DB_INSERTION_FAILED);
    }
}

function _edit_post(RequestContext $ctx, array $body, array $url_specifiers) {
    if (array_key_exists("postContent", $body)) {

        $before_content = $ctx->post["content"];
        $after_content = $body["postContent"];

        $assets = db_post_fetch_assets($ctx->post["postID"]);

        if (strcmp($before_content, $after_content) == 0) {
            respond_bad_request("Expected post content to be different", ERROR_BODY_FIELD_INVALID_DATA);
        } else {
            notification_post_edited($url_specifiers[0], $ctx->session->hex_associated_user_id);
        }

        if (
            array_key_exists("images", $body)
            || post_body_get_image_indexes($before_content) != post_body_get_image_indexes($after_content)
        ) {
            edit_post_images($url_specifiers[0], $before_content, $after_content, $assets, $body["images"]);
        }
        unset($body["images"]);

    }

    if (array_key_exists("images", $body)) {
        respond_bad_request("Expected images to change only when post content changes (use a different index)", ERROR_BODY_FIELD_INVALID_DATA);
    }

    _use_common_edit(TABLE_POSTS, $body, $url_specifiers);
}

function _delete_post(RequestContext $ctx, array $url_specifiers) {
    db_post_delete($url_specifiers[0]);
    respond_no_content();
}

function _fetch_post(RequestContext $ctx, array $url_specifiers) {
    if (!$ctx->no_track) {
        db_post_accesses_add($ctx->session->hex_associated_user_id, $url_specifiers[0]);
    }
    $assets = db_post_fetch_assets($ctx->post["postID"]);
    $ctx->post["images"] = $assets;
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