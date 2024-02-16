<?php
require("lib/context.php");
require_once("lib/object_commons/object_route.php");

const GLOBAL_SETTINGS_METHOD_CHECKS = [
    "GET"=>[
    ],
    "POST"=>[
        "user_is_manager"
    ]
];



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

    if ($ctx->request_method == "PUT") {

        $ctx->body_require_fields_as_types(["preferences"=>"array"]);

        $preferences = $ctx->request_body["preferences"];

        if ($preferences === null || count($preferences) === 0) {
            db_preferences_delete($author);
            respond_no_content();
        } else {
            $encoded = json_encode($preferences);

            if ($encoded === false) {
                respond_bad_request(
                    "Failed to encode preferences",
                    ERROR_JSON_ENCODING_ERROR
                );
            }

            if (strlen($encoded) > PREFERENCES_MAX_LENGTH) {
                respond_bad_request(
                    "Preferences are too large",
                    ERROR_BODY_INVALID
                );
            }

            db_preferences_set($author, $encoded);
            respond_no_content();
        }

    } else if ($ctx->request_method == "DELETE") {

        db_preferences_delete($author);
        respond_no_content();

    } else if ($ctx->request_method == "GET") {

        $preferences = db_preferences_fetch($author);

        if ($preferences === false) {
            $preferences = [];
        } else {
            $preferences = json_decode($preferences, true);
        }

        respond_ok(
            array(
                "preferences"=>$preferences
            )
        );
    }
}

function r_employee_globalsettings(RequestContext $ctx, string $args) {
    
    if ($ctx->request_method == "PUT") {
        $ctx->body_require_fields_as_types([
            "avatarsEnabled"=>"integer",
            "tagsEnabled"=>"integer",
            "postsEnabled"=>"integer",
        ]);
        db_global_settings_set(
            $ctx->request_body["avatarsEnabled"],
            $ctx->request_body["postsEnabled"],
            $ctx->request_body["tagsEnabled"]
        );
        respond_no_content();
    } else if ($ctx->request_method == "GET") {
        $settings = db_global_settings_get();
        respond_ok(
            array(
                "settings"=>$settings
            )
        );
    }


}

register_route(new Route(["GET"], "/notifications", "r_employee_notifications", 1));
register_route(new Route(["GET", "PUT", "DELETE"], "/preferences", "r_employee_preferences", 1));
register_route(new Route(["GET", "PUT"], "/globalsettings", "r_employee_globalsettings", 1));


contextual_run();
?>