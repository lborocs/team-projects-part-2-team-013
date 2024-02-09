//injects the topbar html into the start of the fullscreen element on the page, no matter what html is there

export const fullscreen = document.querySelector('.fullscreen');

export const topbar = document.createElement('header').classList.add('topbar');

export const left = document.createElement('div').classList.add('left');
export const center = document.createElement('div').classList.add('center');
export const right = document.createElement('div').classList.add('right');

export const hamburger = document.createElement('div').id = 'hamburger';
export const breadcrumb = document.createElement('div').classList.add('breadcrumb');

export const logo = document.createElement('img').src = 'https://cdn.013.team/assets/wordmark-large.png';

export const search = document.createElement('div').classList.add('search', 'white');
export const notificationPopover = document.createElement('div').classList.add('notification-popover', 'item');
export const userIconContainer = document.createElement('div').classList.add('item');

hamburger.innerHTML = `
    <span class="material-symbols-rounded">
        menu
    </span>
`

logo.classList.add('fullLogo');
logo.alt = 'logo';

search.id = 'global-search';
search.innerHTML = `
    <input id="search" class="search-input" type="text" autocomplete="off" placeholder="Search"></input>
    <div class="search-icon">
        <span class="material-symbols-rounded">search</span>
    </div>
    <div class="search-icon clear-icon">
        <span class="material-symbols-rounded" id="delete-search">close</span>
    </div>
`;

notificationPopover.id = 'inbox-icon';
notificationPopover.tabIndex = 0;
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
userIconContainer.id = 'user-icon-container';

left.appendChild(hamburger);
left.appendChild(breadcrumb);

center.appendChild(logo);

right.appendChild(search);
right.appendChild(notificationPopover);
right.appendChild(userIconContainer);

fullscreen.prepend(topbar);
