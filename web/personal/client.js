import * as global from "../global-ui.js"
import { animate } from "../global-ui.js"


//REALLY IMPORTANT GLOBAL
var clientPersonals = [];


//single things
const taskGrid = document.querySelector(".taskgrid")
const taskList = document.querySelector(".tasklist")
const overlay = document.querySelector(".overlay")
const explainer = document.querySelector(".explainer")
const explainerTitle = explainer.querySelector(".title")
const explainerDescription = explainer.querySelector(".description")
const explainerTeamLeader = explainer.querySelector(".team-leader")
const explainerDeleteButton = explainer.querySelector(".delete-button")
const explainerTask = explainer.querySelector(".task-overview")
const explainerTaskTitle = explainerTask.querySelector(".title")
const explainerTaskDescription = explainerTask.querySelector(".description")
const explainerTaskOverview = explainer.querySelector(".task-overview")
const explainerTaskDate = explainerTask.querySelector(".date")
const explainerShowHide = document.querySelector("#explainer-show-hide")
const notStartedColumn = document.querySelector("#notstarted")
const inProgressColumn = document.querySelector("#inprogress")
const finishedColumn = document.querySelector("#finished")
const notStartedAddButton = document.querySelector("#notstarted-add")
const inProgressAddButton = document.querySelector("#inprogress-add")
const finishedAddButton = document.querySelector("#finished-add")
const saveButton = document.querySelector("#save-task")
const pressToEdit = document.querySelector("#press-to-edit")
const taskTableBody = document.querySelector(".tasktable-body")
const listAddButtonRow = document.querySelector("#list-add-row")
const listAddButton = document.querySelector("#list-add")

var taskRows = document.querySelectorAll(".taskrow") 


//groups of things
var projectTabs = document.querySelectorAll(".project")
const views = document.querySelectorAll(".view")
const taskColumns = document.querySelectorAll(".taskcolumn")
var taskCards = document.querySelectorAll(".task")
const dropdowns = document.querySelectorAll(".dropdown")
const dragIndicators = document.querySelectorAll(".draggable")

console.log("loaded client.js")
pressToEdit.setAttribute("hidden", "true")

calculateTaskCount()

//event listeners
function setUpProjectTabEventListeners() {
    projectTabs.forEach((projectTab, i) => {
        projectTab.addEventListener("click", () => {
            if (!projectTab.classList.contains("selected")) {
                projectTab.classList.add("selected")
                projectTabs.forEach((tab, j) => {
                    if (j !== i) {
                        tab.classList.remove("selected")
                    }
                })
                console.log("selected")
                
            } 
            explainerTitle.innerHTML = ""
            explainerTitle.innerHTML = projectTab.innerHTML
            explainerDescription.innerHTML = ""

        })
    })
}

views.forEach((view, i) => {
    
    view.addEventListener("click", () => {
        if (!view.classList.contains("selected")) {
            view.classList.add("selected")
            views.forEach((tab, j) => {
                if (j !== i) {
                    tab.classList.remove("selected")
                }
            })
            console.log("selected")

            taskGrid.classList.toggle("fade")
            taskList.classList.toggle("fade")
            setTimeout(() => {
                taskGrid.classList.toggle("norender")
                taskList.classList.toggle("norender")
            }, 50)
        } 
    })
})

explainerShowHide.addEventListener("click", () => {
    explainer.classList.toggle("hidden")

    if (explainer.classList.contains("hidden")) {
        explainerShowHide.innerHTML = `<i class="fa-solid fa-arrows-up-to-line fa-rotate-270"></i>`
    } else {
        explainerShowHide.innerHTML = `<i class="fa-solid fa-arrows-up-to-line fa-rotate-90"></i>`
    }
    console.log("clicked")
})


