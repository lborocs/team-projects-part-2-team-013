//single things
export const hamburger = document.querySelector("#hamburger")
export const sidebar = document.querySelector(".sidebar")
export const container = document.querySelector(".sidebar-container")
export const homeButton = document.querySelector("#home")
export const myListButton = document.querySelector("#mylist")
export const wikiButton = document.querySelector("#wiki")
export const workloadButton = document.querySelector("#workload")
export const settingsButton = document.querySelector("#settings")
export const trainingButton = document.querySelector("#training")
export const logoutButton = document.querySelector("#logout")

export const userBoth = document.querySelector(".user-both")
export const userAvatar = document.getElementById("user-icon")
export const userName = document.getElementById("user-name")

//groups of things
export const sidebarItems = document.querySelectorAll(".sidebar-item")
export const topbarItems = document.querySelectorAll(".item")
console.log("[import] loaded global-ui.js")

export const BACK_BUTTON = 3;
export const FORWARD_BUTTON = 4;


caches.open("employees");


class GlobalEmployeeRequest {

    STALL_TIMEOUT = 50;



    timeout;
    requestSet;
    discardable; // object is discardable after the timeout has ran
    id;
    clients;

    constructor() {
        this.id = Math.random().toString(16).substring(2);
        this.timeout = null;
        this.discardable = false;
        this.requestSet = new Set();
        this.clients = 0;
        
    };

    requestEmployees(employees) {
        this.clients++;

        employees.forEach((employee) => { this.requestSet.add(employee) });

        this.setClock();

        // kinda a hack but basically add a listener
        // and when the listener is dispatched then resolve the promise

        return new Promise((resolve) => {
            const thisListener = (e) => {
                document.removeEventListener(this.id, thisListener);
                resolve(e.results);
            };
            document.addEventListener(this.id, thisListener);
        });


    }

    async setClock() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        this.timeout = setTimeout(() => {this.afterTimeout()}, this.STALL_TIMEOUT);
    }

    async afterTimeout() {
        this.discardable = true;
        console.log(`[GlobalEmployeeRequest(${this.id})] request timed out and is now discardable`);


        let event = new Event(this.id);
        event.results = await this._apiCall(this.requestSet);

        console.log(`[GlobalEmployeeRequest(${this.id})] dispatching to ${this.clients} clients`);
        document.dispatchEvent(event);
        
    }

    async _apiCall() {
        let found = new Map();
        let to_req = new Set();
    
        let cache = await caches.open("employees");
    
        // if the employee is cached then add it to found
        await Promise.all(Array.from(this.requestSet).map(async (employee) => {
            let cache_emp = await cache.match("/employees/" + employee);
            
            // if the employee is in the cache
            if (cache_emp) {
                // if we are older than 1h
                if (cache_emp.headers.get("date") < Date.now() - 60 * 60 * 60) {
                    console.log(`[getEmployeesById] Purging ${employee} from cache`);
                    to_req.add(employee)
                    cache.delete("/employees/" + employee);
                } else {
                    found.set(employee, await cache_emp.json());
                }
            } else {
                to_req.add(employee)
            }
        }
        ));
    
        console.log(`[GlobalEmployeeRequest(${this.id})] Found ${found.size} cached requesting ${to_req.size}`);
        
    
        // if we have none to fetch
        if (to_req.size == 0) {
            return new Map([...found]);
        }
    
    
        // fetch the remaining employees
        let res = await get_api("/employee/employee.php/bulk?ids=" + Array.from(to_req).join(","));
    
        // cache all fetched employees
        Object.entries(res.data.employees).forEach(async (employee) => {
    
            // here we make a "fake response" to cache
            // we could in future cache this as a real /employee/empID endpoint
            // if we decide to add it as an endpoint
            let body = JSON.stringify(employee[1])
    
            await cache.put(
                "/employees/" + employee[0], new Response(
                    body,
                    {
                        headers: {
                            "date": Date.now(),
                            "content-type": "application/json",
                            "content-length": body.length,
                        }
                    }
                )
            );
        });
    
        // return requested employees with the cached ones
        const results = new Map([...found, ...Object.entries(res.data.employees)]);
        console.log(`[GlobalEmployeeRequest(${this.id})] Returning ${results.size} results`);
        return results;
    
    }


}


