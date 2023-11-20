# object manpulation
to make things simpler, routes that all manipulate objects can have the repetitive part of GET, PATCH, POST, DELETE functions on an object abstracted

# the process
## generic manipulation
the function *object_manipulation_generic()* is then called with 4 arguments:
- $model - the const array of fields and their types defined in models.php 
- $table_specifier - the const table specified in models.php
- $ctx - the current request context
- $args - the string of args provided to the route

## arg parsing
the function will then parse $args into a resource id or null, if it is not provided, in the caseof null, the request method MUST be POST for a new resource

## body verification
### body fields
the function will then verify the sent request body based on the model provided above, it will error if any unexpected fields are provided and verify they are of the correct type.
### id verification
if the type is an id it will verify that the id is valid hex, then it will convert it to a binary16 and call a function defined in OBJECT_SNOWFLAKE_VALIDITY_FUNCTIONS, that returns a boolean on wether the id is a valid object, (normally a db_x_exists function)

## check functions
the generic will then call all functions defined in the **OBJECT_TABLE_METHOD_CHECKS** constant, defined as TABLE=>METHOD=>[func_array], checks can cache data between eachother by accessing the ctx object
  
the function should have the signature
```php
object_check_mycheck(RequestContext $ctx, array $path_args)
```
and only return on success (errors should be responded to with the respond functions)
  
note: the function will have object_check_ prepended

## ungeneric function call
based on the request method and table the generic call will call a function from one of 4 constants 
- **OBJECT_GENERIC_NEW_FUNCS**
- **OBJECT_GENERIC_FETCH_FUNCS**
- **OBJECT_GENERIC_EDIT_FUNCS**
- **OBJECT_GENERIC_DELETE_FUNCS**

this function must have the format:
```php
// for PATCH AND POST (takes body)
function a(RequestContext $ctx, array $data, array $url_specifiers)
// for GET and DELETE (doesnt take body)
function b(RequestContext $ctx, array $data, array $url_specifiers)
```
and must ONLY insert into the database, all permission checks must be done elsewhere