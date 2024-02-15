<?php
require_once("secrets.php");
require_once("lib/http/client.php");



function crypto_encrypt_bytestream(
    string $bytes,
    string $encryption_key,
    string $encryption_algo,
    string $hmac_key,
    string $hmac_algo,
    ) {
    $iv = random_bytes(16);

    $encrypted_data = openssl_encrypt(
        $bytes,
        $encryption_algo,
        hex2bin($encryption_key),
        0,
        $iv
    );

    if ($encrypted_data == false) {
        respond_internal_error(ERROR_CRYPTO_FAILURE);
    }

    $payload = bin2hex($iv) . '-' . $encrypted_data;

    $hmac = hash_hmac($hmac_algo, $payload, hex2bin($hmac_key));

    return $hmac . '.' . $payload;

}

function crypto_decrypt_bytestream(
    string $bytearray,
    string $encryption_key,
    string $encryption_algo,
    string $hmac_key,
    string $hmac_algo,
) {

    $split_data = explode(".", $bytearray, 2);

    if (count($split_data) != 2) {
        respond_session_tampering();
    }

    list($hmac, $payload) = $split_data;
    $split_payload = explode("-", $payload);

    if (count($split_payload) !=2) {
        respond_session_tampering();
    }

    list($iv, $encrypted_data) = $split_payload;


    if (!hash_equals($hmac, hash_hmac($hmac_algo, $payload, hex2bin($hmac_key)))) {
        respond_session_tampering();
    }
    // hmac checks out so now we can decrypt
    $bytearray = openssl_decrypt($encrypted_data, $encryption_algo, hex2bin($encryption_key), 0, hex2bin($iv));

    if ($bytearray == false) {
        respond_internal_error(ERROR_CRYPTO_FAILURE);
    }

    return $bytearray;

}


class Session {
    public string $hex_id;
    public string $hex_associated_user_id;
    public int $issued;
    public int $auth_level;
    public int $generation;

    function to_unencrypted_bytes() {
        return pack(
            "a16a16Qcc",
            hex2bin($this->hex_id),
            hex2bin($this->hex_associated_user_id),
            $this->issued,
            $this->auth_level,
            $this->generation,
        );
    }


    static function from_unencrypted_bytes(string $bytearray) {

        $data = @unpack("a16s_id/a16u_id/Qissued/cauth/cgeneration", $bytearray);

        if ($data == false) {
            respond_internal_error(ERROR_SESSION_CANT_UNPACK);
        }

        return new Session (
            bin2hex($data["s_id"]),
            bin2hex($data["u_id"]),
            $data["auth"],
            $data["issued"],
            $data["generation"]
        );
    }

    function encrypt() {
        // encrypted format = user_id.hmac.iv-encrypted_session
        // the hmac is over the iv and encrypted session

        $encrypted = crypto_encrypt_bytestream(
            $this->to_unencrypted_bytes(),
            SESSION_ENCRYPTION_KEY_HEX,
            SESSION_ENCRYPTION_ALGO,
            SESSION_SIGNING_KEY_HEX,
            SESSION_SIGNING_ALGO
        );
    
        return $this->hex_associated_user_id . '.' . $encrypted;
    }

    static function decrypt(string $token) {
        $split_data = explode(".", $token, 2);

        if (count($split_data) != 2) {
            respond_session_tampering();
        }

        list($user_id, $encrypted_bytes) = $split_data;

        $bytearray = crypto_decrypt_bytestream(
            $encrypted_bytes,
            SESSION_ENCRYPTION_KEY_HEX,
            SESSION_ENCRYPTION_ALGO,
            SESSION_SIGNING_KEY_HEX,
            SESSION_SIGNING_ALGO
        );


        $session = Session::from_unencrypted_bytes($bytearray);

        // this should NOT happen ever.
        if ($session->hex_associated_user_id != $user_id) {
            respond_session_tampering();
        }

        return $session;
    }

    function __construct(string $hex_id, string $hex_associated_user_id, int $auth_level, int $issued, int $generation) {
        $this->hex_id = $hex_id;
        $this->hex_associated_user_id = $hex_associated_user_id;
        $this->auth_level = $auth_level;
        $this->issued = $issued;
        $this->generation = $generation;
    }

