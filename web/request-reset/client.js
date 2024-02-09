import * as global from "../global-ui.js"

const emailInput = document.getElementById("email");
const sendButton = document.getElementById("send");


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
    const email = emailInput.value;
    
    if (email.length === 0) {
        console.log("empty email")
        return;
    }

    if (await sendResetEmail(email)) {
        alert("Email sent if it is linked to an account");
        window.location.href = "/";
    }

}




emailInput.addEventListener('input', function(e) {

    if (emailInput.value.length > 0) {
        sendButton.classList.remove("disabled");
    } else {
        sendButton.classList.add("disabled");
    }

})

sendButton.addEventListener("click", handleClick);

emailInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        console.log("enter")
        handleClick();
    }
});