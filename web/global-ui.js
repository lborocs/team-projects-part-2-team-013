//single things
export const hamburger = document.querySelector("#hamburger")
export const closeSidebar = document.querySelector("#close-sidebar")
export const sidebar = document.querySelector(".sidebar")
export const container = document.querySelector(".sidebar-container")
export const homeButton = document.querySelector("#home")
export const myListButton = document.querySelector("#mylist")
export const wikiButton = document.querySelector("#wiki")
export const workloadButton = document.querySelector("#workload")
export const settingsButton = document.querySelector("#settings")
export const trainingButton = document.querySelector("#training")
export const logoutButton = document.querySelector("#logout")

export const userAvatar = document.getElementById("user-icon-container")
export const notificationsButton = document.getElementById("inbox-icon")

//groups of things
export const sidebarItems = document.querySelectorAll(".sidebar-item")
export const topbarItems = document.querySelectorAll(".item")

//global variables
export var notifications = []
export var GLOBAL_LAST_ACTIVE = new Date();

//sidebar state is either "open" or "closed", default is open
export var sidebarState = localStorage.getItem("sidebarState") || "open";
localStorage.setItem("sidebarState", sidebarState);

console.log("[import] loaded global-ui.js")

export const BACK_BUTTON = 3;
export const FORWARD_BUTTON = 4;

export const ASSET_TYPE_EMPLOYEE = "employees";
export const ASSET_TYPE_POST = "posts";
export const ASSET_TYPE_PROJECT = "projects";

export var settings;
// this uses the settings object to reduce the amount of localstorage calls
export function getSetting(key) {
    console.log(`[getSetting] ${key} is ${settings[key]}`)
    return settings[key];
}

// settings object and localstorage entry are kept in sync
export function setSetting(key, value) {
    ensureSettings();
    settings[key] = value;
    localStorage.setItem('settings', JSON.stringify(settings));
    console.log(`[setSetting] ${key} set to ${value}`);
    console.log(settings);
}



caches.open("employees");


export class RollingTimeout {

    duration;
    _timeout;
    callback;
    dirty;

    constructor(callback, duration) {
        this.callback = callback;
        this.duration = duration;
        this.dirty = false;
    }

    roll() {

        if (this.dirty) {
            throw new Error("Cannot roll a dirty timeout, timeout has already completed.");
        }

        if (this._timeout) {
            clearTimeout(this._timeout);
        }

        // use an anoymous function to call the callback
        // so that javascript doesnt magic away the "this" keyword
        this._timeout = setTimeout(
            () => {this._callTimeout()},
            this.duration
        );
    }

    _callTimeout() {
        this.dirty = true;
        this.callback();
    }

}


class GlobalEmployeeRequest {

    STALL_TIMEOUT = 50;



    timeout;
    requestSet;
    discardable; // object is discardable after the timeout has ran
    id;
    clients;

    constructor() {
        this.id = Math.random().toString(16).substring(2);

        this.timeout = new RollingTimeout(
            () => {this.afterTimeout()},
            this.STALL_TIMEOUT
        );

        this.discardable = false;
        this.requestSet = new Set();
        this.clients = 0;
        
    };