//takes a personal task object and shows it in the explainer
function showTaskListInExplainer(task) {
    let titleElement = task.querySelector(".title");
    explainerTaskTitle.innerHTML = titleElement ? titleElement.innerHTML : "No Title";
    explainerTaskTitle.classList.remove("norender");

    let descElement = task.querySelector(".description");
    explainerTaskDescription.innerHTML = descElement ? descElement.innerHTML : `<i class="fa-solid fa-plus"></i> Description`;

    let dateElement = task.querySelector(".date");
    explainerTaskDate.innerHTML = dateElement ? `<i class="fa-regular fa-calendar"></i> ${dateElement.innerHTML}` : `<i class="fa-regular fa-pen-to-square"></i> <i>+ Due date</i>`;

    let taskState = 0;
    if (task.children[2].classList.contains("not-started")) {
        taskState = 0;
    } else if (task.children[2].classList.contains("in-progress")) {
        taskState = 1;
    } else if (task.children[2].classList.contains("finished")) {
        taskState = 2;
    } else {
        console.error("invalid state");
    }
    explainerTask.setAttribute("data-itemID", task.getAttribute("id"));
    let statusElement = document.querySelector(".status");
    statusElement.innerHTML = "";
    let status = document.createElement("div");
    status.classList.add("status-container");
    status.innerHTML = `${taskState == 0 ? `<i class="fa-solid fa-thumbtack"></i> Not Started` : taskState == 1 ? `<i class="fa-solid fa-chart-line"></i> In Progress` : taskState == 2 ? `<i class="fa-regular fa-circle-check"></i> Finished` : "Error"}`;
    statusElement.appendChild(status);
    explainerTaskTitle.setAttribute("contenteditable", "true");
    explainerTaskDescription.setAttribute("contenteditable", "true");
    explainerTaskDate.setAttribute("contenteditable", "true");
    animate(document.querySelector(".task-overview"), "flash")

    let breadcrumb = document.querySelector(".breadcrumb");
    breadcrumb.innerHTML = `My List > ${titleElement.innerHTML}`;
}

function showTaskInExplainer(task) {
    let titleElement = task.querySelector(".title");
    explainerTaskTitle.innerHTML = titleElement ? titleElement.innerHTML : "No Title";
    explainerTaskTitle.classList.remove("norender");

    let descElement = task.querySelector(".description");
    explainerTaskDescription.innerHTML = descElement ? descElement.innerHTML : `<i class="fa-solid fa-plus"></i> Description`;

    let dateElement = task.querySelector(".date");
    explainerTaskDate.innerHTML = dateElement ? `<i class="fa-regular fa-calendar"></i> ${dateElement.innerHTML}` : `<i class="fa-regular fa-pen-to-square"></i> <i>+ Due date</i>`;

    let taskState = 0;
    if (task.parentElement == notStartedColumn) {
        taskState = 0;
    } else if (task.parentElement == inProgressColumn) {
        taskState = 1;
    } else if (task.parentElement == finishedColumn) {
        taskState = 2;
    } else {
        console.error("invalid state");
    }
    explainerTask.setAttribute("data-itemID", task.getAttribute("id"));
    let statusElement = document.querySelector(".status");
    statusElement.innerHTML = "";
    let status = document.createElement("div");
    status.classList.add("status-container");
    status.innerHTML = `${taskState == 0 ? `<i class="fa-solid fa-thumbtack"></i> Not Started` : taskState == 1 ? `<i class="fa-solid fa-chart-line"></i> In Progress` : taskState == 2 ? `<i class="fa-regular fa-circle-check"></i> Finished` : "Error"}`;
    statusElement.appendChild(status);
    explainerTaskTitle.setAttribute("contenteditable", "true");
    explainerTaskDescription.setAttribute("contenteditable", "true");
    explainerTaskDate.setAttribute("contenteditable", "true");
    animate(document.querySelector(".task-overview"), "flash")

    let breadcrumb = document.querySelector(".breadcrumb");
    breadcrumb.innerHTML = `My List > ${titleElement.innerHTML}`;
}

