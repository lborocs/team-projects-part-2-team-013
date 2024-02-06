import * as global from "../global-ui.js"

const loginButton = document.getElementById("login")
const passwordInput = document.getElementById("password")
const emailInput = document.getElementById("email")

function setLoginStatus(status) {
    document.getElementById("status").innerText = status;
}

async function login() {
    const statusElement = document.getElementById("status");
    statusElement.classList.remove("status-incorrect");
    statusElement.classList.add("hidden");
    loginButton.querySelector(".button-text").textContent = "Signing in...";
    var username = document.getElementById("email").value
    var password = passwordInput.value
    var loginData = {
        username: username,
        password: password
    }

    const res = await post_api("/employee/session.php/login", loginData, {use_auth: false, redirect_on_error: false});

    if (res.success) {
        localStorage.setItem("token", res.data.session_token);
        global.getCurrentSession().then((session) => {

            let emp = session.employee;

            console.log(`[login] logged in successfully as ${emp.id} (${global.employeeToName(emp)}) ${session.id} - redirecting`);
    
            if (window.location.hash !== "") {
                window.location.href = window.location.hash.substring(1).split("&")[0];
            } else {
                window.location.href = "/projects/";
            }

        });
    } else {
        statusElement.classList.add("status-incorrect");
        statusElement.classList.remove("hidden");
        setLoginStatus(`${res.error.message} (${res.error.code})`);
        loginButton.querySelector(".button-text").textContent = "Sign in";
    }
}

loginButton.addEventListener("click", login)

passwordInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        login();
    }
});

emailInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        login();
    }
});



document.getElementById('togglePassword').addEventListener('click', function () {
    const passwordInput = document.getElementById('password');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        document.getElementById("togglePassword").textContent = "visibility";
    } else {
        passwordInput.type = 'password';
        document.getElementById("togglePassword").textContent = "visibility_off";
        
    }
});

// redirect to projects if we are logged in
global.renewCurrentSession().then((session) => {
    if (session) {
        window.location.href = "/projects/";
    }
});


const schema = window.location.hash.substring(1).split("&")[1];
if (schema) {
    const msg = {
        "sessionexpired": "Your session expired and you have been logged out",
        "authrequired": "You must be logged in to access that page"
    }[schema]

    if (msg) {
        setLoginStatus(msg);
        document.getElementById("status").classList.remove("hidden");
        document.getElementById("status").classList.add("status-incorrect");  
    }

}