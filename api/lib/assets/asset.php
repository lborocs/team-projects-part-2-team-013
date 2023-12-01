<?php
require("gcp.php");
require("lib/database.php");

enum ASSET_TYPE {
    const USER_AVATAR = 0;
    const POST_MEDIA = 1;
    const PROJECT_ICON = 2;
}


class Asset {
    public string $asset_id;
    public string $owner_id;
    public ASSET_TYPE $type;

    public static function create() {}

    public static function from_db() {}

    function __construct() {
        
    }

    public function delete() {}


}

?>