function setUpTaskEventListeners() {
    taskCards = document.querySelectorAll(".task");
    taskCards.forEach((taskCard) => {

        var taskID = taskCard.getAttribute("id");
        var task = document.getElementById(taskID);

        taskCard.addEventListener("mousedown", () => {
            console.log(explainer)
            explainer.classList.remove("hidden")
            overlay.classList.remove("norender")
            showTaskInExplainer(taskCard);
            animate(taskCard, "click-small")
        });

        taskCard.addEventListener("dragstart", () => {
            taskCard.classList.add("beingdragged");
        });

        taskCard.addEventListener("dragend", () => {
            taskCard.classList.remove("beingdragged");
            showTaskInExplainer(taskCard);
            calculateTaskCount()
        });
    });

    taskRows = document.querySelectorAll(".taskRow");
    taskRows.forEach((taskRow) => {
        taskRow.addEventListener("mousedown", () => {
            console.log("clicked")
            animate(taskRow, "click-small")
            showTaskListInExplainer(taskRow);
        });
    });

}



taskColumns.forEach((taskColumn) => {
    
    taskColumn.addEventListener("dragover", (e) => {
        e.preventDefault()
        const afterElement = findNext(taskColumn, e.clientY)
        const draggable = document.querySelector(".beingdragged")
        if (afterElement == null) {
            taskColumn.appendChild(draggable)
        } else {
            taskColumn.insertBefore(draggable, afterElement)
        }
        var addTask = taskColumn.querySelector(".add-task")
        taskColumn.appendChild(addTask)
    })

})


function findNext(container, y) {
    const otherTasks = container.querySelectorAll(".task:not(.beingdragged)");
    let closest = null;
    let closestOffset = Number.NEGATIVE_INFINITY;

    otherTasks.forEach((child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closestOffset) {
            closest = child;
            closestOffset = offset;
        }
    });

    return closest;
}

async function fetchTasks() {
    const data = await get_api(`/employee/employee.php/personals`);
    console.log("created task")
    console.log(data);
    if (data.success == true) {
        console.log("tasks have been fetched")
        data.data.personals.forEach(task => {
            taskObjectRenderAll(task);
        });
        return data.data.personals
    }
}

function taskObjectRenderAll(task) {
    console.log("rendering task object "+task.title)
    let date = task.dueDate ? new Date(task.dueDate) : new Date();
    let desc = task.content
    let title = task.title || "No Title";
    let createdBy = task.createdBy || "Unknown";
    let state = task.state
    let taskID = task.itemID || "Unknown";
    
    console.log("rendering task")
    console.log(task)

    renderTask(title, state, taskID, desc, createdBy, global.formatDate(date));
    renderTaskInList(title, state, taskID, desc, createdBy, global.formatDate(date));
    calculateTaskCount()
}

function calculateTaskCount() {
    let notStartedCount = notStartedColumn.querySelectorAll(".task").length || 0
    let inProgressCount = inProgressColumn.querySelectorAll(".task").length || 0
    let finishedCount = finishedColumn.querySelectorAll(".task").length || 0
    document.querySelector("#notstarted-count").innerHTML = notStartedCount
    document.querySelector("#inprogress-count").innerHTML = inProgressCount
    document.querySelector("#finished-count").innerHTML = finishedCount
}

function renderTaskInList(title, state = 0, ID = "", desc = "", assignee = "", date = "") {
    console.log("renering task in list")
    state = state === null ? 0 : state;
    ID = ID === null ? "" : ID;
    desc = desc === null ? "" : desc;
    assignee = assignee === null ? "" : assignee;
    date = date === null ? "" : date;

    let taskRow = document.createElement("tr");
    taskRow.classList.add("taskRow");
    

    taskRow.innerHTML = `
        <td class="title">
            ${title}
        </td>
    `; 
    if (date !== "") {
        taskRow.innerHTML += `
            <td class="date">
                ${date}
            </td>
        `;
    }
    
    taskRow.setAttribute("id", ID);

    taskRow.setAttribute("data-desc", desc);
    taskRow.setAttribute("data-assignee", assignee);
    taskRow.setAttribute("data-date", date);

    if (state == 0) {
        taskRow.innerHTML += `
            <td class="not-started">
                <i class="fa-solid fa-thumbtack"></i> Not Started
            </td>
        `;
    } else if (state == 1) {
        taskRow.innerHTML += `
            <td class="in-progress">
                <i class="fa-solid fa-chart-line"></i> In Progress
            </td>
        `;
    } else if (state == 2) {
        taskRow.innerHTML += `
            <td class="finished">
                <i class="fa-regular fa-circle-check"></i> Finished
            </td>
        `;
    } else {
        console.error("invalid state");
    }
    taskTableBody.appendChild(taskRow);
    taskTableBody.appendChild(listAddButtonRow);

    setUpTaskEventListeners();
}

