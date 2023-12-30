# Asset format
example: employee
```json
{
    "empID":"1234",
    "avatar":"asset_id",
}
```

the asset url can be assumed to be https://usercontent.013.team/employee/1234/asset_id
  
  
the general format should be ASSET_PATH + ASSET_TYPE + OWNER_ID + ASSET_ID

assets follow the following restrictions:
- must be between 128x128 and 4096x4096
- icon types must be 4:3 or squarer
- post images aspect ratio must not exceed 1:10
- assets must not exceed 5MB
- assets must be one of the following content types
  - image/png,
  - image/jpeg,
  - image/gif,
  - image/webp,