<?php
require("lib/context.php");

function hash_pass(string $password) {
    return password_hash(
        $password,
        PASSWORD_BCRYPT,
        ["cost"=>PASSWORD_HASHING_COST]
    );
}

function auth_session_issue_new($account) {
    // id must be 32bits for serialisation
    $new_session = new Session(
        bin2hex(generate_uuid()),
        $account["empID"],
        $account["isManager"] + 1,
        timestamp()
    );
    return $new_session;
}

function validate_password_constraints(string $password, Array $banned_words) {
    if (ACCOUNT_PASSWORD_MIN_LENGTH > strlen($password) || strlen($password) > ACCOUNT_PASSWORD_MAX_LENGTH) {
        respond_bad_request(
            "Expected password to be between ". ACCOUNT_PASSWORD_MIN_LENGTH ." and ". ACCOUNT_PASSWORD_MAX_LENGTH ." bytes",
            ERROR_BODY_FIELD_INVALID_DATA
        );
    }

    if (strtoupper($password) == $password || strtolower($password) == $password) {
        respond_bad_request(
            "Expected password to contain at least one uppercase and lowercase letter",
            ERROR_BODY_FIELD_INVALID_DATA
        );
    }

    if (!preg_match("/[0-9]/", $password)) {
        respond_bad_request(
            "Expected password to contain at least one number",
            ERROR_BODY_FIELD_INVALID_DATA
        );
    }

    if (!preg_match(PASSWORD_SPECIAL_CHARS_REGEX, $password)) {
        respond_bad_request(
            "Expected password to contain at least one special character",
            ERROR_BODY_FIELD_INVALID_DATA
        );
    }

    $_lower_password = strtolower($password);
    foreach ($banned_words as $banned_word) {
        if (strpos($_lower_password, strtolower($banned_word)) !== false) {
            respond_bad_request(
                "Expected password to not contain any banned words (". $banned_word .")",
                ERROR_BODY_FIELD_INVALID_DATA
            );
        }
    }
    unset($_lower_password);

}

function r_session_login(RequestContext $ctx, string $args) {
    $ctx->body_require_fields_as_types(
        [
            "username"=>"string",
            "password"=>"string"
        ]
    );

    $username = $ctx->request_body["username"];
    $password = $ctx->request_body["password"];


    $account = db_account_fetch($username);

    if ($account == false) {
        hash_pass($password);
        respond_not_authenticated(
            "Username or password is incorrect",
            ERROR_LOGIN_DETAILS_INCORRECT
        );
    }

    if (password_verify($password, $account["passwordHash"])) {
        $session = auth_session_issue_new($account);
        respond_ok(Array(
            "session_token"=>$session->encrypt(),
            "expires"=>$session->issued + SESSION_INACTIVITY_EPOCH,
        ));
    } else {
        respond_not_authenticated(
            "Username or password is incorrect",
            ERROR_LOGIN_DETAILS_INCORRECT,
        );
    };
    
};

function r_session_register(RequestContext $ctx, string $args) {
    $ctx->body_require_fields_as_types([
        "password"=>"string",
        "email"=>"string",
        "lastName"=>"string",
        "token"=>"string",
    ]);

    $first_name = $ctx->request_body["firstName"] ?? null;
    $last_name = $ctx->request_body["lastName"];
    $email = $ctx->request_body["email"];
    $password = $ctx->request_body["password"];

    if (array_key_exists("firstName", $ctx->request_body) && gettype($first_name) != "string") {
        respond_bad_request(
            "Expected field firstName to be a string",
            ERROR_BODY_FIELD_INVALID_TYPE
        );
    }

    // input validation

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond_bad_request(
            "Expected field email to be a valid email",
            ERROR_BODY_FIELD_INVALID_TYPE
        );
    }

    $banned_words = array_merge(PASSWORD_BANNED_PHRASES, [$first_name, $last_name, explode($email, "@")[0]]);
    validate_password_constraints($password, $banned_words);
    
    // check token
    // if (strtolower($email) !== auth_signup_validate_token($ctx->request_body["token"])) {
    //     respond_not_authenticated(
    //         "Signup token is not valid",
    //         ERROR_SIGNUP_TOKEN_INVALID
    //     );
    // }

    // insertion

    // here we are safe to check if the account already exists as we have validated the token
    // and know the user is signing up with the correct email
    if (db_account_fetch($email)) {
        respond_bad_request(
            "An account with that email already exists",
            ERROR_ACCOUNT_ALREADY_EXISTS
        );
    }

    $emp_id = db_employee_new(
        $first_name,
        $last_name,
    );

    db_account_insert(
        $emp_id,
        $email,
        hash_pass($password),
    );

    respond_ok(Array(
        "empID"=>$emp_id,
    ));

};


