written by jamie skitt

**If you need to retrieve, change or delete serverside data from the client (js), use fetch()**
- fetch() uses HTTP methods to access the API routes provided by 314

**HTTP Methods:**
- GET: retrieves a resource from the server

- POST: submits data to the server to create a new resource or update an existing resource

- DELETE: deletes a resource from the server

- PATCH: submits data to the server to update a portion of an existing resource

The HTTP method you should use for each route is defined in the *routes.md* document

**Async:**

Because you are waiting for the server to respond, code you write using fetch() needs to be *asynchronous*.

The easiest way to do this is to make a function with the *async* keyword before it e.g. 
  `async function login(username, password)`

This lets us use the *await* keyword before calling fetch() inside, telling the client to wait for a response.

e.g. `await fetch(/employee/session.php/login")`

**Structure:**

fetch() calls should follow this general structure:
1. make an async function to do your fetching in
2. create a javascript object of any data you may want to send to the server
3. open a try/catch statement
4. fetch the api route, using the await keyword and assigning the response to a variable
5. inside the fetch statement, declare the method used, declare the content type as json, and send any data in the body
6. catch any errors in the catch statement



Example:
```js
let username = "user1@email.com"
let password = "password123"

async function login(username, password) {
    
    //CREATE A JAVASCRIPT OBJECT OF ANY DATA BEING SENT
    let data = {
        username: username,
        password: password
    }  
    //OPEN A TRY/CATCH
    try {
        //FETCH THE ROUTE
        const response = await fetch("/employee/session.php/login", {
            //STATE THE METHOD USED
            method: "POST",
            //HEADER WILL ALWAYS BE THIS NO MATTER WHAT
            headers: {                                  
                "Content-Type": "application/json"
            },
            //IF METHOD SENDS DATA, DO THIS
            body: JSON.stringify(data)
        });
        //DECODE THE RESPONSE FROM JSON INTO AN OBJECT
        const data = await response.json();
        document.cookie = "token=" + data.data.session_token;
  
    } catch (error) {
    //MAKE SURE TO INCLUDE THE CATCH INCASE SOMETHING GOES WRONG
    //FOR NOW, LOGGING THE ERROR TO CONSOLE IS ENOUGH
        console.error(error);

    }
```
