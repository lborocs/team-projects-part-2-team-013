<?php
require("../context.php");

function r_manager_post_accesses(RequestContext $ctx, string $args) {
    $accesses = db_post_accesses_fetchall();

    respond_ok(array(
        "accesses"=>$accesses
    ));

}

register_route(new Route(
    ["GET"],
    "/frequentposts",
    "r_manager_post_accesses",
    2,
    []
));

contextual_run();
?>