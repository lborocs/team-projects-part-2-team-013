<?php
require_once("lib/const.php");

function image_validation_and_mime($bytestream) {
    $finfo = new finfo();
    $info = $finfo->buffer($bytestream, FILEINFO_MIME_TYPE);
    
    [$mime, $extension] = explode("/", $info);

    if ($mime != "image") {
        respond_bad_request("Unsupported mime type: " . $info, ERROR_UNSUPPORTED_MIME_TYPE);
    }
    return $info;
}

?>