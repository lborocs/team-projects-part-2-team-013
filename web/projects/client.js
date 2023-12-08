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
const projectTitle = document.querySelector("#project-title")
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
const listAddButtonRow = document.querySelector("#list-add-row")
const listAddButton = document.querySelector("#list-add")
const projectBackButton = document.querySelector("#project-back")

//groups of things
var projectRows = document.querySelectorAll(".project-row")
const views = document.querySelectorAll(".view")
const taskColumns = document.querySelectorAll(".taskcolumn")
var taskCards = document.querySelectorAll(".task")
var taskRows = document.querySelectorAll(".taskrow") 
const dropdowns = document.querySelectorAll(".dropdown")
const dragIndicators = document.querySelectorAll(".draggable")
console.log("[import] loaded client.js")


async function projectSwitchToOnClick(projectRow) {
    projectRows = document.querySelectorAll(".project-row")
    projectRows.forEach((row) => {
        row.classList.remove("selected")
    })
    projectRow.classList.add("selected")
    explainerTaskSetToDefault();

    let id = projectRow.getAttribute("data-ID");
    let title = projectRow.getAttribute("data-title");
    let description = projectRow.getAttribute("data-description") ?? "";
    let teamLeader = JSON.parse(projectRow.getAttribute("data-team-leader"));

   
    //remove tasks currently on the screen
    taskCards.forEach((task) => {
        task.remove()
    })
    taskRows.forEach((task) => {
        task.remove()
    }) 
    let tasks = await fetchAndRenderTasks(id);
    console.log("[projectSwitchToOnClick] fetched & rendered tasks for " + title)
    globalTasksList = tasks;
    console.log(globalTasksList)

    
    // unselect not this project
    console.log("[projectSwitchToOnClick] selected " + title)
    //update the breadcrumb with the project name
    global.setBreadcrumb(["Projects", title], [window.location.pathname, "#" + id]);
    projectTitle.innerText = title
    explainerTitle.innerText = title
    explainerDescription.innerText = description
    explainerTeamLeaderName.innerText = global.bothNamesToString(teamLeader.firstName, teamLeader.lastName);
    explainerTeamLeaderAvatar.src = global.employeeAvatarOrFallback(teamLeader)

    teamLeaderEnableElementsIfTeamLeader()

    setActivePane("individual-project-pane");
}

function setActivePane(newPane) {
    console.log("[setActivePane] setting active pane to " + newPane)
    document.querySelectorAll(".main").forEach((pane) => {
        pane.classList.add("norender")
    })

    document.getElementById(newPane).classList.remove("norender")
}


//event listeners
function setUpAllProjectRowEventListeners() {
    projectRows = document.querySelectorAll(".project-row")
    projectRows.forEach((projectRow, i) => {
        projectRow.addEventListener("click", () => {
            projectSwitchToOnClick(projectRow);

        })
    })
}

function setUpProjectRowEventListeners(projectRow) {
    projectRow.addEventListener("click", () => {
        projectSwitchToOnClick(projectRow);

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
            console.log("[viewOnClick] selected")

            taskGrid.classList.toggle("fade")
            taskList.classList.toggle("fade")
            setTimeout(() => {
                taskGrid.classList.toggle("norender")
                taskList.classList.toggle("norender")
            }, 50)
        } 
    })

    global.getCurrentSession().then((session) => {

        if (session.auth_level >= 2) {

            view.classList.toggle("selected");
            taskGrid.classList.add("fade");
            taskGrid.classList.add("norender");
            taskList.classList.remove("fade");
            taskList.classList.remove("norender");
            
        }
    });

})

projectBackButton.addEventListener("click", () => {
    global.setBreadcrumb(["Projects"], [window.location.pathname]);
    renderFromBreadcrumb([null, null]);
})

explainerShowHide.addEventListener("click", () => {
    explainer.classList.toggle("hidden")

    if (explainer.classList.contains("hidden")) {
        explainerShowHide.innerHTML = `<i class="fa-solid fa-arrows-up-to-line fa-rotate-270"></i>`
    } else {
        explainerShowHide.innerHTML = `<i class="fa-solid fa-arrows-up-to-line fa-rotate-90"></i>`
    }
    console.log("[ExplainerShowHide] clicked")
})