    requestEmployees(employees) {
        this.clients++;

        employees.forEach((employee) => { this.requestSet.add(employee) });

        this.timeout.roll();

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

/**
 * 
 * @param {Date} timestamp as a Date object
 * @returns {string} how long ago the timestamp was in a human readable format
 */
export function howLongAgo(timestamp) {
    let currentTime = new Date();
    let diff = currentTime - timestamp;
    let seconds = Math.floor(diff / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    let days = Math.floor(hours / 24);

    if (seconds < 60) {
        return "Now";
    }

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    if (hours < 24) {
        return `${hours}h ago`;
    }

    if (days < 7) {
        return `${days}d ago`;
    }

    return formatDate(timestamp);

}
/**
 * 
 * @param {number} state 0 - not started, 1 - in progress, 2 - finished
 * @returns {string} the state in a human readable format
 */
export function formatTaskState(state) {
    switch (state) {
        case 0:
            return "Not started";
        case 1:
            return "In progress";
        case 2:
            return "Finished";
        default:
            return "unknown task state, how did this even happen";
    }
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
    const fontSize = text.length === 1 ? 130 : 115;
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="256px" height="256px" viewBox="0 0 256 256" version="1.1">
        <circle fill="#${colour}" cx="128" width="256" height="256" cy="128" r="128"/>
        <text xmlns="http://www.w3.org/2000/svg" style="color: #fff; line-height: 1; font-family: system-ui" alignment-baseline="middle" text-anchor="middle" font-size="${fontSize}" font-weight="600" dy=".1em" dominant-baseline="middle" fill="#000" x="50%" y="50%">${text}</text>
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

    if (employee.deleted) {
        return nameToAvatar("Deleted User");
    } else if (employee.avatar) {
        return assetToUrl(ASSET_TYPE_EMPLOYEE, employee.empID, employee.avatar.assetID, employee.avatar.contentType);
    } else {
        return nameToAvatar(employeeToName(employee));
    }
}

export function assetToUrl(type, bucketID, assetID, contentType) {

    return `https://usercontent.013.team/${type}/${bucketID}/${assetID}.${contentType.split("/")[1]}`;
}


export function employeeToName(employee) {
    if (employee.deleted) {
        return "Deleted User";
    }

    if (!employee) {
        return "Unknown User";
    }

    return bothNamesToString(employee.firstName, employee.lastName);
}


/**
 * Combines the first name and the last name into a single string.
 * If the first name is undefined, only the last name is returned.
 *
 * @param {string} fname - The first name.
 * @param {string} sname - The last name.
 * @returns {string} The combined string of the first name and the last name.
 */
function bothNamesToString(fname, sname) {
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


/**
 * Fetches the notifications for the logged in employee.
 *
 * @returns {Promise<Array>} A promise that resolves to an array of notifications.
 */
export async function getEmployeeNotifications() {
    const data = await get_api("/employee/meta.php/notifications", {redirect_on_error:false});
    if (data.success) {
        console.log(`[getEmployeeNotifications] notifications found`);
        return data.data.notifications;
    } else {
        console.error("[getEmployeeNotifications] FAILED TO GET NOTIFICATIONS");
    }

}

/**
 * Renders the notifications passed in depending on their type.
 * Format: 
 * Type: 0 - Post edited
 * Type: 1 - Task updated:
 * Detail 0 - Task created
 * Detail 1 - Task updated
 * Detail 2 - Task assigned to you
 * Detail 3 - Task unassigned to you
 * 
 * @param {Array} notifications 
 */

export async function renderNotifications(notifications) {
    let content = notificationsButton.querySelector('.content');
    content.innerHTML = "";

    //gets any employee ids in the notifications so their details can be fetched
    let empIDs = new Set();
    notifications.forEach(notification => {
        switch(notification.type) {
            case 0:
                empIDs.add(notification.body.post.author.empID);
                break;
            case 1:
                break;
            default:
        }
        empIDs.add(notification.author.empID)
    });

    //getting data needed for rendering
    let employees = await getEmployeesById(empIDs);
    //no longer need to get projects because they are returned in the notification body
    

    
    //rendering notifications
    notifications.forEach(notification => {
        console.log(notification)
        let icon = ""
        let link = "https://www.google.com"
        let desc = "Not Implemented"
        let time = howLongAgo(new Date(notification.time));

        //notification author
        let empID = notification.author.empID;
        let name = employeeToName(employees.get(empID));
        let avatar = employeeAvatarOrFallback(employees.get(empID));

        //notification card
        let notificationCard = document.createElement("a");
        notificationCard.classList.add("notification-card");
        
        switch(notification.type) {
            case 0: // post they are following has been edited
            console.log("[renderNotifications] post edited")
                let post = notification.body.post;

                icon = "checkbook";
                link = `/wiki/post/#${post.postID}`;
                notificationCard.href = link;
                
                notificationCard.innerHTML = `
                    <div class="icon">
                        <span class="material-symbols-rounded">
                            ${icon}
                        </span>
                    </div>
                    <div class="details">
                        <div class="name-card">
                            <img src="${avatar}" class="avatar">
                            <span>${name}</span>
                        </div>
                        <div class="text">Edited the post <span>${post.title}</span>.</div>
                    </div>
                    <div class="arrow">
                        <span class="material-symbols-rounded">
                            open_in_new
                        </span>
                    </div>
                    <div class="time">${time}</div>
                `;

                content.appendChild(notificationCard);

                notificationCard.addEventListener("click", () => {
                    console.log("[renderNotifications] notification clicked")

                    //
                    // TODO: mark notification as read
                    //

                    dispatchBreadcrumbnavigateEvent("notificationsTray");
                })

                break;
            case 1: // task they are involved in has been updated in some way
                console.log("[renderNotifications] task updated")

                //task, project for this notification
                let task = notification.body.task;
                let project = task.project;
                link = `/projects/#${project.projID}-${task.taskID}`;
                notificationCard.href = link;

                switch(notification.body.detail) {
                    case 0: // task has been created
                        icon = "add_task";
                        desc = `Created <span>${task.title}</span> in <span>${project.name}</span>.`
                        break;
                    case 1: // task has been updated
                        icon = "change_circle";
                        desc = `Updated <span>${task.title}</span> in <span>${project.name}</span>.`
                        break;
                    case 2: // task has been assigned to you
                        icon = "person_add";
                        desc = `Assigned you to <span>${task.title}</span> in <span>${project.name}</span>.`
                        break;
                    case 3: // task has been unassigned to you
                        icon = "person_remove";
                        desc = `Removed you from <span>${task.title}</span> in <span>${project.name}</span>.`
                        break;
                    default: // unknown
                        icon = "question_mark";
                        desc = "Not Implemented"
                }
                notificationCard.innerHTML = `
                    <div class="icon">
                        <span class="material-symbols-rounded">
                            ${icon}
                        </span>
                    </div>
                    <div class="details">
                        <div class="name-card">
                            <img src="${avatar}" class="avatar">
                            <span>${name}</span>
                        </div>
                        <div class="text">${desc}</div>
                    </div>
                    <div class="arrow">
                        <span class="material-symbols-rounded">
                            open_in_new
                        </span>
                    </div>
                    <div class="time">${time}</div>
                `;

                content.appendChild(notificationCard);

                notificationCard.addEventListener("click", () => {
                    console.log("[renderNotifications] notification clicked")

                    //
                    // TODO: mark notification as read
                    //

                    dispatchBreadcrumbnavigateEvent("notificationsTray");
                    
                })

                break;
            default: // unknown
                icon = "question_mark";
        }

       
    });
}




//event listeners and ui functions

if (hamburger !== null) {
    hamburger.addEventListener("click", () => {
        sidebar.classList.toggle("visible")
        container.classList.toggle("sidebar-open")
        document.querySelectorAll(".sidebar-item p").forEach((paragraph) => {
            paragraph.classList.toggle("norender")
        })

        // update settings
        setSetting("sidebarIsOpen", container.classList.contains("sidebar-open"));
        console.log("[hamburger] sidebarIsOpen set to " + container.classList.contains("sidebar-open"));
    })
}

if (closeSidebar !== null) {
    closeSidebar.addEventListener("click", () => {
        sidebar.classList.toggle("visible")
        container.classList.toggle("sidebar-open")
        document.querySelectorAll(".sidebar-item p").forEach((paragraph) => {
            paragraph.classList.toggle("norender")
        })
    })
}

if (homeButton !== null) {
    homeButton.addEventListener("click", () => {
        window.location.href = "/projects/";
    });
}

if (myListButton !== null) {
    myListButton.addEventListener("click", () => {
        window.location.href = "/personal/";
    });
}

if (wikiButton !== null) {
    wikiButton.addEventListener("click", () => {
        window.location.href = "/wiki/";
    });
}

if (workloadButton !== null) {
    workloadButton.addEventListener("click", () => {
        window.location.href = "/workload/";
    });
}

if (trainingButton !== null) {
    trainingButton.addEventListener("click", () => {
        window.location.href = "/dashboard/";
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

function ensureSettings() {
    settings = JSON.parse(localStorage.getItem('settings'));
    if (!settings) { // if initial settings aren't in local storage, set them
        settings = {
            sidebarIsOpen: false, // true, false
            taskView: "board", // board, list
            taskSort: "none", // none, name, due, created, hours
            taskOrder: "desc", // asc, desc
            taskFilters: { // union of filters is applied
                managerMine: false, // (manager) only tasks assigned to me
                group: false, // only tasks assigned to more than one person
                single: false, // only tasks assigned to one person
                finished: false, // only finished tasks
                inProgress: false, // only in progress tasks
                notStarted: false, // only not started tasks
                overdue: false, // only overdue task, if tasks have no due date they are not included
                notOverdue: false, // only not overdue tasks or tasks with no due date
            },
            projectSort: "none", // none, name, due, created, accessed
            projectOrder: "desc", // asc, desc
            projectFilters: {
                managerMine: false, // (manager) only projects I am in, or team leader of
                teamLeader: false, // only projects I am team leader of
                overdue: false, // only overdue projects, if projects have no due date they are not included
                notOverdue: false, // only not overdue projects or projects with no due date
            },
        };
        localStorage.setItem('settings', JSON.stringify(settings));
    }
    console.log("[ensureSettings] settings loaded, settings is now:");
    console.log(settings);

}


function fillCurrentUserInfo() {

    if (userAvatar === null) {
        return;
    }

    getCurrentSession(true).then((session) => {

        if (!session) {
            return
        }


        let employee = session.employee;

        let emp_icon = employeeAvatarOrFallback(employee);
        let emp_name = employeeToName(employee);

        let icon = document.createElement("img");
        icon.src=emp_icon;
        icon.classList.add("avatar");
        icon.id = "user-icon";

        userAvatar.classList.add("tooltip");
        userAvatar.classList.add("tooltip-left");

        let tooltip = document.createElement("div");
        tooltip.classList.add("tooltiptext");
        tooltip.innerText = `Logged in as ${emp_name}`;

        userAvatar.appendChild(tooltip);
        userAvatar.appendChild(icon);
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
        let divider = document.createElement("span");
        divider.classList.add("material-symbols-rounded");
        divider.textContent = "chevron_right";
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


if (window.location.pathname !== '/') {

    setTimeout(() => {
        if (sidebar !== null) {
            sidebar.classList.add('transition');
            //no dom queries are inside of the event listener to make global event listener ok
            const sidebarItems = document.querySelectorAll('.sidebar-item p');

            document.addEventListener('click', (e) => {
                const sidebarVisible = sidebar.classList.contains('visible');
                const clickSidebar = sidebar.contains(e.target);
                const clickHamburger = hamburger.contains(e.target);
                
                if (window.innerWidth < 600 && sidebarVisible && !clickSidebar && !clickHamburger) {
                    sidebar.classList.toggle('visible');
                    container.classList.toggle('sidebar-open');
                    sidebarItems.forEach((paragraph) => {
                        paragraph.classList.toggle('norender');
                    });
                }
            });
        }
    }, 200);

    ensureSettings()

    if(window.innerWidth > 600 && getSetting("sidebarIsOpen") === true) {
        console.log("[init] setting sidebar to open")
        sidebar.classList.add("visible")
        container.classList.add("sidebar-open")
        document.querySelectorAll(".sidebar-item p").forEach((paragraph) => {
            paragraph.classList.remove("norender")
        })
    } else {
        console.log("[init] setting sidebar to closed")
        sidebar.classList.remove("visible")
        container.classList.remove("sidebar-open")
        document.querySelectorAll(".sidebar-item p").forEach((paragraph) => {
            paragraph.classList.add("norender")
        })
    }

    fillCurrentUserInfo();
    managerElementsEnableIfManager();
    getEmployeeNotifications().then((items) => {
        if (items.length > 0) {
            console.log("[getEmployeeNotifications] notifications found and display badge");
            console.log(items);
            notifications = items
            renderNotifications(items);
        }
    });
}


// session timeout
setInterval(async () => {
    let session = await getCurrentSession(false);
    if (!session) {
        return;
    }

    let expires = new Date(session.expires);
    let now = new Date((new Date()).toUTCString());

    let diff = expires - now;
    let lastActive = now - new Date(GLOBAL_LAST_ACTIVE.toUTCString());
    console.log(`[sessionTimeout] ${diff}ms remaining on session`);
    console.log(`[sessionTimeout] user last active ${lastActive}ms ago`);

    if (diff < 10 * 60 * 1000) {

        if (lastActive < 15 * 60 * 1000) {

            console.log("[sessionTimeout] session expires in under 10 minutes, renewing");
            await renewCurrentSession();
        } else {
            console.log("[sessionTimeout] user has not been active in the last 15 minutes, wont renew session");
        }
    }
}, 60 * 1000);

// set last active time
document.addEventListener("mousemove", () => {
    GLOBAL_LAST_ACTIVE = new Date();
});
document.addEventListener("keydown", () => {
    GLOBAL_LAST_ACTIVE = new Date();
});

