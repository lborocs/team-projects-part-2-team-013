//Written by Jamie Skitt F226141
import * as global from "../global-ui.js"
import { animate } from "../global-ui.js"
import { getEmployeesById } from '../global-ui.js';

const RENDER_COLUMN = 1;
const RENDER_LIST = 2;
const RENDER_BOTH = 3;

//important shit
var globalTasksList = [];
let titleButton = document.getElementById("title-column");
let dateButton = document.getElementById("date-column");
let statusButton = document.getElementById("status-column");

let sortArray = [titleButton, dateButton, statusButton];

//single things
const taskGrid = document.querySelector(".taskgrid")
const taskList = document.querySelector(".tasklist")
const taskTable = document.querySelector(".tasktable")
const taskTableBody = document.querySelector(".tasktable-body")
const overlay = document.querySelector(".overlay")
const explainer = document.querySelector(".explainer")
const explainerTitle = explainer.querySelector("#explainer-title")
const explainerDescription = document.querySelector("#project-description")
const explainerTeamLeaderAvatar = document.querySelector("#team-leader-avatar")
const explainerTeamLeaderName = document.querySelector("#team-leader-name")
const explainerTask = explainer.querySelector(".task-overview")
const explainerTaskTitle = explainerTask.querySelector(".title")
const explainerTaskDescriptionContainer = explainerTask.querySelector(".description-container")
const explainerTaskDescription = explainerTask.querySelector(".description")
const explainerTaskDateContainer = explainerTask.querySelector(".date-container")
const explainerTaskDate = explainerTask.querySelector(".date")
const explainerShowHide = document.querySelector("#explainer-show-hide")
const notStartedColumn = document.querySelector("#notstarted")
const inProgressColumn = document.querySelector("#inprogress")
const finishedColumn = document.querySelector("#finished")
const notStartedAddButton = document.querySelector("#notstarted-add")
const inProgressAddButton = document.querySelector("#inprogress-add")
const finishedAddButton = document.querySelector("#finished-add")
const listAddButtonRow = document.querySelector("#list-add-row")
const listAddButton = document.querySelector("#list-add")

//groups of things
var projectTabs = document.querySelectorAll(".project")
const views = document.querySelectorAll(".view")
const taskColumns = document.querySelectorAll(".taskcolumn")
var taskCards = document.querySelectorAll(".task")
var taskRows = document.querySelectorAll(".taskrow") 
const dropdowns = document.querySelectorAll(".dropdown")
const dragIndicators = document.querySelectorAll(".draggable")
console.log("loaded client.js")


function projectSwitchToOnClick(projectTab) {
    projectTabs = document.querySelectorAll(".project")

    explainerTaskSetToDefault();

    let id = projectTab.getAttribute("data-ID");
    let title = projectTab.getAttribute("data-title");
    let description = projectTab.getAttribute("data-description") ?? "";
    let teamLeader = projectTab.getAttribute("data-team-leader")

    if (!projectTab.classList.contains("selected")) {
        projectTabs.forEach((tab, j) => {
            tab.classList.remove("selected")
        })
        projectTab.classList.add("selected")
        //remove tasks currently on the screen
        taskCards.forEach((task) => {
            task.remove()
        })
        taskRows.forEach((task) => {
            task.remove()
        }) 
        fetchTasks(id).then((tasks) => {
            console.log("fetched & rendered tasks for " + title)
            globalTasksList = tasks;
            console.log(globalTasksList)
        })
        
        // unselect not this project
        console.log("selected " + title)
        //update the breadcrumb with the project name
        let breadcrumb = document.querySelector(".breadcrumb")
        breadcrumb.innerHTML = `Projects > ${title}`
        explainerTitle.innerText = title
        explainerDescription.innerText = description
        explainerTeamLeaderName.innerText = teamLeader
        explainerTeamLeaderAvatar.src = global.nameToAvatar(teamLeader)
    }
    teamLeaderEnableElementsIfTeamLeader()

}


