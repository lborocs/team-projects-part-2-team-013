
let tabs = document.querySelectorAll(".tab-selector");
tabs.forEach((tab) => {
    if (tab.classList.contains("account")) {
        tab.innerHTML = "This is the account tab";
    } else if (tab.classList.contains("preferences")) {
        tab.innerHTML = "This is the preferences tab";
    } else if (tab.classList.contains("system")) {
        tab.innerHTML = "This is the system tab";
    }
});