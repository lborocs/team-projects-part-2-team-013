import * as global from "../global-ui.js";

const accountTab = document.querySelector('#account');
const preferencesTab = document.querySelector('#preferences');
const systemTab = document.querySelector('#system');
const manageUsersTab = document.querySelector('#manageusers');

const tabs = document.querySelectorAll('.tab');
const options = document.querySelectorAll('.options');

const accountCard = document.querySelector('.account-card');
const accountOptions = document.querySelector('#account-options');
const preferencesOptions = document.querySelector('#preferences-options');
const systemOptions = document.querySelector('#system-options');
const manageUsersOptions = document.querySelector('#manageusers-options');
const sidebarCheckbox = document.getElementById('sidebar-checkbox');
const changePasswordButton = document.querySelector('.change-password');

const logoutButton = document.querySelector('.log-out');

const changeButtons = document.querySelectorAll('#change-button');
const cancelButtons = document.querySelectorAll('#cancel-button');
const confirmButtons = document.querySelectorAll('#confirm-button');
const nameInputs = document.querySelectorAll('.name-display-input');

const firstNameChange = changeButtons[0];
const firstNameCancel = cancelButtons[0];
const firstNameConfirm = confirmButtons[0];
const firstNameInput = nameInputs[0];

const secondNameChange = changeButtons[1];
const secondNameCancel = cancelButtons[1];
const secondNameConfirm = confirmButtons[1];
const secondNameInput = nameInputs[1];

const employeeSearchResults = document.querySelector('.employee-search-results');


function switchToTab(tab) {
    console.log(`[switchToTab] switching to tab ${tab.id}`);

    options.forEach(option => {
        option.classList.add('norender');
    });

    tabs.forEach(tab => {
        tab.classList.remove('active-tab');
    });

    tab.classList.add('active-tab');
    document.querySelector(`#${tab.id}-options`).classList.remove('norender');

    var name;
    if (tab.id == "manageusers") {
        name = "Manage Users";
    } else {
        name = tab.id.charAt(0).toUpperCase() + tab.id.slice(1);
    }

    global.setBreadcrumb(["Settings", name], ["/settings/", "#" + tab.id]);

}

window.addEventListener("breadcrumbnavigate", (event) => {
    console.log("[settings] received breadcrumb navigate");
    renderFromBreadcrumb(event.locations);
});


function renderFromBreadcrumb(locations) {

    const page = locations.length ? locations[0] : "account"
    // strip the hash

    const elem = document.getElementById(page);

    if (!elem) {
        console.error("[renderFromBreadcrumb] no element found for:", page);
        return;
    }

    switchToTab(elem);
}


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



async function setUserData(revalidate = false) {
    let employeeData;
    if (revalidate) {
        employeeData = await global.revalidateCurrentSession();
    } else {
        employeeData = await global.getCurrentSession();
    }

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
        var firstName = "Not set";
        firstNameInput.classList.add('disabled');
    } else{
        var firstName = emp.firstName;
    }
    var lastName = emp.lastName;
    firstNameInput.innerHTML = firstName;
    secondNameInput.innerHTML = lastName;
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
    renderFromBreadcrumb(global.getLocationHashArray());
    const employees = await searchEmployees('');
    renderEmployees(employees);
};

async function renderEmployees(employees) {
    employeeSearchResults.innerHTML = '';
    employees.forEach((employee) => {

        let name = global.employeeToName(employee);
        let avatar = global.employeeAvatarOrFallback(employee);

        let role = employee.isManager ? "Manager" : "Employee";
        let roleIcon = employee.isManager ? "admin_panel_settings" : "person";

        employeeSearchResults.innerHTML += `
            <a class="account-card" href="/settings/user/#${employee.empID}">
                <div class="avatar-container">
                    <img src="${avatar}" class="avatar">
                </div>
                <div class="details">
                    <div class="current-name">${name}</div>
                    <div class="email">${employee.email}</div>
                </div>
                <div class="role-container">
                    <div class="icon">
                        <span class="material-symbols-rounded">${roleIcon}</span>
                    </div>
                    <div class="role">${role}</div>
                </div>
            </a>
        `;
    });

}

logoutButton.addEventListener('click', () => {
    delete_api("/employee/session.php/session").then(async () => {
        await clearStorages();
        window.location.href = "/";
    });
});

firstNameChange.addEventListener('click', () => {
    console.log('change button clicked');
    firstNameChange.classList.add('norender');
    firstNameCancel.classList.remove('norender');
    firstNameConfirm.classList.remove('norender');
    firstNameInput.setAttribute('contenteditable', 'true');
    firstNameInput.classList.add('editable');
    firstNameInput.classList.remove('disabled');
    resetName(2);
    secondNameChange.classList.remove('norender');
    secondNameCancel.classList.add('norender');
    secondNameConfirm.classList.add('norender');
    secondNameInput.setAttribute('contenteditable', 'false');
    secondNameInput.classList.remove('editable');
    firstNameInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            firstNameConfirm.click();
        }
    });
});