    function ensure_still_valid() {
        if (($this->issued + SESSION_INACTIVITY_EPOCH) <= timestamp()) {
            respond_not_authenticated("Session has expired", ERROR_SESSION_EXPIRED);
        }

        $before = microtime(true);

        if (!auth_session_account_check($this->hex_id, $this->hex_associated_user_id, $this->issued)) {
            respond_not_authenticated("Session has been revoked", ERROR_SESSION_REVOKED);
        }

        $duration = microtime(true) - $before;

        header("X-Session-Validation-Time: " . $duration);

    }

    function yank() {
        auth_invalidate_session($this->hex_id);
    }
};

function auth_session_account_check($session, $account, $issued) {
    $request = http_request("GET", SESSION_VALIDATION_BASE . "check/" . $session . "/" . $account);

    if ($request->failed) {
        respond_infrastructure_error("Session validation server is down : " . $request->error, ERROR_SESSION_VALIDATION_SERVER_DOWN);
    }

    $body = $request->body;
    $status_code = $request->status_code;
    // 204 means session has been yanked
    if ($status_code == 204) {
        return false;
    }
    // 200 means account was yanked at some point
    else if ($status_code == 200) {

        // if the session was issued before the yank then it is invalid
        if ($issued <= ($body+0)) { // crude type conversion
            return false;
        }
    }
    else if ($status_code != 404) {
        respond_infrastructure_error("Session validation server unhandled error (". $status_code . ")", ERROR_SESSION_VALIDATION_SERVER_DOWN);
    }
    return true;
}


function auth_invalidate_session($session_id) {
    $req = http_request("POST", SESSION_VALIDATION_BASE . "set/session/" . $session_id);


    if ($req->failed) {
        error_log("Session validation server is down : " . $req->error);
    }

    if ($req->status_code != 200) {
        error_log("Session validation server unhandled error during yank (". $req->status_code . ")");
    }
}

function auth_invalidate_account($account_id) {
    $req = http_request("POST", SESSION_VALIDATION_BASE . "set/account/" . $account_id);

    if ($req->failed) {
        error_log("Session validation server is down : " . $req->error);
    }

    if ($req->status_code != 200) {
        error_log("Session validation server unhandled error account invalidate (". $req->status_code . ")");
    }
}

function auth_password_reset_create_token(string $emp_id) {

    $token_id = random_bytes(UUID_LENGTH);
    $issued = timestamp();

    $plaintext = pack("a16a16Q", $token_id, hex2bin($emp_id), $issued);

    $ciphertext = crypto_encrypt_bytestream(
        $plaintext,
        PASSWORD_RESET_ENCRYPTION_KEY_HEX,
        PASSWORD_RESET_ENCRYPTION_ALGO,
        PASSWORD_RESET_SIGNING_KEY_HEX,
        PASSWORD_RESET_SIGNING_ALGO
    );
    
    return $ciphertext;

}

function auth_password_burn_token(string $token) {
    $validated = auth_password_validate_token($token);
    $token_id = $validated["token_id"];
    $account_id = $validated["emp_id"];
    auth_invalidate_session($token_id);
    auth_invalidate_account($account_id);
    return $validated;
}

function auth_password_validate_token(string $token) {

    $plaintext = crypto_decrypt_bytestream(
        $token,
        PASSWORD_RESET_ENCRYPTION_KEY_HEX,
        PASSWORD_RESET_ENCRYPTION_ALGO,
        PASSWORD_RESET_SIGNING_KEY_HEX,
        PASSWORD_RESET_SIGNING_ALGO
    );

    $data = @unpack("a16token_id/a16emp_id/Qissued", $plaintext);

    if ($data == false) {
        respond_internal_error(ERROR_CRYPTO_FAILURE);
    }
    $token_id = bin2hex($data["token_id"]);
    $emp_id = bin2hex($data["emp_id"]);
    $issued = $data["issued"];

    if ($issued + PASSWORD_RESET_TIMEOUT <= timestamp()) {
        respond_not_authenticated("Password reset token has expired", ERROR_INSUFFICIENT_AUTHORIZATION);
    }

    if (!auth_session_account_check($token_id, $emp_id, $issued)) {
        respond_not_authenticated("Password reset token has been revoked", ERROR_INSUFFICIENT_AUTHORIZATION);
    }

    return [
        "token_id" => $token_id,
        "emp_id" => $emp_id,
        "issued" => $issued
    ];
}

?>