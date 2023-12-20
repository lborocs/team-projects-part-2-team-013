<?php
require("lib/context.php");

function r_manager_popular_posts(RequestContext $ctx, string $args) {
    $accesses = db_post_accesses_fetchall();

    respond_ok(array(
        "posts"=>$accesses
    ));

}

function r_manager_popular_tags() {
    $tagviews = db_tag_fetch_popular();

    respond_ok(array(
        "tags"=>$tagviews
    ));
}

register_route(new Route(
    ["GET"],
    "/frequentedposts",
    "r_manager_popular_posts",
    2,
    []
));

register_route(new Route(
    ["GET"],
    "/frequentedtags",
    "r_manager_popular_tags",
    2,
    []
));

contextual_run();
?>