let titleButton = document.getElementById("title-column");
let dateButton = document.getElementById("date-column");
let statusButton = document.getElementById("status-column");

let sortArray = [titleButton, dateButton, statusButton];

sortArray.forEach((sortObject) => {
    sortObject.addEventListener("click", () => {
        if (sortObject.classList.contains("selected")) {
            if(sortObject.classList.contains("asc")) {
                sortObject.classList.remove("asc");
                sortObject.classList.add("desc");
            } else {
                sortObject.classList.remove("desc");
                sortObject.classList.add("asc");
            }
        } else  {
            sortArray.forEach((sortObject) => {
                sortObject.classList.remove("selected", "asc", "desc");
            });
            sortObject.classList.add("selected", "asc");
        }
        
        let ascending = sortObject.classList.contains("asc");
        let descending = sortObject.classList.contains("desc");
        let sortBy = sortObject.id;
        let tasks = globalTasksList;
        if (sortBy == "title-column") {
            sortByTitle(tasks, ascending);
        } else if (sortBy == "date-column") {
            sortByDueDate(tasks, ascending);
        } else if (sortBy == "status-column") {
            sortByState(tasks, ascending);
        } else {
            console.error("invalid sort criteria");
        }
        taskRows.forEach((task) => {
            task.remove();
        });
        tasks.forEach((task) => {
            renderTaskInList(task);
        });
    })
})



function sortByCreatedAt(tasks, ascending) {
    tasks.sort((a, b) => {
        let aDate = new Date(a.createdAt);
        let bDate = new Date(b.createdAt);
        return ascending ? aDate - bDate : bDate - aDate;
    });
    return tasks;
}

function sortByDueDate(tasks, ascending) {
    tasks.sort((a, b) => {
        if (a.dueDate === null) return 1;
        if (b.dueDate === null) return -1;
        let aDate = new Date(a.dueDate);
        let bDate = new Date(b.dueDate);
        return ascending ? aDate - bDate : bDate - aDate;
    });
    return tasks;
}

function sortByTitle(tasks, ascending) {
    tasks.sort((a, b) => {
        let aTitle = a.title;
        let bTitle = b.title;
        return ascending ? aTitle.localeCompare(bTitle) : bTitle.localeCompare(aTitle);
    });
    return tasks;
}

function sortByState(tasks, ascending) {
    tasks.sort((a, b) => {
        let aState = a.state;
        let bState = b.state;
        return ascending ? aState - bState : bState - aState;
    });
    return tasks;
}

function renderTask(title, state = 0, ID = "", desc = "", assignee = "", date = "") {
    state = state === null ? 0 : state;
    desc = desc === null ? "" : desc;
    assignee = assignee === null ? "" : assignee;
    date = date === null ? "" : date;
    console.log(ID)
    let task = document.createElement("div");
    task.classList.add("task");
    task.setAttribute("draggable", "true");
    task.innerHTML = `
        <div class="draggable">
            <i class="fa-solid fa-grip-vertical"></i>
        </div>
        <div class="title">
            ${title}
        </div>
    `
    if (desc !== "") {
        task.innerHTML += `
        <div class="description">
            ${desc}
        </div>

    `;
    } 
    if (date !== "") {
        task.innerHTML += `
        <div class="date-and-button">
            <div class="date">
                ${date}
            </div>
        </div>
    `;
    }
    
    task.setAttribute("id", ID);
    task.setAttribute("data-desc", desc);
    task.setAttribute("data-date", date);
    task.setAttribute("data-state", state);

    if (state == 0) {
        notStartedColumn.appendChild(task);
        animate(task, "flash")
    } else if (state == 1) {
        inProgressColumn.appendChild(task);
        animate(task, "flash")
    } else if (state == 2) {
        finishedColumn.appendChild(task);
        animate(task, "flash")
    } else {
        console.error("invalid state");
    }
    console.log(taskCards);
    
    console.log(taskCards);
    notStartedColumn.appendChild(notStartedAddButton);
    inProgressColumn.appendChild(inProgressAddButton);
    finishedColumn.appendChild(finishedAddButton);

    setUpTaskEventListeners();
    return task
}