// //event listeners
function setUpProjectTabEventListeners() {
    projectTabs = document.querySelectorAll(".project")
    projectTabs.forEach((projectTab, i) => {
        projectTab.addEventListener("click", () => {
            projectSwitchToOnClick(projectTab);

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

function explainerTaskSetToDefault() {
    explainerTaskTitle.innerHTML = ""
    explainerTaskDescription.innerHTML = "Select a task to view more information..."
    explainerTaskDate.innerHTML = ""
    let statusElement = document.querySelector(".status");
    statusElement.innerHTML = "";
}

function getTaskState(task) {
    let taskState = 0;
    if (task.querySelector(".not-started")) {
        return 0;
    } else if (task.querySelector(".in-progress")) {
        return 1;
    } else if (task.querySelector(".finished")) {
        return 2;
    } else if (task.parentElement == notStartedColumn) {
        return 0;
    } else if (task.parentElement == inProgressColumn) {
        return 1;
    } else if (task.parentElement == finishedColumn) {
        return 2;
    } else {
        console.error("invalid state");
    }
}
//shows the taskRow in the explainer#
//the taskRow contains title, due date and state in columns"
//the rest of the informaton is in the data attributes: desc, assignee, date
function showTaskInExplainer(task) {


    let taskState = getTaskState(task);

    let taskID = task.getAttribute("id");
    explainerTask.setAttribute("task-id", taskID);

    let titleElement = task.querySelector(".title");
    explainerTaskTitle.innerHTML = titleElement ? titleElement.innerHTML : "No Title";
    explainerTaskTitle.classList.remove("norender");

    let descElement = task.getAttribute("data-desc");
    explainerTaskDescription.innerHTML = descElement ? descElement : "<i>No description...</i>";

    let dateElement = task.getAttribute("data-date");
    explainerTaskDate.innerHTML = dateElement ? `<i class="fa-regular fa-calendar"></i> ${dateElement}` : "<i>No due date</i>";

    //get task state from what is in the status column the third column of a row

    explainerTaskDate.setAttribute("data-timestamp", task.getAttribute("data-timestamp"));

    let icon;
    let statusText;
    
    if (taskState == 0) {
        icon = '<i class="fa-solid fa-thumbtack" id="task-status-icon"></i>';
        statusText = 'Not Started';
    } else if (taskState == 1) {
        icon = '<i class="fa-solid fa-chart-line" id="task-status-icon"></i>';
        statusText = 'In Progress';
    } else if (taskState == 2) {
        icon = '<i class="fa-regular fa-circle-check" id="task-status-icon"></i>';
        statusText = 'Finished';
    } else {
        icon = '';
        statusText = 'Error';
    }
    
    let statusElement = document.querySelector(".status");
    statusElement.innerHTML = `${icon} ${statusText}`;;
    animate(document.querySelector(".task-overview"), "flash")

    //show task name in breadcrumb
    let breadcrumb = document.querySelector(".breadcrumb");
    //get currently selected project
    let selectedProject = document.querySelector(".project.selected");
    let projName = selectedProject.getAttribute("data-title");
    breadcrumb.innerHTML = `Projects > ${projName} > ${titleElement.innerHTML}`;
}


function setUpTaskEventListeners() {
    taskCards = document.querySelectorAll(".task");
    taskCards.forEach((taskCard) => {

        taskCard.addEventListener("mousedown", () => {
            //show explainer
            // console.log(explainer)
            explainer.classList.remove("hidden")
            overlay.classList.remove("norender")
            animate(taskCard, "click-small")
        });
        taskCard.addEventListener("mouseup", () => {
            showTaskInExplainer(taskCard);
        });

        taskCard.addEventListener("touchstart", () => {
            //show explainer
            console.log("clicked")
            animate(taskRow, "click-small")
            showTaskInExplainer(taskRow);
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

    //list view
    taskRows = document.querySelectorAll(".taskRow");
    taskRows.forEach((taskRow) => {
        taskRow.addEventListener("mousedown", () => {
            //show explainer
            console.log("clicked")
            animate(taskRow, "click-small")
        });
        taskRow.addEventListener("mouseup", () => {
            showTaskInExplainer(taskRow);
        });
        taskRow.addEventListener("touchstart", () => {
            //show explainer
            console.log("clicked")
            animate(taskRow, "click-small")
            showTaskInExplainer(taskRow);
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

async function fetchTasks(projID) {
    const data = await get_api(`/api/project/task.php/tasks/${projID}`);
    console.log(data);
    // process the data here
    if (data.success == true) {
        console.log(`tasks have been fetched for ${projID}`)
        globalTasksList = data.data.tasks;
        await Promise.all(data.data.tasks.map((task) => {
            taskObjectRenderAll(task)
        }));
        if (data.data.contains_assignments) {
            renderAssignments(data.data.assignments).then(() => {
                console.log("assignments rendered");
            });
        }
        return data.data.tasks
    }
}

function taskObjectRenderAll(task, update = RENDER_BOTH) {
    console.log("rendering task object "+task.title)
    let date = task.dueDate ? global.formatDate(new Date(task.dueDate * 1000)) : "Due date not set";
    let desc = task.description
    let title = task.title || "No Title";
    let createdBy = task.createdBy || "Unknown";
    let state = task.state
    let taskID = task.taskID || "Unknown";
    
    console.log("rendering task")
    console.log(task)

    if (update & RENDER_COLUMN) {
        renderTask(title, state, taskID, desc, createdBy, date, task.dueDate);
    }
    if (update & RENDER_LIST) {
        renderTaskInList(title, state, taskID, desc, createdBy, date);
    }
    
    calculateTaskCount()
    global.managerElementsEnableIfManager();
    teamLeaderEnableElementsIfTeamLeader();
}

async function renderAssignments(assignments) {
    let unique_users = new Set();

    assignments.forEach((assignment) => {
        unique_users.add(assignment.empID);
    });

    let employees = await getEmployeesById([...unique_users]);

    assignments.forEach((assignment) => {
        // emp first
        let emp = employees.get(assignment.empID);
        let emp_name = global.bothNamesToString(emp.firstName, emp.lastName);
        let emp_icon = global.nameToAvatar(emp_name);

        // find task html element
        let task = document.getElementById(assignment.taskID);

        if (!task) {
            console.log(`Task ${assignment.taskID} not found (we leaked an assignment)`)
            return
        }

        let usersAssigned = task.querySelector(".users-assigned");
        
        // create child
        let assignmentElem = document.createElement("div");
        assignmentElem.classList.add("task-assignment");
        assignmentElem.classList.add("tooltip");
        assignmentElem.innerHTML = `<p class="tooltiptext">${emp_name}</p>
        <img src="${emp_icon}" class="avatar">`

        // add child element
        usersAssigned.appendChild(assignmentElem);
    });
}


export function teamLeaderEnableElementsIfTeamLeader() {
    let projectTab = document.querySelector(".project.selected");
    if (projectTab == null) {
        return
    }
    let teamLeaderID = projectTab.getAttribute("data-team-leader-id");

    let session = JSON.parse(sessionStorage.getItem("session"));
    let isTeamLeader = session.employee.empID == teamLeaderID;

    if ((session.auth_level ?? 0) >= 2) {
        return
    }
    console.log("team leader enable elements if team leader ", isTeamLeader)


    let teamLeaderElements = document.querySelectorAll(".team-leader-only");


    teamLeaderElements.forEach((elem) => {
        if (!isTeamLeader) {
           elem.classList.add("norender");
        } else {
            elem.classList.remove("norender");
        }
        
})
}

async function fetchProjects() {
    const data = await get_api('/api/project/project.php/projects');
    console.log(data);
    // process the data here
    if (data.success == true) {
        console.log("projects have been fetched")
        await Promise.all(data.data.projects.map(async (project) => {

            await projectObjectRenderAndListeners(project);
        }));
        return data.data.projects
    }
}

fetchProjects().then((projects) => {
    let first_index = projectTabs.length - 1;
    console.log("projects:")
    console.log(projects)
    //fetch tasks for the first project
    projectSwitchToOnClick(projectTabs[first_index]);
    setUpProjectTabEventListeners();
})


function calculateTaskCount() {
    let notStartedCount = notStartedColumn.querySelectorAll(".task").length || 0
    let inProgressCount = inProgressColumn.querySelectorAll(".task").length || 0
    let finishedCount = finishedColumn.querySelectorAll(".task").length || 0
    document.querySelector("#notstarted-count").innerHTML = notStartedCount
    document.querySelector("#inprogress-count").innerHTML = inProgressCount
    document.querySelector("#finished-count").innerHTML = finishedCount
}


function renderTaskInList(title, state = 0, ID = "", desc = "", assignee = "", dueDate = "") {
    console.log("renering task in list")

    let taskRow = document.createElement("tr");
    taskRow.classList.add("taskRow");

    taskRow.innerHTML = `
        <td class="title">
            ${title}
        </td>
        <td class="date">
                ${dueDate}
            </td>
    `; 
    
    
    //set id to the task id
    taskRow.setAttribute("id", ID);
    //add the parameters as html data attributes
    taskRow.setAttribute("data-desc", desc);
    taskRow.setAttribute("data-date", dueDate);
    taskRow.setAttribute("data-assignee", assignee);

    //check if state is 0,1,2 and do separate things for each. otherwise, error
    if (state == 0) {
        taskRow.innerHTML += `
            <td class="not-started">
                <div class="status-cell">
                    <i class="fa-solid fa-thumbtack"></i> Not Started
                </div>
            </td>
        `;
    } else if (state == 1) {
        taskRow.innerHTML += `
            <td class="in-progress">
                <div class="status-cell">
                    <i class="fa-solid fa-chart-line"></i> In Progress
                </div>
            </td>
        `;
    } else if (state == 2) {
        taskRow.innerHTML += `
            <td class="finished">
                <div class="status-cell">
                    <i class="fa-regular fa-circle-check"></i> Finished
                </div>
            </td>
        `;
    } else {
        console.error("invalid state");
    }
    taskTableBody.appendChild(taskRow);
    //move the add task button to the bottom
    taskTableBody.appendChild(listAddButtonRow);
    calculateTaskCount();
    setUpTaskEventListeners();
}




sortArray.forEach((sortObject) => {
    sortObject.addEventListener("click", () => {
        //sort out what criteria to sort by
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
        
        //sort the tasks
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
        //remove all tasks from the table
        taskRows.forEach((task) => {
            task.remove();
        });
        //render all tasks in the table
        tasks.forEach((task) => {
            taskObjectRenderAll(task, RENDER_LIST);
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


async function renderTask(title, state = 0, ID = "", desc = "", createdBy = "", date = "", timestamp ) {
    //check for null values and set default values (null doesnt count as undefined)
    state = state === null ? 0 : state;
    ID = ID === null ? "" : ID;
    desc = desc === null ? "" : desc;
    createdBy = createdBy === null ? "" : createdBy;
    date = date === null ? "" : date;
    console.log("Task createdBy to " + createdBy)

    let dateToday = (new Date()).getTime() / 1000;

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

    let urgent;
    if (timestamp < dateToday && state !== 2) {
        // due in the past
        urgent = `<i class='fa-solid fa-exclamation-circle' id='task-overdue'></i>`;
    } else {
        urgent = "";
    }

    if (date !== "") {
        task.innerHTML += `

        <div class="date-and-users">
            <div class="tooltip" id="task-overdue">
                <p class="tooltiptext">Task overdue</p>
                ${urgent}
            </div>
            <div class="date" id="task-date">
                ${date}
            </div>
            <div class="users-assigned">
            </div>
        </div>
    `;
    }


    
    //set id to the task id
    task.setAttribute("id", ID);
    task.setAttribute("data-timestamp", timestamp);
    //add the parameters as html data attributes
    task.setAttribute("data-desc", desc);
    task.setAttribute("data-date", date);
    //check if state is 0,1,2 and do separate things for each. otherwise, error
    if (state == 0) {
        notStartedColumn.appendChild(task);
    } else if (state == 1) {
        inProgressColumn.appendChild(task);
    } else if (state == 2) {
        finishedColumn.appendChild(task);
    } else {
        console.error("invalid state");
    }
    
    // console.log(taskCards);
    //put the new task button on the bottom for each column
    notStartedColumn.appendChild(notStartedAddButton);
    inProgressColumn.appendChild(inProgressAddButton);
    finishedColumn.appendChild(finishedAddButton);

    calculateTaskCount();
    setUpTaskEventListeners();
}


function renderProject(ID, title, desc, teamLeader, isTeamLeader, teamLeaderID) {
    let project = document.createElement("div")
    project.classList.add("project")
    if(isTeamLeader) {
        project.innerHTML = `
        <div class="tooltip">
            <p class="tooltiptext">You are the team leader for this project</p>
            <i class="fa-solid fa-user-gear"></i> ${title}
        </div>
    `
    } else {
    project.innerHTML = `
        <i class="fa-solid fa-users"></i> ${title}
    `
    }
    //set id to the project id
    project.setAttribute("data-ID", ID)
    project.setAttribute("data-title", title)
    project.setAttribute("data-description", desc)
    project.setAttribute("data-team-leader", teamLeader)
    project.setAttribute("data-team-leader-id", teamLeaderID)
    document.querySelector(".projects").appendChild(project)
    projectTabs = document.querySelectorAll(".project")
    teamLeaderEnableElementsIfTeamLeader()
}

async function addTask(state) {
    console.log("Running confirmDelete")
    console.log("Creating popup")
    let popupDiv = document.querySelector('.popup');
    console.log(popupDiv)
    let fullscreenDiv = document.querySelector('.fullscreen');
    console.log("before popup")
    popupDiv.innerHTML = `
        <dialog open class='popupDialog' id="add-task-popup">
            <p class="add-task-title">Create and assign new task:</p>
            <input type="text" placeholder="Task title..." class="add-task-title-input">
            <p class="add-task-title" id="add-task-description">Assign employees to task:</p>
            <div class="dropdown-and-employee-list">
                <div class="dropdown-button-container">
                    <select class="dropdown", id="employee-select">
                    </select>
                    <button class="addButton">Add</button>
                </div>
                <div class="assigned-employees">
                
                </div>
            </div>
            <p class="add-task-title" id="add-task-description">Description:</p>
            <textarea placeholder="Task description..." class="add-task-description-input"></textarea>
            <div class="date-picker">
                <label for="due-date" class="due-date-prompt">Due Date:</label>
                <input type="date" class="add-task-date-input">
            </div>
            <div class="buttonForm">
                <button class="closeButton">Cancel</button>
                <button class="createButton">Create</button>
            </div>
        </dialog>
    `;

    let assignedEmployees = new Set();
    let assignedEmployeesDiv = popupDiv.querySelector('.assigned-employees');

    let empList = popupDiv.querySelector('#employee-select');
    let res = await get_api(`/api/employee/employee.php/all`);
    let employeeList = res.data.employees;
    employeeList.forEach((emp) => {
        let emp_name = global.bothNamesToString(emp.firstName, emp.lastName);
        let option = document.createElement("option");
        option.value = emp.empID;
        option.innerText = emp_name;
        empList.appendChild(option);
    });

    // turn employeelist into a map of id to employee
    let employeeMap = new Map();
    employeeList.forEach((emp) => {
        employeeMap.set(emp.empID, emp);
    });


    console.log(popupDiv.innerHTML)
    console.log("after popup")
    fullscreenDiv.style.filter = 'brightness(0.6)';
    let dialog = popupDiv.querySelector('.popupDialog');
    let createButton = dialog.querySelector('.createButton');
    let closeButton = dialog.querySelector('.closeButton');
    let deleteButton = dialog.querySelector('.deleteButton');
    let addButton = dialog.querySelector('.addButton');
    closeButton.addEventListener('click', (event) => {
        event.preventDefault(); 
        dialog.style.display = 'none';
        fullscreenDiv.style.filter = 'none';
        console.log("rejecting")
        reject();
    });
    createButton.addEventListener('click', async (event) => {
        event.preventDefault();
        
        let selectedProject = document.querySelector(".project.selected");
        let projID = selectedProject.getAttribute("data-ID");

        let titleInput = dialog.querySelector('.add-task-title-input');
        let descInput = dialog.querySelector('.add-task-description-input');
        let dateInput = dialog.querySelector('.add-task-date-input');
        console.log(dateInput.value)
        let date = new Date(dateInput.value);
        let timestamp = Math.floor(date.getTime() / 1000);


        let createTaskRes = await post_api(
            `/api/project/task.php/task/${projID}`,
            {
                title: titleInput.value,
                state: state,
                description: descInput.value,
                dueDate: timestamp,
                //assignedEmployees: [...assignedEmployees]
            }
        );

        if (createTaskRes.success) {
            let newTask = createTaskRes.data;

            // put assignments


            let assignedArray = [...assignedEmployees];

            let assignmentsRes = await put_api(
                `/api/project/task.php/assignments/${projID}/${createTaskRes.data.taskID}`,
                {assignments:assignedArray}
            );

            // 204 no content
            if (!assignmentsRes) {

                // render task then assignments
                taskObjectRenderAll(newTask);

                let assignmentMap = assignedArray.map((empID) => {
                    return {
                        empID: empID,
                        taskID: newTask.taskID
                    }
                });

                renderAssignments(assignmentMap).then(() => {
                    console.log("assignments rendered for new task");
                });
            } else {
                // render task
                taskObjectRenderAll(newTask);
            }

        } else {
            let error = `${res.data.message} (${res.data.code})`
            console.error("Error creating new task : " + error);
        }
        

        dialog.style.display = 'none';
        fullscreenDiv.style.filter = 'none';
        console.log("resolving")
    });

    addButton.addEventListener('click', (event) => {
        assignedEmployees.add(empList.value);
        updateAssignedEmployees(assignedEmployeesDiv, assignedEmployees, employeeMap);
    });

}


function updateAssignedEmployees(element, assignedSet, employeeMap) {
    // remove all children
    element.innerHTML = "";

    assignedSet.forEach((empID) => {
        let emp = employeeMap.get(empID);
        let emp_name = global.bothNamesToString(emp.firstName, emp.lastName);
        let emp_icon = global.nameToAvatar(emp_name);
        let listItem = document.createElement("div");
        listItem.classList.add("employee-list-item");
        listItem.classList.add("tooltip");
        listItem.innerHTML = `
        <img src="${emp_icon}" class="avatar" id="task-create-avatar">
        <p class="tooltiptext">${emp_name}</p>`;
        element.appendChild(listItem);
    });
}

const addButtonArray = [notStartedAddButton, inProgressAddButton, finishedAddButton];

addButtonArray.forEach((button) => {
    button.addEventListener("click", async () => {
        if (button.id == "notstarted-add") {
            await addTask(0);
        } else if (button.id == "inprogress-add") {
            await addTask(1);
        } else if (button.id == "finished-add") {
            await addTask(2);
        } else {
            console.error("invalid state");
        }

    });
});

let listAddTaskButton = document.getElementById("list-add");
listAddTaskButton.addEventListener("click", async () => {
    await addTask(0);
});

//mobile less than 775px
let mediaQueryMobile = window.matchMedia("(max-width: 775px)")
//between mobile and 1520px
let mediaQueryMedium = window.matchMedia("(min-width: 776px) and (max-width: 1520px)")
//larger than 1520px
let mediaQueryDesktop = window.matchMedia("(min-width: 1521px)")

//check for mobile on load
if (mediaQueryMobile.matches) {
    console.log("mobile")
    explainer.classList.add("hidden")
    overlay.classList.add("norender")
    explainerShowHide.classList.add("norender")
} else {
    console.log("desktop")
}

//check for mobile on resize
mediaQueryMobile.addEventListener("change", (e) => {
    if (e.matches) {
        console.log("mobile")
        explainer.classList.add("hidden")
        overlay.classList.add("norender")
        explainerShowHide.classList.add("norender")
    }
})

//check for medium on load
if (mediaQueryMedium.matches) {
    console.log("medium")
    explainer.classList.add("hidden")
}

//check for medium on resize
mediaQueryMedium.addEventListener("change", (e) => {
    if (e.matches) {
        console.log("medium")
        explainer.classList.add("hidden")
        explainerShowHide.classList.remove("norender")
    }
})

//check for desktop on load
if (mediaQueryDesktop.matches) {
    console.log("desktop")
}

//check for desktop on resize
mediaQueryDesktop.addEventListener("change", (e) => {
    if (e.matches) {
        console.log("desktop")
        explainer.classList.remove("hidden")
        explainerShowHide.classList.remove("norender")
    }
})

overlay.addEventListener('click', () => {
    explainer.classList.add('hidden');
    overlay.classList.add('norender');
});

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
            event.stopPropagation();
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            console.log("resolving")
            resolve();
        });
    });
}


window.onload = function() {
    let deleteTaskButtons = document.querySelectorAll(".delete-button");
    deleteTaskButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            console.log("delete button clicked")
            confirmDelete().then(() => {
                deleteTaskFromExplainer();
            }).catch((e) => {
                console.log('Deletion cancelled');
                console.log(e)
            });
            
            console.log("deletion function finished");
            // deleteTaskFromExplainer();
        });
    });
}

function deleteTaskFromExplainer() {
    let taskID = explainerTask.getAttribute("task-id");
    deleteTask(taskID);
}


function deleteTask(taskID) {
    console.log("deleting task " + taskID);
    let selectedProject = document.querySelector(".project.selected");
    let projID = selectedProject.getAttribute("data-ID");


    delete_api(`/api/project/task.php/task/${projID}/${taskID}`);
    
    let task = document.getElementById(taskID);

    if (task) {
        task.remove();
    }
    
}

async function createProject(projName, description, teamLeader) {
    res = await post_api(
        "/api/project/project.php/project",
        {
            projName: projName,
            description: description,
            teamLeader: teamLeader
        }
    );

    
}   

async function addProjectPopup(){
    let popupDiv = document.querySelector('.popup');
    console.log(popupDiv)
    let fullscreenDiv = document.querySelector('.fullscreen');
    console.log("before popup")
    popupDiv.innerHTML = `
        <dialog open class='popupDialog' id="add-task-popup">
            <p class="add-task-title">New project creation:</p>
            <input type="text" placeholder="Project title..." class="add-task-title-input">
            <p class="add-task-title" id="add-task-description">Assign team leader:</p>
            <div class="dropdown-and-employee-list">
                <div class="dropdown-button-container">
                    <select class="dropdown", id="employee-select">
                    </select>
                    <button class="setButton">Set</button>
                </div>
                <div class="assigned-team-leader">          
                </div>
            </div>
            <p class="add-task-title" id="add-task-description">Description:</p>
            <textarea placeholder="Project description..." class="add-task-description-input"></textarea>
            <div class="date-picker">
                <label for="due-date" class="due-date-prompt">Due Date:</label>
                <input type="date" class="add-task-date-input">
            </div>
            <div class="buttonForm">
                <button class="closeButton">Cancel</button>
                <button class="createButton">Create</button>
            </div>
        </dialog>
    `;

    fullscreenDiv.style.filter = 'brightness(0.6)';
    let dialog = popupDiv.querySelector('.popupDialog');
    let createButton = dialog.querySelector('.createButton');
    let closeButton = dialog.querySelector('.closeButton');
    let addButton = dialog.querySelector('.addButton');

    let teamLeaderElem = dialog.querySelector('.assigned-team-leader');

    let teamLeader;

    let empList = popupDiv.querySelector('#employee-select');

    let res = await get_api(`/api/employee/employee.php/all`);
    let employeeList = res.data.employees;
    let employeeMap = new Map();
    employeeList.forEach((emp) => {
        employeeMap.set(emp.empID, emp);
    });
    employeeList.forEach((emp) => {
        let emp_name = global.bothNamesToString(emp.firstName, emp.lastName);
        let option = document.createElement("option");
        option.value = emp.empID;
        option.innerText = emp_name;
        empList.appendChild(option);
    });





    closeButton.addEventListener('click', (event) => {
        event.preventDefault(); 
        dialog.style.display = 'none';
        fullscreenDiv.style.filter = 'none';
    });
    createButton.addEventListener('click', async (event) => {
        event.preventDefault();
    

        let titleInput = dialog.querySelector('.add-task-title-input');
        let descInput = dialog.querySelector('.add-task-description-input');


        let res = await post_api(
            `/api/project/project.php/project`,
            {
                projName: titleInput.value,
                description: descInput.value,
                teamLeader: teamLeader,
            }
        );

        if (res.success) {
            let newProject = res.data;
            await projectObjectRenderAndListeners(newProject);

        } else {
            let error = `${res.data.message} (${res.data.code})`
            console.error("Error creating new project : " + error);
        }
        

        dialog.style.display = 'none';
        fullscreenDiv.style.filter = 'none';
        console.log("resolving")
    });

    // setButton.addEventListener('click', (event) => {
    //     teamLeader = empList.value;
    //     let emp = employeeMap.get(teamLeader);
    //     let emp_name = global.bothNamesToString(emp.firstName, emp.lastName);
    //     let emp_icon = global.nameToAvatar(emp_name);
    //     teamLeaderElem.innerHTML = `<img src="${emp_icon}" class="avatar">${emp_name}`
    // });

}

async function projectObjectRenderAndListeners(project) {
    let session = JSON.parse(sessionStorage.getItem("session"));
    console.log(session)
    let isTeamLeader = (project.teamLeader === session.employee.empID);
    let emps = await global.getEmployeesById([project.teamLeader, project.createdBy]);
    let teamLeader = emps.get(project.teamLeader);


    let teamLeaderName = global.bothNamesToString(teamLeader.firstName, teamLeader.lastName);
    renderProject(project.projID, project.projName, project.description, teamLeaderName, isTeamLeader, project.teamLeader);

    setUpProjectTabEventListeners();
    calculateTaskCount();
}

let addProjectButton = document.querySelector(".add-project");
addProjectButton.addEventListener("click", async () => {
        console.log("add project button clicked")
        await addProjectPopup();

    }
);

async function editTaskPopup(title, desc, timestamp, assignments){
    console.log("Running editTaskPopup")
    let popupDiv = document.querySelector('.popup');
    console.log(popupDiv)
    let fullscreenDiv = document.querySelector('.fullscreen');
    console.log("before popup")
    popupDiv.innerHTML = `
        <dialog open class='popupDialog' id="edit-task-popup">
            <p class="edit-task-title">Edit task:</p>
            <input type="text" placeholder="Task title..." class="edit-task-title-input" value="${title}">

            <p class="edit-task-title" id="edit-task-description">Assign employees to task:</p>
            <div class="dropdown-and-employee-list">
                <div class="dropdown-button-container">
                    <select class="dropdown", id="employee-select">
                    </select>
                    <button class="addButton">Add</button>
                </div>
                <div class="assigned-employees">           
                </div>
            </div>
            <p class="edit-task-title" id="edit-task-description">Edit task description:</p>
            <textarea placeholder="Edit task description..." class="edit-task-description-input">${desc.trimStart().trimEnd()}
            </textarea>
            <div class="date-picker">
                <label for="due-date" class="due-date-prompt">Due Date:</label>
                <input type="date" class="add-task-date-input">
            </div>
            <div class="buttonForm">
                <button class="closeButton">Cancel</button>
                <button class="editButton">Edit</button>
            </div>
        </dialog>
    `;

    fullscreenDiv.style.filter = 'brightness(0.6)';
    let dialog = popupDiv.querySelector('.popupDialog');
    let editButton = dialog.querySelector('.editButton');
    let closeButton = dialog.querySelector('.closeButton');
    let addButton = dialog.querySelector('.addButton');
    let dateSelector = dialog.querySelector('.add-task-date-input');
    let date = new Date(timestamp * 1000).toISOString().split('T')[0];
    console.log("current date is")
    console.log(date)

    dateSelector.value = date
    

    let teamLeaderElem = dialog.querySelector('.assigned-team-leader');

    let teamLeader;

    let empList = popupDiv.querySelector('#employee-select');
    let res = await get_api(`/api/employee/employee.php/all`);
    let employeeList = res.data.employees;
    let employeeMap = new Map();
    employeeList.forEach((emp) => {
        employeeMap.set(emp.empID, emp);
    });
    employeeList.forEach((emp) => {
        let emp_name = global.bothNamesToString(emp.firstName, emp.lastName);
        let option = document.createElement("option");
        option.value = emp.empID;
        option.innerText = emp_name;
        empList.appendChild(option);
    });





    closeButton.addEventListener('click', (event) => {
        event.preventDefault(); 
        dialog.style.display = 'none';
        fullscreenDiv.style.filter = 'none';
    });
    
    editButton.addEventListener('click', async (event) => {
        event.preventDefault();
    

        let titleInput = dialog.querySelector('.add-task-title-input');
        let descInput = dialog.querySelector('.add-task-description-input');


        let res = await post_api(
            `/api/project/project.php/project`,
            {
                projName: titleInput.value,
                description: descInput.value,
                teamLeader: teamLeader,
            }
        );

        if (res.success) {
            let newProject = res.data;
            await projectObjectRenderAndListeners(newProject);

        } else {
            let error = `${res.data.message} (${res.data.code})`
            console.error("Error creating new project : " + error);
        }

        dialog.style.display = 'none';
        fullscreenDiv.style.filter = 'none';
        console.log("resolving")
    });

    addButton.addEventListener('click', (event) => {
        teamLeader = empList.value;
        let emp = employeeMap.get(teamLeader);
        let emp_name = global.bothNamesToString(emp.firstName, emp.lastName);
        let emp_icon = global.nameToAvatar(emp_name);
        //teamLeaderElem.innerHTML = `<img src="${emp_icon}" class="avatar">${emp_name}`
    });

}


document.querySelector(".edit-button").addEventListener("click", async () => {
    let taskID = explainerTask.getAttribute("task-id");
    let taskElem = document.getElementById(taskID);
    if (taskElem == null) {
        return
    };
    let currentDescription = taskElem.getAttribute("data-desc");
    let currentTimestamp = taskElem.getAttribute("data-timestamp");
    let currentTitle = taskElem.querySelector(".title").innerText;
    //let currentAssignee = area.querySelector(".users-assigned");
    //console.log(currentAssignee);
    console.log("edit button clicked");
    await editTaskPopup(
        currentTitle,
        currentDescription,
        currentTimestamp,
    );
});
    
