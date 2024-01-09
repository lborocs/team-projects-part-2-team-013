document.getElementById("register").addEventListener("click", (e) => {
    window.location.href = "/"
})

function updateStyles(){
    if (document.getElementById("password").value.length > 7) {
        document.getElementById("eightChars").style.color = "green"
        document.getElementById("eightCharsIcon").classList.remove("fa-times")
        document.getElementById("eightCharsIcon").classList.add("fa-check")

    }
    else {
        document.getElementById("eightChars").style.color = "#ff0033"
        document.getElementById("eightCharsIcon").classList.remove("fa-check")
        document.getElementById("eightCharsIcon").classList.add("fa-times")

    }
    if ((document.getElementById("password").value !== document.getElementById("password").value.toLowerCase()) && (document.getElementById("password").value.length !== 0)) {
        document.getElementById("uppercaseLetter").style.color = "green"
        document.getElementById("uppercaseLetterIcon").classList.remove("fa-times")
        document.getElementById("uppercaseLetterIcon").classList.add("fa-check")

    }
    else {
        document.getElementById("uppercaseLetter").style.color = "#ff0033"
        document.getElementById("uppercaseLetterIcon").classList.remove("fa-check")
        document.getElementById("uppercaseLetterIcon").classList.add("fa-times")
    }
    var num = false
    Array.from(document.getElementById("password").value).forEach((char) => {
        if (!isNaN(char)) {
            num = true
        }
    })
    if (num === true && (document.getElementById("password").value.length !== 0)) {
        document.getElementById("number").style.color = "green"
        document.getElementById("numberIcon").classList.remove("fa-times")
        document.getElementById("numberIcon").classList.add("fa-check")

    }
    else {
        document.getElementById("number").style.color = "#ff0033"
        document.getElementById("numberIcon").classList.remove("fa-check")
        document.getElementById("numberIcon").classList.add("fa-times")
    }
    if (document.getElementById("password").value.includes("?") || document.getElementById("password").value.includes("!") || document.getElementById("password").value.includes("_")) {
        document.getElementById("specialChar").style.color = "green"
        document.getElementById("specialCharIcon").classList.remove("fa-times")
        document.getElementById("specialCharIcon").classList.add("fa-check")

    }
    else {
        document.getElementById("specialChar").style.color = "#ff0033"
        document.getElementById("specialCharIcon").classList.remove("fa-check")
        document.getElementById("specialCharIcon").classList.add("fa-times")
        
}
}

addEventListener("keydown", (e) => {
    sleep(10).then(() => {
        if (document.activeElement.id === "password" || document.getElementById("password").value.length !== 0) {
    updateStyles()
    }
}
    )
})

document.getElementById("password").addEventListener("focus", updateStyles)

const sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};
const passwordInput = document.getElementById('password');
passwordInput.type = 'password';

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