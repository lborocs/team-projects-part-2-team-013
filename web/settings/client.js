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
const sidebarCheckbox = document.getElementById('sidebar-checkbox');
const changePasswordButton = document.querySelector('.change-password');

const logoutButton = document.querySelector('.log-out');

const changeButtons = document.querySelectorAll('#change-button');
const cancelButtons = document.querySelectorAll('#cancel-button');
const confirmButtons = document.querySelectorAll('#confirm-button');
const nameInputs = document.querySelectorAll('.name-display-input');

const changeButton1 = changeButtons[0];
const cancelButton1 = cancelButtons[0];
const confirmButton1 = confirmButtons[0];
const nameInput1 = nameInputs[0];

const changeButton2 = changeButtons[1];
const cancelButton2 = cancelButtons[1];
const confirmButton2 = confirmButtons[1];
const nameInput2 = nameInputs[1];

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

sidebarCheckbox.addEventListener('change', async function() {
    if (this.checked) {
        await global.preferences.set('sidebarisopen', true);
    } else {
        await global.preferences.set('sidebarisopen', false);
    }
});

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

    const sidebarValue = await global.preferences.get('sidebarisopen');
    const sidebar = sidebarValue.or_default();
    if (sidebar == true) {
        sidebarCheckbox.checked = true;
    } else {
        sidebarCheckbox.checked = false;
    }

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

    accountOptions.querySelector('.current-name').innerHTML = employeeName;
    accountCard.querySelector('.email').innerHTML = employeeEmail;
    accountCard.querySelector('.avatar').src = employeeAvatar;
    accountCard.querySelector('.role').innerText = isManager ? "Manager" : "Employee";
    accountCard.querySelector('.icon span').innerHTML = isManager ? "admin_panel_settings" : "person";
    if (emp.firstName == null){
        var firstName = "N/A";
    } else{
        var firstName = emp.firstName;
    }
    var lastName = emp.lastName;
    nameInput1.innerHTML = firstName;
    nameInput2.innerHTML = lastName;
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

window.onload = async function() {
    const employees = await searchEmployees('');
    renderEmployees(employees);
};

