Written/designed by aidan F223129
# standard responses
## http codes
### success
- 200 OK - request was successful
- 204 NO CONTENT - request was successful and no content is returned (usually after a successful DELETE request)
### client error
- 400 BAD REQUEST - Something about the users request was invalid, e.g malformed data, missing fields, etc
- 401 UNAUTHORIZED - Authentication is either missing or invalid
- 403 FORBIDDEN - Authentication was valid but insufficient to complete the request, either you do not have sufficient authorization for the operation required, or you may need a otp, refer to the json error code
- 404 NOT FOUND - The requested route was not a registered route on the server, this can also be returned if the requested resource is hidden from the user (e.g a task that the user cannot read)
### server error
- 500 - INTERNAL SERVER ERROR - something *KNOWN* went wrong fulfilling the request
- 501 - NOT IMPLEMENTED - the requested functionality has not yet been implemented
- 520 - UNHANDLED SERVER EXCEPTION - something unknown threw an uncaught exception
## standard json body
```json
{
    "success":true/false,
    "data": {},
}
```
## error response
in the case of an error, a message and an error code will be returned  
```json
{
    "success":false,
    "data":{
        "message":"Descriptive error message",
        "code":1005, // codes are defined in /api/consts.php
    }
}
```
## success responses
in the case of a success the data body will be dependent on the requested route  
```json
{
    "success":true,
    "data":{...}
}
```

# route responses
## object creation/modification
for a route creating/editing an object, generally PATCH/POST something like a task or project  
on success the data will contain the updated object  
eg PATCH /api/project/tasks.php/patch/task1234abc
```json
{
    "success":true,
    "data":{
        "taskID":"task1234abc",
        "createdBy":"manager4567bbc",
        "title":"Important task",
        "description":"Be an academic weapon",
        "state":TASK_STATE_TODO // integer: 0,
        "archived":false,
        "createdAt": 1698093297
    }
}
```
otherwise on error a standard error will be returned, generall 400 bad request and an error code indicating the error

## object deletion
deleting an object successfully will return HTTP 204 NO CONTENT, this response code will NOT contain a body, on error a standard error response will be returned containing a json body with an appropriate error code

## fetching an object/objects
fetching an object such as /task/PROJECT_ID/TASK_ID will return an object of the requested task  
if either project_id or task_id are missing the api will respond 404 with an error specifying which one was not found.  
if the user does not have permission to access either specifier a 403 will be returned with an error code with more information

for endpoints that enumerate objects, i.e fetch all tasks in a project, /tasks/project_id or /projects, the response data will be an array of objects  

for exmaple: GET /tasks/project714af3
```json
{
    "success":true,
    "data":[
        {
            {task1 object...},
            {task2 object...},
            ...
        }
    ]
}
```
routes like this will return a 404 error if the single specifier is invalid. but an empty array if on success there are no objects associated with the specifier, e.g a project does not have any tasks. this will be a general 200 OK response with a standard response body, NOT 204 NO CONTENT.
