import * as global from "../global-ui.js"
import { animate } from "../global-ui.js"
import { getEmployeesById } from '../global-ui.js';

const RENDER_COLUMN = 1;
const RENDER_LIST = 2;
const RENDER_BOTH = 3;

//important shit
var globalTasksList = [];
var globalAssignments = [];
var globalCurrentProject;
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
const projectSearchInput = document.querySelector("#project-search")
const taskSearchInput = document.querySelector("#task-search")

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


    let project = await getProjectById(id);
    if (!project) {
        console.error(`[projectSwitchToOnClick] Error fetching project`);
        return false;
    }

    globalCurrentProject = project;

    let teamLeader = await global.getEmployeesById([project.teamLeader.empID]);
    if (!teamLeader) {
        console.error(`[projectSwitchToOnClick] Error fetching team leader`);
        return false;
    }
    teamLeader = teamLeader.get(project.teamLeader.empID);
    //remove tasks currently on the screen
    taskCards.forEach((task) => {
        task.remove()
    })
    taskRows.forEach((task) => {
        task.remove()
    }) 
    let tasks = await fetchTasks(id);
    if (!tasks) {
        console.error(`[projectSwitchToOnClick] Error fetching tasks`);
        return false;
    }
    
    await renderTasks(tasks);
    console.log("[projectSwitchToOnClick] fetched & rendered tasks for " + project.name)
    globalTasksList = tasks;
    console.log("global tasks list:")
    console.log(globalTasksList)

    
    // unselect not this project
    console.log("[projectSwitchToOnClick] selected " + project.name)
    //update the breadcrumb with the project name
    global.setBreadcrumb(["Projects", project.name], [window.location.pathname, "#" + id]);
    projectTitle.innerText = project.name;
    explainerTitle.innerText = project.name;
    explainerDescription.innerText = project.description;
    explainerTeamLeaderName.innerText = global.bothNamesToString(teamLeader.firstName, teamLeader.lastName);
    explainerTeamLeaderAvatar.src = global.employeeAvatarOrFallback(teamLeader)

    teamLeaderEnableElementsIfTeamLeader()

    setActivePane("individual-project-pane");
    clearProjectList();
}