firstNameCancel.addEventListener('click', () => {
    resetName(1);
    firstNameChange.classList.remove('norender');
    firstNameCancel.classList.add('norender');
    firstNameConfirm.classList.add('norender');
    firstNameInput.setAttribute('contenteditable', 'false');
    firstNameInput.classList.remove('editable');
});

firstNameConfirm.addEventListener('click', async () => {
    firstNameChange.classList.remove('norender');
    firstNameCancel.classList.add('norender');
    firstNameConfirm.classList.add('norender');
    firstNameInput.setAttribute('contenteditable', 'false');
    firstNameInput.classList.remove('editable');
    let nameValue = firstNameInput.innerHTML;
    changeFirstName(nameValue);
});

secondNameChange.addEventListener('click', () => {
    console.log('change button clicked');
    secondNameChange.classList.add('norender');
    secondNameCancel.classList.remove('norender');
    secondNameConfirm.classList.remove('norender');
    secondNameInput.setAttribute('contenteditable', 'true');
    secondNameInput.classList.add('editable');
    resetName(1);
    firstNameChange.classList.remove('norender');
    firstNameCancel.classList.add('norender');
    firstNameConfirm.classList.add('norender');
    firstNameInput.setAttribute('contenteditable', 'false');
    firstNameInput.classList.remove('editable');
    secondNameInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            secondNameConfirm.click();
        }
    });
});

secondNameCancel.addEventListener('click', () => {
    resetName(2);
    secondNameChange.classList.remove('norender');
    secondNameCancel.classList.add('norender');
    secondNameConfirm.classList.add('norender');
    secondNameInput.setAttribute('contenteditable', 'false');
    secondNameInput.classList.remove('editable');
});

secondNameConfirm.addEventListener('click', async () => {
    secondNameChange.classList.remove('norender');
    secondNameCancel.classList.add('norender');
    secondNameConfirm.classList.add('norender');
    secondNameInput.setAttribute('contenteditable', 'false');
    secondNameInput.classList.remove('editable');
    let nameValue = secondNameInput.innerHTML;
    changeLastName(nameValue);
});

async function resetName(n){
    console.log('resetting name');
    let employeeData = await global.getCurrentSession();
    let emp = employeeData.employee;
    if (emp.firstName == null){
        var firstName = "N/A";
    } else{
        var firstName = emp.firstName;
    }
    var lastName = emp.lastName;
    if (n == 1){
        firstNameInput.innerHTML = firstName;
    } else if (n == 2){
        secondNameInput.innerHTML = lastName;
    }
}
async function changeFirstName(newName) {
    if (newName == "N/A" || newName.trim() == ""){
        newName = null;
        firstNameInput.innerHTML = "N/A";
    }
    const body = {
        firstName: newName,
    };

    const res = await patch_api('/employee/employee.php/employee/@me', body);
    if (res.success) {
        setUserData(true);
    } else {
        global.popupAlert("Failed to change name", "The following error occured:" + res.error.message, "error");
    }
}

async function changeLastName(newName) {
    const body = {
        lastName: newName,
    };

    const res = await patch_api('/employee/employee.php/employee/@me', body);
    if (res.success) {
        setUserData(true);
    } else {
        global.popupAlert("Failed to change name", "The following error occured:" + res.error.message, "error");
    }
}

logoutButton.addEventListener('click', () => {
    delete_api("/employee/session.php/session").then(async () => {
        await clearStorages();
        window.location.href = "/";
    });
});

changePasswordButton.addEventListener('click', () => {
    passwordPopup().then(() => {
    }
    ).catch(() => {
        console.log('password change cancelled');
    });
});


function passwordPopup() {

    const callback = (ctx) => {
        ctx.actionButton.classList.add('disabled');

        ctx.content.innerHTML = `<div class="popup-inputs">
            <div class="popup-subtitle">
                Enter your current password:
            </div>
            <input class="modal-input text" type="password" id="current-password" placeholder="Current Password">
        </div>
        <div class="popup-inputs">
            <div class="popup-subtitle">
                Set your new password:
            </div>
            <div class="input-wrapper">
                <input class="modal-input text" type="password" id="new-password" placeholder="New Password">
                <input class="modal-input text" type="password" id="confirm-new-password" placeholder="Confirm New Password">
                <div class="error-message" id="password-error"></div>
            </div>
        </div>`

        const newPasswordInput = ctx.content.querySelector('#new-password');
        const confirmPasswordInput = ctx.content.querySelector('#confirm-new-password');
        const currentPasswordInput = ctx.content.querySelector('#current-password');
        const errorMessage = ctx.content.querySelector('#password-error');

        const validatePassword = () => {
            if (newPasswordInput.value !== confirmPasswordInput.value) {
                errorMessage.innerText = "Passwords do not match";
                ctx.actionButton.classList.add('disabled');
                return;
            }
            errorMessage.innerText = "";
            ctx.actionButton.classList.remove('disabled');
        }

        newPasswordInput.addEventListener('input', validatePassword);
        confirmPasswordInput.addEventListener('input', validatePassword);

        ctx.actionButton.addEventListener('pointerup', async () => {
            const res = await patch_api('/employee/session.php/account', {
                newPassword: newPasswordInput.value,
                password: currentPasswordInput.value
            });


            if (res.success) {
                ctx.completeModal(true);

                const content = `
                    <div class="modal-text">Your password has been changed successfully</div>
                    <div class="modal-text">Please log in with your new password</div>
                    <div class="modal-subtext">All other computers will be logged out too.</div>
                `

                await global.popupAlert(
                    "Password Changed",
                    content,
                    "success"
                ).catch();
                document.location.href = "/";
            } else {
                errorMessage.innerText = res.error.message;
            }
        });

    }


    return global.popupModal(
        false,
        "Change Password",
        callback,
        {text: "Change Password", class:"blue"},
        false
    );

}