function userCreateNewTask(column) {
    console.log("creating new task")
    let task = document.createElement("div")
    task.classList.add("task")
    task.classList.add("new")
    task.innerHTML = `
        <div class="title">
            <div class="draggable">
                <i class="fa-solid fa-grip-vertical"></i>
            </div>
            <input type="text" placeholder="Task name..." class="title-input">

        </div>
    `
    column.appendChild(task);

    column.appendChild(column.querySelector(".add-task"))

    task.querySelector(".title-input").addEventListener("keydown", async function(event) {
        if (event.key === "Enter") {
            task.remove()
            event.preventDefault();
            let state = 0;
            if (column == notStartedColumn) {
                state = 0;
            } else if (column == inProgressColumn) {
                state = 1;
            } else if (column == finishedColumn) {
                state = 2;
            } else {
                console.error("invalid state");
            }

            let session = JSON.parse(sessionStorage.getItem("session"));
            post_api(`/employee/employee.php/personal/${session.employee.empID}`, {title: this.value, state: state}).then(res => {
                console.log("new task data");
                console.log(res)
                if (res.success) {
                    taskObjectRenderAll(res.data)
                    
                    let parent = task.querySelector(".title")
                    console.log(parent)
                    global.showConfirmCheck(parent)
                    
                }
            })
            
        }
    });
    
}

function listCreateNewTask() {
    console.log("creating new task")
    let state = 0
    let ID = "123456789"
    let desc = "test"
    let date = "10/12/2021"
    let assignee = "Jamie Skitt"
    let taskRow = document.createElement("tr");
    taskRow.classList.add("taskRow");
    taskRow.classList.add("new");
    taskRow.innerHTML = `
        <td class="title">
            test...
        </td>
    `; 
    if (date !== "") {
        taskRow.innerHTML += `
            <td class="date">
                ${date}
            </td>
        `;
    }
    
    taskRow.setAttribute("id", ID);
    taskRow.setAttribute("data-desc", desc);
    taskRow.setAttribute("data-assignee", assignee);
    taskRow.setAttribute("data-date", date);
    
    if (state == 0) {
        taskRow.innerHTML += `
            <td class="not-started">
                <i class="fa-solid fa-thumbtack"></i> Not Started
            </td>
        `;
    } else if (state == 1) {
        taskRow.innerHTML += `
            <td class="in-progress">
                <i class="fa-solid fa-chart-line"></i> In Progress
            </td>
        `;
    } else if (state == 2) {
        taskRow.innerHTML += `
            <td class="finished">
                <i class="fa-regular fa-circle-check"></i> Finished
            </td>
        `;
    } else {
        console.error("invalid state");
    }
    taskTableBody.appendChild(taskRow);
    taskTableBody.appendChild(listAddButtonRow);

    setUpTaskEventListeners();
}


console.log("setting up event listeners")

notStartedAddButton.addEventListener("click", () => {
    userCreateNewTask(notStartedColumn)
})

inProgressAddButton.addEventListener("click", () => {
    userCreateNewTask(inProgressColumn)
})

finishedAddButton.addEventListener("click", () => {
    userCreateNewTask(finishedColumn)
})

listAddButton.addEventListener("click", () => {
    listCreateNewTask()
})

fetchTasks()

function updateTaskFromExplainer(){
    console.log("updating task")
    let title = explainerTaskTitle.textContent
    let desc = explainerTaskDescription.textContent
    let date = explainerTaskDate.textContent
    let itemID = explainerTask.getAttribute("data-itemID")
    let taskCard = document.getElementById(itemID)
    console.log(taskCard)
    taskCard.setAttribute("data-desc", desc)
    taskCard.setAttribute("data-date", date)
    let titleElement = taskCard.querySelector(".title");
    let descElement = taskCard.querySelector(".description");
    let dateElement = taskCard.querySelector(".date");

    if (titleElement) {
        titleElement.innerHTML = title;
    }

    if (descElement) {
        descElement.innerHTML = desc;
    }

    if (dateElement) {
        dateElement.innerHTML = date;
    }
    animate(taskCard, "flash")

    
    
}

