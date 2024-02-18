import * as global from "../global-ui.js";

const accountTab = document.querySelector('.account');
const preferencesTab = document.querySelector('.preferences');
const systemTab = document.querySelector('.system');
const manageUsersTab = document.querySelector('.manage-users');

const tabs = document.querySelectorAll('.tab');

const accountCard = document.querySelector('.account-card');
const accountOptions = document.querySelector('.account-options');
const preferencesOptions = document.querySelector('.preferences-options');
const systemOptions = document.querySelector('.system-options');
const manageUsersOptions = document.querySelector('.manage-users-options');

accountTab.addEventListener('click', () => {
    accountOptions.classList.remove('norender');
    preferencesOptions.classList.add('norender');
    systemOptions.classList.add('norender');
    manageUsersOptions.classList.add('norender');

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
    manageUsersOptions.classList.add('norender');

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
    manageUsersOptions.classList.add('norender');

    tabs.forEach(tab => {
        tab.classList.remove('active-tab');
    })

    systemTab.classList.add('active-tab');

    global.setBreadcrumb(["Settings", "System"], ["../", '#' + "system"])
})

manageUsersTab.addEventListener('click', () => {
    accountOptions.classList.add('norender');
    preferencesOptions.classList.add('norender');
    systemOptions.classList.add('norender');
    manageUsersOptions.classList.remove('norender');

    tabs.forEach(tab => {
        tab.classList.remove('active-tab');
    })

    manageUsersTab.classList.add('active-tab');

    global.setBreadcrumb(["Settings", "Manage Users"], ["../", '#' + "manage-users"])
})

//dropdown menu event listeners

document.addEventListener('click', function(event) {
    [...preferencesMenus, ...globalSettingsMenus].forEach(({ optionsId }) => {
        let options = document.querySelector(optionsId);
        if (!options.contains(event.target)) {
            options.classList.remove('open');
        }
    });
});

let globalSettingsMenus = [
    { selector: '.avatar-option', textId: '#avatar-text', settingKey: 'avatarsEnabled', optionsId: '#avatar-options' },
    { selector: '.posting-option', textId: '#posting-text', settingKey: 'postsEnabled', optionsId: '#posting-options' },
    { selector: '.tags-option', textId: '#tags-text', settingKey: 'tagsEnabled', optionsId: '#tags-options' },
];

let preferencesMenus = [
    { selector: '.list-option', textId: '#list-text', preferenceKey: 'taskview', optionsId: '#list-options' },
    { selector: '.sort-projects-type', textId: '#sort-projects-type-text', preferenceKey: 'projectsort', optionsId: '#sort-projects-type' },
    { selector: '.sort-projects-direction-option', textId: '#sort-projects-direction-text', preferenceKey: 'projectorder', optionsId: '#sort-projects-direction' },
    { selector: '.sort-tasks-type', textId: '#sort-tasks-type-text', preferenceKey: 'tasksort', optionsId: '#sort-tasks-type' },
    { selector: '.sort-tasks-direction-option', textId: '#sort-tasks-direction-text', preferenceKey: 'taskorder', optionsId: '#sort-tasks-direction' },
];

preferencesMenus.forEach(({ selector, textId, preferenceKey, optionsId }) => {
    let menuOptions = document.querySelectorAll(selector);
    menuOptions.forEach((option) => {
        option.addEventListener('click', async (event) => {
            let selectedOption = option.textContent;
            let storedValue = option.getAttribute('data-value');
            await global.preferences.set(preferenceKey, storedValue);
            document.querySelector(textId).innerHTML = selectedOption;
            document.querySelector(optionsId).classList.remove('open');
            event.stopPropagation();
        });
    });

    let options = document.querySelector(optionsId);
    options.addEventListener('click', (event) => {
        preferencesMenus.forEach(({ optionsId: otherOptionsId }) => {
            if (optionsId !== otherOptionsId) {
                document.querySelector(otherOptionsId).classList.remove('open');
            }
        });
        options.classList.toggle('open');
        event.stopPropagation();
    });
});

const settingsMap = {
    'For Nobody': 2,
    'For Managers Only': 1,
    'For Everybody': 0
};

const reversedSettingsMap = {
    2 : 'For Nobody',
    1 : 'For Managers Only',
    0 : 'For Everybody'
}

