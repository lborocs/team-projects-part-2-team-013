Written/designed by aidan F223129
# employee

## employee.php

- [x] **/api/employee/employee.php/bulk?ids=id1,id2** (no query params defaults to the logged in user)
  - GET (get all employees)
    
    ```jsonc
    {
      "success": true,
      "data": {
        "requested": 10,
        "found": 8,
        "employees": {
          "id1": {...},
          "id2": {...},
          ...
        }
      }
    }
    ```

- [x] **/api/employee/employee.php/personals**
  - GET (get personal todo list)
    will return everything on the CURRENT users todo list
    ```jsonc
    {
      "success":true,
      "data":{
        "personals":[...]
      }
    }
    ```

- [x] **/api/employee/employee.php/all**
  - GET (get all employees ever)
  ```jsonc
  {
    "success":true,
    "data":{
      "employees":[
        {...}
      ]
    }
  }
  ```

- [ ] **/api/employee/employee.php/personal/:employee_id:/:personal_id:**
  - [ ] GET (Get individual todo list item info)
  - [ ] POST (Create new todo list item)
  - [ ] PATCH (Edit users todolist item)
  - [ ] DELETE (Delete from todolist)

## manager.php
- [x] **/frequentedposts**
  - GET (return most viewed posts)
    ```jsonc
    {
      "success":true,
      "data":[
        {
          "accesses":[
            {"empID":"emp id","postID":"post id", "views":"number"}
          ]
        }
      ]
    }
    ``` 

## session.php
- [x] **/api/employee/session.php/login**
  - [x] POST (log in) {"username":string,"password":string}
    ```jsonc
    {
      "success":true,
      "data":{
        "session_token":"userid.crypto.hash"
      }
    }
    ```
- [x] **/api/employee/session.php/session**
  - [ ] DELETE (logout)
  - [x] GET (get session info)
    ```jsonc
    {
      "success":true,
      "data":{
        "expires": 1522244110,
        "id": "session_id",
        "user": "user_id",
        "auth_level": 1, // 1 employee 2 manager
        "employee": {...}
      }
    }
    ```
  - [ ] PUT (renew session and discard old)
- [ ] **/api/employee/session.php/otp**
  - POST {"password"}
- [ ] **/api/employee/session.php/account**
    - [ ] GET (account info)
    - [ ] PATCH {"password"} (requires otp)
- [ ] **/api/employee/session.php/register**
    - POST (register account)

# project

## task.php
- [x] **/api/project/task.php/tasks/:PROJECT_ID**
    - [x] GET (get all tasks)
      
      will return a body containing an array of tasks, and if the user is a manager, an array of assignments. otherwise it will just return the users tasks.
      ```jsonc
      {
        "success":true,
        "data":{
          "contains_assignments":true,
          "tasks":[...],
          "assignments":[...]
        }
      }
      ```
- [ ] **/api/project/task.php/task/:PROJECT_ID:/:TASK_ID**
  - [x] GET (get task by id)
    ```jsonc
    {
      "success":true,
      "data":{
        "taskID":"task id here",
        "title": "task title here",
        // rest of task object
      }
    }
    ```
  - [ ] PATCH (edit task by id)
  - [x] POST (new task - no task id)
      {"title":string, "description":string?, "state":integer, "dueDate":integer}
  - [ ] DELETE (delete task)

## project.php
- [x] **/api/project/project.php/projects**
    - GET (Get all projects)
      
      will return a body containing an array of projects the user has accesss to (or all for managers)
      ```jsonc
      {
        "success":true,
        "data":{
          "projects":[...]
        }
      }
      ```
- [ ] **/api/project/project.php/project/:PROJECT_ID**
    - [x] GET (get individual project)
      ```jsonc
      {
        "success":true,
        "data":{
          "projID":"project id here",
          "description": "project desc here",
          // rest of project object
        }
      }
    - [ ] PATCH (edit project)
    - [ ] POST (new project - no id)
    - [ ] DELETE (delete project)

# wiki
## post.php
- [x] **/api/forum/post.php/posts**
  - GET (get all posts)
    will return a body containing a list of posts
    ```jsonc
    {
      "success": true,
      "data": {
        "posts": [...] // no content in post object
      }
    }
    ```
- [ ] **/api/forum/post.php/post/:POST_ID:**
  - [x] GET (get individual post)
    ```jsonc
    {
      "success":true,
      "data":{
        "title":"post title here",
        "createdBy": "createdby user_id here",
        // rest of post object
      }
    }
    ```
  - [ ] PATCH (modify post)
  - [ ] DELETE (delete post)
  - [x] POST (new post) {"title":string, "isTechnical":int(0/1), "content":string}