document.addEventListener("DOMContentLoaded", function() {
    let tabElements = document.querySelectorAll(".tab");
    tabElements.forEach((element) => {
        element.addEventListener("click", () => {
            let selectedTab = element.classList[0];
            let optionTitle = document.querySelector(".option-title")
            console.log(selectedTab);

            if (selectedTab == "account"){
                optionTitle.innerHTML = "Account"
            }
            if (selectedTab == "preferences"){
                optionTitle.innerHTML = "Preferences"
            }
            if (selectedTab == "system"){
                optionTitle.innerHTML = "System"
            }
        });
    });
});