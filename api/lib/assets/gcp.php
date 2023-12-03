<?php
require("vendor/autoload.php");
require_once("secrets.php");
require_once("lib/const.php");

use Google\Cloud\Storage\StorageClient;
use Google\Cloud\Core\Exception\ServiceException;

const STORAGE_CLIENT = new StorageClient([
    "keyFile" => GCP_CREDENTIALS_OBJECT,
]);

$bucket = STORAGE_CLIENT->bucket(GOOGLE_ASSET_BUCKET_NAME);



function upload_file(Asset $asset, $file, string $content_type) {
    global $bucket;

    try {
        $bucket->upload($file, [
            "name" => $asset->implode_path(),
            "metadata" => [
                "contentType" => $content_type
            ]
        ]);
    } catch (ServiceException $e) {
        error_log($e);
        return false;
    }
    return true;
}

function delete_file(Asset $asset) {
    global $bucket;
    try {
        $bucket->object($asset->implode_path())->delete();
    } catch (ServiceException $e) {
        error_log($e);
        return false;
    }
    return true;
}



?>