function explainerTaskSetToDefault() {
    console.log("[explainerTaskSetToDefault] setting to default");
    explainerTaskTitle.innerHTML = ""
    explainerTaskDescription.innerHTML = "Select a task to view more information..."
    explainerTaskDate.innerHTML = ""
    let statusElement = document.querySelector(".status");
    statusElement.innerHTML = "";

    let currentProject = document.querySelector(".project.selected");
    if (currentProject) {
        let projName = currentProject.getAttribute("data-title");
        let projID = currentProject.getAttribute("data-ID");
        global.setBreadcrumb(["Projects", projName], [window.location.pathname, "#" + projID]);
    } else {
        global.setBreadcrumb(["Projects"], [window.location.pathname]);
    }
    
}

function getTaskState(task) {
    let taskState = task.getAttribute("data-state");
    if (taskState == null) {
        console.error("[getTaskState] task has no state");
        return null;
    }
    console.log(`[getTaskState] task state is ${parseInt(taskState)}`)
    return parseInt(taskState);
}

function updateTaskState(task) {
    let state = getTaskState(task);
    let taskID = task.getAttribute("id");
    let projID = document.querySelector(".project-row.selected").getAttribute("data-ID");
    let newState = state;
    if (task.parentElement == notStartedColumn) {
        newState = 0;
    } else if (task.parentElement == inProgressColumn) {
        newState = 1;
    } else if (task.parentElement == finishedColumn) {
        newState = 2;
    } else {
        console.error("[updateTaskState] how the hell did someone drop a task OUTSIDE a column");
    }
    if (newState != state) {
        task.setAttribute("data-state", newState);
        patch_api(`/project/task.php/task/${projID}/${taskID}`, {state:newState}).then((res) => {
            if (!res) { // 204 no content (success)
                console.log(`[updateTaskState] updated task ${taskID} to state ${newState}`);
            } else {
                console.error(`[updateTaskState] failed to update task ${taskID} to state ${newState}`);
            }
        });
    }
}

//shows the taskRow in the explainer
//the taskRow contains title, due date and state in columns"
//the rest of the informaton is in the data attributes: desc, assignee, date
function showTaskInExplainer(task) {


    let taskState = getTaskState(task);

    let taskID = task.getAttribute("id");
    explainerTask.setAttribute("task-id", taskID);
    // get the task title from data-title
    let taskTitle = task.getAttribute("data-title");
    explainerTaskTitle.innerHTML = taskTitle;
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

    //get currently selected project
    let selectedProject = document.querySelector(".project-row.selected");
    let projName = selectedProject.getAttribute("data-title");
    let projID = selectedProject.getAttribute("data-ID");

    global.setBreadcrumb(["Projects", projName, taskTitle], [window.location.pathname, "#" + projID, "#" + projID + "-" + taskID])
}


