import * as global from "../global-ui.js"


const emailInput = document.getElementById('email');
const registerButton = document.getElementById('register');
let statusElement = document.getElementById("status");

registerButton.addEventListener("click", verify)

emailInput.addEventListener('input', function() {    
    sleep(10).then(() => {
        console.log(emailInput.value)
        if(emailInput.value.length > 0) {
            registerButton.classList.remove("disabled");
        }
        else {
            registerButton.classList.add("disabled");
        }
    });
});

emailInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        verify();
    }
});

const sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

function setStatus(status) {
    statusElement.innerText = status;
}

async function verify() {
    const email = emailInput.value;

    if (email == "") {
        statusElement.classList.add("status-incorrect");
        statusElement.classList.remove("hidden");
        setStatus("Please enter your Email");
        return false;
    }
    let data = {
        email: email
    }
    console.log(data)
    const res = await post_api("/employee/session.php/verifyemail", data)

    if (res.success) {
        statusElement.classList.remove("hidden");
        setStatus("Email sent, please check your email.");
    }
    else {
        console.log("[register] failed to register")
        statusElement.classList.add("status-incorrect");
        statusElement.classList.remove("hidden");
        setStatus(`${res.error.message} (${res.error.code})`);
    }
}