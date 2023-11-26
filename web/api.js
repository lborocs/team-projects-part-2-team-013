async function api_request(route, method, body, retries) {

    let headers;
    if (sessionStorage.getItem("token") !== null) {
        headers = {
            "Content-Type": "application/json",
            "Authorization": sessionStorage.getItem("token")
        }
    } else {
        headers = {
            "Content-Type": "application/json",
        }
    }
    
    let encoded_body = null;
    if (body !== undefined) {
        encoded_body = JSON.stringify(body)
    }

    const response = await fetch("https://013.team/api" + route, {
        method: method,
        headers: headers,
        body:  encoded_body
    });
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
        case 1000:
        case 1004:
        case 1005:
            sessionStorage.clear();
            window.location.href = "/" // redirect to login
            break;
        
        case 3000: // unhandled internal exception
        case 3005: // db general failure

            if (retries === undefined || retries > 0) {
                if (retries === undefined) {
                    retries = 3;
                } else {
                    retries--;
                }
                console.warn(`Retrying request ${retries} more times`);
                return await api_request(route, method, body, retries);
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

async function get_api(route) {
    return api_request(route, "GET");
}

async function post_api(route, body) {
    return api_request(route, "POST", body);
}

async function patch_api(route, body) {
    return api_request(route, "PATCH", body);
}

async function delete_api(route) {
    return api_request(route, "DELETE");
}

async function put_api(route, body) {
    return api_request(route, "PUT", body);
}