async function avatarPopup() {
    const callback = (ctx) => {

        ctx.content.innerHTML = `
            <div class="avatar-change-content">
                <div class="avatar-upload">
                    <div class="popup-subtitle">
                        Upload new avatar:
                    </div>
                    <form>
                        <input type="file" id="image-upload" class="modal-input" accept="image/*">
                        <label for="image-upload" class="text-button blue">
                            <div class="button-icon">
                                <span class="material-symbols-rounded">add_photo_alternate</span>
                            </div>
                            <div class="button-text">Choose File</div>
                        </label>
                    </form>
                </div>
                <div class="avatar-container">
                    <img class="avatar-preview">
                </div>
            </div>
                <div class="error-message"></div>
            </div>
        `;

        const errorMessage = ctx.content.querySelector('.error-message');

        const resetContainer = document.createElement('div');
        resetContainer.classList.add("modal-buttons");


        const resetButtonPrompt = document.createElement('div');
        resetButtonPrompt.classList.add("text-button");
        resetButtonPrompt.innerHTML = `<div class="button-text">Reset My Avatar</div>`;
        resetContainer.appendChild(resetButtonPrompt);

        const cancelResetButton = document.createElement('div');
        cancelResetButton.classList.add("text-button", "norender");
        cancelResetButton.innerHTML = `<div class="button-text">Cancel</div>`;
        resetContainer.appendChild(cancelResetButton);


        const resetButton = document.createElement('div');
        resetButton.classList.add("text-button", "red", "norender");
        resetButton.innerHTML = `<div class="button-text">Reset</div>`;
        resetContainer.appendChild(resetButton);


        cancelResetButton.addEventListener('pointerup', () => {
            resetButtonPrompt.classList.remove('norender');
            cancelResetButton.classList.add('norender');
            resetButton.classList.add('norender');
            errorMessage.innerText = "";
        });
        resetButtonPrompt.addEventListener('pointerup', () => {
            resetButtonPrompt.classList.add('norender');
            cancelResetButton.classList.remove('norender');
            resetButton.classList.remove('norender');
            errorMessage.innerText = "Are you sure you want to reset your avatar?";
        });


        const modalActions = ctx.dialog.querySelector('.modal-actions');
        modalActions.insertBefore(resetContainer, modalActions.firstChild);



        global.getCurrentSession().then(session => {
            ctx.content.querySelector('.avatar-preview').src = global.employeeAvatarOrFallback(session.employee);
            if (session.employee.avatar == null) {
                resetButton.classList.add('norender');
                resetButton.classList.remove('modal-tip');
            }
        });


        ctx.content.querySelector('#image-upload').addEventListener('change', function(event) {
            var file = event.target.files[0];
            let avatar = ctx.content.querySelector('.avatar-preview');
            var reader = new FileReader();
            reader.onloadend = function() {
                avatar.src = reader.result;
            }
            reader.readAsDataURL(file);
        });

        const resHandler = async (res) => {
            ctx.content.classList.remove("animate-spinner");
            if (res.success) {
                ctx.completeModal(true);
                await global.revalidateCurrentSession();
            } else {
                errorMessage.innerText = res.error.message;
            }
        }

        
        ctx.actionButton.addEventListener('pointerup', async () => {
            let avatar = ctx.content.querySelector('.avatar-preview').src;
            errorMessage.innerText = "";
            ctx.content.classList.add("animate-spinner");
            resHandler(await updateAvatar(avatar));
        });

        resetButton.addEventListener('pointerup', async () => {
            errorMessage.innerText = "";
            ctx.content.classList.add("animate-spinner");
            resHandler(await resetAvatarToDefault());
        });

    }

    global.popupModal(
        false,
        "Change Avatar",
        callback,
        {text: "Save", class:"blue"},
        false
    ).then(() => {
        global.popupAlert(
            "Avatar Updated",
            "Your avatar has been updated successfully, it make take a few minutes to appear everywhere.",
            "success"
        ).catch();
    });
};


let avatarButton = document.querySelector('.avatar-container');
avatarButton.addEventListener('click', () => {
    avatarPopup();
});

async function updateAvatar(avatar) {
    let newAvatar = avatar.split(',')[1];
    const body = {
        avatar: newAvatar,
    };
    return await patch_api(`/employee/employee.php/employee/@me`, body);
}

async function resetAvatarToDefault() {
    const body = {
        avatar: null,
    };
    return await patch_api(`/employee/employee.php/employee/@me`, body);
}

