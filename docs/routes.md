Written/designed by aidan F223129
# employee

## employee.php

- [ ] **/employee/employee.php/employee/:EMP_ID:** (replace emp_id with @me for self)
  - [x] GET (get employee)
  - [x] PATCH (edit employee)
    ```jsonc
      {
        "firstname":"new fname",
        "lastName": "new lname",
        "avatar":"base64 avatar bytes",
        "isManager":0, // manager only
      }


- [x] **/employee/employee.php/bulk?ids=id1,id2** (no query params defaults to the logged in user)
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

- [x] **/employee/employee.php/all?q=search_query**
  - GET (searches employees)
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

- [x] **/employee/employee.php/personals**
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

- [x] **/employee/employee.php/personal/:employee_id:/:personal_id:**
  - [x] GET (Get individual todo list item info)
  - [x] POST (Create new todo list item)
  - [x] PATCH (Edit users todolist item)
  - [x] DELETE (Delete from todolist)

## manager.php
- [x] **/frequentedposts**
  - GET (return most viewed posts)
    ```jsonc
    {
      "success":true,
      "data":[
        {
          "posts":[
            {"empID":"emp id","postID":"post id", "views":"number"}
          ]
        }
      ]
    }
    ``` 
- [x] **/frequentedtags**
  - GET (return most viewed tags)
    ```jsonc
    {
      "success":true,
      "data":[
        {
          "tags":[
            {"tagID":"tagid here","tagName":"tag name here", "views":"number"}
          ]
        }
      ]
    }
    ``` 

## session.php

- [x] **/employee/session.php/resetpassword**
  - [x] PATCH {"newPassword":string, "token":string} (change password with token)
  - [x] POST {"email":string} (send password reset email)
  - [x] PUT {"token":string} (get employee object from token) 


- [x] **/employee/session.php/login**
  - [x] POST (log in) {"username":string,"password":string}
    ```jsonc
    {
      "success":true,
      "data":{
        "session_token":"userid.crypto.hash"
      }
    }
    ```

- [x] **/employee/session.php/logoutall**
  - POST (log out all active sessions)

- [x] **/employee/session.php/session**
  - [x] DELETE (logout)
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
  - [x] PUT (renew session and discard old)

- [x] **/employee/session.php/account**
    - [x] GET (account info)
      ```jsonc
      {
        "success": true,
        "data": {
          "email": "employee email",
          "empID": "employee id",
          // timestamps in microseconds
          "passwordLastChanged": 1703029106,
          "createdAt": 1698417895
        },
      }
      ```
    - [x] PATCH {"password":string, "newPassword":string}

- [x] **/employee/session.php/register**
    - POST (register account) {firstName:?string, lastName:string, password:string, email:string, token:string}

## meta.php

- [x] **/employee/meta.php/notifications**
  - GET get all notifications (defined in notifications.md)

- [x] **/employee/meta.php/preferences**
  - [x] GET get preferences
    ```jsonc
    {
      "success":true,
      "data":{
        "preferences":{
          // preferences object
        }
      }
    }
    ```
  - [x] PUT overwrite preferences {"preferences":{...}}
  - [x] DELETE reset preferences to default
# project

## task.php
- [x] **/project/task.php/tasks/:PROJECT_ID**
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

- [x] **/project/task.php/task/:PROJECT_ID:/:TASK_ID**
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
  - [x] PATCH (edit task by id)
  - [x] POST (new task - no task id)
      {"title":string, "description":string?, "state":integer, "dueDate":integer}
  - [x] DELETE (delete task)

- [x] **/project/task.php/assignments/:PROJECT_ID:/:TASK_ID:**
  - [x] GET (get assignments for a task)
  - [x] PUT (overwrite task assignments) {assignments:[empid1, empid2]}
    ```jsonc
    {
      "success":true,
      "data":{
        "assigned":[...],
        "unassigned":[...]
      }
    }
    ```

## project.php
- [x] **/project/project.php/projects?q=search_term**
    - GET (Get all projects)
      
      will return a body containing an array of projects the user has accesss to (or all for managers)
      it is filtered down with the search term where the project contains that term.
      ```jsonc
      {
        "success":true,
        "data":{
          "projects":[...]
        }
      }
      ```

- [ ] **/project/project.php/project/:PROJECT_ID**
    - [x] GET (get individual project)
      ```jsonc
      {
        "success":true,
        "data":{
          "projID":"project id here",
          "description": "project desc here",
          // rest of project object
        }
      }```
    - [x] PATCH (edit project)
    - [x] POST (new project - no id)
    - [ ] DELETE (delete project)

# wiki
## post.php
- [x] **/wiki/post.php/posts?q=search_term&tags=tagid1,tagid2**
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

- [ ] **/wiki/post.php/post/:POST_ID:**
  - [x] PUT /post/:POST_ID:/tags
    manages tags for a post {tags:[tagid1,tagid2]}

  - [x] GET (get individual post)
    ```jsonc
    {
      "success":true,
      "data":{
        "title":"post title here",
        "createdBy": {
          "empID":"empid here",
          // rest of employee object
        },
        // rest of post object
      }
    }
    ```
  - [x] PATCH (modify post)
  - [ ] DELETE (delete post)
  - [x] POST (new post) {"title":string, "isTechnical":int(0/1), "content":string (images represented as {{img1}} for index 1), images:{index:base64imagedata}}

- [x] **/wiki/post.php/meta/:POST_ID:**
  - [x] GET (get post feedback and subscription)
  - [x] PUT (overwrite post meta {subscribed:0/1, feedback:int})

- [x] **/wiki/post.php/tag/:TAG_ID:**
  - [x] POST (create a new tag)
  - [x] DELETE (delete a tag)

- [x] **/wiki/post.php/tags**
  - GET (get all tags)
 
