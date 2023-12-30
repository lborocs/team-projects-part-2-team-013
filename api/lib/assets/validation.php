<?php
require_once("lib/const.php");

const ASSET_VALID_CONTENT_TYPES = [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
];

const ASSET_MAX_SIZE = 1024 * 1024 * 5; // 5MB

const ASSET_MAX_DIMENSIONS = 4096;
const ASSET_MIN_DIMENSIONS = 128;
const ASSET_ICON_MAX_ASPECT_RATIO = 4/3;
const ASSET_ICON_MIN_ASPECT_RATIO = 3/4;
const ASSET_MAX_ASPECT_RATIO = 10/1;
const ASSET_MIN_ASPECT_RATIO = 1/10;

function image_validation_and_mime($bytestream, int $type) {

    if (strlen($bytestream) > ASSET_MAX_SIZE) {
        respond_bad_request(
            "File too large",
            ERROR_ASSET_FILE_SIZE_TOO_LARGE
        );
    }

    $finfo = new finfo();
    $info = $finfo->buffer($bytestream, FILEINFO_MIME_TYPE);
    
    [$mime, $extension] = explode("/", $info);

    if ($mime != "image") {
        respond_bad_request("Unsupported mime type: " . $info, ERROR_UNSUPPORTED_MIME_TYPE);
    }

    if (!in_array($info, ASSET_VALID_CONTENT_TYPES)) {
        respond_bad_request("Unsupported image type: " . $info, ERROR_UNSUPPORTED_MIME_TYPE);
    }

    $dimensions = getimagesizefromstring($bytestream);

    if ($dimensions === false) {
        respond_bad_request("Failed to get image dimensions", ERROR_BODY_FIELD_INVALID_DATA);
    }

    [$width, $height] = $dimensions;
    
    if ($width >ASSET_MAX_DIMENSIONS || $height >ASSET_MAX_DIMENSIONS) {
        respond_bad_request("Image dimensions too large", ERROR_ASSET_DIMENSIONS_TOO_LARGE);
    }

    if ($width < ASSET_MIN_DIMENSIONS || $height < ASSET_MIN_DIMENSIONS) {
        respond_bad_request("Image dimensions too small", ERROR_ASSET_DIMENSIONS_TOO_SMALL);
    }

    $provided_ratio = $width / $height;
    if ($type == ASSET_TYPE::PROJECT_ICON || $type == ASSET_TYPE::USER_AVATAR) {
        if ($provided_ratio > ASSET_ICON_MAX_ASPECT_RATIO || $provided_ratio < ASSET_ICON_MIN_ASPECT_RATIO) {
            respond_bad_request("Image aspect ratio must be 4:3 (3:4) or squarer", ERROR_ASSET_BAD_ASPECT_RATIO);
        }
    } else {
        if ($provided_ratio > ASSET_MAX_ASPECT_RATIO || $provided_ratio < ASSET_MIN_ASPECT_RATIO) {
            respond_bad_request("Image aspect ratio must be less than 10:1 (1:10)", ERROR_ASSET_BAD_ASPECT_RATIO);
        }
    }

    return $info;
}

?>