//injects the sidebar html into the start of the sidebar-container element on the page, no matter what html is there

const sidebarContainer = document.querySelector('.sidebar-container');

export const sidebar = document.createElement('div').classList.add('sidebar', 'visible');

export const mobileSidebarHeader = document.createElement('div').classList.add('mobile-sidebar-header');
export const fullLogo = document.createElement('img').classList.add('fullLogo');
fullLogo.src = 'https://cdn.013.team/assets/wordmark-large.png';
fullLogo.alt = 'logo';
export const closeSidebar = document.createElement('div').classList.add('small-icon').id = 'close-sidebar';

export const home = document.createElement('div').classList.add('sidebar-item').id = 'home';
export const mylist = document.createElement('div').classList.add('sidebar-item').id = 'mylist';
export const wiki = document.createElement('div').classList.add('sidebar-item').id = 'wiki';
export const workload = document.createElement('div').classList.add('sidebar-item', 'manager-only', 'norender').id = 'workload';
export const training = document.createElement('div').classList.add('sidebar-item', 'manager-only', 'norender').id = 'training';
export const logout = document.createElement('div').classList.add('sidebar-item').id = 'logout';

closeSidebar.innerHTML = `<span class="material-symbols-rounded">close</span>`;

mobileSidebarHeader.appendChild(fullLogo);
mobileSidebarHeader.appendChild(closeSidebar);

home.innerHTML = `<span class="material-symbols-rounded">home</span> <p class="">Projects</p>`;
mylist.innerHTML = `<span class="material-symbols-rounded">checklist</span> <p class="">My List</p>`;
wiki.innerHTML = `<span class="material-symbols-rounded">menu_book</span> <p class="">Wiki</p>`;
workload.innerHTML = `<span class="material-symbols-rounded">speed</span> <p class="">Workload</p>`;
training.innerHTML = `<span class="material-symbols-rounded">school</span> <p class="">Training</p>`;
logout.innerHTML = `<span class="material-symbols-rounded">logout</span> <p class="">Logout</p>`;

sidebar.appendChild(mobileSidebarHeader);
sidebar.appendChild(home);
sidebar.appendChild(mylist);
sidebar.appendChild(wiki);
sidebar.appendChild(workload);
sidebar.appendChild(training);
sidebar.appendChild(logout);

sidebarContainer.appendChild(sidebar);