async function renderEmployees(employees) {
    var employeeList = document.querySelector('.employee-list');
    employeeList.innerHTML = '';
    employees.forEach((employee) => {
        if (employee.firstName == null){
            var firstName = "N/A";
        } else{
            var firstName = employee.firstName;
        }
        employeeList.innerHTML += `
            <div class="employee-card" data-empID="${employee.empID}">
                <div class="first-name">${firstName}</div>
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

logoutButton.addEventListener('click', () => {
    delete_api("/employee/session.php/session").then(async () => {
        await clearStorages();
        window.location.href = "/";
    });
});

changeButton1.addEventListener('click', () => {
    console.log('change button clicked');
    changeButton1.classList.add('norender');
    cancelButton1.classList.remove('norender');
    confirmButton1.classList.remove('norender');
    nameInput1.setAttribute('contenteditable', 'true');
    nameInput1.classList.add('editable');
    nameInput1.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            confirmButton1.click();
        }
    });
});

cancelButton1.addEventListener('click', () => {
    resetName(1);
    changeButton1.classList.remove('norender');
    cancelButton1.classList.add('norender');
    confirmButton1.classList.add('norender');
    nameInput1.setAttribute('contenteditable', 'false');
    nameInput1.classList.remove('editable');
});

confirmButton1.addEventListener('click', async () => {
    changeButton1.classList.remove('norender');
    cancelButton1.classList.add('norender');
    confirmButton1.classList.add('norender');
    nameInput1.setAttribute('contenteditable', 'false');
    nameInput1.classList.remove('editable');
    let nameValue = nameInput1.innerHTML;
    changeFirstName(nameValue);
});

changeButton2.addEventListener('click', () => {
    console.log('change button clicked');
    changeButton2.classList.add('norender');
    cancelButton2.classList.remove('norender');
    confirmButton2.classList.remove('norender');
    nameInput2.setAttribute('contenteditable', 'true');
    nameInput2.classList.add('editable');
    nameInput2.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            confirmButton2.click();
        }
    });
});

cancelButton2.addEventListener('click', () => {
    resetName(2);
    changeButton2.classList.remove('norender');
    cancelButton2.classList.add('norender');
    confirmButton2.classList.add('norender');
    nameInput2.setAttribute('contenteditable', 'false');
    nameInput2.classList.remove('editable');
});

confirmButton2.addEventListener('click', async () => {
    changeButton2.classList.remove('norender');
    cancelButton2.classList.add('norender');
    confirmButton2.classList.add('norender');
    nameInput2.setAttribute('contenteditable', 'false');
    nameInput2.classList.remove('editable');
    let nameValue = nameInput2.innerHTML;
    changeLastName(nameValue);
});

async function resetName(n){
    console.log('resetting name');
    let employeeData = await getEmployee();
    let emp = employeeData.employee;
    if (emp.firstName == null){
        var firstName = "N/A";
    } else{
        var firstName = emp.firstName;
    }
    var lastName = emp.lastName;
    if (n == 1){
        nameInput1.innerHTML = firstName;
    } else if (n == 2){
        nameInput2.innerHTML = lastName;
    }
}
async function changeFirstName(newName) {
    if (newName == "N/A" || newName.trim() == ""){
        newName = null;
        nameInput1.innerHTML = "N/A";
    }
    const body = {
        firstName: newName,
    };

    const response = await patch_api('/employee/employee.php/employee/@me', body);
    setUserData();
}

async function changeLastName(newName) {
    const body = {
        lastName: newName,
    };

    const response = await patch_api('/employee/employee.php/employee/@me', body);
    setUserData();
}

logoutButton.addEventListener('click', () => {
    delete_api("/employee/session.php/session").then(async () => {
        await clearStorages();
        window.location.href = "/";
    });
});

changePasswordButton.addEventListener('click', () => {
    passwordPopup().then(() => {
        console.log('password changed');
    }
    ).catch(() => {
        console.log('password change cancelled');
    });
});


function passwordPopup() {
    console.error('password popup');
    return new Promise((resolve, reject) => {

        let popupDiv = document.querySelector('.popup');
        let fullscreenDiv = document.querySelector('.fullscreen');
        console.error("we got further")
        popupDiv.innerHTML = `
            <dialog open class='popup-dialog'>
                <div class="popup-title">
                    Change Password
                    <div class="small-icon close-button">
                        <span class="material-symbols-rounded">
                            close
                        </span>
                    </div>
                </div>
                <div class="popup-inputs">
                    <div class="popup-subtitle">
                        Enter your current password:
                    </div>
                    <input class="password textfield" type="password" id="current-password" placeholder="Current Password">
                </div>
                <div class="popup-inputs">
                    <div class="popup-subtitle">
                        Set your new password:
                    </div>
                    <div class="input-wrapper">
                        <input class="password textfield" type="password" id="new-password" placeholder="New Password">
                        <input class="password textfield" type="password" id="confirm-new-password" placeholder="Confirm New Password">
                    </div>
                </div>

                <div class="popup-buttons">
                    <div class="text-button" id="popup-cancel">
                        <div class="button-text">Cancel</div>
                    </div>
                    <div class="text-button blue" id="popup-confirm">
                        <div class="button-text">Confirm</div>
                    </div>
                </div>
            </dialog>
        `;
        console.error("after html")
        fullscreenDiv.style.filter = 'brightness(0.75)';

        let dialog = popupDiv.querySelector('.popup-dialog');
        let popupCancel = dialog.querySelector('#popup-cancel');
        let popupConfirm = dialog.querySelector('#popup-confirm');
        console.error(popupConfirm);
        let currentPassword = dialog.querySelector('#current-password');
        let newPassword = dialog.querySelector('#new-password');
        let confirmNewPassword = dialog.querySelector('#confirm-new-password');

        popupCancel.addEventListener('click', (event) => {
            event.preventDefault();
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            reject();
        });

        popupConfirm.addEventListener('click', (event) => {
            console.log('confirm button clicked');
            event.preventDefault();
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            if (!newPassword.value == confirmNewPassword.value) {
                console.error('passwords do not match');
            }
            const oldPassword = currentPassword.value;
            const newPassword = newPassword.value;
            changePassword(oldPassword, newPassword);
            resolve();
        });
    });
}

async function changePassword(currentPassword, newPassword) {
    const body = {
        password: currentPassword,
        newPassword: newPassword,
    };

    const response = await patch_api('/employee/session.php/account', body);
    if (response.success) {
        console.log('password changed');
    } else {
        console.log('password change failed');
    }
    setUserData();
}

global.setBreadcrumb(["Settings", "Account"], ["./", '#' + "account"])

