<?php
require_once("lib/assets/asset.php");
require_once("lib/database.php");
$asset = Asset::create(file_get_contents("https://i.pinimg.com/564x/a3/d5/e9/a3d5e93f5ab1980af4705c080f7c6f26.jpg"), ASSET_TYPE::USER_AVATAR, "1111");


phpinfo();
?>