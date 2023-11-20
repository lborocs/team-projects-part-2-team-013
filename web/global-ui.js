//single things
export const hamburger = document.querySelector("#hamburger")
export const sidebar = document.querySelector(".sidebar")
export const container = document.querySelector(".sidebar-container")
export const homeButton = document.querySelector("#home")
export const myListButton = document.querySelector("#mylist")
export const wikiButton = document.querySelector("#wiki")
export const workloadButton = document.querySelector("#workload")
export const settingsButton = document.querySelector("#settings")
export const logoutButton = document.querySelector("#logout")

export const userIcon = document.querySelector(".user-both")

//groups of things
export const sidebarItems = document.querySelectorAll(".sidebar-item")
export const topbarItems = document.querySelectorAll(".item")
console.log("loaded global-ui.js")


export function formatDate(date) {
    let day = date.getDate()
    let month = date.getMonth()
    let year = date.getFullYear()
    let ordinal = "th"
    if (day == 1 || day == 21 || day == 31) {
        ordinal = "st"
    } else if (day == 2 || day == 22) {
        ordinal = "nd"
    } else if (day == 3 || day == 23) {
        ordinal = "rd"
    }
    let shortMonths = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."]
    let formattedDate = `${day}${ordinal} ${shortMonths[month]} ${year}`
    return formattedDate
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

export function nameToAvatar(name) {
    let degree = hash(name) % 360;
    let colour = hsvToHex(degree, 40, 90);
    return `https://ui-avatars.com/api/?name=${name.replace(" ", "-")}&background=${colour}&size=256&color=000&rounded=true`
}

export function bothNamesToString(fname, sname) {
    if (fname == undefined) {
        return sname
    } else {
        return fname + " " + sname;
    }
}

//utility functions
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

//event listeners
hamburger.addEventListener("click", () => {
    sidebar.classList.toggle("visible")
    container.classList.toggle("sidebar-open")
    document.querySelectorAll(".sidebar-item p").forEach((paragraph) => {
        paragraph.classList.toggle("norender")
    })
})

homeButton.addEventListener("click", () => {
    animate(homeButton, "click")
    setTimeout(() => {
        window.location.href = "/dashboard/";
    }, 150)
});

myListButton.addEventListener("click", () => {
    animate(myListButton, "click")
    setTimeout(() => {
        window.location.href = "/personal/";
    }, 150)
});

wikiButton.addEventListener("click", () => {
    animate(wikiButton, "click")
    setTimeout(() => {
        window.location.href = "/wiki/";
    }, 150)
});

workloadButton.addEventListener("click", () => {
    animate(homeButton, "click")
    setTimeout(() => {
        window.location.href = "/workload/";
    }, 150)
});

logoutButton.addEventListener("click", () => {
    animate(logoutButton, "click")
    delete_api("/api/employee/session.php/session").then(() => {
        sessionStorage.clear();
        window.location.href = "/";
    });
});

sidebarItems.forEach((sidebarItem, i) => {
    sidebarItem.addEventListener("click", () => {
        if (!sidebarItem.classList.contains("selected")) {
            sidebarItem.classList.add("selected")
            sidebarItems.forEach((item, j) => {
                if (j !== i) {
                    item.classList.remove("selected")
                }
            })
            console.log("selected")
        } 
    })
})

export function managerElementsEnableIfManager() {
    let session = JSON.parse(sessionStorage.getItem("session"));
    if (!session) {
        return
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
}


function fillCurrentUserInfo() {
    let session = JSON.parse(sessionStorage.getItem("session"));
    if (!session) {
        return
    }
    let employee = session.employee;

    let emp_name = bothNamesToString(employee.firstName, employee.lastName);
    let emp_icon = nameToAvatar(emp_name);


    let icon = document.createElement("img");
    icon.src=emp_icon;
    icon.classList.add("avatar");

    document.getElementById("user-icon").replaceChildren(
        icon
    );
    document.getElementById("user-name").innerText = emp_name;
}

fillCurrentUserInfo();

export async function getEmployeesById(employees) {
    let found = new Map();
    let to_req = new Set(employees);

    if (to_req.size != 0) {
        let res = await get_api("/api/employee/employee.php/bulk?ids=" + Array.from(to_req).join(","));
        console.log(res);
        return new Map([...found, ...Object.entries(res.data.employees)]);
    } else {
        return new Map([...found]);
    }

}
managerElementsEnableIfManager();