function clearProjectList() {
    let projectsTable = document.querySelector("#projects-table");
    projectsTable.querySelector("tbody").replaceChildren();
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
        explainerShowHide.innerHTML = `<span class="material-symbols-rounded">right_panel_open</span>`
    } else {
        explainerShowHide.innerHTML = `<span class="material-symbols-rounded">right_panel_close</span>`
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

    //using globalCurrentProject
    if (globalCurrentProject) {
        let projName = globalCurrentProject.name
        let projID = globalCurrentProject.projID
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
    let projID = globalCurrentProject.projID;
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
            if (res.status == 204) { // 204 no content (success)
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
//THIS WILL BE REFACTORED
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

    global.setBreadcrumb(["Projects", globalCurrentProject.name, taskTitle], [window.location.pathname, "#" + globalCurrentProject.projID, "#" + globalCurrentProject.projID + "-" + taskID])
}


function setUpTaskEventListeners() {

    console.log("[setUpTaskEventListeners] setting up event listeners")

    taskCards = document.querySelectorAll(".task");
    taskCards.forEach((taskCard) => {

        let contextMenuButton = taskCard.querySelector(".context-menu");
        let contextMenuPopover = taskCard.querySelector(".context-menu-popover");
        contextMenuButton.addEventListener("click", (e) => {
            e.stopPropagation()

            //closes the rest of them first
            let contextMenus = document.querySelectorAll(".context-menu-popover.visible");
            contextMenus.forEach(menu => {
                if (menu !== contextMenuPopover) {
                    menu.classList.remove("visible");
                    menu.parentElement.classList.remove("active")
                }
            });

            contextMenuPopover.classList.toggle("visible")
            contextMenuButton.classList.toggle("active")
        })
        //have to include mouse up and down this is crazy event propagation
        contextMenuButton.addEventListener("mouseup", (e) => {
            e.stopPropagation()
        }) 
        contextMenuButton.addEventListener("mousedown", (e) => {
            e.stopPropagation()
        }) 
        //closes the context menu if they click outside
        document.addEventListener("click", (e) => {
            if (!contextMenuButton.contains(e.target)) {
                contextMenuPopover.classList.remove("visible")
                contextMenuButton.classList.remove("active")
            }
        })



        taskCard.addEventListener("mousedown", (e) => {
            //if the target is the context menu button, dont show the explainer
            if (e.target.classList.contains("context-menu")) {
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
        taskCard.addEventListener("mouseup", (e) => {
            //if the target is the context menu button, dont show the explainer
            if (e.target.classList.contains("context-menu")) {
                return
            }

            showTaskInExplainer(taskCard);
            
        });

        taskCard.addEventListener("touchstart", () => {
            //show explainer
            console.log("[taskCardOnTouch] clicked")
            animate(taskCard, "click-small")
            showTaskInExplainer(taskCard);
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


/**
 * Fetches all tasks for a project
 * @param {*} projID 
 * @returns {Array} tasks
 */
async function fetchTasks(projID) {
    const data = await get_api(`/project/task.php/tasks/${projID}`);
    console.log("[fetchTasks] fetched tasks for " + projID);
    console.log(data);
    if (data.success == true) {
        console.log(`tasks have been fetched for ${projID}`)
        if (data.data.contains_assignments) {
            globalAssignments = data.data.assignments;

            data.data.tasks.forEach((task) => {
                task.assignments = [];
                data.data.assignments.forEach((assignment) => {
                    if (assignment.task.taskID === task.taskID) {
                        task.assignments.push(assignment.employee.empID);
                    }
                });
            });
        }
        globalTasksList = data.data.tasks;
        return data.data.tasks
    }
}

/**
 * Renders all tasks from a given list of tasks
 * @param {Array} tasks 
 */
async function renderTasks(tasks) {
    await Promise.all(tasks.map((task) => {
        taskObjectRenderAll(task)
    }));
    setUpTaskEventListeners();
    renderAssignments(globalAssignments);
}


function taskObjectRenderAll(task, update = RENDER_BOTH) {
    console.log("[taskObjectRenderAll] rendering task object "+task.title)
    let date = task.dueDate ? global.formatDate(new Date(task.dueDate)) : "Due date not set";
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
        assignmentElem.classList.add("tooltip", "tooltip-under");
        assignmentElem.innerHTML = `<p class="tooltiptext">${emp_name}</p>
        <img src="${emp_icon}" class="avatar">`

        // add child element
        usersAssigned.appendChild(assignmentElem);
    });
}

function clearRenderedTasks() {
    taskCards.forEach((task) => {
        task.remove()
    })
    taskRows.forEach((task) => {
        task.remove()
    }) 
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



async function getProjectById(projID) {
    let data = await get_api(`/project/project.php/project/${projID}`);
    if (!data.success) {
        console.error(`[getProjectById] Error fetching project ${projID}: ${res.error.message} (${res.error.code})`);
        return null;
    }
    return data.data;
}

async function fetchAndRenderAllProjects() {
    setActivePane("select-projects-pane");
    global.setBreadcrumb(["Projects"], [window.location.pathname]);
    const data = await get_api('/project/project.php/projects');
    console.log("[fetchAndRenderAllProjects] fetched projects");
    console.log(data);
    // process the data here
    if (data.success == true) {
        clearProjectList();
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
    let res = await get_api(`/project/project.php/project/${projID}`);

    if (!res.success) {

        if (res.error.code == 4002) { // resource not found code
            alert("You appear to have followed a link to a project that either does not exist or you do not have access to.")
        }

        console.error(`[renderFromBreadcrumb] Error fetching project ${projID}: ${res.error.message} (${res.error.code})`);
        return false;
    }

    let project = res.data;

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

//TODO: render the context menu
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

    //generating the html for the task
    //context menu button takes the majority of the html here
    task.innerHTML = `
        <div class="title">
            ${title}
            <div class="small-icon task-context-menu-button context-menu">
                <span class="material-symbols-rounded">more_horiz</span>
                <div class="context-menu-popover">
                    <div class="item">
                        <div class="icon">
                            <span class="material-symbols-rounded">
                                edit
                            </span>
                        </div>
                        <div class="text">
                            Edit
                        </div>
                    </div>
                    <div class="item">
                        <div class="icon">
                            <span class="material-symbols-rounded">
                                delete
                            </span>
                        </div>
                        <div class="text">
                            Delete
                        </div>
                    </div>
                    <div class="divider"></div>
                    <div class="item">
                        <div class="icon">
                            <span class="material-symbols-rounded">
                                share
                            </span>
                        </div>
                        <div class="text">
                            Open in new tab
                        </div>
                    </div>
                    <div class="item">
                        <div class="icon">
                            <span class="material-symbols-rounded">
                                visibility
                            </span>
                        </div>
                        <div class="text">
                            Copy link
                        </div>
                    </div>
                    <div class="item disabled">
                        <div class="icon">
                            <span class="material-symbols-rounded">
                                export_notes
                            </span>
                        </div>
                        <div class="text">
                            Export
                        </div>
                    </div>

                    <div class="item">
                        <div class="icon">
                            <span class="material-symbols-rounded">
                                file_download
                            </span>
                        </div>
                        <div class="text">
                            Download
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
    

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
            <div class="tooltip tooltip-under status-container">
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
//         <div class="tooltip tooltip-under">
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
    let date = createdAt ? global.formatDateFull(new Date(createdAt)) : "No creation date found";
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
        <td>${date}</td>
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
            <div class="add-task-title">
            <span>Create Task</span>
            <div class="small-icon" id="close-button">
                <span class="material-symbols-rounded">
                    close
                </span>
            </div>
            </div>
            <input type="text" placeholder="Task title" class="add-task-title-input">
            
            <div class="add-task-description-container">
                <div id="description-editor"></div>
            </div>
            <div class="dropdown-and-employee-list">
                <div class="search-dropdown" id="employee-select" tabindex="0">
                    <div class="search">
                        <input class="search-input" type="text" autocomplete="off" placeholder="Add Employees">
            
                        
                        <div class="search-icon">
                            <span class="material-symbols-rounded">search</span>
                        </div>
                        <div class="search-icon clear-icon">
                            <span class="material-symbols-rounded">close</span>
                        </div>
                    </div>
                    <div class="popover">
                        <div class="employee-list">
                        </div>
                        <div class="show-more text-button">
                            <div class="button-icon">
                                <span class="material-symbols-rounded">
                                    more_horiz
                                </span>
                            </div>
                            <div class="button-text">
                                Show More
                            </div>
                        </div>
                    </div>
                </div>
                <div class="assigned-employees">
                
                </div>
            </div>
            
            <div class="number-picker" id="expected-man-hours">
                <div class = "stepper decrement" tabindex="0">
                    <span class="material-symbols-rounded">
                        remove
                    </span>
                </div>

                <input type="number" class="number-input" value="1" min="0" tabindex="0">

                <div class="stepper increment" tabindex="0">
                    <span class="material-symbols-rounded">
                        add
                    </span>
                </div>
            </div>
            <div class="date-picker" id="due-date">
                <div class="date-picker-icon">
                    <span class="material-symbols-rounded">event</span>
                </div>
                <input class="date-picker-input" type="text" placeholder="Due Date" tabindex="0"></input>
            </div>
            <div class="confirm-buttons-row">
                <div class="text-button" id="discard-button">
                    <div class="button-text">
                        Discard
                    </div>  
                </div>
                <div class="text-button" id="create-button">
                    <div class="button-text">
                        Create
                    </div>
                </div>
            </div>
        </dialog>
    `;

    //quill for description
    var quill = new Quill('#description-editor', {
        modules: {
            toolbar: [
                [{ header: [1, 2, false] }],
                ['bold', 'italic', 'underline'],
                ['image', 'code-block']
            ]
        },
        placeholder: 'Description...',
        theme: 'snow'
    });

    //event listeners for the number picker
    let numberPicker = document.querySelector("#expected-man-hours");
    let numberPickerInput = numberPicker.querySelector('input[type="number"]')
    let numberPickerPlus = numberPicker.querySelector('.stepper.increment')
    let numberPickerMinus = numberPicker.querySelector('.stepper.decrement')
    numberPickerPlus.addEventListener('click', e => {
        e.preventDefault()
        numberPickerInput.stepUp()
    })
    numberPickerMinus.addEventListener('click', e => {
        e.preventDefault()
        numberPickerInput.stepDown()
    })
    numberPickerInput.addEventListener('focus', e => {
        numberPickerInput.select()
    })

    //flatpickr for date picker
    let datePickerInput = popupDiv.querySelector('.date-picker-input')
    let fp = flatpickr(datePickerInput, {
        dateFormat: 'd/m/Y',
        altInput: true,
        altFormat: 'F j, Y',
        disableMobile: true,
        onChange: (selectedDates, dateStr, instance) => {
            datePickerInput.dispatchEvent(new Event('change'))
        }
    })

    let assignedEmployees = new Set();
    let assignedEmployeesDiv = popupDiv.querySelector('.assigned-employees');

    let empList = popupDiv.querySelector('#employee-select > .popover > .employee-list'); //this is crazy it should change later
    let res = await get_api(`/employee/employee.php/all`);
    let employeeList = res.data.employees;
    employeeList.forEach((emp) => {
        let emp_name = global.bothNamesToString(emp.firstName, emp.lastName);
        let avatar = global.employeeAvatarOrFallback(emp);
        let option = document.createElement("div");
        option.classList.add("name-card");
        option.innerHTML = `
            <img src="${avatar}" class="avatar">
            <span>${emp_name}</span>
            <span class="material-symbols-rounded icon">
                person_add
            </span>
        `
        option.setAttribute("data-id", emp.empID);
        empList.appendChild(option);
    });

    // turn employeelist into a map of id to employee
    let employeeMap = new Map();
    employeeList.forEach((emp) => {
        employeeMap.set(emp.empID, emp);
    });

    // add event listeners to employee list
    let employeeListOptions = empList.querySelectorAll(".name-card");
    employeeListOptions.forEach((option) => {
        option.addEventListener("click", () => {
            let empID = option.getAttribute("data-id");
            assignedEmployees.add(empID);
            updateAssignedEmployees(assignedEmployeesDiv, assignedEmployees, employeeMap)
        })
    })


    console.log(popupDiv.innerHTML)
    console.log("[addTask] after popup")
    fullscreenDiv.style.filter = 'brightness(0.75)';
    let dialog = popupDiv.querySelector('.popupDialog');
    dialog.style.transform = 'translateY(0px)'
    dialog.style.opacity = '1';
    
    let createButton = dialog.querySelector('#create-button');
    let closeButton = dialog.querySelector('#close-button');
    let discardButton = dialog.querySelector('#discard-button');

    closeButton.addEventListener('click', (event) => {
        event.preventDefault(); 
        dialog.style.transform = 'translateY(-1%)'
        dialog.style.opacity = '0';
        dialog.style.display = 'none';
        
        
        fullscreenDiv.style.filter = 'none';
        console.log("[addTaskCloseButton] rejecting")
    });

    discardButton.addEventListener('click', (event) => {
        event.preventDefault(); 
        dialog.style.transform = 'translateY(-1%)'
        dialog.style.opacity = '0';
        dialog.style.display = 'none';
        fullscreenDiv.style.filter = 'none';
        console.log("[addTaskDiscardButton] rejecting")
    });

    dialog.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            dialog.style.transform = 'translateY(-1%)'
            dialog.style.opacity = '0';
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            console.log("[addTaskEscape] rejecting")
        }
    });

    createButton.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        let title = dialog.querySelector('.add-task-title-input').value;
        let description = quill.root.innerHTML;
        let expectedManHours = parseInt(numberPickerInput.value, 10);
        let dueDate = fp.selectedDates[0];
        let dueDateTimestamp = dueDate ? dueDate.getTime() : null;
        let state = 0;
        let assignedEmployeesArray = [...assignedEmployees];
        //post the task without assignments
        let taskRes = await post_api(`/project/task.php/task/${globalCurrentProject.projID}`, {
            title: title,
            description: description,
            expectedManHours: expectedManHours,
            dueDate: dueDateTimestamp,
            state: state,
        });
        if (taskRes.success) {
            let task = taskRes.data;
            //post the assignments
            let assignmentRes = await put_api(`/project/task.php/assignments/${globalCurrentProject.projID}/${task.taskID}`, {
                assignments: assignedEmployeesArray
            });   
            if (assignmentRes.success) {
                let assignments = assignmentRes.data;
                task.assignments = assignments;
                taskObjectRenderAll(task, RENDER_BOTH);
                dialog.style.transform = 'translateY(-1%)'
                dialog.style.opacity = '0';
                dialog.style.display = 'none';
                fullscreenDiv.style.filter = 'none';
                console.log("[addTaskCreateButton] resolving")
            } else {
                console.error("[addTaskCreateButton] Error creating assignments: ", assignmentRes.error.message);
                alert("An error occurred while creating the task. Please try again later.");
            }
        } else {
            console.log("[addTaskCreateButton] rejecting")
        }
    })



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
        listItem.classList.add("tooltip", "tooltip-under");
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

let boardAddTaskButton = document.getElementById("add-task-button");
boardAddTaskButton.addEventListener("click", async () => {
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
    explainerShowHide.innerHTML = `<span class="material-symbols-rounded">right_panel_open</span>`

}

//check for medium on resize
mediaQueryMedium.addEventListener("change", (e) => {
    if (e.matches) {
        console.log("[mediaQueryMediumChange] medium")
        explainer.classList.add("hidden")
        explainerShowHide.classList.remove("norender")
        explainerShowHide.innerHTML = `<span class="material-symbols-rounded">right_panel_open</span>`

    }
})

//check for desktop on load
if (mediaQueryDesktop.matches) {
    console.log("[mediaQueryDesktop] desktop")
    explainerShowHide.innerHTML = `<span class="material-symbols-rounded">right_panel_close</span>`
}

//check for desktop on resize
mediaQueryDesktop.addEventListener("change", (e) => {
    if (e.matches) {
        console.log("[mediaQueryDesktopChange] desktop")
        explainer.classList.remove("hidden")
        explainerShowHide.classList.remove("norender")
        explainerShowHide.innerHTML = `<span class="material-symbols-rounded">right_panel_close</span>`
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
                <div>Are you sure you want to delete this task?</div>
                <div><strong>This change cannot be undone.</strong></div>
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

    fullscreenDiv.style.filter = 'brightness(0.75)';
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
            let error = `${res.error.message} (${res.error.code})`
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
    console.log("[projectObjectRenderAndListeners] rendering project: ", project.projID, project.name);
    let session = await global.getCurrentSession();
    let isTeamLeader = (project.teamLeader.empID === session.employee.empID);
    let emps = await global.getEmployeesById([project.teamLeader.empID, project.createdBy.empID]);
    let teamLeader = emps.get(project.teamLeader.empID);


    let teamLeaderName = global.bothNamesToString(teamLeader.firstName, teamLeader.lastName);
    let element = renderProject(project.projID, project.name, project.description, teamLeader, isTeamLeader, project.createdAt);

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
    let date = new Date(timestamp).toISOString().split('T')[0];
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
            let error = `${res.error.message} (${res.error.code})`
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

projectSearchInput.addEventListener("keydown", (e) => {
    sleep(10).then(() => {
        searchAndRenderProjects(projectSearchInput.value)
    })
})

document.getElementById("task-search").addEventListener("keydown", (e) => {
    sleep(10).then(() => {
        searchAndRenderTasks()
    })
})


document.getElementById("delete-project-search").addEventListener("click", () => {
    projectSearchInput.value = "";
    searchAndRenderProjects()
})

document.getElementById("delete-task-search").addEventListener("click", () => {
    taskSearchInput.value = "";
    searchAndRenderTasks()
})


const sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

async function searchAndRenderProjects(search) {
    const data = await get_api('/project/project.php/projects?q=' + search);
    console.log("[searchAndRenderProjects(" + search + ")] fetched projects");
    console.log(data);
    console.log('.project-row.selected');
    if (data.success == true) {
        clearProjectList();
        console.log("[searchAndRenderAllProjects] projects have been fetched successfully")
        await Promise.all(data.data.projects.map(async (project) => {

            await projectObjectRenderAndListeners(project);
        }));
        return data.data.projects
    }
}


async function searchTasks(search) {
    let tasks = globalTasksList;
    let filteredTasks = [];
    tasks.forEach((task) => {
        let title = task.title;
        let desc = task.description;
        let dueDate = task.dueDate;
        dueDate = dueDate ? global.formatDateFull(new Date(dueDate)) : null; //gets it into searchable format
        if (title.includes(search) || desc.includes(search) || (dueDate && dueDate.includes(search))) {
            filteredTasks.push(task);
        }
    });
    return filteredTasks;
}

async function searchAndRenderTasks() {
    let search = taskSearchInput.value;
    let tasks = await searchTasks(search);
    console.log("[renderTasksFromSearch] filtered tasks: ");
    console.log(tasks);
    clearRenderedTasks()
    renderTasks(tasks);
}
