<?php

class HTTPResponse {
    public int $status_code;
    public bool $failed = false;
    public ?string $body = null;
    public ?string $error = null;

    function __construct(int $status_code, string $body, ?string $error) {
        $this->status_code = $status_code;

        if (strlen($body) > 0) {
            $this->body = $body;
        } else if ($body === false) {
            $this->failed = true;
            $this->error = $error;
        }
    }
}



function http_request(string $method, string $url, array $headers = [], ?string $body = null) {
    $handle = curl_init();

    curl_setopt($handle, CURLOPT_URL, $url);
    curl_setopt($handle, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($handle, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($handle, CURLOPT_HTTPHEADER, $headers);

    if (!is_null($body)) {
        curl_setopt($handle, CURLOPT_POSTFIELDS, $body);
    }

    $body = curl_exec($handle);

    $status_code = curl_getinfo($handle, CURLINFO_HTTP_CODE);

    if ($body === false) {
        $error = curl_error($handle);
    } else {
        $error = null;
    }

    curl_close($handle);

    return new HTTPResponse($status_code, $body, $error);
}


?>