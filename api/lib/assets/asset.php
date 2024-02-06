<?php
require_once("gcp.php");
require_once("lib/common.php");
require_once("lib/database.php");
require_once("lib/assets/validation.php");

enum ASSET_TYPE {
    const USER_AVATAR = 1;
    const POST_MEDIA = 2;
    const PROJECT_ICON = 3;
}

class AssetException extends Exception {
    public function __construct($message, $code) {
        parent::__construct($message, $code);
    }

    public function send_to_client() {
        respond_infrastructure_error($this->message, $this->code);
    }

}

class Asset {

    public string $asset_id;
    public string $bucket_id;
    public string $content_type;
    public int $type;

    // the following function must not end execution when provided a mime
    public static function create($file, int $type, string $bucket_id, string $pre_validated_mime=null) {


        if ($pre_validated_mime !== null) {
            $content_type = $pre_validated_mime;
        } else {
            $content_type = image_validation_and_mime($file, $type);
        }


        $asset_id = bin2hex(generate_uuid());

        $asset = new Asset($type, $bucket_id, $asset_id, $content_type, $type);

        if (upload_file($asset, $file, $content_type)) {


            // then insert it into the database
            if (!db_asset_new($asset_id, $bucket_id, $type, $content_type)) {

                // if we cant insert it into the database, delete it from the cloud
                if (!$asset->delete()) {
                    // if we cant delete it from the cloud, then we have a problem
                    error_log("Failed to delete asset from cloud follwing db insertion error: " . $asset->implode_path());
                    throw new AssetException("Failed to delete asset from cloud following db insertion error", ERROR_CLOUD_UPLOAD_FAILED);
                
                } else {
                    error_log("Failed to insert asset into database - deleted it from the cloud: " . $asset->implode_path());
                    throw new AssetException("Failed to insert asset into database - deleted it from the cloud", ERROR_DB_INSERTION_FAILED);
                }
            }
            return $asset;
        } else {
            throw new AssetException("Failed to upload file to cloud", ERROR_CLOUD_UPLOAD_FAILED);
        }
    }

    public static function from_db(Array $row) {
        return new Asset(
            $row["assetType"],
            $row["bucketID"],
            $row["assetID"],
            $row["contentType"],
        );
    }

    function __construct(int $type, string $bucket_id, string $asset_id, string $content_type) {
        $this->type = $type;
        $this->bucket_id = $bucket_id;
        $this->asset_id = $asset_id;
        $this->content_type = $content_type;
    }

    public function delete() {

        // try to delete from cloud
        if (delete_file($this)) {

            // if we succeed, delete from database
            if (!db_asset_delete($this->asset_id)) {
                error_log("Failed to delete asset from database following cloud deletion: " . $this->implode_path());
                throw new AssetException("Failed to delete asset from database following cloud deletion", ERROR_DB_GENERAL_FAILURE);
            } else {
                return true;
            }
        } else {
            error_log("Failed to delete asset from cloud: " . $this->implode_path());
            throw new AssetException("Failed to delete asset from cloud", ERROR_CLOUD_DELETE_FAILED);
        }
    }

    function type_to_path() {
        switch ($this->type) {
            case ASSET_TYPE::USER_AVATAR:
                return "employees";
            case ASSET_TYPE::POST_MEDIA:
                return "posts";
            case ASSET_TYPE::PROJECT_ICON:
                return "project";
            default:
                return "unknown";
        }
    }

    public function implode_path() {
        return implode("/", [
            $this->type_to_path(),
            $this->bucket_id,
            $this->asset_id . "." . explode("/", $this->content_type)[1] // 2nd part of content type is extension
        ]);
    }

    public static function from_multiple_bytes(Array $files, int $type, string $bucket_id) {

        $types = [];

        foreach ($files as $file) {
            array_push($types, image_validation_and_mime($file, $type));
        }

        $assets = [];

        try {
            foreach ($files as $index => $file) {
                array_push($assets, Asset::create($file, $type, $bucket_id, $types[$index]));
            }
        } catch (AssetException $e) {
            foreach ($assets as $asset) {
                try {$asset->delete();} catch (AssetException $e) {}
            }
            throw $e;
        }
    
        return $assets;
    }

}

?>