//utility functions

/**
 * Formats a date into a human readable string.
 * 
 * @param {Date} date - The date to be formatted.
 * @returns {string} The formatted date string.
 * 
 * @example
 * // returns "1st Jan. 2023"
 * formatDate(new Date(2022, 0, 1));
 */
export function formatDate(date) {
    let currentDate = new Date();
    let day = date.getDate();
    let month = date.getMonth();
    let year = date.getFullYear();
    let ordinal = "th";
    if (day == 1 || day == 21 || day == 31) {
        ordinal = "st";
    } else if (day == 2 || day == 22) {
        ordinal = "nd";
    } else if (day == 3 || day == 23) {
        ordinal = "rd";
    }
    let shortMonths = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
    let formattedDate;
    if (year !== currentDate.getFullYear()) {
        formattedDate = `${day}${ordinal} ${shortMonths[month]} ${year}`;
    } else {
        formattedDate = `${day}${ordinal} ${shortMonths[month]}`;
    }
    return formattedDate;
}

export function formatDateFull(date) {
    let currentDate = new Date();
    let day = date.getDate();
    let month = date.getMonth();
    let year = date.getFullYear();
    let ordinal = "th";
    if (day == 1 || day == 21 || day == 31) {
        ordinal = "st";
    } else if (day == 2 || day == 22) {
        ordinal = "nd";
    } else if (day == 3 || day == 23) {
        ordinal = "rd";
    }
    let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",  "November", "December"];
    let formattedDate = `${day}${ordinal} ${months[month]} ${year}`;
    return formattedDate;
}

function hash(str) {
    let hash = str.charCodeAt(0) + 0x1dc5;
    for (let i = 0; i < str.length; i++) {
        let char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
    }
    return Math.abs(hash);
  
}

function rgbComponentToHex(c) {
    var hex = c.toString(16);
    return hex.padStart(2, "0");
  }

function hsvToHex(h,s, v) {
    s /= 100;
    v /= 100;
    let i = Math.floor(h / 60);
    let f = h / 60 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);
    let r,g,b
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return rgbComponentToHex(Math.floor(r*255)) + rgbComponentToHex(Math.floor(b*255)) + rgbComponentToHex(Math.floor(g*255));
    
}

export function generateAvatarSvg(text, colour) {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="256px" height="256px" viewBox="0 0 256 256" version="1.1">
        <circle fill="#${colour}" cx="128" width="256" height="256" cy="128" r="128"/>
        <text xmlns="http://www.w3.org/2000/svg" style="color: #000; line-height: 1; font-family: 'Open Sans', sans-serif" alignment-baseline="middle" text-anchor="middle" font-size="112" font-weight="400" dy=".1em" dominant-baseline="middle" fill="#000" x="50%" y="50%">${text}</text>
    </svg>`
}


/**
 * Generates the URL for an initials avatar given a name.
 * 
 * @param {string} name - The name to be used for the avatar.
 * @returns {string} The URL of the generated avatar.
 * 
 * @example
 * // returns a data url for an avatar with the initials "FB"
 * nameToAvatar("Firat Batmaz");
 */
function nameToAvatar(name) {
    let initials = name.split(" ").map((word) => word[0]).join("");
    let degree = hash(name) % 360;
    let colour = hsvToHex(degree, 40, 90);
    console.log(`[nameToAvatar] Generated avatar for ${name}: colour ${colour}`)
    return `data:image/svg+xml;base64,${btoa(generateAvatarSvg(initials, colour))}`;
}


export function employeeAvatarOrFallback(employee) {
    if (employee.avatar) {
        return `https://usercontent.013.team/employees/${employee.empID}/${employee.avatar.assetID}.${employee.avatar.contentType.split("/")[1]}`;
    } else {
        return nameToAvatar(bothNamesToString(employee.firstName, employee.lastName));
    }
}

/**
 * Combines the first name and the last name into a single string.
 * If the first name is undefined, only the last name is returned.
 *
 * @param {string} fname - The first name.
 * @param {string} sname - The last name.
 * @returns {string} The combined string of the first name and the last name.
 */
