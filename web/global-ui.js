//scripts to inject the side and top bar if required
import * as sidebar from "./global-sidebar.js";
import * as topbar from "./global-topbar.js";



//global variables
export var notifications = []
export var GLOBAL_LAST_ACTIVE = new Date();

export const sidebarContainer = document.querySelector('.sidebar-container');
export const topbarContainer = document.querySelector('.topbar-container');
const notificationReadButton = document.getElementById('read-all');


console.log("[import] loaded global-ui.js")

export const BACK_BUTTON = 3;
export const FORWARD_BUTTON = 4;

export const ASSET_TYPE_EMPLOYEE = "employees";
export const ASSET_TYPE_POST = "posts";
export const ASSET_TYPE_PROJECT = "projects";


caches.open("employees");


var globalMutexes = new Map();
var waiters = new Map();

export function takeMutex(mutex) {
    const id = Math.random().toString(16).substring(2);
    if (globalMutexes.has(mutex)) {
        globalMutexes.get(mutex).add(id);
    } else {
        globalMutexes.set(mutex, new Set([id]));
    }
    return id;
}


export function waitMutex(scope) {

    return new Promise((resolve) => {
       if (!globalMutexes.has(scope) || globalMutexes.get(scope).size == 0) {
           resolve();
       }

       else {
           if (waiters.has(scope)) {
               waiters.get(scope).push(resolve);
           } else {
               waiters.set(scope, [resolve]);
           }
       }
        
    });

}

export function releaseMutex(mutex, id) {
    if (globalMutexes.has(mutex)) {
        globalMutexes.get(mutex).delete(id);
    }

    if (waiters.has(mutex) && globalMutexes.get(mutex).size == 0) {
        waiters.get(mutex).forEach((resolve) => {
            resolve();
        });
    }
}

export function checkMutex(mutex) {
    return globalMutexes.has(mutex) && globalMutexes.get(mutex).size > 0;

}


export class ReusableRollingTimeout {
    
    inner;
    callback;
    duration;

    constructor(callback, duration) {
        this.callback = callback;
        this.duration = duration;
        this.inner = new RollingTimeout(callback, duration);
    }

