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

class Asset {

    public string $asset_id;
    public string $owner_id;
    public string $content_type;
    public int $type;

    public static function create($file, int $type, string $owner_id) {


        $content_type = image_validation_and_mime($file);


        $asset_id = bin2hex(random_bytes(16));

        $asset = new Asset($type, $owner_id, $asset_id, $content_type, $type);

        if (upload_file($asset, $file, $content_type)) {


            // then insert it into the database
            if (!db_asset_new($asset_id, $owner_id, $type, $content_type)) {

                // if we cant insert it into the database, delete it from the cloud
                if (!$asset->delete()) {
                    // if we cant delete it from the cloud, then we have a problem
                    error_log("Failed to delete asset from cloud follwing db insertion error: " . $asset->implode_path());
                    respond_infrastructure_error("Failed to delete asset from cloud following db insertion error", ERROR_CLOUD_UPLOAD_FAILED);
                
                } else {
                    error_log("Failed to insert asset into database - deleted it from the cloud: " . $asset->implode_path());
                    respond_database_failure(true);
                }
            }
            return $asset;
        } else {
            respond_infrastructure_error("Failed to upload file to cloud", ERROR_CLOUD_UPLOAD_FAILED);
        }
    }

    public static function from_db(Array $row) {
        return new Asset(
            $row["type"],
            $row["owner_id"],
            $row["asset_id"],
            $row["content_type"],
            $row["type"]
        );
    }

    function __construct(int $type, string $owner_id, string $asset_id, string $content_type, int $asset_type) {
        $this->type = $type;
        $this->owner_id = $owner_id;
        $this->asset_id = $asset_id;
        $this->content_type = $content_type;
        $this->type = $asset_type;
    }

    public function delete() {

        // try to delete from cloud
        if (delete_file($this)) {

            // if we succeed, delete from database
            if (!db_asset_delete($this->asset_id)) {
                error_log("Failed to delete asset from database following cloud deletion: " . $this->implode_path());
                respond_database_failure(false);
            } else {
                return true;
            }
        } else {
            error_log("Failed to delete asset from cloud: " . $this->implode_path());
            respond_infrastructure_error("Failed to delete asset from cloud", ERROR_CLOUD_DELETE_FAILED);
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
            $this->owner_id,
            $this->asset_id . "." . explode("/", $this->content_type)[1] // 2nd part of content type is extension
        ]);
    }

}

?>