function setUpTaskEventListeners() {

    console.log("[setUpTaskEventListeners] setting up event listeners")

    taskCards = document.querySelectorAll(".task");
    taskCards.forEach((taskCard) => {

        taskCard.addEventListener("mousedown", (e) => {
            //does nothing if the context menu button is clicked
            if (e.target.classList.contains("task-context-menu-button")) {
                return
            }
            //show explainer
            // console.log(explainer)
            explainer.classList.remove("hidden")
            overlay.classList.remove("norender")
            animate(taskCard, "click-small")
            taskCards.forEach((card) => {
                card.classList.remove("task-focussed")
            })
            taskCard.classList.add("task-focussed")
        });
        taskCard.addEventListener("mouseup", () => {
            showTaskInExplainer(taskCard);
            
        });

        taskCard.addEventListener("touchstart", () => {
            //show explainer
            console.log("[taskCardOnTouch] clicked")
            animate(taskRow, "click-small")
            showTaskInExplainer(taskRow);
        });

        taskCard.addEventListener("dragstart", () => {
            taskCard.classList.add("beingdragged");
        });

        taskCard.addEventListener("dragend", () => {
            taskCard.classList.remove("beingdragged");
            showTaskInExplainer(taskCard);
            updateTaskState(taskCard);
            calculateTaskCount()
        });
    });

    //list view
    taskRows = document.querySelectorAll(".taskRow");
    taskRows.forEach((taskRow) => {
        taskRow.addEventListener("mousedown", () => {
            //show explainer
            console.log("[taskRowOnMouseDown] clicked")
            animate(taskRow, "click-small")
        });
        taskRow.addEventListener("mouseup", () => {
            showTaskInExplainer(taskRow);
        });
        taskRow.addEventListener("touchstart", () => {
            //show explainer
            console.log("[taskRowOnTouchStart] clicked")
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
        if (taskColumn.id === 'notstarted') {
            taskColumn.appendChild(addTask);
        }
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

async function fetchAndRenderTasks(projID) {
    const data = await get_api(`/project/task.php/tasks/${projID}`);
    console.log("[fetchAndRenderTasks] fetched tasks for " + projID);
    console.log(data);
    // process the data here
    if (data.success == true) {
        console.log(`tasks have been fetched for ${projID}`)
        globalTasksList = data.data.tasks;
        await Promise.all(data.data.tasks.map((task) => {
            taskObjectRenderAll(task)
        }));
        setUpTaskEventListeners();
        if (data.data.contains_assignments) {
            renderAssignments(data.data.assignments).then(() => {
                console.log("[fetchAndRenderTasks] assignments rendered");
            });
        }
        return data.data.tasks
    }
}

function taskObjectRenderAll(task, update = RENDER_BOTH) {
    console.log("[taskObjectRenderAll] rendering task object "+task.title)
    let date = task.dueDate ? global.formatDate(new Date(task.dueDate * 1000)) : "Due date not set";
    let desc = task.description
    let title = task.title || "No Title";
    let createdBy = task.createdBy || "Unknown";
    let state = task.state
    let taskID = task.taskID || "Unknown";
    let expectedManHours = task.expectedManHours; //no safety here because not null i think

    console.log(task)

    if (update & RENDER_COLUMN) {
        renderTask(title, state, taskID, desc, createdBy, date, task.dueDate, expectedManHours);
    }
    if (update & RENDER_LIST) {
        renderTaskInList(title, state, taskID, desc, createdBy, date, expectedManHours);
    }
    
    calculateTaskCount()
    global.managerElementsEnableIfManager();
    teamLeaderEnableElementsIfTeamLeader();
}

async function renderAssignments(assignments) {
    let unique_users = new Set();

    assignments.forEach((assignment) => {
        unique_users.add(assignment.employee.empID);
    });

    let employees = await getEmployeesById([...unique_users]);

    assignments.forEach((assignment) => {
        // emp first
        let emp = employees.get(assignment.employee.empID);
        let emp_name = global.bothNamesToString(emp.firstName, emp.lastName);
        let emp_icon = global.employeeAvatarOrFallback(emp);

        // find task html element
        let task = document.getElementById(assignment.task.taskID);

        if (!task) {
            console.log(`[renderAssignment] Task ${assignment.task.taskID} not found (we leaked an assignment)`)
            return
        }

        let usersAssigned = task.querySelector(".users-assigned");
        
        // create child
        let assignmentElem = document.createElement("div");
        assignmentElem.classList.add("assignment");
        assignmentElem.classList.add("tooltip", "under");
        assignmentElem.innerHTML = `<p class="tooltiptext">${emp_name}</p>
        <img src="${emp_icon}" class="avatar">`

        // add child element
        usersAssigned.appendChild(assignmentElem);
    });
}


async function teamLeaderEnableElementsIfTeamLeader() {
    let projectRow = document.querySelector(".project-row.selected");
    if (projectRow == null) {
        return
    }
    let teamLeader = JSON.parse(projectRow.getAttribute("data-team-leader"));

    let session = await global.getCurrentSession();
    let isTeamLeader = session.employee.empID == teamLeader.empID;

    if ((session.auth_level ?? 0) >= 2) {
        return
    }
    console.log("[teamLeaderEnableElementsIfTeamLeader] isteamleader: ", isTeamLeader)


    let teamLeaderElements = document.querySelectorAll(".team-leader-only");


    teamLeaderElements.forEach((elem) => {
        if (!isTeamLeader) {
           elem.classList.add("norender");
        } else {
            elem.classList.remove("norender");
        }
        
})
}

async function fetchAndRenderAllProjects() {
    setActivePane("select-projects-pane");
    global.setBreadcrumb(["Projects"], [window.location.pathname]);
    const data = await get_api('/project/project.php/projects');
    console.log("[fetchAndRenderAllProjects] fetched projects");
    console.log(data);
    // process the data here
    if (data.success == true) {
        let projectsTable = document.querySelector("#projects-table");
        projectsTable.querySelector("tbody").replaceChildren();
        console.log("[fetchAndRenderAllProjects] projects have been fetched successfully")
        await Promise.all(data.data.projects.map(async (project) => {

            await projectObjectRenderAndListeners(project);
        }));
        return data.data.projects
    }
}


window.addEventListener("breadcrumbnavigate", async (event) => {
    console.log("[breadcrumbnavigate] event received" + event.locations);
    await renderFromBreadcrumb(event.locations);

});

console.log("[dashboard/client.js] rendering from breadcrumb INITIAL.")
global.dispatchBreadcrumbnavigateEvent("initial");

async function renderFromBreadcrumb(locations) {
    let [projID, taskID] = locations;

    console.log(`[renderFromBreadcrumb] project: ${projID} task: ${taskID}`)

    if (!projID) {
        return await fetchAndRenderAllProjects();
    }

    setActivePane("individual-project-pane");
    let data = await get_api(`/project/project.php/project/${projID}`);

    if (!data.success) {

        if (data.data.code == 4002) { // resource not found code
            alert("You appear to have followed a link to a project that either does not exist or you do not have access to.")
        }

        console.error(`[renderFromBreadcrumb] Error fetching project ${projID}: ${data.data.message} (${data.data.code})`);
        return false;
    }

    let project = data.data;

    for (let i = 0; i < projectRows.length; i++) {
        if (projectRows[i].getAttribute("data-ID") == projID) {
            projectRows[i].remove();
            break;
        }
    }


    let element = await projectObjectRenderAndListeners(project);

    await projectSwitchToOnClick(element);


    if (taskID) {
        console.log(`[renderFromBreadcrumb] attempting to render task ${taskID}`)
        let task = document.getElementById(taskID);
        if (task) {
            showTaskInExplainer(task);
        } else {
            alert("You appear to have followed a link to a task that either does not exist or you do not have access to.");
        }
    }

    return true;


}


function calculateTaskCount() {
    let notStartedCount = notStartedColumn.querySelectorAll(".task").length || 0
    let inProgressCount = inProgressColumn.querySelectorAll(".task").length || 0
    let finishedCount = finishedColumn.querySelectorAll(".task").length || 0
    document.querySelector("#notstarted-count").innerHTML = notStartedCount
    document.querySelector("#inprogress-count").innerHTML = inProgressCount
    document.querySelector("#finished-count").innerHTML = finishedCount
}


function renderTaskInList(title, state = 0, ID = "", desc = "", assignee = "", dueDate = "", expectedManHours) {
    console.log("[renderTaskInList] renering task in list")

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
    taskRow.setAttribute("data-title", title);
    taskRow.setAttribute("data-expectedManHours", expectedManHours);
    taskRow.setAttribute("data-state", state);

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


async function renderTask(title, state = 0, ID = "", desc = "", createdBy = "", date = "", timestamp, expectedManHours) {
    //check for null values and set default values (null doesnt count as undefined)
    state = state === null ? 0 : state;
    ID = ID === null ? "" : ID;
    desc = desc === null ? "" : desc;
    createdBy = createdBy === null ? "" : createdBy;
    date = date === null ? "" : date;
    expectedManHours = expectedManHours === null ? "" : expectedManHours;
    console.log("[renderTask] Task createdBy to " + createdBy)


    let dateToday = (new Date()).getTime() / 1000;

    let task = document.createElement("div");
    task.classList.add("task");
    task.setAttribute("draggable", "true");

    //set id to the task id
    task.setAttribute("id", ID);
    
    //add the parameters as html data attributes
    task.setAttribute("data-timestamp", timestamp);
    task.setAttribute("data-desc", desc);
    task.setAttribute("data-date", date);
    task.setAttribute("data-title", title);
    task.setAttribute("data-expectedManHours", expectedManHours);
    task.setAttribute("data-state", state);

    //generate the html for the task
    task.innerHTML = `
        <div class="title">
            ${title}
            <div class="small-icon task-context-menu-button">
                <span class="material-symbols-rounded">more_horiz</span>
            </div>
        </div>
    `
    // Testing if its better not to render descriptions until you click in
    // There would be an icon conveying that there is a description though
    // if (desc !== "") {
    //     task.innerHTML += `
    //     <div class="description">
    //         ${desc}
    //     </div>
    // `;
    // }

    let statusIcon;
    let dateTooltip;
    if (timestamp < dateToday && state !== 2) {
        // tasks which are overdue
        statusIcon = `<span class="material-symbols-rounded overdue">error</span>`;
        const overdueDays = Math.floor((dateToday - timestamp) / (24 * 60 * 60));
        dateTooltip = `Task overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`;
    } else if (state !== 2){
        // tasks which are finished and have a due date in the past
        statusIcon = `<span class="material-symbols-rounded">event_upcoming</span>`;
        const dueInDays = Math.floor((timestamp - dateToday) / (24 * 60 * 60));
        dateTooltip = `Due in ${dueInDays} day${dueInDays !== 1 ? 's' : ''}`;
    } else {
        // tasks which have a due date in the future
        statusIcon = `<span class="material-symbols-rounded">event_upcoming</span>`;
        const finishedDaysAgo = Math.floor((dateToday - timestamp) / (24 * 60 * 60));
        dateTooltip = `Finished ${finishedDaysAgo} day${finishedDaysAgo !== 1 ? 's' : ''} ago`;
    }

    if (date !== "") {
        task.innerHTML += `

        <div class="date-and-users">
            <div class="tooltip under status-container">
                <p class="tooltiptext">${dateTooltip}</p>
                ${statusIcon}
                <div class="date" id="task-date">
                    ${date}
                </div>
            </div>
            
            <div class="users-assigned">
            </div>
        </div>
    `;
    }


    
    
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

    calculateTaskCount();
}


// function renderProject(ID, title, desc, teamLeader, isTeamLeader, teamLeaderID) {
//     let project = document.createElement("div")
//     project.classList.add("project")
//     if(isTeamLeader) {
//         project.innerHTML = `
//         <div class="tooltip under">
//             <p class="tooltiptext">You are the team leader for this project</p>
//             <i class="fa-solid fa-user-gear"></i> ${title}
//         </div>
//     `
//     } else {
//     project.innerHTML = `
//         <i class="fa-solid fa-users"></i> ${title}
//     `
//     }
//     //set id to the project id
//     project.setAttribute("data-ID", ID)
//     project.setAttribute("data-title", title)
//     project.setAttribute("data-description", desc)
//     project.setAttribute("data-team-leader", teamLeader)
//     project.setAttribute("data-team-leader-id", teamLeaderID)
//     document.querySelector("#projects-table").appendChild(project)
//     projectTabs = document.querySelectorAll(".project")
//     teamLeaderEnableElementsIfTeamLeader()

//     return project
// }

function renderProject(ID, title, desc, teamLeader, isTeamLeader, createdAt) {
    let projectsTable = document.querySelector("#projects-table");
    let projectTitle = document.querySelector(".project-bar .title");
    let project = document.createElement("tr")
    project.setAttribute("tabindex", "0")
    project.classList.add("project-row")
    let icon = isTeamLeader ? `fas fa-user-gear` : `fas fa-users`;

    let teamLeaderName = global.bothNamesToString(teamLeader.firstName, teamLeader.lastName);

    console.log(`[renderProject] using icon: ${icon}`)
    let date = createdAt ? global.formatDateFull(new Date(createdAt * 1000)) : "No creation date found";
    project.innerHTML = `
        <td>
            <div class="project-card">
                <div class="icon">
                    <i class="${icon}"></i>
                </div>
                <div class="name">
                    ${title}
                </div>
            </div>
        </td>
        <td>${date}</td>
        <td>
            <div class="name-card">
                <div class="icon">
                    <img src="${global.employeeAvatarOrFallback(teamLeader)}" class="avatar">
                </div>
                <div class="name">
                    ${teamLeaderName}
                </div>
            </div>
        </td>
        <td>
            Not implemented
        </td>
        <td>
            <div class="icon-button no-box">
                <i class="fa-solid fa-ellipsis"></i>
            </div>
        </td>
    `

    projectTitle.innerHTML = title;

    //set id to the project id
    project.setAttribute("data-ID", ID)
    project.setAttribute("data-title", title)
    project.setAttribute("data-description", desc)
    project.setAttribute("data-team-leader", JSON.stringify(teamLeader))
    projectsTable.querySelector("tbody").appendChild(project)
    teamLeaderEnableElementsIfTeamLeader()

    return project
}
async function addTask(state) {
    console.log("[addTask] Creating popup")
    let popupDiv = document.querySelector('.popup');
    console.log(popupDiv)
    let fullscreenDiv = document.querySelector('.fullscreen');
    console.log("[addTask] before popup")
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
            <input type="text" class="add-task-description-input" placeholder="Description"></input>
            <div class="assigned-employees">
                <div class="text-button" id="add-employee">
                    <div class="button-icon">
                        <span class="material-symbols-rounded">
                            add
                        </span>
                    </div>
                    <div class="button-text">
                        Add
                    </div>
                </div>
                <div class="assigned">

                </div>
            </div>
            <input type="number" class="expected-hours-input" placeholder="Hours"></input>
            <input type="date" class="add-task-date-input" placeholder="Due Date"></input>    
        </dialog>
    `;

    let assignedEmployees = new Set();
    let assignedEmployeesDiv = popupDiv.querySelector('.assigned-employees');

    let empList = popupDiv.querySelector('#employee-select');
    let res = await get_api(`/employee/employee.php/all`);
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
    console.log("[addTask] after popup")
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
        console.log("[addTaskCloseButton] rejecting")
        reject();
    });
    createButton.addEventListener('click', async (event) => {
        event.preventDefault();
        
        let selectedProject = document.querySelector(".project-row.selected");
        console.log("[addTaskCreateButton] selectedProject: " + selectedProject)
        let projID = selectedProject.getAttribute("data-ID");

        let titleInput = dialog.querySelector('.add-task-title-input');
        let descInput = dialog.querySelector('.add-task-description-input');
        let dateInput = dialog.querySelector('.add-task-date-input');
        console.log("[addTaskCreateButton] dateinput: " + dateInput.value)
        let date = new Date(dateInput.value);
        let timestamp = Math.floor(date.getTime() / 1000);


        let createTaskRes = await post_api(
            `/project/task.php/task/${projID}`,
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
                `/project/task.php/assignments/${projID}/${createTaskRes.data.taskID}`,
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
                    console.log("[addTaskRenderAssignmentsCallback] assignments rendered for new task");
                });
            } else {
                // render task
                taskObjectRenderAll(newTask);
            }

        } else {
            let error = `${res.data.message} (${res.data.code})`
            console.error("[addTask] Error creating new task : " + error);
        }
        

        dialog.style.display = 'none';
        fullscreenDiv.style.filter = 'none';
        console.log("[addTask] resolving")
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
        let emp_icon = global.employeeAvatarOrFallback(emp);
        let listItem = document.createElement("div");
        listItem.classList.add("employee-list-item");
        listItem.classList.add("tooltip", "under");
        listItem.innerHTML = `
        <img src="${emp_icon}" class="avatar" id="task-create-avatar">
        <p class="tooltiptext">${emp_name}</p>`;
        element.appendChild(listItem);
    });
}

const addButtonArray = [notStartedAddButton];

addButtonArray.forEach((button) => {
    button.addEventListener("click", async () => {
        if (button.id == "notstarted-add") {
            await addTask(0);
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
    console.log("[mediaQueryMobile] mobile")
    explainer.classList.add("hidden")
    overlay.classList.add("norender")
    explainerShowHide.classList.add("norender")
} else {
    console.log("[mediaQuery] desktop")
}

//check for mobile on resize
mediaQueryMobile.addEventListener("change", (e) => {
    if (e.matches) {
        console.log("[mediaQuerymobileChange] mobile")
        explainer.classList.add("hidden")
        overlay.classList.add("norender")
        explainerShowHide.classList.add("norender")
    }
})

//check for medium on load
if (mediaQueryMedium.matches) {
    console.log("[mediaQueryMedium] medium")
    explainer.classList.add("hidden")
    explainerShowHide.innerHTML = `<i class="fa-solid fa-arrows-up-to-line fa-rotate-270"></i>`

}

//check for medium on resize
mediaQueryMedium.addEventListener("change", (e) => {
    if (e.matches) {
        console.log("[mediaQueryMediumChange] medium")
        explainer.classList.add("hidden")
        explainerShowHide.classList.remove("norender")
        explainerShowHide.innerHTML = `<i class="fa-solid fa-arrows-up-to-line fa-rotate-270"></i>`

    }
})

//check for desktop on load
if (mediaQueryDesktop.matches) {
    console.log("[mediaQueryDesktop] desktop")
    explainerShowHide.innerHTML = `<i class="fa-solid fa-arrows-up-to-line fa-rotate-90"></i>`
}

//check for desktop on resize
mediaQueryDesktop.addEventListener("change", (e) => {
    if (e.matches) {
        console.log("[mediaQueryDesktopChange] desktop")
        explainer.classList.remove("hidden")
        explainerShowHide.classList.remove("norender")
        explainerShowHide.innerHTML = `<i class="fa-solid fa-arrows-up-to-line fa-rotate-90"></i>`
    }
})

overlay.addEventListener('click', () => {
    explainer.classList.add('hidden');
    overlay.classList.add('norender');
});

function confirmDelete() {
    console.log("[confirmDelete] Running confirmDelete")
    return new Promise((resolve, reject) => {
        console.log("[confirmDelete] Creating popup")
        let popupDiv = document.querySelector('.popup');
        console.log(popupDiv)
        let fullscreenDiv = document.querySelector('.fullscreen');
        console.log("[confirmDelete] before popup")
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
        console.log("[confirmDelete] after popup")
        fullscreenDiv.style.filter = 'brightness(0.6)';

        let dialog = popupDiv.querySelector('.popupDialog');
        let closeButton = dialog.querySelector('.closeButton');
        let deleteButton = dialog.querySelector('.deleteButton');

        closeButton.addEventListener('click', (event) => {
            event.preventDefault(); 
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            console.log("[confirmDeleteCloseButton] rejecting")
            reject();
        });

        deleteButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            console.log("[confirmDeleteDeleteButton] resolving")
            resolve();
        });
    });
}


window.onload = function() {
    let deleteTaskButtons = document.querySelectorAll(".delete-button");
    deleteTaskButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            console.log("[DeletTaskButtonsClick] delete button clicked")
            confirmDelete().then(() => {
                deleteTaskFromExplainer();
            }).catch((e) => {
                console.log('[DeletTaskButtonsClick] Deletion cancelled');
                console.log(e)
            });
            
            console.log("[DeletTaskButtonsClick] deletion function finished");
            // deleteTaskFromExplainer();
        });
    });
}

function deleteTaskFromExplainer() {
    let taskID = explainerTask.getAttribute("task-id");
    deleteTask(taskID);
}


function deleteTask(taskID) {
    console.log("[deleteTask] deleting task " + taskID);
    let selectedProject = document.querySelector(".project-row.selected");
    let projID = selectedProject.getAttribute("data-ID");


    delete_api(`/project/task.php/task/${projID}/${taskID}`);
    
    let task = document.getElementById(taskID);

    if (task) {
        task.remove();
    }
    
}

async function createProject(projName, description, teamLeader) {
    res = await post_api(
        "/project/project.php/project",
        {
            projName: projName,
            description: description,
            teamLeader: teamLeader
        }
    );

    
}   

async function addProjectPopup(){
    let popupDiv = document.querySelector('.popup');
    console.log("[addProjectPopup] popupDiv");
    console.log(popupDiv)
    let fullscreenDiv = document.querySelector('.fullscreen');
    console.log("[addProjectPopup] before popup")
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

    let res = await get_api(`/employee/employee.php/all`);
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
            `/project/project.php/project`,
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
        console.log("[addProjectPopupCreateButtonClick] resolving")
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
    console.log("[projectObjectRenderAndListeners] rendering project:")
    console.log(project)
    let session = await global.getCurrentSession();
    let isTeamLeader = (project.teamLeader.empID === session.employee.empID);
    let emps = await global.getEmployeesById([project.teamLeader.empID, project.createdBy.empID]);
    let teamLeader = emps.get(project.teamLeader.empID);


    let teamLeaderName = global.bothNamesToString(teamLeader.firstName, teamLeader.lastName);
    let element = renderProject(project.projID, project.projName, project.description, teamLeader, isTeamLeader, project.createdAt);

    setUpProjectRowEventListeners(element);
    calculateTaskCount();
    element.data = project;
    return element;
}

let createProjectButton = document.querySelector("#new-project");
createProjectButton.addEventListener("click", async () => {
        console.log("[addProjectButtonClick] add project button clicked")
        await addProjectPopup();

    }
);

async function editTaskPopup(title, desc, timestamp, assignments){
    console.log("[editTaskPopup] Running editTaskPopup")
    let popupDiv = document.querySelector('.popup');
    console.log(popupDiv)
    let fullscreenDiv = document.querySelector('.fullscreen');
    console.log("[editTaskPopup] before popup")
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
    console.log("[editTaskPopup] current date is")
    console.log(date)

    dateSelector.value = date
    

    let teamLeaderElem = dialog.querySelector('.assigned-team-leader');

    let teamLeader;

    let empList = popupDiv.querySelector('#employee-select');
    let res = await get_api(`/employee/employee.php/all`);
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
            `/project/project.php/project`,
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
        console.log("[editTaskPopupEditButtonClick] resolving")
    });

    addButton.addEventListener('click', (event) => {
        teamLeader = empList.value;
        let emp = employeeMap.get(teamLeader);
        let emp_name = global.bothNamesToString(emp.firstName, emp.lastName);
        let emp_icon = global.employeeAvatarOrFallback(emp);
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
    console.log("[editButtonClick] edit button clicked");
    await editTaskPopup(
        currentTitle,
        currentDescription,
        currentTimestamp,
    );
});

document.getElementById("project-search").addEventListener("keydown", (e) => {
    sleep(10).then(() => {
        filterProjectFromSearch();
    })
})

// document.getElementById("task-search").addEventListener("keydown", (e) => {
//     sleep(10).then(() => {
//         filterTaskFromSearch();
//     })
// })


document.getElementById("delete-project-search").addEventListener("click", () => {
    document.getElementById("project-search").value = "";
    filterProjectFromSearch();
})

document.getElementById("delete-task-search").addEventListener("click", () => {
    document.getElementById("task-search").value = "";
    filterTaskFromSearch();
})


const sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

async function searchAndRenderProjects(search) {
    const data = await get_api('/project/project.php/projects?q=' + search);
    console.log("[searchAndRenderProjects" + search + "] fetched projects");
    console.log(data);
    console.log('.project-row.selected');
    // process the data here
    if (data.success == true) {
        let projectsTable = document.querySelector("#projects-table");
        projectsTable.querySelector("tbody").replaceChildren();
        console.log("[fetchAndRenderAllProjects] projects have been fetched successfully")
        await Promise.all(data.data.projects.map(async (project) => {

            await projectObjectRenderAndListeners(project);
        }));
        return data.data.projects
    }
}


// async function searchAndRenderTasks(search) {
//     const data = await get_api('/project/task.php/tasks?q=' + search);
//     console.log("[searchAndRenderTasks" + search + "] fetched tasks");
//     console.log(data);
//     if (data.success == true) {
//         let tasksTable = document.querySelector("#tasks-table");
//         tasksTable.querySelector("tbody").replaceChildren();
//         console.log("[fetchAndRenderAllTasks] tasks have been fetched successfully")
//         await Promise.all(data.data.tasks.map(async (task) => {
//             await taskObjectRenderAll(task, RENDER_LIST);
//         }));
//         return data.data.tasks
//     }
// }


function filterProjectFromSearch() {
    console.log("[filterProjectFromSearch] searching for:");
    console.log(document.getElementById("project-search").value); 
    searchAndRenderProjects(document.getElementById("project-search").value)
}

// function filterTaskFromSearch() {
//     console.log("[filterTaskFromSearch] searching for:");
//     console.log(document.getElementById("task-search").value); 
//     searchAndRenderTasks(document.getElementById("task-search").value)
// }