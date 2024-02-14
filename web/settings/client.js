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
    if (!tagsOptions.contains(event.target)) {
        tagsOptions.classList.remove('open');
    }
    if (!listOptions.contains(event.target)) {
        listOptions.classList.remove('open');
    }
    if (!sortProjectsType.contains(event.target)) {
        sortProjectsType.classList.remove('open');
    }
    if (!sortTasksType.contains(event.target)) {
        sortTasksType.classList.remove('open');
    }
    if (!sortTasksDirection.contains(event.target)) {
        sortTasksDirection.classList.remove('open');
    }
    if (!sortProjectsDirection.contains(event.target)) {
        sortProjectsDirection.classList.remove('open');
    }
});

let avatarOptions = document.querySelector('#avatar-options');
avatarOptions.addEventListener('click', () => {
    avatarOptions.classList.toggle('open');
});

let avatarMenu = document.querySelectorAll('.avatar-option');
avatarMenu.forEach((option) => {
    option.addEventListener('click', (event) => {
        document.querySelector('#avatar-text').innerHTML = option.innerHTML;
        avatarOptions.classList.remove('open');
        event.stopPropagation();
    })
})

let postingOptions = document.querySelector('#posting-options');
postingOptions.addEventListener('click', () => {
    postingOptions.classList.toggle('open');
});

let postingMenu = document.querySelectorAll('.posting-option');
postingMenu.forEach((option) => {
    option.addEventListener('click', (event) => {
        document.querySelector('#posting-text').innerHTML = option.innerHTML;
        postingOptions.classList.remove('open');
        event.stopPropagation();
    })
})

let tagsOptions = document.querySelector('#tags-options');
tagsOptions.addEventListener('click', () => {
    tagsOptions.classList.toggle('open');
});

let tagsMenu = document.querySelectorAll('.tags-option');
tagsMenu.forEach((option) => {
    option.addEventListener('click', (event) => {
        document.querySelector('#tags-text').innerHTML = option.innerHTML;
        tagsOptions.classList.remove('open');
        event.stopPropagation();
    })
})

let listOptions = document.querySelector('#list-options');
listOptions.addEventListener('click', () => {
    listOptions.classList.toggle('open');
});

let listMenu = document.querySelectorAll('.list-option');
listMenu.forEach((option) => {
    option.addEventListener('click', (event) => {
        document.querySelector('#list-text').innerHTML = option.innerHTML;
        listOptions.classList.remove('open');
        event.stopPropagation();
    })
})

let sortProjectsType = document.querySelector('#sort-projects-type');
sortProjectsType.addEventListener('click', () => {
    sortProjectsType.classList.toggle('open');
});

let sortProjectsMenu = document.querySelectorAll('.sort-projects-type');
sortProjectsMenu.forEach((option) => {
    option.addEventListener('click', (event) => {
        document.querySelector('#sort-projects-type-text').innerHTML = option.innerHTML;
        sortProjectsType.classList.remove('open');
        event.stopPropagation();
    })
})

let sortProjectsDirection = document.querySelector('#sort-projects-direction');
sortProjectsDirection.addEventListener('click', () => {
    sortProjectsDirection.classList.toggle('open');
});

let sortProjectsDirectionMenu = document.querySelectorAll('.sort-projects-direction-option');
sortProjectsDirectionMenu.forEach((option) => {
    option.addEventListener('click', (event) => {
        document.querySelector('#sort-projects-direction-text').innerHTML = option.innerHTML;
        sortProjectsDirection.classList.remove('open');
        event.stopPropagation();
    })
})

let sortTasksType = document.querySelector('#sort-tasks-type');
sortTasksType.addEventListener('click', () => {
    sortTasksType.classList.toggle('open');
});

let sortTasksMenu = document.querySelectorAll('.sort-tasks-type');
sortTasksMenu.forEach((option) => {
    option.addEventListener('click', (event) => {
        document.querySelector('#sort-tasks-type-text').innerHTML = option.innerHTML;
        sortTasksType.classList.remove('open');
        event.stopPropagation();
    })
})

let sortTasksDirection = document.querySelector('#sort-tasks-direction');
sortTasksDirection.addEventListener('click', () => {
    sortTasksDirection.classList.toggle('open');
});

let sortTasksDirectionMenu = document.querySelectorAll('.sort-tasks-direction-option');
sortTasksDirectionMenu.forEach((option) => {
    option.addEventListener('click', (event) => {
        document.querySelector('#sort-tasks-direction-text').innerHTML = option.innerHTML;
        sortTasksDirection.classList.remove('open');
        event.stopPropagation();
    })
})


global.setBreadcrumb(["Settings", "Account"], ["../", '#' + "account"])

