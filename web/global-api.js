
const DEFAULT_OPTIONS = {
    redirect_on_error: true,
    retries: 3,
    use_auth: true,
}

class APIResponse {

    data;
    error;

    status;
    success;

    headers;


    constructor(status, body, headers) {
        this.status = status;
        this.headers = headers;
        if (body.success) {
            this.success = true;
            this.data = body.data;
        }
        else {
            this.success = false;
            this.error = body.data;
        }
    }

}

//const API_BASE = "http://localhost:4444";
const API_BASE = "https://013.team/api";

// always remember null is a valid body
async function api_request(route, method, body, options={}) {

    options = Object.assign({}, DEFAULT_OPTIONS, options);
    console.log("[API] request options: ", options);

    let headers;

    let token = localStorage.getItem("token")

    if (token !== null && options.use_auth) {
        headers = {
            "Content-Type": "application/json",
            "Authorization": token
        }
    } else {
        headers = {
            "Content-Type": "application/json",
        }
    }
    
    let reqInit = {
        method: method,
        headers: headers,
    };

    if (body !== undefined) {
        reqInit.body = JSON.stringify(body);
    }

    const raw_response = await fetch(API_BASE + route, reqInit);


    let raw_res = {};

    if (raw_response.status == 204) {
        raw_res = {
            success: true,
            data: null
        }
    } else {
        raw_res = await raw_response.json();
    }


    const res = new APIResponse(
        raw_response.status,
        raw_res,
        raw_response.headers
    );

    // 204 no content has no content
    if (res.status == 204) {
        console.log(`[API] ${method} ${route} 204 NO CONTENT`);
        return res;
    }

    // if we success
    if (res.success) {
        console.log(`[API] ${method} ${route} ${res.status} ${raw_response.statusText}`)
        return res;
    }

    // failure
    //document.body.innerHTML = `<h1>${status} ${response.statusText}</h1><p>${data.data.message}</p><img src="https://http.cat/${status}" alt="HTTP ${status}">`;


    const error_code = res.error.code;
    const error_message = res.error.message;

    console.error(`[API] ${method} ${route} ERRORED: ${res.status} - ${error_code} - ${error_message}`);

    var msg;


    switch (error_code) {
        

        // bad session
        case 3001:
        case 3002:
        case 3003:

        case 1004: // session expired
        case 1005: // session revoked
            // notice the important lack of break.
            msg = "&sessionexpired"
        case 1000: // not authenticated

            if (!msg) {
                msg = "&authrequired"
            }

            localStorage.clear();
            await caches.delete("employees");

            if (!options.redirect_on_error) {
                console.log("[API] Explicitly told not to redirect");
                break;
            } else {
                // dont redirect if we are already on the login page
                if (window.location.pathnames == "/") {
                    break
                }
                let after_login = window.location.pathname + window.location.hash;
                window.location.href = `/#${after_login}${msg}` // redirect to login
                break;
            };


        
        case 3000: // unhandled internal exception
        case 3005: // db general failure
        case 3006: // session validation server failure

            if (options.retries > 0) {
                options.retries = options.retries - 1;
                console.warn(`Retrying request ${options.retries} more times`);
                return await api_request(route, method, body, options);
            } else {
                console.error(`Retries exhausted: returning error message`);
                return res;
            }
            break;
    
        default:
            break;
    }

    return res;
}

async function get_api(route, options=DEFAULT_OPTIONS) {
    return api_request(route, "GET", undefined, options);
}

async function post_api(route, body, options=DEFAULT_OPTIONS) {
    return api_request(route, "POST", body, options);
}

async function patch_api(route, body, options=DEFAULT_OPTIONS) {
    return api_request(route, "PATCH", body, options);
}

async function delete_api(route, options=DEFAULT_OPTIONS) {
    return api_request(route, "DELETE", undefined, options);
}

async function put_api(route, body, options=DEFAULT_OPTIONS) {
    return api_request(route, "PUT", body, options);
}