function r_session_session(RequestContext $ctx, string $args) {
    if ($ctx->request_method == "GET") {
        respond_ok(Array(
            "expires"=>$ctx->session->issued + SESSION_INACTIVITY_EPOCH,
            "id"=>$ctx->session->hex_id,
            "auth_level"=>$ctx->session->auth_level,
            "employee" => db_employee_fetch($ctx->session->hex_associated_user_id)
        ));   
    } else if ($ctx->request_method == "PUT") {
        $ctx->session->yank();

        $account = db_account_fetch_by_id($ctx->session->hex_associated_user_id);

        $session = auth_session_issue_new($account);

        respond_ok(array(
            "session_token"=>$session->encrypt(),
        ));
    }
    else if ($ctx->request_method == "DELETE") {
        $ctx->session->yank();
        respond_no_content();
    }
    else {
        respond_not_implemented();
    }
    
    
};

function r_session_account(RequestContext $ctx, string $args) {
    // PATCH to edit the current users account

    $account = db_account_fetch_by_id($ctx->session->hex_associated_user_id);

    if ($ctx->request_method == "PATCH") {
        $ctx->body_require_fields_as_types([
            "password"=>"string",
            "newPassword"=>"string",
        ]);

        $password = $ctx->request_body["password"];
        $new_password = $ctx->request_body["newPassword"];

        $employee = db_employee_fetch($account["empID"]);

        $banned_words = array_merge(PASSWORD_BANNED_PHRASES, [$employee["firstName"], $employee["lastName"], explode($account["email"], "@")[0]]);
        validate_password_constraints($new_password, $banned_words);

        if (!password_verify($password, $account["passwordHash"])) {
            respond_bad_request(
                "Password is incorrect",
                ERROR_LOGIN_DETAILS_INCORRECT
            );
        }


        db_account_password_change(
            $ctx->session->hex_associated_user_id,
            hash_pass($new_password)
        );

        auth_invalidate_account($ctx->session->hex_associated_user_id);
        respond_no_content();
        
    }
    // GET to return the current users account
    else if ($ctx->request_method == "GET") {
        respond_ok(array(
            "email"=>$account["email"],
            "empID"=>$account["empID"],
            "passwordLastChanged"=>$account["passwordLastChanged"],
            "createdAt"=>$account["createdAt"],
        ));
    } 
}

function r_session_204(RequestContext $ctx, string $args) {
    respond_no_content();
}

register_route(new Route(["POST"], "/login", "r_session_login", 0, ["REQUIRES_BODY"]));
register_route(new Route(["DELETE", "GET", "PUT"], "/session", "r_session_session", 1));
register_route(new Route(["POST"], "/otp", "r_session_otp", 1, ["REQUIRES_BODY"]));
register_route(new Route(["PATCH", "GET"], "/account", "r_session_account", 1, ["REQUIRES_BODY"]));
register_route(new Route(["GET"], "/generate_204", "r_session_204", 0, []));
register_route(new Route(["GET", "POST"], "/register", "r_session_register", 0, ["REQUIRES_BODY"]));


contextual_run();
?>