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

export const closeSidebar = document.createElement('a')
closeSidebar.classList.add('small-icon')
closeSidebar.id = 'close-sidebar';

export const home = document.createElement('a')
home.classList.add('sidebar-item')
home.id = 'home';
home.setAttribute('href', '/projects/');

export const personal = document.createElement('a')
personal.classList.add('sidebar-item')
personal.id = 'mylist';
personal.setAttribute('href', '/personal/');

export const wiki = document.createElement('a')
wiki.classList.add('sidebar-item')
wiki.id = 'wiki';
wiki.setAttribute('href', '/wiki/');

export const workload = document.createElement('a')
workload.classList.add('sidebar-item', 'manager-only', 'norender')
workload.id = 'workload';
workload.setAttribute('href', '/workload/');

export const training = document.createElement('a')
training.classList.add('sidebar-item', 'manager-only', 'norender')
training.id = 'training';
training.setAttribute('href', '/dashboard/');

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


//selects the right sidebar item when clicked
let selectedItem = null;
if (items !== null) {
    items.forEach((item) => {
        item.addEventListener("pointerup", (e) => {

            if (e.button !== 0) {
                return
            }

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

        if (item.getAttribute('href') === window.location.pathname) {
            item.classList.add("selected")
        }
    })
}





