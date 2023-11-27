<?php
require("../context.php");

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
        bin2hex(random_bytes(UUID_LENGTH)),
        bin2hex($account["empID"]),
        $account["isManager"] + 1,
        time()
    );
    return $new_session->encrypt();
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
            "session_token"=>$session,
        ));
    } else {
        respond_not_authenticated(
            "Username or password is incorrect",
            ERROR_LOGIN_DETAILS_INCORRECT,
        );
    };
    
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
        respond_ok(array(
            "session_token"=>auth_session_issue_new($ctx->session->hex_associated_user_id),
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

function r_session_otp(RequestContext $ctx, string $args) {
    $ctx->body_require_fields(["password"]);
}

function r_session_account(RequestContext $ctx, string $args) {
    // PATCH to edit the current users account
    if ($ctx->request_method == "PATCH") {
        $ctx->body_require_fields(["password", "otp"]);
    }
    // GET to return the current users account
    else if ($ctx->request_method == "GET") {

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
// not for prototype

function r_session_register(RequestContext $ctx, string $args) {
    $ctx->body_require_fields_as_types([
        "password"=>"string",
        "email"=>"string",
        "lastName"=>"string",
    ]);

    $first_name = $ctx->request_body["firstName"] ?? null;
    
    $emp_id = db_employee_new(
        $first_name,
        $ctx->request_body["lastName"],
    );

    db_account_insert(
        $emp_id,
        $ctx->request_body["email"],
        hash_pass($ctx->request_body["password"]),
    );

    respond_no_content();

};

register_route(new Route(["GET", "POST"], "/register", "r_session_register", 0, ["REQUIRES_BODY"]));


contextual_run();
?>