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


register_route(new Route(["GET"], "/notifications", "r_employee_notifications", 1));

contextual_run();
?>