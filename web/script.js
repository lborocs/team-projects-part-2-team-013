import * as global from "../global-ui.js"

const loginButton = document.getElementById("login")
const passwordInput = document.getElementById("password")

sessionStorage.clear();

function setLoginStatus(status) {
    document.getElementById("status").innerText = status;
}

async function login() {
    const statusElement = document.getElementById("status");
    statusElement.classList.remove("status-incorrect");
    setLoginStatus("Logging in...")
    var username = document.getElementById("username").value
    var password = passwordInput.value
    var loginData = {
        username: username,
        password: password
    }

    const res = await post_api("/employee/session.php/login", loginData);

    if (res.success) {
        sessionStorage.setItem("token", res.data.session_token);
        global.getCurrentSession().then((session) => {

            let emp = session.employee;

            console.log(`[login] logged in successfully as ${emp.id} (${global.bothNamesToString(emp.firstName, emp.lastName)}) ${session.id} - redirecting`);
    
            if (window.location.hash !== "") {
                window.location.href = window.location.hash.substring(1);
            } else {
                window.location.href = "/projects/";
            }

        });
    } else {
        statusElement.classList.add("status-incorrect");
        setLoginStatus(`Error: ${res.data.message} (${res.data.code})`);
    }
}

loginButton.addEventListener("click", login)

passwordInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        login();
    }
});


document.getElementById('togglePassword').addEventListener('click', function () {
    const passwordInput = document.getElementById('password');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        document.getElementById("togglePassword").classList.remove("fa-eye-slash")
        document.getElementById("togglePassword").classList.add("fa-eye")
    } else {
        passwordInput.type = 'password';
        document.getElementById("togglePassword").classList.remove("fa-eye")
        document.getElementById("togglePassword").classList.add("fa-eye-slash")
        
    }
});