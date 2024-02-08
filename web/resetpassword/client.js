import * as global from "../global-ui.js"

const accountDisplay = document.getElementById("account-display");
const avatarContainer = document.getElementById("avatar-container");
const passwordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("newPasswordConfirm");
const changeButton = document.getElementById("change");

var validatedToken;

async function validateToken() {
    const token = document.location.hash.substring(1);

    if (token.length == 0) { return; }

    const res = await put_api("/employee/session.php/resetpassword", {token:token});
    if (res.status != 200) { return; }

    accountDisplay.innerText = global.employeeToName(res.data.employee);
    avatarContainer.innerHTML = `<img src="${global.employeeAvatarOrFallback(res.data.employee)}" class="avatar" alt="avatar">`;
    validatedToken = token;

}

validateToken();


async function changePassword(newPassword) {

    if (!validatedToken) {
        return
    }

    const res = await patch_api("/employee/session.php/resetpassword", {token:validatedToken, newPassword:newPassword});

    if (!res.success) {
        alert(res.error.message);
        return false;
    }
    return true;

}

changeButton.addEventListener("click", async function() {

    if (!validatedToken) {
        return
    }

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password != confirmPassword) {
        alert("Passwords do not match");
        return;
    }

    if (await changePassword(confirmPassword)) {
        alert("Password changed successfully");
        window.location.href = "/";
    }
});
