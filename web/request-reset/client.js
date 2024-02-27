import * as global from "../global-ui.js"

const emailInput = document.getElementById("email");
const sendButton = document.getElementById("send");


async function sendResetEmail(email) {
    console.log("sending email")

    const res = await post_api("/employee/session.php/resetpassword", {"email": email});

    if (!res.success) {
        await global.popupAlert(
            "Failed to Send Email",
            `An error has occured: ${res.error.message}`,
            "error"
        );
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
        await global.popupAlert(
            "Email Sent",
            "An email has been sent to the provided address if it is linked to an account. Please check your inbox.",
            "success"
        );
        window.location.href = "/";
    }

}


document.querySelector("#email-form")?.addEventListener("submit", function(e) {
    e.preventDefault();
    handleClick();
});



emailInput.addEventListener('input', function(e) {

    if (emailInput.value.length > 0) {
        sendButton.classList.remove("disabled");
    } else {
        sendButton.classList.add("disabled");
    }

})

sendButton.addEventListener("click", handleClick);
