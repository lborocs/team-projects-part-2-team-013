import * as global from "../global-ui.js";

const accountTab = document.querySelector('.account');
const preferencesTab = document.querySelector('.preferences');
const systemTab = document.querySelector('.system');

const tabs = document.querySelectorAll('.tab');

const accountOptions = document.querySelector('.account-options');
const preferencesOptions = document.querySelector('.preferences-options');
const systemOptions = document.querySelector('.system-options');

accountTab.addEventListener('click', () => {
    accountOptions.classList.remove('norender');
    preferencesOptions.classList.add('norender');
    systemOptions.classList.add('norender');

    tabs.forEach(tab => {
        tab.classList.remove('active-tab');
    })

    accountTab.classList.add('active-tab');

    global.setBreadcrumb(["Settings", "Account"], ["../", '#' + "account"])
})

preferencesTab.addEventListener('click', () => {
    accountOptions.classList.add('norender');
    preferencesOptions.classList.remove('norender');
    systemOptions.classList.add('norender');

    tabs.forEach(tab => {
        tab.classList.remove('active-tab');
    })

    preferencesTab.classList.add('active-tab');

    global.setBreadcrumb(["Settings", "Preferences"], ["../", '#' + "preferences"])
})

systemTab.addEventListener('click', () => {
    accountOptions.classList.add('norender');
    preferencesOptions.classList.add('norender');
    systemOptions.classList.remove('norender');

    tabs.forEach(tab => {
        tab.classList.remove('active-tab');
    })

    systemTab.classList.add('active-tab');

    global.setBreadcrumb(["Settings", "System"], ["../", '#' + "system"])
})

//dropdown menu event listeners

document.addEventListener('click', function(event) {
    if (!avatarOptions.contains(event.target)) {
        avatarOptions.classList.remove('open');
    }
    if (!postingOptions.contains(event.target)) {
        postingOptions.classList.remove('open');
    }
});

let avatarOptions = document.querySelector('#avatar-options');
avatarOptions.addEventListener('click', () => {
    if (avatarOptions.classList.contains('open')) {
        avatarOptions.classList.remove('open');
    } else {
        avatarOptions.classList.toggle('open');
    }
})

let avatarDropdown = document.querySelectorAll('.avatar-option');
avatarDropdown.forEach((option) => {
    option.addEventListener('click', () => {
        avatarOptions.classList.remove('open');
        
    })
})

let postingOptions = document.querySelector('#posting-options');
postingOptions.addEventListener('click', () => {
    if (postingOptions.classList.contains('open')) {
        postingOptions.classList.remove('open');
    } else {
        postingOptions.classList.toggle('open');
    }
})

let postingDropdown = document.querySelectorAll('.posting-option');
postingDropdown.forEach((option) => {
    option.addEventListener('click', () => {
        postingOptions.classList.remove('open');
    })
})


global.setBreadcrumb(["Settings", "Account"], ["../", '#' + "account"])

