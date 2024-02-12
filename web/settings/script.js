document.addEventListener("DOMContentLoaded", function() {
    let tabElements = document.querySelectorAll(".tab");
    tabElements.forEach((element) => {
        element.addEventListener("click", () => {
            let selectedTab = element.classList[0];
            console.log(selectedTab);


        });
    });
});