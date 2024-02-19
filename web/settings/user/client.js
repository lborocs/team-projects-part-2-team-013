import * as global from "../../global-ui.js";

const nameValues = document.querySelectorAll('.current-name');
const accountCard = document.querySelector('.account-card');
const accountOptions = document.querySelector('.account-options');

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


function getQueryParam() {
    return window.location.hash.substring(1);
}
let empID = getQueryParam();
console.log("THE ID");
console.log(empID);


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

    document.querySelector('.current-name').innerHTML = employeeName;
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
    let emp = await getEmployee();
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