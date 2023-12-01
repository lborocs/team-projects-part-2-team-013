<?php
require("vendor/autoload.php");
require("secrets.php");
require("lib/consts.php");

use Google\Cloud\Storage\StorageClient;

const STORAGE_CLIENT = new StorageClient([
    "credentials" => GCP_CREDENTIALS_OBJECT,
]);

$bucket = STORAGE_CLIENT->bucket(GOOGLE_ASSET_BUCKET_NAME);



function upload_file(Asset $asset) {
    
}

function delete_file(Asset $asset) {
    
}



?>