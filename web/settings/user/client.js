import * as global from "../../global-ui.js";

const nameValues = document.querySelectorAll('.current-name');
const accountCard = document.querySelector('.account-card');

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

const accountDropdown = document.getElementById('account-dropdown');
const accountOptions = document.querySelectorAll('.account-option');



function getQueryParam() {
    return window.location.hash.substring(1);
}
let empID = getQueryParam();
console.log("THE ID");
console.log(empID);

async function updateAccountType(type) {
    const body = {
        isManager: type,
    };

    const response = await patch_api(`/employee/employee.php/employee/${empID}`, body);
    setUserData();
}

accountDropdown.addEventListener('click', (event) => {
    event.stopPropagation();
    accountDropdown.classList.toggle('open');
});

accountOptions.forEach((option) => {
    let accountType = document.querySelector('#account-type');
    option.addEventListener('click', (event) => {
        event.stopPropagation();
        let selectedOption = option.innerText;
        accountType.innerHTML = selectedOption;
        accountDropdown.classList.remove('open');
        if (selectedOption == "Manager") {
            updateAccountType(1);
        } else {
            updateAccountType(0);
        }
    });
});

document.addEventListener('click', (event) => {
    event.stopPropagation();
    accountDropdown.classList.remove('open');
});

async function getEmployee(empID) {
    console.log('fetching employee');
    const res = await get_api(`/employee/employee.php/employee/${empID}`);
    if (res.success) {
        return res.data;

    } else {
        console.error('Request failed');
    }
}
getEmployee(empID);



async function setUserData() {
    let empData = await getEmployee(empID);
    let emp = empData.employee;
    console.log("[setUserData] got employee", emp);
    console.log(emp);
    let employeeName = global.employeeToName(emp);
    console.log("Employee Name: " + employeeName);
    let employeeEmail = emp.email;
    let employeeAvatar = global.employeeAvatarOrFallback(emp);

    const isManager = emp.isManager != 0;

    let accountType = document.querySelector('#account-type');
    accountType.innerHTML = isManager ? "Manager" : "Employee";
    accountCard.querySelector('.role').innerText = isManager ? "Manager" : "Employee";

    document.querySelector('.current-name').innerHTML = employeeName;
    global.setBreadcrumb(["Settings", "Manage User", employeeName], ["./", "#account", "#manageusers"])
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
    firstNameInput.innerHTML = firstName;
    secondNameInput.innerHTML = lastName;
};

setUserData();

firstNameChange.addEventListener('click', () => {
    console.log('change button clicked');
    firstNameChange.classList.add('norender');
    firstNameCancel.classList.remove('norender');
    firstNameConfirm.classList.remove('norender');
    firstNameInput.setAttribute('contenteditable', 'true');
    firstNameInput.classList.add('editable');
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
    let emp = await getEmployee();
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

    const response = await patch_api(`/employee/employee.php/employee/${empID}`, body);
    setUserData();
}

async function changeLastName(newName) {
    const body = {
        lastName: newName,
    };

    const response = await patch_api(`/employee/employee.php/employee/${empID}`, body);
    setUserData();
}
    

let deleteAccountButton = document.querySelector('.delete-account');
deleteAccountButton.addEventListener('click', () => {
    confirmDelete()
        .then(() => {
            delete_api(`/employee/employee.php/employee/${empID}`).then(async () => {
                window.location.href = "/settings#manager-user";
            });
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
                    Delete Account
                    <div class="small-icon close-button">
                        <span class="material-symbols-rounded">
                            close
                        </span>
                    </div>
                </div>
                <div class="popup-text">Are you sure you want to delete this user's account?</div>
                <div class="popup-text">Any employee specific data will be deleted</div>
                <div class="popup-text">This action cannot be undone.</div>

                <div class="popup-buttons">
                    <div class="text-button" id="cancel-button">
                        <div class="button-text">Cancel</div>
                    </div>
                    <div class="text-button red" id="delete-button">
                        <div class="button-text">Delete</div>
                    </div>
                </div>
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

var employeeEmail
async function updateEmployeeEmail(empID) {
    const empData = await getEmployee(empID);
    console.log(empData);
    employeeEmail = empData.employee.email;
    console.log("Employee Email: ");
    console.log(employeeEmail);
}
updateEmployeeEmail(empID);
const sendButton = document.getElementById("reset-password");


async function sendResetEmail(email) {
    console.log("sending email")

    const res = await post_api("/employee/session.php/resetpassword", {"email": email});

    if (!res.success) {
        alert(res.error.message);
        return false;
    }
    return true;

}

async function handleClick() {
    console.log("handle click")
    const email = employeeEmail

    if (await sendResetEmail(email)) {
        alert("Email sent if it is linked to an account");
    }

}

sendButton.addEventListener("click", handleClick);

