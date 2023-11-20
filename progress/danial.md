18/10
Created shared excel sheet for overall database schema

22/10:
Worked with Usman to finalise database schema
Created all tables (minus wiki side)
Adjusted Foreign keys, constraints and data types

23/10
Added passwordLastChanged column to ACCOUNTS
Altered Foreign Key (email) in ACCOUNTS to CASCADE on update to prevent update discrepancies
Added Wiki side schema to database scheme excel sheet (without tags)
Implemented wiki table into phpMyAdmin
Altered all date types: DATETIME -> BIGINT

Implemented db_task_change_state
Altered db_task_update to validate input states
Changed TASKS table "madeBy -> createdBy" for consistency