<?php
require("lib/context.php");

function r_employee_notifications(RequestContext $ctx, string $args) {
    $author = $ctx->session->hex_associated_user_id;

    $notifications = db_notifications_fetch($author);

    respond_ok(
        array(
            "notifications"=>$notifications
        )
    );

}


function r_employee_preferences(RequestContext $ctx, string $args) {
    $author = $ctx->session->hex_associated_user_id;

    //$preferences = db_preferences_fetch($author);

    respond_ok(
        array(
            "preferences"=>[]
        )
    );

}


register_route(new Route(["GET"], "/notifications", "r_employee_notifications", 1));
register_route(new Route(["GET"], "/preferences", "r_employee_preferences", 1));

contextual_run();
?>