export function bothNamesToString(fname, sname) {
    if (fname == undefined) {
        return sname
    } else {
        return fname + " " + sname;
    }
}

/**
 * Applies an animation to a given HTML element and removes it when completed.
 * 
 * @param {HTMLElement} element - The HTML element to be animated.
 * @param {string} animation - The CSS class of the animation to be applied.
 * 
 * @example
 * // Animates the element with a CSS animation class 'fade-in'
 * animate(document.getElementById('popup'), 'fade-in');
 */
export function animate(element, animation) {
    element.classList.add(animation);
    const duration = parseFloat(getComputedStyle(element).getPropertyValue('animation-duration')) * 1000;
    setTimeout(() => {
      element.classList.remove(animation);
    }, duration);
}

export function showConfirmCheck(parent) {
    let check = document.createElement("i");
    check.classList.add("fa-solid");
    check.classList.add("fa-check");
    check.classList.add("confirmation");
    parent.appendChild(check);
    setTimeout(() => {
        check.classList.add("fade-500ms");
    }, 200);
    
    return check;
}

/**
 * Fetches the employee data for a set of employee IDs.
 * 
 * @param {Array} employees - An array of employee IDs to fetch data for.
 * @returns {Promise<Map>} A promise that resolves to a Map of the employee IDs to their data.
 * 
 * @example
 * //Fetch the data for employees with IDs 1, 2, and 3 and logs the result.
 * getEmployeesById([1, 2, 3]).then(data => console.log(data));
 */

let _globalEmployeeRequest = new GlobalEmployeeRequest();

export async function getEmployeesById(employees) {

    // if the timeout has expired we make a new object
    if (_globalEmployeeRequest.discardable) {
        _globalEmployeeRequest = new GlobalEmployeeRequest();
    }

    return await _globalEmployeeRequest.requestEmployees(employees);

}

async function fetchSession() {
    const data = await get_api("/employee/session.php/session");
    if (data.success) {
        console.log(`SESSION INFO : ${data.data}`);
        localStorage.setItem("session", JSON.stringify(data.data));
    } else {
        console.error("FAILED TO GET SESSION");
    }

    return data.data;

}


export async function getCurrentSession(lazy = false) {
    let session = JSON.parse(localStorage.getItem("session"));
    if (!session && !lazy) {
        session = await fetchSession();
    }

    return session;
}

export async function renewCurrentSession() {
    let data = await put_api("/employee/session.php/session", undefined, {redirect_on_error:false});

    if (data.success) {
        localStorage.setItem("token", data.data.session_token)
        localStorage.removeItem("session");
        console.log("[renewCurrentSession] session renewed")
        return await getCurrentSession();
    } else {
        return null;
    }
}


export async function clearStorages() {
    localStorage.clear();
    await caches.delete("employees");
}






//event listeners and ui functions

if (hamburger !== null) {
    hamburger.addEventListener("click", () => {
        sidebar.classList.toggle("visible")
        container.classList.toggle("sidebar-open")
        document.querySelectorAll(".sidebar-item p").forEach((paragraph) => {
            paragraph.classList.toggle("norender")
        })
    })
}

if (homeButton !== null) {
    homeButton.addEventListener("click", () => {
        setTimeout(() => {
            window.location.href = "/projects/";
        }, 150)
    });
}

if (myListButton !== null) {
    myListButton.addEventListener("click", () => {
        setTimeout(() => {
            window.location.href = "/personal/";
        }, 150)
    });
}

if (wikiButton !== null) {
    wikiButton.addEventListener("click", () => {
        setTimeout(() => {
            window.location.href = "/wiki/";
        }, 150)
    });
}

if (workloadButton !== null) {
    workloadButton.addEventListener("click", () => {
        setTimeout(() => {
            window.location.href = "/workload/";
        }, 150)
    });
}

if (trainingButton !== null) {
    trainingButton.addEventListener("click", () => {
        setTimeout(() => {
            window.location.href = "/dashboard/";
        }, 150)
    });
}


if (logoutButton !== null) {
    logoutButton.addEventListener("click", () => {
        delete_api("/employee/session.php/session").then(async () => {
            await clearStorages();
            window.location.href = "/";
        });
    });
}