globalSettingsMenus.forEach(({ selector, textId, settingKey, optionsId }) => {
    let menuOptions = document.querySelectorAll(selector);
    menuOptions.forEach((option) => {
        option.addEventListener('click', async (event) => {

            let selectedOption = option.textContent;
            let settingValue = settingsMap[selectedOption];
            await global.siteSettings.set(settingKey, settingValue);
            document.querySelector(textId).innerHTML = selectedOption;
            document.querySelector(optionsId).classList.remove('open');
            event.stopPropagation();
        });
    });

    let options = document.querySelector(optionsId);
    options.addEventListener('click', (event) => {
        globalSettingsMenus.forEach(({ optionsId: otherOptionsId }) => {
            if (optionsId !== otherOptionsId) {
                document.querySelector(otherOptionsId).classList.remove('open');
            }
        });
        options.classList.toggle('open');
        event.stopPropagation();
    });
});



window.addEventListener('load', async () => {
    preferencesMenus.forEach(async ({ textId, preferenceKey }) => {
        const pref = await global.preferences.get(preferenceKey);
        const attributeSearch = pref.or_default();
        const defaultElement = document.querySelector(`[data-value="${attributeSearch}"]`).innerHTML;
        document.querySelector(textId).innerHTML = defaultElement;
    });

    globalSettingsMenus.forEach(async ({ textId, settingKey }) => {
        const setting = await global.siteSettings.get(settingKey);
        console.log('setting:', setting);
        const settingValue = reversedSettingsMap[setting];
        console.log('settingValue:', settingValue);
        document.querySelector(textId).innerHTML = settingValue;
    });
});


async function getEmployee() {
    const res = await get_api(`/employee/employee.php/employee/@me`);
    if (res.success) {
        return res.data;
    } else {
    console.error("[getEmployee] failed to get employee", empID)
}
}

async function setUserData() {
    let employeeData = await getEmployee();
    console.log("[setUserData] got employee", employeeData);
    let emp = employeeData.employee;
    
    let employeeName = global.employeeToName(emp);
    let employeeEmail = emp.email;
    let employeeAvatar = global.employeeAvatarOrFallback(emp);

    const isManager = employeeData.isManager != 0;

    accountOptions.querySelectorAll('.current-name').forEach((e) => {e.innerHTML = employeeName});
    accountCard.querySelector('.email').innerHTML = employeeEmail;
    accountCard.querySelector('.avatar').src = employeeAvatar;
    accountCard.querySelector('.role').innerText = isManager ? "Manager" : "Employee";
    accountCard.querySelector('.icon span').innerHTML = isManager ? "admin_panel_settings" : "person";
};

setUserData();


document.addEventListener("preferencesave", async (event) => {
    preferenceAlert();
});
    

function preferenceAlert() {
    let main = document.querySelector('.main');
    let alertDiv = document.createElement('div');
    alertDiv.classList.add('preference-alert');
    alertDiv.innerText = 'Preferences Saved';
    main.appendChild(alertDiv);
    console.log("[preferenceAlert] alert triggered");
    setTimeout(() => {
        alertDiv.classList.add('fade-1000ms');
    }, 200);
}

async function searchEmployees(query) {
    console.log('fetching employees');
    const res = await get_api(`/employee/employee.php/all?q=${query}`);
    if (res.success) {
        const employees = res.data.employees;
        return employees;

    } else {
        console.error('Request failed');
    }
}

const inputField = document.querySelector('#inputField');
const inputValue = inputField.value;

inputField.addEventListener('input', async (event) => {
    const query = event.target.value;
    const employees = await searchEmployees(query);
    console.log(employees);
    renderEmployees(employees);
});

async function renderEmployees(employees) {
    var employeeList = document.querySelector('.employee-list');
    employeeList.innerHTML = '';
    employees.forEach((employee) => {
        employeeList.innerHTML += `
            <div class="employee-card" data-empID="${employee.empID}">
                <div class="first-name">${employee.firstName}</div>
                <div class="last-name">${employee.lastName}</div>
                <div class="email">${employee.email}</div>
            </div>
        `;
    });
    employeeCardEventListeners();
}

function employeeCardEventListeners(){
    let employeeCards = document.querySelectorAll('.employee-card');
    employeeCards.forEach((card) => {
        card.addEventListener('click', (event) => {
            window.location.href = `/settings/user/#${card.getAttribute('data-empID')}`;
        });
    });
}

global.setBreadcrumb(["Settings", "Account"], ["./", '#' + "account"])

