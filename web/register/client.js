import * as global from "../global-ui.js"

const PASS_COLOR = "#238823";
const PASS_ICON = 'check_circle';
const FAIL_COLOR = "#d2222d";
const FAIL_ICON = 'cancel';
const EMPTY_COLOR = "black"
const EMPTY_ICON = 'radio_button_unchecked';

const passwordInput = document.getElementById('password');
const emailInput = document.getElementById('email');
const nameInput = document.getElementById('name');
const registerButton = document.getElementById('register');
const statusElement = document.getElementById('status');
const passwordCriteria = document.querySelector('div.password-criteria');
const eightChars = document.getElementById('eight-chars');
const uppercaseLetter = document.getElementById('uppercase-letter');
const number = document.getElementById('number');
const specialChar = document.getElementById('special-char');


registerButton.addEventListener("click", register)

passwordInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        login();
    }
});


function setStatus(status) {
    document.getElementById("status").innerText = status;
}

function resetCriteria(element) {
    element.style.color = EMPTY_COLOR;
    element.querySelector("span").textContent = EMPTY_ICON;
}

function updateCriteriaHints() {
    passwordCriteria.classList.remove("disabled");

    const passwordValue = passwordInput.value;
    if (passwordValue.length === 0) {
        resetCriteria(eightChars);
        resetCriteria(uppercaseLetter);
        resetCriteria(number);
        resetCriteria(specialChar);
        registerButton.classList.add("disabled");
        return;
    }

    //im declaring these explicitly to make the contitions more readable
    const passwordLength = passwordValue.length;
    const passwordHasUppercase = /[A-Z]/.test(passwordValue);
    const passwordHasNumber = /\d/.test(passwordValue);
    const passwordHasSpecialChar = /[!@#$%^&*()\-_=+{};:,<.>'`\"\ ]/.test(passwordValue);
    console.log(passwordHasSpecialChar)

    let results = []
    results[0] = showCriteriaResult(passwordLength >= 8, eightChars);
    results[1] = showCriteriaResult(passwordHasUppercase && passwordLength !== 0, uppercaseLetter);
    results[2] = showCriteriaResult(passwordHasNumber && passwordLength !== 0, number);
    results[3] = showCriteriaResult(passwordHasSpecialChar, specialChar);

    let allClear = results.every(result => result === true);
    if (allClear) {
        registerButton.classList.remove("disabled");
    } else {
        registerButton.classList.add("disabled");
    }

}

function showCriteriaResult(condition, element) {
    if (condition) {
        element.style.color = PASS_COLOR;
        element.querySelector("span").textContent = PASS_ICON
        return true;
    } else {
        element.style.color = FAIL_COLOR;
        element.querySelector("span").textContent = FAIL_ICON;
        return false;
    }
}

async function register() {
    const email = emailInput.value;
    const password = passwordInput.value;
    const name = nameInput.value;

    if (email == "" || password == "" || name == "") {
        statusElement.classList.add("status-incorrect");
        statusElement.classList.remove("hidden");
        setStatus("All fields are required");
        return false;
    }

    var names = name.split(" ");
    var fullname = {};
    if (names.length >= 2) {
        fullname = {
            first: names[0],
            last: names.slice(1).join(" ")
        }
    } else {
        fullname = {
            first: name,
            last: ""
        }
    }

    const body = {
        email: email,
        password: password,
        firstName: fullname.first,
        lastName: fullname.last,
        token: "gonnagetabigtastyfrommcdonalds"
    }

    const res = await post_api("/employee/session.php/register", body, {use_auth: false, redirect_on_error: false})

    if (res.success) {
        localStorage.setItem("token", res.data.session_token);
        global.getCurrentSession().then((session) => {
            console.log("[register] registered successfully")
            let emp = session.employee;
            console.log(`[register] registered successfully as ${emp.id} (${global.employeeToName(emp)}) ${session.id} - redirecting`);
            window.location.href = "/projects/";
        });
    } else {
        console.log("[register] failed to register")
        statusElement.classList.add("status-incorrect");
        statusElement.classList.remove("hidden");
        setStatus(`${res.error.message} (${res.error.code})`);

    }

}

passwordInput.addEventListener("input", updateCriteriaHints)
document.getElementById("password").addEventListener("focus", updateCriteriaHints)

document.getElementById('togglePassword').addEventListener('click', () => {
    //for password visibility
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        document.getElementById("togglePassword").textContent = "visibility";
    } else {
        passwordInput.type = 'password';
        document.getElementById("togglePassword").textContent = "visibility_off";
    }
});