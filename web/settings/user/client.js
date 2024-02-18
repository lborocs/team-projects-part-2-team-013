import * as global from "../../global-ui.js";

const nameValues = document.querySelectorAll('.current-name');
const accountCard = document.querySelector('.account-card');
const changeButton = document.getElementById('change-button');
const cancelButton = document.getElementById('cancel-button');
const confirmButton = document.getElementById('confirm-button');


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

    nameValues.forEach((e) => {e.innerHTML = employeeName});
    accountCard.querySelector('.email').innerHTML = employeeEmail;
    accountCard.querySelector('.avatar').src = employeeAvatar;
    accountCard.querySelector('.role').innerText = isManager ? "Manager" : "Employee";
    accountCard.querySelector('.icon span').innerHTML = isManager ? "admin_panel_settings" : "person";
};

setUserData();

changeButton.addEventListener('click', () => {
    changeButton.classList.add('norender');
    cancelButton.classList.remove('norender');
    confirmButton.classList.remove('norender');
});

cancelButton.addEventListener('click', () => {
    changeButton.classList.remove('norender');
    cancelButton.classList.add('norender');
    confirmButton.classList.add('norender');
});

confirmButton.addEventListener('click', async () => {
    changeButton.classList.remove('norender');
    cancelButton.classList.add('norender');
    confirmButton.classList.add('norender');
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
