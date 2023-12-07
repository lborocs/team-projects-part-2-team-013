written by jamie skitt & aidan

**If you need to retrieve, change or delete serverside data from the client (js), use global-api.js**
- the api function use HTTP methods to access the API routes provided by aidan

**HTTP Methods:**
- GET: retrieves a resource from the server

- POST: submits data to the server to create a new resource or update an existing resource

- DELETE: deletes a resource from the server

- PATCH: submits data to the server to update a portion of an existing resource

- PUT: replaces data at the server with the user provided data

The HTTP method you should use for each route is defined in the *routes.md* document

**Async:**

Because you are waiting for the server to respond, code you write using fetch() needs to be *asynchronous*.

The easiest way to do this is to make a function with the *async* keyword before it e.g. 
  `async function login(username, password)`

This lets us use the *await* keyword before calling the api function inside, telling the client to wait for a response.

e.g. `await post_api(/employee/session.php/login")`

**Structure:**

api calls should follow this general structure:
1. make an async function to do your fetching in
2. create a javascript object of any data you may want to send to the server
3. fetch the api route, using the await keyword and assigning the response to a variable
4. inside the fetch statement, declare the method used, declare the content type as json, and send any data in the body
5. catch any errors by reading data.success

the api methods are based on the request method you want, e.g
put_api() for PUT
get_api() for GET


Example:
```js
let username = "user1@email.com"
let password = "password123"

async function login(username, password) {
    
    //CREATE A JAVASCRIPT OBJECT OF ANY DATA BEING SENT
    let req = {
        username: username,
        password: password
    }  
    //OPEN A TRY/CATCH
    const data = await post_api("/employee/session.php/login", req);

    if (data.success) {
        // do stuff
    }
```