if (sidebarItems !== null) {
    sidebarItems.forEach((sidebarItem, i) => {
        sidebarItem.addEventListener("click", () => {
            if (!sidebarItem.classList.contains("selected")) {
                sidebarItem.classList.add("selected")
                sidebarItems.forEach((item, j) => {
                    if (j !== i) {
                        item.classList.remove("selected")
                    }
                })
                console.log("[sideBarItem] selected")
            } 
        })
    })
}

export function managerElementsEnableIfManager() {
    getCurrentSession(true).then((session) => {
        if (!session) {
            return;
        }
        let managerElements = document.querySelectorAll(".manager-only");
        let isManager = (session.auth_level ?? 0) >= 2;
        managerElements.forEach((elem) => {
            if (!isManager) {
            elem.classList.add("norender");
            } else {
                elem.classList.remove("norender");
            }
            
        })
    });
}


function fillCurrentUserInfo() {

    if (userAvatar === null || userName === null) {
        return;
    }

    getCurrentSession(true).then((session) => {

        if (!session) {
            return
        }


        let employee = session.employee;

        let emp_name = bothNamesToString(employee.firstName, employee.lastName);
        let emp_icon = employeeAvatarOrFallback(employee);


        let icon = document.createElement("img");
        icon.src=emp_icon;
        icon.classList.add("avatar");

        userAvatar.replaceChildren(
            icon
        );
        userName.innerText = emp_name;
    });
}

export function setBreadcrumb(breadcrumbPaths, hrefs) {
    let breadcrumb = document.querySelector(".breadcrumb")
    if (breadcrumb === null) {
        return;
    }
    breadcrumb.replaceChildren();


    console.log("[setBreadcrumb] updating breadcrumb to " + breadcrumbPaths.join(" > "));

    if (breadcrumbPaths.length != hrefs.length) {
        console.error("[setBreadcrumb] breadcrumbPaths and hrefs must be the same length");
        console.warn("[setBreadcrumb] breadcrumbPaths: " + breadcrumbPaths);
        console.warn("[setBreadcrumb] hrefs: " + hrefs);
        return;
    }

    for (let i = 0; i < breadcrumbPaths.length; i++) {
        
        let path = breadcrumbPaths[i];
        let navigator = hrefs[i];

        let child = document.createElement("a");
        child.classList.add("breadcrumb-child", "breadcrumb-navigator");
        child.innerText = path;
        child.href = navigator;
        
        // set breadcrumb to what we just navigated to 
        child.addEventListener("click", (e) => {
            
            setBreadcrumb(breadcrumbPaths.slice(0, i+1), hrefs.slice(0, i+1));
            dispatchBreadcrumbnavigateEvent(e);
        });

        breadcrumb.appendChild(child);
        let divider = document.createElement("i");
        divider.classList.add("fa-solid", "fa-chevron-right");
        divider.classList.add("breadcrumb-child", "breadcrumb-divider");
        breadcrumb.appendChild(divider);
    }
    breadcrumb.lastChild.remove();

    let last = hrefs[hrefs.length - 1];
    
    console.log("[setBreadcrumb] updating hash to " + last);
    document.location.hash = new URL(last, document.location).hash;
}

export function getLocationHashArray() {
    if (document.location.hash) {
        return document.location.hash.substring(1).split("-");
    } else {
        return [];
    }
}

// allow back and forward functionality when only the hash/breadcrumb changes
window.addEventListener("mouseup", async (e) => {
    if (e.button == BACK_BUTTON || e.button == FORWARD_BUTTON) {
        // wait for the browser to update the hash
        await new Promise(r => setTimeout(r, 50));
        dispatchBreadcrumbnavigateEvent(e.type);
    }
});

window.addEventListener("popstate", async (e) => {
    await new Promise(r => setTimeout(r, 50));
    //dispatchBreadcrumbnavigateEvent(e.type);
});

export function dispatchBreadcrumbnavigateEvent(src, locations  = getLocationHashArray()) {

    console.log(`[dispatchBreadcrumbnavigate] dispatching from ${src}`);

    let event = new Event("breadcrumbnavigate");
    event.locations = locations;
    window.dispatchEvent(event);
}


fillCurrentUserInfo();
managerElementsEnableIfManager();