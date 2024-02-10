//injects the topbar html into the topbar element on the page, with event listeners for actions
//gets imported into global-ui.js as topbar, so items can be accessed by topbar.items
//page needs to have a single topbar element declared with a set height so we dont get layout shift

console.log("[import] topbar.js loaded");

export var topbar = null
export var items = null
if (document.querySelector('.topbar')) {
    topbar = document.querySelector('.topbar');
}

export const left = document.createElement('div')
left.classList.add('left');

export const center = document.createElement('div')
center.classList.add('center');

export const right = document.createElement('div')
right.classList.add('right');

export const hamburger = document.createElement('div')
hamburger.id = 'hamburger';

export const breadcrumb = document.createElement('div')
breadcrumb.classList.add('breadcrumb');

export const logo = document.createElement('img')
logo.classList.add('fullLogo');
logo.src = 'https://cdn.013.team/assets/logo-large.png';
logo.alt = 'logo';

export const search = document.createElement('div')
search.classList.add('search', 'white');
search.id = 'global-search';

export const notificationPopover = document.createElement('div')
notificationPopover.classList.add('notification-popover', 'item');
notificationPopover.id = 'inbox-icon';
notificationPopover.tabIndex = 0;

export const userAvatar = document.createElement('div')
userAvatar.classList.add('item');
userAvatar.id = 'user-icon-container';



hamburger.innerHTML = `<span class="material-symbols-rounded">menu</span>`

search.innerHTML = `
    <input id="search" class="search-input" type="text" autocomplete="off" placeholder="Search"></input>
    <div class="search-icon">
        <span class="material-symbols-rounded">search</span>
    </div>
    <div class="search-icon clear-icon">
        <span class="material-symbols-rounded" id="delete-search">close</span>
    </div>
`;

notificationPopover.innerHTML = `
    <div class="icon-button no-box">
        <div class="button-icon">
            <span class="material-symbols-rounded">
                inbox
            </span>
        </div>
    </div>
    <div class="popover-content">
        <div class="title">
            <div class="icon">
                <span class="material-symbols-rounded">
                    inbox
                </span>
            </div>
            Activity
            <div class="small-icon tooltip tooltip-left" id="read-all" tabindex="0">
                <p class="tooltiptext">Read all</p>
                <span class="material-symbols-rounded">
                    done_all
                </span>
            </div>
        </div>
        <div class="content">
            There is no activity to display.
        </div>
    </div>
`

left.appendChild(hamburger);
left.appendChild(logo);
left.appendChild(breadcrumb);


right.appendChild(search);
right.appendChild(notificationPopover);
right.appendChild(userAvatar);

//injects before all the page content within .topbar-container
if (topbar !== null) {
    topbar.appendChild(left);
    topbar.appendChild(center);
    topbar.appendChild(right);
    items = document.querySelectorAll('.item');
}



