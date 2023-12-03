
const DEFAULT_OPTIONS = {
    redirect_on_error: true,
    retries: 3,
}

//const API_BASE = "http://localhost:4444";
const API_BASE = "https://013.team/api";

// always remember null is a valid body
async function api_request(route, method, body, options={}) {

    options = Object.assign({}, DEFAULT_OPTIONS, options);
    console.log("[API] request options: ", options);

    let headers;

    let token = localStorage.getItem("token")

    if (token !== null) {
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

    const response = await fetch(API_BASE + route, reqInit);
    const status = response.status;

    // 204 no content has no content
    if (response.status == 204) {
        console.log(`[API] ${method} ${route} 204 NO CONTENT`);
        return null;
    }

    const data = await response.json();

    // if we success
    if (data.success) {
        console.log(`[API] ${method} ${route} ${status} ${response.statusText}`)
        return data;
    }

    // failure
    //document.body.innerHTML = `<h1>${status} ${response.statusText}</h1><p>${data.data.message}</p><img src="https://http.cat/${status}" alt="HTTP ${status}">`;


    const error_code = data.data.code;
    const error_message = data.data.message;

    console.error(`[API] ${method} ${route} ERRORED: ${status} - ${error_code} - ${error_message}`);

    switch (error_code) {
        case 1004: // session expired
        case 1005: // session revoked

            if (options.redirect_on_error) {
                alert("Your session has expired, please log in again");

            }
        case 1000: // not authenticated

            localStorage.clear();
            await caches.delete("employees");

            if (!options.redirect_on_error) {
                console.log("[API] Explicitly told not to redirect");
                break;
            } else {
                let after_login = window.location.pathname + window.location.hash;
                window.location.href = `/#${after_login}` // redirect to login
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
                return data;
            }
            break;
    
        default:
            break;
    }

    return data;
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