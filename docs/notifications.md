# Notifications
notifications have different bodies based on the type

the standard notification body is as follows:
```jsonc
{
    "eventID":"uuid",
    "type":POST_TYPE,
    "body":Union(POST_TYPES)
}
```

the type field determines the content of the body object based on the following types

### 0 - POST_UPDATE
dispatched whenever a post a user is subscribed to is edited
```jsonc
{
    "editor":{"empID":"id of who edited the post"},
    "title":"post title",
}
```

### 1 - TASK_UPDATE
dispatched whenever a task concerning a user is changed
```jsonc
{
    "task":{...},
    "detail":TASK_UPDATE_TYPE
}
```

the different types of task edit are
  - 0 - TASK CREATED
  - 1 - TASK EDITED
  - 2 - TASK ASSIGNED TO YOU
  - 3 - TASK UNASSIGNED TO YOU