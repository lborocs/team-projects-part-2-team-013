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
    menus.forEach(({ optionsId }) => {
        let options = document.querySelector(optionsId);
        if (!options.contains(event.target)) {
            options.classList.remove('open');
        }
    });
});


//Array to recursively add event listeners to dropdown menus
let menus = [
    { selector: '.avatar-option', textId: '#avatar-text', preferenceKey: 'avatar', optionsId: '#avatar-options' },
    { selector: '.posting-option', textId: '#posting-text', preferenceKey: 'posting', optionsId: '#posting-options' },
    { selector: '.tags-option', textId: '#tags-text', preferenceKey: 'tags', optionsId: '#tags-options' },
    { selector: '.list-option', textId: '#list-text', preferenceKey: 'list', optionsId: '#list-options' },
    { selector: '.sort-projects-type', textId: '#sort-projects-type-text', preferenceKey: 'sortProjectsType', optionsId: '#sort-projects-type' },
    { selector: '.sort-projects-direction-option', textId: '#sort-projects-direction-text', preferenceKey: 'sortProjectsDirection', optionsId: '#sort-projects-direction' },
    { selector: '.sort-tasks-type', textId: '#sort-tasks-type-text', preferenceKey: 'sortTasksType', optionsId: '#sort-tasks-type' },
    { selector: '.sort-tasks-direction-option', textId: '#sort-tasks-direction-text', preferenceKey: 'sortTasksDirection', optionsId: '#sort-tasks-direction' },
];



menus.forEach(({ selector, textId, preferenceKey, optionsId }) => {
    let menuOptions = document.querySelectorAll(selector);
    menuOptions.forEach((option) => {
        option.addEventListener('click', async (event) => {
            let selectedOption = option.textContent;
            await global.preferences.set(preferenceKey, selectedOption);
            document.querySelector(textId).innerHTML = selectedOption;
            document.querySelector(optionsId).classList.remove('open');
            event.stopPropagation();
        });
    });

    let options = document.querySelector(optionsId);
    options.addEventListener('click', (event) => {
        menus.forEach(({ optionsId: otherOptionsId }) => {
            if (optionsId !== otherOptionsId) {
                document.querySelector(otherOptionsId).classList.remove('open');
            }
        });
        options.classList.toggle('open');
        event.stopPropagation();
    });
});

window.addEventListener('load', async () => {
    menus.forEach(async ({ textId, preferenceKey }) => {
        let preferenceValue = await global.preferences.get(preferenceKey);
        if (preferenceValue) {
            document.querySelector(textId).innerHTML = preferenceValue;
        }
    });
});

let deleteAccountButton = document.querySelector('.delete-account');
deleteAccountButton.addEventListener('click', () => {
    confirmDelete()
        .then(() => {
        })
        .catch((error) => {
            console.log('Delete account cancelled');
        })
});




function confirmDelete() {
    return new Promise((resolve, reject) => {

        if (global.queryModalSkip()) {
            resolve();
            return;
        }

        let popupDiv = document.querySelector('.popup');
        let fullscreenDiv = document.querySelector('.fullscreen');

        popupDiv.innerHTML = `
            <dialog open class='popup-dialog'>
                <div class="popup-title">
                    Delete Todo Item
                    <div class="small-icon close-button">
                        <span class="material-symbols-rounded">
                            close
                        </span>
                    </div>
                </div>
                <div class="popup-text">Are you sure you want to delete this Todo item?</div>
                <div class="popup-text">This action cannot be undone.</div>

                <div class="popup-buttons">
                    <div class="text-button" id="cancel-button">
                        <div class="button-text">Cancel</div>
                    </div>
                    <div class="text-button red" id="delete-button">
                        <div class="button-text">Delete</div>
                    </div>
                </div>
                <span>Tip: you can hold SHIFT to skip this modal</span>
            </dialog>
        `;
        fullscreenDiv.style.filter = 'brightness(0.75)';

        let dialog = popupDiv.querySelector('.popup-dialog');
        let closeButton = dialog.querySelector('.close-button');
        let cancelButton = dialog.querySelector('#cancel-button');
        let deleteButton = dialog.querySelector('#delete-button');

        closeButton.addEventListener('click', (event) => {
            event.preventDefault();
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            reject();
        });

        cancelButton.addEventListener('click', (event) => {
            event.preventDefault();
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            reject();
        });

        deleteButton.addEventListener('click', (event) => {
            event.preventDefault();
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            resolve();
        });
    });
}

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
    console.log(employeeData);
    
    let employeeName = global.employeeToName(employeeData.employee);
    let employeeEmail = employeeData.employee.email;
    let employeeAvatar = employeeData.employee.avatar;

    document.querySelector('.current-name').innerHTML = employeeName;
    document.querySelector('#current-name').value = employeeName;
    document.querySelector('.email').innerHTML = employeeEmail;
    document.querySelector('.avatar').src = employeeAvatar;
};

setUserData();





global.setBreadcrumb(["Settings", "Account"], ["../", '#' + "account"])

