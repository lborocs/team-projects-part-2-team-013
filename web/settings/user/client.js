import * as global from "../../global-ui.js";

const nameValues = document.querySelectorAll('.current-name');
const accountCard = document.querySelector('.account-card');

const firstNameOption = document.querySelector('#first-name-change');
const secondNameOption = document.querySelector('#last-name-change');

const firstNameChange = firstNameOption.querySelector('.change-button');
const firstNameCancel = firstNameOption.querySelector('.cancel-button');
const firstNameConfirm = firstNameOption.querySelector('.confirm-button');
const firstNameInput = firstNameOption.querySelector('.name-display-input');

const secondNameChange = secondNameOption.querySelector('.change-button');
const secondNameCancel = secondNameOption.querySelector('.cancel-button');
const secondNameConfirm = secondNameOption.querySelector('.confirm-button');
const secondNameInput = secondNameOption.querySelector('.name-display-input');

const accountDropdown = document.getElementById('account-dropdown');
const accountOptions = document.querySelectorAll('.account-option');



function getQueryParam() {
    return window.location.hash.substring(1);
}
const empID = getQueryParam();
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

async function fetchCurrentEmployee() {
    console.log('fetching employee');
    const res = await get_api(`/employee/employee.php/employee/${empID}`);
    if (res.success) {
        return res.data;

    } else {
        console.error('Request failed');
    }
}

let currentEmployee;
async function getEmployee(renew = false) {
    if (currentEmployee && !renew) {
        return currentEmployee;
    }
    currentEmployee = await fetchCurrentEmployee();
    return currentEmployee;
}


async function setUserData() {
    let empData = await getEmployee(true);
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
    global.setBreadcrumb(["Settings", "Manage Users", `Managing ${employeeName}`], ["/settings/", "/settings/#manageusers", "#" + empID])
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
                await global.popupAlert("Account deleted", "Account was successfully deleted", "success").catch();
                window.location.href = "/settings#manager-user";
            });
        })
        .catch((error) => {
            console.log('Delete account cancelled');
        })
});

let resetAvatarButton = document.querySelector('.reset-button');
resetAvatarButton.addEventListener('click', () => {
    let popupCallback = (context) => {
        context.content.innerHTML = 'Are you sure you want to remove this user\'s avatar?';
        context.actionButton.addEventListener('click', async () => {
            await resetAvatarToDefault();
            setUserData()
            context.completeModal(true);
        });
    };

    global.popupModal(
        true,
        'Remove Avatar',
        popupCallback,
        {
            text: 'Confirm',
            class: 'blue'
        },
        false
    ).then(() => {
        console.log('Modal completed successfully');
    }).catch(() => {
        console.log('Modal was canceled or closed');
    });
});

function confirmDelete() {

    const callback = (ctx) => {
        ctx.content.innerHTML = `
        <div class="modal-text"><b>Deleting an account will permanently remove all employee data</b></div>
        <div class="modal-subtext">This will not delete projects this employee leads or other similar items</div>
        `;
    }

    return global.popupModal(
        false,
        'Are you sure you want to delete this account?',
        callback,
        {class:"red", text:"Delete"}
    )
}

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

async function resetAvatarToDefault() {
    const body = {
        avatar: null,
    };
    return await patch_api(`/employee/employee.php/employee/${empID}`, body);
}

sendButton.addEventListener("click", handleClick);

