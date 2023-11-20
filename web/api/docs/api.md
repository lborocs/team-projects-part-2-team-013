Written/designed by aidan F223129
# Routes
## General
Routes with variables in the request url will only have optionally other variables following  
to reduce api complexity, for example:  
**/projects.php/project/:project_id:/tasks/:task_id:** would not be implemented  
**/projects.php/tasks/:project_id:/task_id:** would be

## Creating a route

```php
<?php
require("../context.php");

// for abc.php/route1
function r_abc_route1(RequestContext $ctx, string $args) {
    // do whatever
    // here is where helper functions would be called
    // access the request context here
    // and finally respond with a response helper function
};

register_route(new Route(
    ["GET", "POST"], // ALLOWED REQUEST METHODS
    "/route1", // the path after the file name abc.php
    "r_abc_route1", // the function name we defined earlier in the form r_(filename)_(routename)
    0, // the required auth level 0-none 1-employee 2-manager 
    ["REQUIRES_BODY"] // route flags from flags section
));


// this only needs to be done once per file
contextual_run();

?>
```

## Request Context

## Flags
- REQUIRES_BODY  
used to mandate that a valid json body is sent to each request to this route, this will **not** verify that the request body is not an empty "{}" JSON object  
the helper function *body_requires_fields* should be used to check validity  
this is only checked if the used request method supports a body, for an endpoint that takes both GET and POST, only post will error without a body.

- URL_PATH_ARGS_LEGAL  
by url path args (/path1/arg1) are not allowed. setting this flag will allow them

- URL_PATH_ARGS_REQUIRED  
  same as URL_PATH_ARGS_LEGAL but requires atleast 1 argument  
  must be used in conjunction with URL_PATH_ARGS_LEGAL

## Helper functions

### Argument parsing
- **get_first_path** is simmilar to the head:tail function of an array  
  it will turn "/route1/arg1/arg2" into ["/route1","/arg1/arg2"]

### Body functions
- **ctx.body_require_fields(Array\<string\>)** will ensure the request body contains each field in the array

- **ctx.body_require_fields_as_types(Array\<string=>type\>, bool allow_null=false)** will ensure the request body contains each field in the array **AND** check its a valid type ("string", "int", "float", "object")

### Response functions
These functions all end excecution and return data back to the requester  

the main response functions are respond, respond_ok, and respond_error  
the signatures are laid out below  

all these functions are helper bindings to the base respond function and abstract away things like status codes

- **respond**(bool *request_success*, Array *response_data*, int *status_code*)
  - **respond_ok**(Array *response_data*)
  - **respond_error**(string *error_message*, int *status_code*)
    - **respond_not_implemented**() - 501
    - **respond_bad_request**() - 400
    - **respond_not_authenticated** - 401
    - **respond_insufficient_authorization**() - 403
    - **respond_not_found**(string *requested_route*) - 404
  
respones contain a json body consisting of an error message and error code  
error codes are defined as follows in consts.php