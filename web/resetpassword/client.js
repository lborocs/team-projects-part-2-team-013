const validatedToken = "";

async function validateToken() {
    const token = document.location.hash.substring(1);

    if (token.length > 0) { return; }

    const res = await get_api("/employee/session.php/resetpassword", {token:token});
    if (res.status != 200) { return; }

    document.getElementById("email").innerText = res.email;
    validatedToken = token;

}

validateToken();


async function chnagePassword() {
    
    await put_api("/employee/session.php/resetpassword", {token:validatedToken, password:password});

}