    roll() {
        if (!this.inner || this.inner.dirty) {
            this.inner = new RollingTimeout(this.callback, this.duration);
        }
        this.inner.roll();
    }

}


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

    cancel() {
        clearTimeout(this._timeout);
        this.dirty = true;
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
                if (cache_emp.headers.get("date") < Date.now() - 5 * 60 * 60) {
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

export const PREFERENCE_NEVER = 2;
export const PREFERENCE_I_LEAD = 1;
export const PREFERENCE_ALWAYS = 0;

const DEFAULT_PREFERENCES = {
    "sidebarisopen": true,
    "taskview": PREFERENCE_I_LEAD, // default to list view
    "tasksort": "name",
    "taskorder": "desc",
    "taskfilters.managermine": false,
    "taskfilters.group": false,
    "taskfilters.single": false,
    "taskfilters.finished": false,
    "taskfilters.inprogress": false,
    "taskfilters.notstarted": false,
    "taskfilters.overdue": false,
    "taskfilters.notoverdue": false,
    "projectsort": "lastAccessed",
    "projectorder": "desc",
    "projectfilters.managermine": false,
    "projectfilters.teamleader": false,
    "projectfilters.overdue": false,
    "projectfilters.notoverdue": false,
    "notificationslastreadat": 0,
}

// we need to set dynamically
getCurrentSession(true).then((session) => {
    const isManager = (session.auth_level ?? 0) >= 2;
    DEFAULT_PREFERENCES.taskview = isManager ? PREFERENCE_NEVER : PREFERENCE_I_LEAD;
});


class PreferenceValue {
    
    inner;
    default;

    constructor(real, defaultv) {
        this.default = defaultv;
        this.inner = real;
    }

    or_default() {
        return this.inner ?? this.default;
    }
}

class PreferenceStore {

    store;
    saver;
    _lazy;
    
    constructor() {
        this._lazy = true;
        this.store = new Map();
        // rolling timeout to save 2s after no changes
        this.saver = new ReusableRollingTimeout(() => {this.save()}, 200);
    }

    async save() {
        await put_api("/employee/meta.php/preferences", {preferences: Object.fromEntries(this.store)});
        document.dispatchEvent(new Event("preferencesave"));
    }

    async _fill() {

        if (checkMutex("preferenceFill")) {
            console.log("[PreferenceStore] someone else is filling the preferences, waiting...")
            await waitMutex("preferenceFill");
            return;
        }
        const handle = takeMutex("preferenceFill");


        const res = await get_api("/employee/meta.php/preferences");
        if (res.success) {
            console.log("[PreferenceStore] preferences fetched successfully")
            this.store = new Map(Object.entries(res.data.preferences))
            this._lazy = false;
            releaseMutex("preferenceFill", handle);
        } else {
            releaseMutex("preferenceFill", handle);
            throw Error(`failed to get preferences (${res.error.code}) ${res.error.message}`)
        }
    }

    async get(key) {
        key = key.toLowerCase();

        if (this._lazy) {
            await this._fill();
        }

        const value =  this.store.get(key);
        return new PreferenceValue(value, DEFAULT_PREFERENCES[key]);
    }

    async get_or_default(key) {
        return (await this.get(key)).or_default();
    }

    async set(key, value) {
        key = key.toLowerCase();
    
        if (this._lazy) {
            await this._fill();
        }
    
        this.store.set(key, value);
        this.saver.roll();
    }

    async delete(key) {
        key = key.toLowerCase();
        this.store.delete(key);
        this.saver.roll();
    }
    
}
export const preferences = new PreferenceStore();
document.preferences = preferences;


export const SETTING_NOBODY = 2;
export const SETTING_MANAGERS_ONLY = 1;
export const SETTING_EVERYONE = 0;



class GlobalSettings {
    
    _inner;
    _lazy;

    constructor() {
        this._lazy = true;
    }


    async fill() {

        if (checkMutex("globalSettingsFill")) {
            console.log("[GlobalSettings] someone else is filling the settings, waiting...")
            await waitMutex("globalSettingsFill");
            return;
        }
        const handle = takeMutex("globalSettingsFill");
        console.log("[GlobalSettings] taking mutex")



        const res = await get_api("/employee/meta.php/globalsettings");
        if (res.success) {
            console.log("[GlobalSettings] settings fetched successfully")
            this._inner = res.data.settings;
            this._lazy = false;
            releaseMutex("globalSettingsFill", handle);
        } else {
            releaseMutex("globalSettingsFill", handle);
            throw Error(`failed to get settings (${res.error.code}) ${res.error.message}`)
        }
    }

    async get(key) {
        if (this._lazy) {
            await this.fill();
        }
        return this._inner[key];
    }

    async set(key, value) {
        if (this._lazy) {
            await this.fill();
        }
        this._inner[key] = value;
        await put_api("/employee/meta.php/globalsettings", this._inner);
    }
}

export const siteSettings = new GlobalSettings();
document.siteSettings = siteSettings;



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

    if (date == null) {
        return false;
    }

    let currentDate = new Date();
    let day = date.getDate();
    let month = date.getMonth();
    let year = date.getFullYear();
    let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",  "November", "December"];
    let formattedDate = `${day} ${months[month]} ${year}`;
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
        return "Just now";
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

export function hsvToHex(h,s, v) {
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

    text = text.toUpperCase();
    text = text.substring(0, 2);

    const fontSize = text.length === 1 ? 130 : 115;
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="256px" height="256px" viewBox="0 0 256 256" version="1.1">
        <circle fill="#${colour}" cx="128" width="256" height="256" cy="128" r="128"/>
        <text xmlns="http://www.w3.org/2000/svg" style="color: #fff; line-height: 1; font-family: system-ui" alignment-baseline="middle" text-anchor="middle" font-size="${fontSize}" font-weight="600" dy=".1em" dominant-baseline="middle" fill="#0f0f0f" x="50%" y="50%">${text}</text>
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
function fallbackAvatar(employee, colour) {
    let name = employeeToName(employee);
    let initials = name.split(" ").map((word) => word[0]).join("");
    let degree = Number("0x" + employee.empID.substr(-3)) % 360;
    colour = colour !== undefined ? colour : hsvToHex(degree, 40, 90);
    console.log(`[nameToAvatar] Generated avatar for ${name}: colour ${colour}`)
    return `data:image/svg+xml;base64,${btoa(generateAvatarSvg(initials, colour))}`;
}


export function employeeAvatarOrFallback(employee) {

    if (employee.deleted) {
        return fallbackAvatar(employee, "d8d8d8");
    } else if (employee.avatar) {
        return assetToUrl(ASSET_TYPE_EMPLOYEE, employee.empID, employee.avatar.assetID, employee.avatar.contentType);
    } else {
        return fallbackAvatar(employee);
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

let _globalEmployeeRequest = new GlobalEmployeeRequest();

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

export function revalidateCurrentSession() {
    console.log("[revalidateCurrentSession] session revalidation requested")
    return fetchSession();
}

export async function renewCurrentSession(redirect_on_error = false) {
    let data = await put_api("/employee/session.php/session", undefined, {redirect_on_error:redirect_on_error});

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
 * Detail 4 - Task completed status changed
 * 
 * @param {Array} notifications 
 */

export async function renderNotifications(notifications) {
    let content = topbar.notificationPopover.querySelector('.content');
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
    const session = await getCurrentSession();
    const notifsLastReadAt = new Date(
        (await preferences.get("notificationsLastReadAt")).or_default()
    );
    //no longer need to get projects because they are returned in the notification body
    

    
    //rendering notifications
    notifications.forEach(notification => {
        let icon = ""
        let link = "https://013.team/"
        let desc = "Not Implemented"
        const notificationTime = new Date(notification.time);
        let time = howLongAgo(notificationTime);
        let unreadIndicator = document.querySelector(".notification-popover");

        //notification author
        let empID = notification.author.empID;
        let name;
        if (empID == session.employee.empID) {
            name = "You";
        } else {
            name = employeeToName(employees.get(empID));
        }
        let avatar = employeeAvatarOrFallback(employees.get(empID));

        //notification card
        let notificationCard = document.createElement("a");
        notificationCard.classList.add("notification-card");
        notificationCard.tabindex = -1;

        if (notificationTime >= notifsLastReadAt) {
            console.log("[renderNotifications] notification is unread")
            notificationCard.classList.add("unread");
            unreadIndicator.classList.add("unread");
        }

        
        switch(notification.type) {
            case 0: // post they are following has been edited
            console.log("[renderNotifications] post edited")
                let post = notification.body.post;

                icon = "checkbook";
                link = `/wiki/post/#${post.postID}`;
                notificationCard.href = link;
                notificationCard.tabindex = -1;
                
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
                notificationCard.tabindex = -1;

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
                    case 4: // task has been completed
                        icon = "check_circle";
                        desc = `Changed the completion status of <span>${task.title}</span> in <span>${project.name}</span>.`
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

if (topbar.hamburger !== null) {
    topbar.hamburger.addEventListener("click", () => {
        sidebar.sidebar.classList.toggle("visible")
        sidebarContainer.classList.toggle("sidebar-open")
        document.querySelectorAll(".sidebar-item p").forEach((paragraph) => {
            paragraph.classList.toggle("norender")
        })
    })
}

if (sidebar.closeSidebar !== null) {
    sidebar.closeSidebar.addEventListener("pointerup", () => {

        sidebar.sidebar.classList.toggle("visible")
        sidebarContainer.classList.toggle("sidebar-open")

        document.querySelectorAll(".sidebar-item p").forEach((paragraph) => {
            paragraph.classList.toggle("norender")
        })

    })
}

if (sidebar.logout !== null) {
    sidebar.logout.addEventListener("click", () => {

        delete_api("/employee/session.php/session").then(async () => {
            await clearStorages();
            window.location.href = "/";
        });
        
    });
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

    if (topbar.userAvatar === null) {
        console.error("[fillCurrentUserInfo] topbar.userAvatar is null")
        return;
    }
    console.log("[fillCurrentUserInfo] filling user info")

    getCurrentSession(true).then((session) => {

        if (!session) {
            console.error("[fillCurrentUserInfo] session is null")
            return
        }


        let employee = session.employee;

        let emp_icon = employeeAvatarOrFallback(employee);
        let emp_name = employeeToName(employee);

        let icon = document.createElement("img");
        icon.src=emp_icon;
        icon.classList.add("avatar");
        icon.id = "user-icon";

        topbar.userAvatar.appendChild(icon);
        console.log("[fillCurrentUserInfo] user icon added")
    });
}
export { fillCurrentUserInfo };

function userIconContextMenu() {
    if (topbar.userAvatar === null) {
        return;
    }

    topbar.userAvatar.classList.add('context-menu')
    let contextMenu = document.createElement('div')
    contextMenu.classList.add('context-menu-popover')
    contextMenu.innerHTML = `
        <div class="item action-settings">
            <div class="icon">
                <span class="material-symbols-rounded">
                    settings
                </span>
            </div>
            <div class="text">
                Settings
            </div>
        </div>
        <div class="item action-invite">
            <div class="icon">
                <span class="material-symbols-rounded">
                    mail
                </span>
            </div>
            <div class="text">
                Invite
            </div>
        </div>
        <div class="divider"></div>
        <div class="item action-logout">
            <div class="icon">
                <span class="material-symbols-rounded">
                    logout
                </span>
            </div>
            <div class="text">
                Log out
            </div>
        </div>
    `
    topbar.userAvatar.appendChild(contextMenu)

    topbar.userAvatar.addEventListener('pointerup', (e) => {
        e.stopPropagation()
        topbar.userAvatar.querySelector('.context-menu-popover').classList.toggle('visible')
    })

    document.addEventListener('pointerdown', (e) => {
        if (!topbar.userAvatar.contains(e.target)) {
            topbar.userAvatar.querySelector('.context-menu-popover').classList.remove('visible')
        }

    })

    //context menu items
    let contextMenuItems = contextMenu.querySelectorAll(".item");
    contextMenuItems.forEach(item => {
        item.addEventListener("pointerup", (e) => {
            e.stopPropagation();
            if (item.classList.contains("action-settings")) {
                console.log("[User Icon Redirect] Redirecting to profile page")
                window.location.href = "/settings";
            } else if (item.classList.contains("action-invite")) {
                console.log("[User Icon Redirect] Redirecting to invite page")
            } else if (item.classList.contains("action-logout")) {
                console.log("[User Icon Redirect] Logging out")
                delete_api("/employee/session.php/session").then(async () => {
                    await clearStorages();
                    window.location.href = "/";
                });
            } else {
                console.error("[User Icon Redirect] unknown action")
            }
        });
    });
}

export function setBreadcrumb(breadcrumbPaths, hrefs) {

    if (checkMutex("locationHash")) {
        console.log("[setBreadcrumb] locationHash mutex is locked, ignoring setBreadcrumb");
        return;
    }
    const id = takeMutex("locationHash");

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

    const url = new URL(last, document.location);
    document.location.hash = url.hash;

    releaseMutex("locationHash", id);
}

export function getLocationHashArray() {
    if (document.location.hash) {
        return document.location.hash.substring(1).split("-");
    } else {
        return [];
    }
}

window.addEventListener("popstate", async (e) => {

    if (checkMutex("locationHash")) {
        console.log("[popstate] locationHash mutex is locked, ignoring popstate");
        return;
    }

    //this closes anythign that is open like context menu or notification popover
    document.activeElement.blur();

    await new Promise(r => setTimeout(r, 50));
    dispatchBreadcrumbnavigateEvent(e.type);
});



/**
 * dispatches a 'breadcrumbnavigate' event from a specified source.
 *
 * @param {string} src - the navigation source
 * @param {Array} [locations=getLocationHashArray()] - an optional array of location hashes. default = `getLocationHashArray()`.
 * @fires window#breadcrumbnavigate
 */
export function dispatchBreadcrumbnavigateEvent(src, locations  = getLocationHashArray()) {

    console.log(`[dispatchBreadcrumbnavigate] dispatching from ${src}`);

    let event = new Event("breadcrumbnavigate");
    event.locations = locations;
    window.dispatchEvent(event);
}


if (window.location.pathname !== '/' || window.location.pathname !== '/register/') {

    setTimeout(() => {
        if (sidebarContainer !== null) {
            sidebar.sidebar.classList.add('transition');

            document.addEventListener('click', (e) => {
                const sidebarVisible = sidebar.sidebar.classList.contains('visible');
                const clickSidebar = sidebar.sidebar.contains(e.target);
                const clickHamburger = topbar.hamburger.contains(e.target);
                
                if (window.innerWidth < 600 && sidebarVisible && !clickSidebar && !clickHamburger) {
                    sidebar.sidebar.classList.toggle('visible');
                    sidebarContainer.classList.toggle('sidebar-open');
                    sidebar.items.forEach((paragraph) => {
                        paragraph.classList.toggle('norender');
                    });
                }
            });
        }
    }, 200);

    if (sidebarContainer !== null) {

        preferences.get_or_default("sidebarIsOpen").then((sidebarIsOpen) => {

            if(window.innerWidth > 600 && sidebarIsOpen === true) {
                console.log("[init] setting sidebar to open")
                sidebar.sidebar.classList.add("visible")
                sidebarContainer.classList.add("sidebar-open")
                document.querySelectorAll(".sidebar-item p").forEach((paragraph) => {
                    paragraph.classList.remove("norender")
                })
            } else {
                console.log("[init] setting sidebar to closed")
                sidebar.sidebar.classList.remove("visible")
                sidebarContainer.classList.remove("sidebar-open")
                document.querySelectorAll(".sidebar-item p").forEach((paragraph) => {
                    paragraph.classList.add("norender")
                })
            }
        });

    }

    fillCurrentUserInfo();
    userIconContextMenu();
    managerElementsEnableIfManager();

    let unreadIndicator = document.querySelector(".notification-popover");

    if (topbar.topbar !== null) {
        getEmployeeNotifications().then((items) => {
            if (items.length > 0) {
                console.log("[getEmployeeNotifications] notifications found and display badge");
                console.log(items);
                notifications = items
                renderNotifications(items);
            }
        });
        notificationReadButton.addEventListener("pointerup", async () => {
            await preferences.set("notificationsLastReadAt", (new Date()).toUTCString());
            document.querySelectorAll(".notification-card.unread").forEach((card) => {
                card.classList.remove("unread");
            });
            unreadIndicator.classList.remove("unread");

        });
    }

}


// session timeout
setInterval(async () => {
    let session = await getCurrentSession(true);
    if (!session) {
        return;
    }

    let expires = new Date(session.expires);
    let now = new Date((new Date()).toUTCString());

    let diff = expires - now;
    let lastActive = now - new Date(GLOBAL_LAST_ACTIVE.toUTCString());
    console.log(`[sessionTimeout] ${diff}ms remaining on session`);
    console.log(`[sessionTimeout] user last active ${lastActive}ms ago`);


    if (diff < 0) {
        console.log("[sessionTimeout] session has expired, redirecting to login");
        let after_login = window.location.pathname + window.location.hash
        window.location.href = `/#${after_login}&sessionexpired`;
    }

    
    if (diff < 10 * 60 * 1000) {

        if (lastActive < 15 * 60 * 1000) {

            console.log("[sessionTimeout] session expires in under 10 minutes, renewing");
            await renewCurrentSession(true);
        } else {
            console.log("[sessionTimeout] user has not been active in the last 15 minutes, wont renew session");
        }
    }
}, 60 * 1000);

// set last active time
document.addEventListener("mousemove", (e) => {
    GLOBAL_LAST_ACTIVE = new Date();
    skipModals = e.shiftKey;
});
document.addEventListener("keydown", () => {
    GLOBAL_LAST_ACTIVE = new Date();
});

var skipModals = false;

export function queryModalSkip() {

    // we gotta check that the shift key is STILL down in case they alt tab
    if (!skipModals) {
        document.querySelectorAll(".modal-skippable").forEach((modal) => {
            modal.classList.remove("modal-skippable-active");
        });
    }

    return skipModals;

}


document.addEventListener("keydown", (e) => {

    if (e.key != "Shift") {
        return
    }

    console.log("[modalSkipper] setting skip");

    document.querySelectorAll(".modal-skippable").forEach((modal) => {
        modal.classList.add("modal-skippable-active");
    });

    skipModals = true;
});

document.addEventListener("keyup", (e) => {
    if (e.key != "Shift") {
        return
    }
    console.log("[modalSkipper] no longer skipping");
    skipModals = false;
    document.querySelectorAll(".modal-skippable").forEach((modal) => {
        modal.classList.remove("modal-skippable-active");
    });
});

const actionInvite = document.querySelector(".action-invite");

if (actionInvite) {
    actionInvite.addEventListener("pointerup", () => {
        invitePopup();
    });
}

function invitePopup() {
    
    let emailValue;

    const callback = (ctx) => {

        const {content, actionButton} = ctx;

        actionButton.classList.add("disabled");

        const text = document.createElement("div");
        text.classList.add("modal-text");
        text.innerText = "Enter the email of the employee you want to invite";
        content.appendChild(text);

        const emailInput = document.createElement("input");
        emailInput.type = "email";
        emailInput.placeholder = "email@make-it-all.co.uk";
        emailInput.id = "invite-email";
        content.appendChild(emailInput);

        emailInput.addEventListener("input", (e) => {
            emailValue = emailInput.value;
            if (emailInput.value.includes("@") && emailInput.value.includes(".")){
                actionButton.classList.remove("disabled");

                if (e.key == "Enter") {
                    ctx.completeModal(true);
                }

            } else {
                actionButton.classList.add("disabled");
            }
        });

    }

    popupModal(false, "Invite Employee", callback, {text: "Invite", class: "blue"}).then(async () => {
        const res = await post_api("/employee/session.php/invite", {email: emailValue});
        if (res.success) {
            popupAlert("Invite sent", `We have sent an invitation to ${emailValue}`, "success");
        } else {
            popupAlert("Unable to send an invite", `Something went wrong: ${res.error.message}`, "error");
        }
    });
}


/**
 * Displays a popup modal with the given parameters.
 * @param {boolean} skippable - Indicates whether the modal can be skipped.
 * @param {string} title - The title of the modal.
 * @param {function} popupCallback - A callback function given the popup elements.
 * @param {object} action_button - Object for action button properties.
 * @param {string} action_button.text - The text to display on the action button.
 * @param {string} action_button.class - The CSS class to apply to the action button.
 * @param {boolean} handleResolve - Indicates whether the modal should automatically resolve when the action button is pressed.
 * @returns {Promise} - A promise that resolves when the modal is completed successfully, and rejects when it is canceled or closed.
 */
export function popupModal(
    skippable,
    title,
    popupCallback,
    action_buttion,
    handleResolve = true,
) {
    return new Promise(async (resolve, reject) => {


        if (checkMutex("popupModal")) {
            console.log("[popupModal] mutex is taken")
            reject();
        }
        console.log("[popupModal] taking mutex")
        const handle = takeMutex("popupModal");


        if (skippable && queryModalSkip()) {
            console.log("[popupModal] modal skipped");
            releaseMutex("popupModal", handle);
            resolve();
            return;
        }

        const escListener = (e) => {
            if (e.key != "Escape") { return; };
            completeModal(false);
        }

        document.addEventListener("keydown", escListener);


        function completeModal(success) {
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            fullscreenDiv.style.pointerEvents = 'auto';
            document.removeEventListener("keydown", escListener);

            releaseMutex("popupModal", handle);

            if (success) {
                resolve();
            } else {
                reject();
            }
        }



        let popupDiv = document.querySelector('.popup');
        let fullscreenDiv = document.querySelector('.fullscreen');

        let skipableTip = "";
        if (skippable) {
            skipableTip = `<div class="modal-tip">
                <span class="modal-tip-title">TIP</span>
                <span class="modal-tip-text">Hold <kbd>SHIFT</kbd> to skip this popup</span>
            </div>`
        }


        popupDiv.innerHTML = `
            <dialog open class='modal-dialog'>
                <div class="modal-title">
                    <div id="modal-icon"></div>
                    <div class="title-content">${title}</div>
                    <div class="small-icon" id="close-button">
                        <span class="material-symbols-rounded">
                            close
                        </span>
                    </div>
                </div>
                <div id="modal-content"></div>

                <div class="modal-actions">
                    ${skipableTip}
                    <div class="modal-buttons">
                        <div class="text-button" id="cancel-button">
                            <div class="button-text">Cancel</div>
                        </div>
                        <div class="text-button" id="action-button">
                            <div class="button-text">${action_buttion.text}</div>
                        </div>
                    </div>
                </div>
            </dialog>
        `;
        fullscreenDiv.style.filter = 'brightness(0.75)';
        fullscreenDiv.style.pointerEvents = 'none';

        const content = popupDiv.querySelector('#modal-content');
        const dialog = popupDiv.querySelector('.modal-dialog');
        const closeButton = dialog.querySelector('#close-button');
        const cancelButton = dialog.querySelector('#cancel-button');
        const actionButton = dialog.querySelector('#action-button');
        const modalIcon = dialog.querySelector('#modal-icon');

        const context = {
            content: content,
            dialog: dialog,
            closeButton: closeButton,
            cancelButton: cancelButton,
            actionButton: actionButton,
            completeModal: completeModal,
            icon: modalIcon,
        }


        try {
            popupCallback(context);
        } catch (e) {
            console.error("[popupModal] contentCallback failed, abandoning modal");
            console.error(e);
            completeModal(false);
        }

        actionButton.classList.add(action_buttion.class);


        closeButton.addEventListener('pointerup', (event) => {
            event.preventDefault();
            completeModal(false);
        });

        cancelButton.addEventListener('pointerup', (event) => {
            event.preventDefault();
            completeModal(false);
        });

        if (handleResolve) {
            actionButton.addEventListener('pointerup', (event) => {
                event.preventDefault();
                completeModal(true);
            });
        }

    });
}

/**
 * Displays an alert popup modal with the specified title, content, and type.
 * 
 * @param {string} title - The title of the alert.
 * @param {string} content - The HTML content of the alert.
 * @param {string} type - The type of the alert. (error, warning, info, success)
 * @returns {Promise} - A promise that resolves OR rejects when the alert is closed.
 */
export function popupAlert(title, content, type) {

    let icon;
    let colour;
    switch (type) {
        case "error":
            icon = "error";
            break;
        case "warning":
            icon = "warning";
            break;
        case "info":
            icon = "info";
            break;
        case "success":
            icon = "check_circle";
            break;
    }

    const callback = (ctx) => {

        ctx.icon.innerHTML = `<span class="material-symbols-rounded alert-icon ${type}">${icon}</span>`;

        ctx.content.innerHTML = content;
        ctx.cancelButton.classList.add("norender");
    }

    return popupModal(
        false,
        title,
        callback,
        {text: "OK", class: "blue"}
    );



}


const BRACKET_REGEX = /\(.+\) +/g;
/**
 * Trims the given text to the desired length.
 * 
 * @param {string} text - The text to be trimmed.
 * @param {number} desiredLength - The desired length of the trimmed text.
 * @returns {string} - The trimmed text.
 */
export function trimText(text, desiredLength) {
    if (text.length > desiredLength) {

        // remove brackets if they exist
        if (text.match(BRACKET_REGEX)) {
            return trimText(text.replace(BRACKET_REGEX, ""), desiredLength);
        }
        
        return text.substring(0, desiredLength-3) + "...";
    } else {
        return text;
    }
}

var arrowNavGeneration = 0;
export function applyArrowNavigable() {

    const selectors = [
        '[tabindex]:not([tabindex="-1"])',
        'a[href]:not([tabindex="-1"])',
    ]

    

    const elements = Array.from(document.querySelectorAll(
        selectors.join(", ")
    )).filter((element) => { return element.offsetParent !== null });

    console.log(`[applyArrowNavigable] found ${elements.length} elements`);
    arrowNavGeneration++;
    const currentGeneration = arrowNavGeneration;

    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];

        // backtrack to find an element with a different parent
        let myParent = element.parentElement;

        let firstSameParent;
        let lastSameParent;
        
        for (let j = i-1; j >= 0; j--) {
            if (elements[j].parentElement != myParent) {
                firstSameParent = elements[j+1];
                break;
            }
        }

        for (let j = i+1; j < elements.length; j++) {
            if (elements[j].parentElement != myParent) {
                lastSameParent = elements[j-1];
                break;
            }
        }


        const previousElement = elements[i-1];
        const nextElement = elements[i+1];

        lastSameParent = lastSameParent == element ? null : lastSameParent;
        firstSameParent = firstSameParent == element ? null : firstSameParent;
    
        element.addEventListener("keydown", (e) => {

            // lousy workaround for the fact that we can't remove event listeners
            // without a reference to the function
            // and the function captures the current environment
            // so we cant define it statically
            if (arrowNavGeneration != currentGeneration) {
                return;
            }

            // if element not focused, ignore
            if (document.activeElement != element) {
                return;
            }


            if (e.key == "ArrowLeft") {
                e.preventDefault();

                const elem = e.ctrlKey ? (firstSameParent ?? previousElement) : previousElement;

                console.log("[applyArrowNavigable] back to", previousElement)
                if (elem) {
                    elem.focus();
                }
            } else if (e.key == "ArrowRight") {
                e.preventDefault();

                const elem = e.ctrlKey ? (lastSameParent ?? nextElement) : nextElement;

                console.log("[applyArrowNavigable] forward to", elem)
                if (elem) {
                    elem.focus();
                }
            }
        });
    }
}

const arrowNavObserver = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            arrowNavRoller.roll();
        }
    }
});

// roll it so we dont waste resources as redraws happen a lot
const arrowNavRoller = new ReusableRollingTimeout(() => {
    applyArrowNavigable();
}, 500);

arrowNavObserver.observe(document.body, {childList: true, subtree: true});