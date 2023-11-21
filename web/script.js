const loginButton = document.getElementById("login")
const passwordInput = document.getElementById("password")

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
        fetchSession().then((_) => {
            window.location.href = "/dashboard/"
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

async function fetchSession() {
    const data = await get_api("/employee/session.php/session");
    if (data.success) {
        console.log(`SESSION INFO : ${data.data}`);
        sessionStorage.setItem("session", JSON.stringify(data.data));
    } else {
        console.error("FAILED TO GET SESSION");
    }

}

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