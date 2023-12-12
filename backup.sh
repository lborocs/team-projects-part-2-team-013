#!/bin/bash
TIME=`date +%Y-%m-%d--%H-%M-%S`
echo "Backup started at $TIME"
sudo mariadb-dump prod > dumps/$TIME.sql
echo "Uploading backup to GCP"
gsutil cp dumps/$TIME.sql gs://backups.013.team/
TIME=`date +%Y-%m-%d--%H-%M-%S`
echo "Backup completed at $TIME"
