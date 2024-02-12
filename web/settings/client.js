import * as global from "../global-ui.js"

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



global.setBreadcrumb(["Settings", "Account"], ["../", '#' + "account"])