explainerTaskTitle.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        updateTaskFromExplainer()
        explainerTaskTitle.blur()
    }
})

explainerTaskDescription.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        updateTaskFromExplainer()
        explainerTaskDescription.blur()
    }
})

explainerTaskDate.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        updateTaskFromExplainer()
        explainerTaskDate.blur()
    }
})

function confirmDelete() {
    console.log("Running confirmDelete")
    return new Promise((resolve, reject) => {
        console.log("Creating popup")
        let popupDiv = document.querySelector('.popup');
        console.log(popupDiv)
        let fullscreenDiv = document.querySelector('.fullscreen');
        console.log("before popup")
        popupDiv.innerHTML = `
            <dialog open class='popupDialog' id="delete-popup">
                <p>Are you sure you want to delete this task?</p>
                <p><strong>This change cannot be undone.</strong></p>
                <form method="dialog" class = "buttonForm">
                    <button class="closeButton">Cancel</button>
                    <button class="deleteButton">Delete</button> 
                </form>
            </dialog>
        `;
        console.log(popupDiv.innerHTML)
        console.log("after popup")
        fullscreenDiv.style.filter = 'brightness(0.6)';

        let dialog = popupDiv.querySelector('.popupDialog');
        let closeButton = dialog.querySelector('.closeButton');
        let deleteButton = dialog.querySelector('.deleteButton');

        closeButton.addEventListener('click', (event) => {
            event.preventDefault(); 
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            console.log("rejecting")
            reject();
        });

        deleteButton.addEventListener('click', (event) => {
            event.preventDefault();
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            console.log("resolving")
            resolve();
        });
    });
}


function deleteTask() {
    console.log("bin clicked")
    let session = JSON.parse(sessionStorage.getItem("session"));

    let taskID = explainerTaskOverview.getAttribute("data-itemID");

    if (!taskID) {
        console.error("deleter pressed with no task selected");
    } else {
        confirmDelete().then(() => {
            delete_api(`/employee/employee.php/personal/${session.employee.empID}/${taskID}`).then(res => {
                if (!res) {
                    document.getElementById(taskID).remove();
                    calculateTaskCount()
                }
            })
        }).catch(() => {
            console.log("Delete cancelled");
        });
    }
}

explainerDeleteButton.addEventListener("click", deleteTask);


//mobile less than 775px
let mediaQueryMobile = window.matchMedia("(max-width: 775px)")
//between mobile and 1520px
let mediaQueryMedium = window.matchMedia("(min-width: 776px) and (max-width: 1520px)")
//larger than 1520pxF
let mediaQueryDesktop = window.matchMedia("(min-width: 1521px)")

if (mediaQueryMobile.matches) {
    console.log("mobile")
    explainer.classList.add("hidden")
    overlay.classList.add("norender")
    explainerShowHide.classList.add("norender")
} else {
    console.log("desktop")
}

mediaQueryMobile.addEventListener("change", (e) => {
    if (e.matches) {
        console.log("mobile")
        explainer.classList.add("hidden")
        overlay.classList.add("norender")
        explainerShowHide.classList.add("norender")
    }
})

if (mediaQueryMedium.matches) {
    console.log("medium")
    explainer.classList.add("hidden")
    overlay.classList.add("norender")
}

mediaQueryMedium.addEventListener("change", (e) => {
    if (e.matches) {
        console.log("medium")
        explainer.classList.add("hidden")
        explainerShowHide.classList.remove("norender")
    }
})

if (mediaQueryDesktop.matches) {
    console.log("desktop")
}

mediaQueryDesktop.addEventListener("change", (e) => {
    if (e.matches) {
        console.log("desktop")
        explainer.classList.remove("hidden")
        overlay.classList.remove("norender")
        explainerShowHide.classList.remove("norender")
    }
})

overlay.addEventListener('click', () => {
    explainer.classList.add('hidden');
    overlay.classList.add('norender');
});