//injects the sidebar html into the sidebar element on the page, with event listeners for actions
//gets imported into global-ui.js as sidebar, so items can be accessed by sidebar.items
//page needs to have a single sidebar element declared with a set width so we dont get layout shift
console.log("[import] sidebar.js loaded");

export var sidebar = null
export var items = null
if (document.querySelector('.sidebar')) {
    sidebar = document.querySelector('.sidebar');
}

export const mobileSidebarHeader = document.createElement('div')
mobileSidebarHeader.classList.add('mobile-sidebar-header');

export const logo = document.createElement('img')
logo.classList.add('fullLogo');
logo.src = 'https://cdn.013.team/assets/wordmark-large.png';
logo.alt = 'logo';

export const closeSidebar = document.createElement('div')
closeSidebar.classList.add('small-icon')
closeSidebar.id = 'close-sidebar';

export const home = document.createElement('div')
home.classList.add('sidebar-item')
home.id = 'home';
home.setAttribute('data-url', '/projects/');

export const personal = document.createElement('div')
personal.classList.add('sidebar-item')
personal.id = 'mylist';
personal.setAttribute('data-url', '/personal/');

export const wiki = document.createElement('div')
wiki.classList.add('sidebar-item')
wiki.id = 'wiki';
wiki.setAttribute('data-url', '/wiki/');

export const workload = document.createElement('div')
workload.classList.add('sidebar-item', 'manager-only', 'norender')
workload.id = 'workload';
workload.setAttribute('data-url', '/workload/');

export const training = document.createElement('div')
training.classList.add('sidebar-item', 'manager-only', 'norender')
training.id = 'training';
training.setAttribute('data-url', '/dashboard/');

export const logout = document.createElement('div')
logout.classList.add('sidebar-item')
logout.id = 'logout';



closeSidebar.innerHTML = `<span class="material-symbols-rounded">close</span>`;

mobileSidebarHeader.appendChild(logo);
mobileSidebarHeader.appendChild(closeSidebar);

home.innerHTML = `<span class="material-symbols-rounded">home</span> <p class="">Projects</p>`;
personal.innerHTML = `<span class="material-symbols-rounded">checklist</span> <p class="">My List</p>`;
wiki.innerHTML = `<span class="material-symbols-rounded">menu_book</span> <p class="">Wiki</p>`;
workload.innerHTML = `<span class="material-symbols-rounded">speed</span> <p class="">Workload</p>`;
training.innerHTML = `<span class="material-symbols-rounded">school</span> <p class="">Training</p>`;
logout.innerHTML = `<span class="material-symbols-rounded">logout</span> <p class="">Logout</p>`;

//injects before all the page content within .main
if (sidebar !== null) {
    sidebar.appendChild(mobileSidebarHeader);
    sidebar.appendChild(home);
    sidebar.appendChild(personal);
    sidebar.appendChild(wiki);
    sidebar.appendChild(workload);
    sidebar.appendChild(training);
    sidebar.appendChild(logout);
    items = document.querySelectorAll('.sidebar-item');
}

if (closeSidebar !== null) {
    closeSidebar.addEventListener("pointerup", () => {

        sidebar.classList.toggle("visible")
        sidebarContainer.classList.toggle("sidebar-open")

        document.querySelectorAll(".sidebar-item p").forEach((paragraph) => {
            paragraph.classList.toggle("norender")
        })

    })
}

if (home !== null) {
    home.addEventListener("pointerup", () => {
        window.location.href = "/projects/";
    });
}

if (personal !== null) {
    personal.addEventListener("pointerup", () => {
        window.location.href = "/personal/";
    });
}

if (wiki !== null) {
    wiki.addEventListener("pointerup", () => {
        window.location.href = "/wiki/";
    });
}

if (workload !== null) {
    workload.addEventListener("pointerup", () => {
        window.location.href = "/workload/";
    });
}

if (training !== null) {
    training.addEventListener("pointerup", () => {
        window.location.href = "/dashboard/";
    });
}

//selects the right sidebar item when clicked
let selectedItem = null;
if (items !== null) {
    items.forEach((item) => {
        item.addEventListener("pointerup", () => {
            if (selectedItem) {
                selectedItem.classList.remove("selected")
            }
            item.classList.add("selected")
            selectedItem = item
            console.log("[item] selected")
        });
    });
}

//selects the right sidebar item when the page loads
if (items !== null) {
    items.forEach((item) => {

        if (item.id === "logout") {
            return
        }

        if (item.getAttribute('data-url') === window.location.pathname) {
            item.classList.add("selected")
        }
    })
}





