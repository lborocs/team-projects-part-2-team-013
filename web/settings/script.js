document.addEventListener("DOMContentLoaded", function() {
    let tabElements = document.querySelectorAll(".tab");
    tabElements.forEach((element) => {
        element.addEventListener("click", () => {
            let selectedTab = element.classList[0];
            tabElements.forEach((tab) => {
                tab.classList.remove("active-tab");
            });
            element.classList.add("active-tab");
            let optionTitle = document.querySelector(".option-title")
            console.log(selectedTab);
            let optionMenus = document.querySelectorAll(".options")

            optionMenus.forEach(menu => {
                if (menu.classList.contains(`${selectedTab}-options`)) {
                    menu.classList.remove('norender');
                } else {
                    menu.classList.add('norender');
                }
            });

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