<?php
require_once("secrets.php");
require_once("lib/http/client.php");


class Session {
    public string $hex_id;
    public string $hex_associated_user_id;
    public int $issued;
    public int $auth_level;

    function to_unencrypted_bytes() {
        return pack("a16a16Qc", hex2bin($this->hex_id), hex2bin($this->hex_associated_user_id), $this->issued, $this->auth_level);
    }


    static function from_unencrypted_bytes(string $bytearray) {

        $data = @unpack("a16s_id/a16u_id/Qissued/cauth", $bytearray);

        if ($data == false) {
            respond_internal_error(ERROR_SESSION_CANT_UNPACK);
        }

        return new Session (
            bin2hex($data["s_id"]),
            bin2hex($data["u_id"]),
            $data["auth"],
            $data["issued"]
        );
    }

    function encrypt() {
        // encrypted format = user_id.hmac.iv-encrypted_session
        // the hmac is over the iv and encrypted session

        $iv = random_bytes(16);

        $encrypted_data = openssl_encrypt(
            $this->to_unencrypted_bytes(),
            SESSION_ENCRYPTION_ALGO,
            hex2bin(SESSION_ENCRYPTION_KEY_HEX),
            0,
            $iv
        );

        if ($encrypted_data == false) {
            respond_internal_error(ERROR_SESSION_ENCRYPTION_FAILED);
        }

        $payload = bin2hex($iv) . '-' . $encrypted_data;
    
        $hmac = hash_hmac(SESSION_HMAC_ALGO, $payload, hex2bin(SESSION_HMAC_KEY_HEX));
    
        return $this->hex_associated_user_id . '.' . $hmac . '.' . $payload;
    }

    static function decrypt(string $token) {
        $split_data = explode(".", $token);

        if (count($split_data) != 3) {
            respond_session_tampering();
        }

        list($user_id, $hmac, $payload) = $split_data;
        $split_payload = explode("-", $payload);

        if (count($split_payload) !=2) {
            respond_session_tampering();
        }

        list($iv, $encrypted_data) = $split_payload;
        


        if (!hash_equals($hmac, hash_hmac(SESSION_HMAC_ALGO, $payload, hex2bin(SESSION_HMAC_KEY_HEX)))) {
            respond_session_tampering();
        }
        // hmac checks out so now we can decrypt
        $bytearray = openssl_decrypt($encrypted_data, SESSION_ENCRYPTION_ALGO, hex2bin(SESSION_ENCRYPTION_KEY_HEX), 0, hex2bin($iv));

        if ($bytearray == false) {
            respond_internal_error(ERROR_SESSION_DECRYPTION_FAILED);
        }


        $session = Session::from_unencrypted_bytes($bytearray);

        // this should NOT happen ever.
        if ($session->hex_associated_user_id != $user_id) {
            respond_session_tampering();
        }
        return $session;
    }

    function __construct(string $hex_id, string $hex_associated_user_id, int $auth_level, int $issued) {
        $this->hex_id = $hex_id;
        $this->hex_associated_user_id = $hex_associated_user_id;
        $this->auth_level = $auth_level;
        $this->issued = $issued;
    }

    function ensure_still_valid() {
        if (($this->issued + SESSION_INACTIVITY_EPOCH) <= timestamp()) {
            respond_not_authenticated("Session has expired", ERROR_SESSION_EXPIRED);
        }

        $before = microtime(true);

        $request = http_request("GET", SESSION_VALIDATION_BASE . "check/" . $this->hex_id . "/" . $this->hex_associated_user_id);

        if ($request->failed) {
            respond_infrastructure_error("Session validation server is down : " . $request->error, ERROR_SESSION_VALIDATION_SERVER_DOWN);
        }

        $body = $request->body;
        $status_code = $request->status_code;
        // 204 means session has been yanked
        if ($status_code == 204) {
            respond_not_authenticated("Session has been revoked", ERROR_SESSION_REVOKED);
        }
        // 200 means account was yanked at some point
        else if ($status_code == 200) {

            // if the session was issued before the yank then it is invalid
            if ($this->issued <= ($body+0)) { // crude type conversion
                respond_not_authenticated("Session has been revoked", ERROR_SESSION_REVOKED);
            }
        }
        else if ($status_code != 404) {
            respond_infrastructure_error("Session validation server unhandled error (". $status_code . ")", ERROR_SESSION_VALIDATION_SERVER_DOWN);
        }
        $duration = microtime(true) - $before;

        header("X-Session-Validation-Time: " . $duration);

    }

    function yank() {
        auth_invalidate_session($this->hex_id);
    }
};

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

function auth_signup_validate_token(string $token) {
    respond_not_implemented();
}

function auth_signup_create_token(string $email) {
    // requires email is a real email and doesnt exist
    $email = strtolower($email);
    


    respond_not_implemented();
}

?>