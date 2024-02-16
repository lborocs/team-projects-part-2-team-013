import * as global from "../global-ui.js";
import { animate, getEmployeesById } from "../global-ui.js";

const RENDER_COLUMN = 1;
const RENDER_LIST = 2;
const RENDER_BOTH = 3;

//important shit
var globalTasksList = [];
var globalAssignments = [];
var globalCurrentProject;
var globalCurrentTask;
var explainerTask = null // the currently selected task in the explaner, NOT AN ELEMENT
let sortAttribute = 'lastAccessed'
let sortDirection = 'desc';
let currentPage = 1;
let pageLimit = 25;
let titleButton = document.getElementById("title-column");
let dateButton = document.getElementById("date-column");
let statusButton = document.getElementById("status-column");
let assigneesButton = document.getElementById("assignees-column")


let sortArray = [titleButton, dateButton, statusButton, assigneesButton];

//single things
const taskGrid = document.querySelector(".taskgrid")
const taskGridWrapper = document.querySelector(".taskgrid-wrapper")
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

const explainerTaskContainer = explainer.querySelector(".task-overview")
const explainerTaskTitle = explainerTaskContainer.querySelector(".title")
const explainerTaskDescriptionContainer = explainerTaskContainer.querySelector(".description-container")
const explainerTaskDescription = explainerTaskContainer.querySelector(".description")
const explainerTaskDateContainer = explainerTaskContainer.querySelector(".date-container")
const explainerTaskDate = explainerTaskContainer.querySelector(".date")
const explainerShowHide = document.querySelector("#explainer-show-hide")
const notStartedColumn = document.querySelector("#notstarted")
const inProgressColumn = document.querySelector("#inprogress")
const finishedColumn = document.querySelector("#finished")
const notStartedAddButton = document.querySelector("#notstarted-add")
const listAddRow = document.querySelector("#list-add-row")
const projectsPerPageDropdown = document.querySelector("#projects-per-page");
const view10 = document.querySelector("#view-10");
const view25 = document.querySelector("#view-25");
const view50 = document.querySelector("#view-50");
const view100 = document.querySelector("#view-100");

const projectBackButton = document.querySelector("#project-back")
const projectSearchInput = document.querySelector("#project-search")
const taskSearchInput = document.querySelector("#task-search")
const explainerTaskManhours = document.querySelector(".manhours-container")
const dashboardRedirect = document.getElementById('dashboard-redirect');
const listViewButton = document.getElementById('list-view-button');
const boardViewButton = document.getElementById('board-view-button');
const lastAccessedButton = document.getElementById('project-last-accessed');
const pageBackButton = document.getElementById('page-back-button');
const pageForwardButton = document.getElementById('page-forward-button');
const pageNumberElement = document.querySelector('.page-number');

//groups of things
var projectRows = document.querySelectorAll(".project-row")
const views = document.querySelectorAll(".view")
const taskColumns = document.querySelectorAll(".taskcolumn")
var taskCards = document.querySelectorAll(".task")
var taskRows = document.querySelectorAll(".taskrow") 
const dropdowns = document.querySelectorAll(".dropdown")
const dragIndicators = document.querySelectorAll(".draggable")


// dont set to null cause null is used in the case of no preceeding element
var taskDragLastDrawnElement = 0;
var taskDragLastDrawnColumn = 0;

console.log("[import] loaded client.js")


async function projectSwitchToOnClick(projectRow, setBreadcrumb = true) {
    projectRows = document.querySelectorAll(".project-row")
    projectRows.forEach((row) => {
        row.classList.remove("selected")
    })
    projectRow.classList.add("selected")
    explainerTaskSetToDefault();

    let id = projectRow.getAttribute("data-ID");


    await renderIndividualProject(id, setBreadcrumb);

}

async function renderIndividualProject(id, setBreadcrumb = true) {
    let project = await getProjectById(id);
    if (!project) {
        console.error(`[renderIndividualProject] Error fetching project`);
        return false;
    }

    globalCurrentProject = project;

    let teamLeader = await global.getEmployeesById([project.teamLeader.empID]);
    if (!teamLeader) {
        console.error(`[renderIndividualProject] Error fetching team leader`);
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
        console.error(`[renderIndividualProject] Error fetching tasks`);
        return false;
    }
    
    await renderTasks(tasks);
    console.log("[renderIndividualProject] fetched & rendered tasks for " + project.name)
    globalTasksList = tasks;
    console.log("global tasks list:")
    console.log(globalTasksList)

    
    // unselect not this project
    console.log("[renderIndividualProject] selected " + project.name)
    //update the breadcrumb with the project name
    if (setBreadcrumb) {
        global.setBreadcrumb(["Projects", project.name], [window.location.pathname, "#" + id]);
        dashboardRedirect.href = `/dashboard/#${id}`
    }

    projectTitle.innerText = project.name;
    explainerTitle.innerText = project.name;
    explainerDescription.innerHTML = project.description;
    explainerTeamLeaderName.innerText = global.employeeToName(teamLeader);
    explainerTeamLeaderAvatar.src = global.employeeAvatarOrFallback(teamLeader)

    const prefSort = await global.preferences.get('tasksort');
    const prefDirection = await global.preferences.get('taskdirection');
    const attributeSearch = await prefSort.or_default();
    const sortDirection = await prefDirection.or_default();

    let sortColumn = document.querySelector(`[data-value=${attributeSearch}]`);
    sortColumn.classList.add("sorting-by");
    if (sortDirection === 'desc') {
        sortColumn.classList.add("reverse");
    }

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


views.forEach((view, i) => {
    
    view.addEventListener("pointerup", () => {

        if (view.classList.contains("selected")) {
            return
        }

        view.classList.add("selected")
        views.forEach((tab, j) => {
            if (j !== i) {
                tab.classList.remove("selected")
            }
        })
        console.log("[viewOnClick] selected")

        taskGridWrapper.classList.toggle("fade")
        taskList.classList.toggle("fade")
        setTimeout(() => {
            taskGridWrapper.classList.toggle("norender")
            taskList.classList.toggle("norender")
        }, 50)
    })

    global.getCurrentSession().then((session) => {

        if (session.auth_level >= 2) {

            boardViewButton.classList.remove("selected");
            listViewButton.classList.add("selected");
            taskGridWrapper.classList.add("fade");
            taskGridWrapper.classList.add("norender");
            taskList.classList.remove("fade");
            taskList.classList.remove("norender");
            
        }
    });

})

projectBackButton.addEventListener("pointerup", () => {
    global.setBreadcrumb(["Projects"], [window.location.pathname]);
    renderFromBreadcrumb([null, null]);
})

explainerShowHide.addEventListener("pointerup", () => {
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
    explainerTask = null;
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

        //update the disabled option in the context menu
        let contextMenu = task.querySelector(".context-menu-popover");
        let stateSelector = contextMenu.querySelector(".state-selector .submenu");
        let stateItems = stateSelector.querySelectorAll(".item");
        stateItems.forEach((item) => {
            item.classList.remove("disabled");
        });
        stateItems[newState].classList.add("disabled");

        //globally udpates task state on client
        let globalTask = globalTasksList.find(task => task.taskID === taskID);
        globalTask.state = newState;


        patch_api(`/project/task.php/task/${projID}/${taskID}`, {state:newState}).then((res) => {
            if (res.status == 204) { // 204 no content (success)
                console.log(`[updateTaskState] updated task ${taskID} to state ${newState}`);
            } else {
                console.error(`[updateTaskState] failed to update task ${taskID} to state ${newState}`);
            }
        });
    }
}

//takes a task card HTML ELEMENT
function showTaskInExplainer(taskCard) {

    let taskID = taskCard.getAttribute("id");
    explainerTaskContainer.setAttribute("task-id", taskID);
    //get the task from globalTasksList
    globalCurrentTask = globalTasksList.find((task) => {
        return task.taskID == taskID;
    });
    console.log(globalCurrentTask)
    explainerTask = globalCurrentTask
    explainerTaskTitle.innerHTML = globalCurrentTask.title;
    explainerTaskTitle.classList.remove("norender");
    
    explainerTaskManhours.innerHTML = `
    <span class="material-symbols-rounded">
        timer
    </span>
    <div class="manhours">
        ${globalCurrentTask.expectedManHours/3600} Manhour${globalCurrentTask.expectedManHours !== 3600 ? 's' : ''}
    </div>
    `;

    explainerTaskDescription.innerHTML = globalCurrentTask.description ? globalCurrentTask.description : "<i>No description...</i>";

    let dueDate = globalCurrentTask.dueDate ? new Date(globalCurrentTask.dueDate) : null;
    explainerTaskDate.innerHTML = global.formatDateFull(dueDate) || "No due date";

    let statusElement = document.querySelector(".status");
    statusElement.innerHTML = globalCurrentTask.state == 0 ? "Not Started" : globalCurrentTask.state == 1 ? "In Progress" : "Finished";
    animate(document.querySelector(".task-overview"), "flash")

    global.setBreadcrumb(["Projects", globalCurrentProject.name, globalCurrentTask.title], [window.location.pathname, "#" + globalCurrentProject.projID, "#" + globalCurrentProject.projID + "-" + globalCurrentTask.taskID])
}


function setUpTaskEventListeners() {

    console.log("[setUpTaskEventListeners] setting up event listeners")

    taskCards = document.querySelectorAll(".task");
    taskCards.forEach((taskCard) => {

        let contextMenuButton = taskCard.querySelector(".context-menu");
        let contextMenuPopover = taskCard.querySelector(".context-menu-popover");

        contextMenuButton.addEventListener("click", (e) => {
            e.stopPropagation();
            //closes the rest of them first
            let contextMenus = document.querySelectorAll(".context-menu-popover.visible");
            contextMenus.forEach(menu => {
                if (menu !== contextMenuPopover) {
                    menu.classList.remove("visible");
                    menu.parentElement.classList.remove("active");
                }
            });
            contextMenuPopover.classList.toggle("visible");
            contextMenuButton.classList.toggle("active");
        });

        //stops the context menu from closing when you click on the options
        let contextMenuItems = contextMenuPopover.querySelectorAll(".item");
        contextMenuItems.forEach(item => {
            let timeoutId;
            item.addEventListener("pointerup", (e) => {
                e.stopPropagation();
                console.log("[contextMenuItemOnClick] clicked")

                if (item.classList.contains("action-edit")) {
                    console.log("[contextMenuItemOnClick] edit clicked")
                    showTaskInExplainer(taskCard);
                    editTaskPopup(globalCurrentTask);
                    

                } else if (item.classList.contains("action-delete")) {
                    console.log("[contextMenuItemOnClick] delete clicked")

                    let taskID = taskCard.getAttribute("id");
                    confirmDelete().then(() => {
                        deleteTask(taskID)
                        taskCard.remove()
                        calculateTaskCount()
                    }).catch((e) => {
                        console.log('[DeleteTaskButtonsClick] Deletion cancelled');
                        console.log(e)
                    });


                } else if (item.classList.contains("action-copy")) {
                    console.log("[contextMenuItemOnClick] copy clicked")

                    if(timeoutId) {
                        clearTimeout(timeoutId);
                    }

                    let taskID = taskCard.getAttribute("id");
                    let link = window.location.origin + "/projects/#" + globalCurrentProject.projID + "-" + taskID;
                    navigator.clipboard.writeText(link)

                    item.querySelector(".text").innerHTML = "Copied!"
                    timeoutId = setTimeout(() => {
                        item.querySelector(".text").innerHTML = "Copy Link"
                    }, 1000)


                } else if (item.classList.contains("action-open")) {
                    console.log("[contextMenuItemOnClick] open clicked")

                    let taskID = taskCard.getAttribute("id");
                    let link = window.location.origin + "/projects/#" + globalCurrentProject.projID + "-" + taskID;
                    window.open(link, "_blank")

                } else if (!item.classList.contains("disabled")) {
                    if (item.classList.contains("not-started-state")) {
                        console.log("[contextMenuItemOnClick] not started clicked")
                    } else if (item.classList.contains("in-progress-state")) {
                        console.log("[contextMenuItemOnClick] in progress clicked")
                    } else if (item.classList.contains("finished-state")) {
                        console.log("[contextMenuItemOnClick] finished clicked")
                    }
                } else {
                    console.log("[contextMenuItemOnClick] no known action")
                }
            });
        });

        //have to include mouse up and down this is crazy event propagation
        contextMenuButton.addEventListener("pointerup", (e) => {
            e.stopPropagation();
        });

        contextMenuButton.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
        });

        let taskStatusContainers = taskCard.querySelectorAll(".status-container");
        taskStatusContainers.forEach((icon) => {

            icon.addEventListener("pointerdown", (e) => {
                e.stopPropagation();
            });

            icon.addEventListener("pointerup", (e) => {
                e.stopPropagation();
            });
        
        })

        //closes the context menu if they click outside
        document.addEventListener("pointerup", (e) => {
            if (!contextMenuButton.contains(e.target)) {
                contextMenuPopover.classList.remove("visible");
                contextMenuButton.classList.remove("active");
            }
        });

        taskCard.addEventListener("contextmenu", (e) => {
            e.preventDefault(); //stop the browser putting its own right click menu over the top
            e.stopPropagation();
        
            //closes the rest of them first
            let contextMenus = document.querySelectorAll(".context-menu-popover.visible");
            contextMenus.forEach(menu => {
                if (menu !== contextMenuPopover) {
                    menu.classList.remove("visible");
                    menu.parentElement.classList.remove("active");
                }
            });
        
            contextMenuPopover.classList.toggle("visible");
            contextMenuButton.classList.toggle("active");
        });


        taskCard.addEventListener("pointerdown", (e) => {
            //if the target is the context menu button, dont show the explainer
            if (e.target.classList.contains("context-menu")) {
                return
            }

            taskCards.forEach((card) => {
                card.classList.remove("clicked")
                card.classList.remove("task-focussed")
            })
            taskCard.classList.add("clicked")
            taskCard.classList.add("task-focussed")
        });
        taskCard.addEventListener("click", (e) => {

            if (e.target.classList.contains("context-menu")) {
                return
            }

            if (taskCard.classList.contains("beingdragged")) {
                return
            }

            //right click
            if (e.button == 2) {
                return
            }

            // console.log(explainer)
            explainer.classList.remove("hidden")
            overlay.classList.remove("norender")
            
            taskCards.forEach((card) => {
                card.classList.remove("clicked")
            })

            showTaskInExplainer(taskCard);
            
        });

        taskCard.addEventListener("dragstart", () => {
            taskCard.classList.add("beingdragged");
        });

        taskCard.addEventListener("dragend", () => {
            taskCard.classList.remove("beingdragged");
            taskCard.classList.remove("clicked");

            taskColumns.forEach((column) => {
                column.classList.remove("highlight")
            })

            if (taskCard.getAttribute("id") !== explainerTaskContainer.getAttribute("task-id")) {
                taskCard.classList.remove("task-focussed");
            }

            updateTaskState(taskCard);
            calculateTaskCount()
        });
    });

    //list view
    taskRows = document.querySelectorAll(".taskRow");
    taskRows.forEach((taskRow) => {
        taskRow.addEventListener("pointerdown", () => {
            console.log("[taskRowOnMouseDown] clicked")
            //taskRow.classList.add("clicked")
        });

        taskRow.addEventListener("pointerup", () => {
            //show explainer
            console.log("[taskRowOnTouchStart] clicked")
            // taskRows.forEach((row) => {
            //     row.classList.remove("clicked")
            // })
            showTaskInExplainer(taskRow);
        });
    });
}





taskColumns.forEach((taskColumn) => {
    
    taskColumn.addEventListener("dragover", (e) => {
        e.preventDefault()
        const afterElement = findNext(taskColumn, e.clientY)

        taskColumn.classList.add("highlight")

        // optimisation: redrawing is crazy expensive so we only
        // want to redraw if the user has actually moved the task
        if (afterElement == taskDragLastDrawnElement && taskColumn == taskDragLastDrawnColumn) {
            return
        } else {
            taskDragLastDrawnElement = afterElement;
            taskDragLastDrawnColumn = taskColumn;

            taskColumns.forEach((column) => {
                column.classList.remove("highlight")
            })

            taskColumn.classList.add("highlight")

        }
        console.log("[taskColumnDragover] inserting above", afterElement?.getAttribute("data-title"))
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

    if (data.success == true) {
        console.log(`[fetchTasks] tasks have been fetched for ${projID}`)
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
async function renderTasks(tasks, update = RENDER_BOTH) {
    clearRenderedTasks();
    await Promise.all(tasks.map((task) => {
        taskObjectRenderAll(task, update)
    }));
    setUpTaskEventListeners();
    await renderAssignments(globalAssignments);
}

function taskObjectRenderAll(task, update = RENDER_BOTH) {
    console.log("[taskObjectRenderAll] rendering task object "+task.title)
    let date = task.dueDate ? global.formatDate(new Date(task.dueDate)) : "";
    let desc = task.description
    let title = task.title || "No Title";
    let createdBy = task.createdBy || "Unknown";
    let state = task.state
    let taskID = task.taskID || "Unknown";
    let expectedManHours = task.expectedManHours; //no safety here because not null i think
    let assignments = task.assignments || [];    

    if (update & RENDER_COLUMN) {
        renderTask(title, state, taskID, desc, createdBy, date, task.dueDate, expectedManHours, assignments);
    }
    if (update & RENDER_LIST) {
        renderTaskInList(title, state, taskID, desc, createdBy, date, expectedManHours, assignments);
    }
    
    calculateTaskCount()
    global.managerElementsEnableIfManager();
    teamLeaderEnableElementsIfTeamLeader();
}


async function renderAssignments(assignments, update = RENDER_BOTH) {

    if (assignments.length == 0) {
        console.log("[renderAssignments] assignments is empty")
        return
    }

    console.error('[renderAssignments] rendering assignments:')
    console.log(assignments)

    let unique_users = new Set();
    let taskUserCount = new Map();

    assignments.forEach((assignment) => {
        unique_users.add(assignment.employee.empID);
    });

    let employees = await getEmployeesById([...unique_users]);

    assignments.forEach((assignment) => {
        let emp = employees.get(assignment.employee.empID);
        let emp_name = global.employeeToName(emp);
        let emp_icon = global.employeeAvatarOrFallback(emp);

        let task = document.getElementById(assignment.task.taskID);

        if (!task) {
            console.log(`[renderAssignment] Task ${assignment.task.taskID} not found (we leaked an assignment)`)
            return
        }
        let taskTable = document.querySelector(".tasktable-body");
        let taskTableTask = taskTable.querySelector(`[id="${assignment.task.taskID}"]`);
        let usersAssigned = task.querySelector(".users-assigned");
        let usersAssignedList = taskTableTask.querySelector(".users-assigned-list");
        
        let assignmentElem = document.createElement("div");
        assignmentElem.classList.add("assignment");
        assignmentElem.classList.add("tooltip", "tooltip-under");

        if (usersAssigned) {
            let count = taskUserCount.get(assignment.task.taskID) || 0;
            if (count < 3) {
                assignmentElem.innerHTML = `<p class="tooltiptext">${emp_name}</p>
                <img src="${emp_icon}" class="task-avatar">`

                if (update & RENDER_COLUMN) {
                    usersAssigned.appendChild(assignmentElem);
                }
                if (update & RENDER_LIST) {
                    usersAssignedList.appendChild(assignmentElem.cloneNode(true));
                }

            } else if (count === 3) {
                let additionalUsers = assignments.filter(a => a.task.taskID === assignment.task.taskID).length - 3;

                const icon = global.generateAvatarSvg("+" + additionalUsers, "dfdfdf");
                const url = "data:image/svg+xml;base64," + btoa(icon);
            
                assignmentElem.innerHTML = `<p class="tooltiptext">${additionalUsers} more users assigned</p>
                <img src="${url}" class="task-avatar">`

                if (update & RENDER_COLUMN) {
                    usersAssigned.appendChild(assignmentElem);
                }
                if (update & RENDER_LIST) {
                    usersAssignedList.appendChild(assignmentElem.cloneNode(true));
                }
            }
            taskUserCount.set(assignment.task.taskID, count + 1);
        }
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

    if (!globalCurrentProject) {
        return
    }


    let session = await global.getCurrentSession();
    let isTeamLeader = session.employee.empID == globalCurrentProject.teamLeader.empID;

    // managers always have team leader perms
    if ((session.auth_level ?? 0) >= 2) {
        isTeamLeader = true;
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
    let res = await get_api(`/project/project.php/project/${projID}`);
    if (!res.success) {
        console.error(`[getProjectById] Error fetching project ${projID}: ${res.error.message} (${res.error.code})`);
        throw res;
    }
    return res.data;
}

async function fetchAndRenderAllProjects() {
    setActivePane("select-projects-pane");
    global.setBreadcrumb(["Projects"], [window.location.pathname]);
    const data = await get_api(`/project/project.php/projects?q=${projectSearchInput.value}&sort_by=${sortAttribute}&sort_direction=${sortDirection}&limit=${pageLimit}&page=${currentPage}`);
    console.log("[fetchAndRenderAllProjects] fetched projects");

    if (data.success == false) {
        return
    }

    clearProjectList();
    console.log("[fetchAndRenderAllProjects] projects have been fetched successfully")
    console.log("[fetchAndRenderAllProjects] pageLimit is " + pageLimit)

    await checkNextPage();

    let projectTableHeaders = document.querySelectorAll("#projects-table > thead > tr > th");
    projectTableHeaders.forEach((header) => {
        
        if (sortAttribute) { 
            header.addEventListener("click", (e) => {
                sortAttribute = header.getAttribute('data-attribute');
                if (header.classList.contains("sorting-by")) {
                    header.classList.toggle("reverse");
                    sortDirection = header.classList.contains("reverse") ? 'desc' : 'asc';
                } else {
                    projectTableHeaders.forEach((header) => {
                        header.classList.remove("sorting-by", "reverse");
                    });
                    header.classList.add("sorting-by");
                    sortDirection = 'asc';
                }
                currentPage = 1;
                pageBackButton.classList.add("disabled");
                pageNumberElement.textContent = currentPage;
                searchAndRenderProjects(projectSearchInput.value, sortAttribute, sortDirection, pageLimit, currentPage);
            });
        }
    });

    await Promise.all(data.data.projects.map( async (project) => {
        await projectObjectRenderAndListeners(project);
    }));
    return data.data.projects
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

    try {
        await renderIndividualProject(projID, true);
    } catch (e) {
        await fetchAndRenderAllProjects();
    }

    if (!taskID) {
        return;
    }
    console.log(`[renderFromBreadcrumb] attempting to render task ${taskID}`);
    let task = document.getElementById(taskID);
    if (!task) {
        alert("You appear to have followed a link to a task that either does not exist or you do not have access to.");
        return;
    } 
    showTaskInExplainer(task);

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

function renderTaskInList(title, state = 0, ID = "", desc = "", assignee = "", dueDate = "", expectedManHours, assignments = []) {
    console.log("[renderTaskInList] rendering task in list")

    let taskRow = document.createElement("tr");
    taskRow.classList.add("taskRow");

    // set id to the task id
    taskRow.setAttribute("id", ID);
    // add the parameters as html data attributes
    taskRow.setAttribute("data-desc", desc);
    taskRow.setAttribute("data-date", dueDate);
    taskRow.setAttribute("data-assignee", assignee);
    taskRow.setAttribute("data-title", title);
    taskRow.setAttribute("data-expectedManHours", expectedManHours);
    taskRow.setAttribute("data-state", state);
    taskRow.setAttribute("data-assignments", JSON.stringify(assignments));

    var icon;
    var statusText;
    var stateClass;
    if (state == 0) {
        stateClass = "not-started";
        icon = "push_pin";
        statusText = "Not Started";
    } else if (state == 1) {
        stateClass = "in-progress";
        icon = "timeline";
        statusText = "In Progress";
    } else if (state == 2) {
        stateClass = "finished";
        icon = "check_circle";
        statusText = "Finished";
    } else {
        console.error(`[renderTaskInList] invalid state (${state}) for task ${title}`);
    }

    taskRow.innerHTML = `
        <td class="${stateClass} td-class">
            <div class="dropdown status-cell" id="list-task-status" tabindex="0">
                <span class="material-symbols-rounded">${icon}</span>
                <div class="dropdown-text">${statusText}</div>
                <div class="dropdown-chevron">
                    <span class="material-symbols-rounded">
                        expand_more
                    </span>
                </div>
                <div class="dropdown-menu">
                    <div class="dropdown-option" id="dropdown-not-started">Not Started</div>
                    <div class="dropdown-option" id="dropdown-in-progress">In Progress</div>
                    <div class="dropdown-option" id="dropdown-finished">Finished</div>
                </div>
            </div>
        </td>
    `;

    taskRow.innerHTML += `
        <td class="title">
            ${title}
        </td>
    `;

    if (dueDate === "") {
        taskRow.innerHTML += `
            <td class="date disabled">
                Not set
            </td>
        `;
    } else {
        taskRow.innerHTML += `
            <td class="date">
                ${dueDate}
            </td>
        `;
    }

    if (assignments.length == 0) {
        taskRow.innerHTML += `
            <td class="assignee disabled">
                Not set
            </td>
        `;
    } else {
        console.log("[renderTaskInList] assignments:" + assignments)

        taskRow.innerHTML += `
            <td>
                <div class="users-assigned-list"></div>
            </td>
        `;
    }

    taskTableBody.appendChild(taskRow);
    taskTableBody.appendChild(listAddRow);
    calculateTaskCount();
    setupDropdownEventListeners(taskRow);
}

function setupDropdownEventListeners(taskRow) {
    let listTaskStatus = taskRow.querySelector("#list-task-status");
    let dropdownNotStarted = taskRow.querySelector("#dropdown-not-started");
    let dropdownInProgress = taskRow.querySelector("#dropdown-in-progress");
    let dropdownFinished = taskRow.querySelector("#dropdown-finished");

    listTaskStatus.addEventListener("click", () => {
        listTaskStatus.classList.toggle("open")
    });

    document.addEventListener("click", (e) => {
        if (!listTaskStatus.contains(e.target)) {
            listTaskStatus.classList.remove("open")
        }
    });

    dropdownNotStarted.addEventListener("click", () => {
        listTaskStatus.querySelector(".dropdown-text").innerText = "Not Started";
        taskRow.setAttribute("data-state", 0);
        let tdElement = taskRow.querySelector(".td-class");
        tdElement.classList.remove("in-progress", "finished");
        tdElement.classList.add("not-started");

        let icon = taskRow.querySelector(".material-symbols-rounded");
        icon.innerHTML = "push_pin";
    });

    dropdownInProgress.addEventListener("click", () => {
        listTaskStatus.querySelector(".dropdown-text").innerText = "In Progress";
        taskRow.setAttribute("data-state", 1);
        let tdElement = taskRow.querySelector(".td-class");
        tdElement.classList.remove("not-started", "finished");
        tdElement.classList.add("in-progress");
        let icon = taskRow.querySelector(".material-symbols-rounded");
        icon.innerHTML = "timeline";
    });

    dropdownFinished.addEventListener("click", () => {
        listTaskStatus.querySelector(".dropdown-text").innerText = "Finished";
        taskRow.setAttribute("data-state", 2);
        let tdElement = taskRow.querySelector(".td-class");
        tdElement.classList.remove("not-started", "in-progress");
        tdElement.classList.add("finished");

        let icon = taskRow.querySelector(".material-symbols-rounded");
        icon.innerHTML = "check_circle";
    });
}

sortArray.forEach((sortObject) => {
    sortObject.addEventListener("click", () => {
        const cl = sortObject.classList;
        const symbol = sortObject.querySelector('.material-symbols-rounded');
        if (cl.contains("sorting-by")) {
            if(cl.contains("desc")) {
                cl.remove("desc");
                cl.add("asc");
                if (symbol) symbol.innerHTML = "arrow_upward";
            } else {
                cl.remove("asc");
                cl.add("desc");
                if (symbol) symbol.innerHTML = "arrow_downward";
            }
        } else  {
            sortArray.forEach((sortObject) => {
                sortObject.classList.remove("sorting-by", "asc", "desc");
                const otherSymbol = sortObject.querySelector('.material-symbols-rounded');
                if (otherSymbol) otherSymbol.innerHTML = "swap_vert";
            });
            cl.add("sorting-by", "desc");
            if (symbol) symbol.innerHTML = "arrow_downward";
        }
        
        let sortDirection = !(cl.contains("asc"));
        console.error(sortDirection)
        
        let sortBy = sortObject.id;
        let tasks = globalTasksList;
        if (sortBy == "title-column") {
            sortByTitle(tasks, sortDirection);
        } else if (sortBy == "date-column") {
            sortByDueDate(tasks, sortDirection);
        } else if (sortBy == "status-column") {
            sortByState(tasks, sortDirection);
        } else if (sortBy == "assignees-column") {
            sortByAssignees(tasks, sortDirection);
        } else {
            console.error("invalid sort criteria");
        }
        taskRows = document.querySelectorAll(".taskRow");
        taskRows.forEach((task) => {
            task.remove();
        });
        tasks.forEach(async (task) => {
            await new Promise((resolve) => {
                taskObjectRenderAll(task, RENDER_LIST);
                resolve();
            })
            
        });
        setUpTaskEventListeners();
        renderAssignments(globalAssignments, RENDER_LIST);
        animate(document.querySelector(".tasktable-body"), "flash");
    })
})


function sortByCreatedAt(tasks, descending) {
    tasks.sort((a, b) => {
        let aDate = new Date(a.createdAt);
        let bDate = new Date(b.createdAt);
        return descending ? aDate - bDate : bDate - aDate;
    });
    return tasks;
}

function sortByDueDate(tasks, descending) {
    tasks.sort((a, b) => {
        if (a.dueDate === null) return 1;
        if (b.dueDate === null) return -1;
        let aDate = new Date(a.dueDate);
        let bDate = new Date(b.dueDate);
        return descending ? aDate - bDate : bDate - aDate;
    });
    return tasks;
}

function sortByTitle(tasks, descending) {
    tasks.sort((a, b) => {
        let aTitle = a.title;
        let bTitle = b.title;
        return descending ? aTitle.localeCompare(bTitle) : bTitle.localeCompare(aTitle);
    });
    return tasks;
}

function sortByState(tasks, descending) {
    tasks.sort((a, b) => {
        let aState = a.state;
        let bState = b.state;
        return descending ? aState - bState : bState - aState;
    });
    return tasks;
}

function sortByAssignees(tasks, descending) {
    tasks.sort((a, b) => {
        let aAssignees = a.assignments.length;
        let bAssignees = b.assignments.length;
        return descending ? aAssignees - bAssignees : bAssignees - aAssignees;
    });
    return tasks;
}

//TODO: render the context menu
async function renderTask(title, state = 0, ID = "", desc = "", createdBy = "", date = "", timestamp, expectedManHours, assignments = []) {
    state = state === null ? 0 : state;
    ID = ID === null ? "" : ID;
    desc = desc === null ? "" : desc;
    createdBy = createdBy === null ? "" : createdBy;
    date = date === null ? "" : date;
    expectedManHours = expectedManHours === null ? "" : expectedManHours;
    assignments = assignments === null ? [] : assignments;

    let dateToday = (new Date()).getTime();

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


    //this is some genuinely insane code that avoids having to write a loop
    let selectedState = ["", "", ""];
    selectedState[state] = "disabled";



    //generating the html for the task
    //context menu button takes the majority of the html here
    task.innerHTML = `
        <div class="title">
            ${title}
            <div class="small-icon task-context-menu-button context-menu">
                <span class="material-symbols-rounded">more_horiz</span>
                <div class="context-menu-popover">
                    <div class="item action-edit">
                        <div class="icon">
                            <span class="material-symbols-rounded">
                                edit
                            </span>
                        </div>
                        <div class="text">
                            Edit
                        </div>
                    </div>
                    <div class="item state-selector">
                        <div class="icon">
                            <span class="material-symbols-rounded">
                                move_group
                            </span>
                        </div>
                        <div class="text">
                            Move to
                        </div>
                        <div class="arrow">
                            <span class="material-symbols-rounded">
                                arrow_forward_ios
                            </span>
                        </div>
                        <div class="submenu">
                            <div class="item not-started-state ${selectedState[0]}">
                                <div class="icon">
                                    <span class="material-symbols-rounded">
                                        push_pin
                                    </span>
                                </div>
                                <div class="text">
                                    Not Started
                                </div>
                            </div>
                            <div class="item in-progress-state ${selectedState[1]}">
                                <div class="icon">
                                    <span class="material-symbols-rounded">
                                        timeline
                                    </span>
                                </div>
                                <div class="text">
                                    In Progress
                                </div>
                            </div>
                            <div class="item finished-state ${selectedState[2]}">
                                <div class="icon">
                                    <span class="material-symbols-rounded">
                                        check_circle
                                    </span>
                                </div>
                                <div class="text">
                                    Finished
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="item action-delete">
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
                    <div class="item action-copy">
                        <div class="icon">
                            <span class="material-symbols-rounded">
                                link
                            </span>
                        </div>
                        <div class="text">
                            Copy link
                        </div>
                    </div>
                    <div class="item action-open">
                        <div class="icon">
                            <span class="material-symbols-rounded">
                                open_in_new
                            </span>
                        </div>
                        <div class="text">
                            Open in new tab
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
                </div>
            </div>
        </div>
    `
    

    let statusIcon;
    let overdueContainerClass = "";
    let dateTooltip;

    // Calculate the difference in days
    const diffInDays = Math.floor((timestamp - dateToday) / (24 * 60 * 60 * 1000));

    if (timestamp === null) {

        statusIcon = `<span class="material-symbols-rounded">event_upcoming</span>`;
        dateTooltip = `No due date set`;

    } else if (diffInDays < 0 && state !== 2) {

        // tasks which are overdue
        statusIcon = `<span class="material-symbols-rounded">calendar_clock</span>`;
        overdueContainerClass = "overdue";
        dateTooltip = `Overdue by ${-diffInDays} day${-diffInDays !== 1 ? 's' : ''}`;

    } else if (state === 2 && diffInDays > 0) {

        // tasks which are finished but have a due date in the future
        statusIcon = `<span class="material-symbols-rounded">event_upcoming</span>`;
        dateTooltip = `Finished but due in ${diffInDays} day${diffInDays !== 1 ? 's' : ''}`;

    } else if (state !== 2){

        // tasks which are not finished and have a due date in the future
        statusIcon = `<span class="material-symbols-rounded">event_upcoming</span>`;
        dateTooltip = `Due in ${diffInDays} day${diffInDays !== 1 ? 's' : ''}`;

    } else {
        
        // tasks which are finished and have a due date in the past
        statusIcon = `<span class="material-symbols-rounded">event_upcoming</span>`;
        dateTooltip = `Finished ${-diffInDays} day${-diffInDays !== 1 ? 's' : ''} ago`;
    }

    let taskInfo = document.createElement("div");
    taskInfo.classList.add("task-info");
    if (date !== "" || expectedManHours !== 0 || desc !== "<p><br></p>") {
    task.appendChild(taskInfo);
    }
    
    if (date !== "") {
        const formattedDate = formatDateWithOrdinals(date);
        taskInfo.innerHTML += `
            <div class="tooltip tooltip-under status-container ${overdueContainerClass}">
                <p class="tooltiptext">${dateTooltip}</p>
                ${statusIcon}
                <div class="date" id="task-date">
                    ${formattedDate}
                </div>
            </div>
        `;
    };

    if (expectedManHours > 0) {
        let manHours = expectedManHours / 3600;
        let timeDisplay;
        let manHoursTooltip;
        if (manHours < 1) {
            let manMinutes = manHours * 60;
            timeDisplay = `${manMinutes.toFixed(0)} Minute${manMinutes !== 1 ? 's' : ''}`;
            manHoursTooltip = `${manMinutes.toFixed(0)} expected minute${manMinutes !== 1 ? 's' : ''}`;
        } else {
            manHours = Number.isInteger(manHours) ? manHours : manHours.toFixed(2);
            timeDisplay = `${manHours} Hour${manHours !== 1 ? 's' : ''}`;
            manHoursTooltip = `${manHours} expected hour${manHours !== 1 ? 's' : ''}`;
        }
        taskInfo.innerHTML += `

            <div class="tooltip tooltip-under manhours-container status-container">
                <p class="tooltiptext">${manHoursTooltip}</p>
                <span class="material-symbols-rounded">
                    timer
                </span>
                <div class="manhours">
                    ${timeDisplay}
                </div>
            </div>
        `;
    }

    if (desc !== "<p><br></p>" && desc !== null) {
        taskInfo.innerHTML += `
        <div class="tooltip tooltip-under description-icon-container status-container">
            <p class="tooltiptext">This task contains a description</p>
            <span class="material-symbols-rounded">
                subject
            </span>
        </div>

        `;
    }

    if (assignments.length > 0) {

        taskInfo.innerHTML += `
            <div class="users-assigned"></div>
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
    correctContextMenus()
}

function formatDateWithOrdinals(date) {
    const day = parseInt(date.split(" ")[0]);
    const ordinal = getOrdinalSuffix(day);
    const monthYear = date.split(" ")[1];
    return `${day}<sup>${ordinal} </sup> ${monthYear}`;
}

function getOrdinalSuffix(day) {
    if (day >= 11 && day <= 13) {
        return "th";
    }
    switch (day % 10) {
        case 1:
            return "st";
        case 2:
            return "nd";
        case 3:
            return "rd";
        default:
            return "th";
    }
}

function correctContextMenus() {
    let tasks = document.querySelectorAll(".task");
    let taskGrid = document.querySelector(".taskgrid");
    let taskGridRect = taskGrid.getBoundingClientRect();

    tasks.forEach((task) => {
        let contextMenu = task.querySelector(".context-menu-popover");
        let rect = contextMenu.getBoundingClientRect();
        let availableSpace = taskGridRect.bottom - rect.top;
        if (rect.height > availableSpace) {
            contextMenu.classList.add("above");
            console.log(`[correctContextMenus] adding above`)
        } else {
            contextMenu.classList.remove("above");
            console.log(`[correctContextMenus] removing above`)
        }
    });
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
 
function renderProject(ID, title, desc, teamLeader, isTeamLeader, createdAt, lastAccessed, dueDate) {
    let projectsTable = document.querySelector("#projects-table");
    let projectTitle = document.querySelector(".project-bar .title");
    let project = document.createElement("tr");
    project.setAttribute("tabindex", "0");
    project.classList.add("project-row");
    let icon = isTeamLeader ? `bookmark_manager` : `folder`;

    let teamLeaderName = global.employeeToName(teamLeader);

    let date = createdAt ? global.formatDateFull(new Date(createdAt)) : "No creation date found";
    let lastAccessedFormatted = lastAccessed ? formatLastAccessed(new Date(lastAccessed)) : `<span class="disabled">Never</span>`;
    let lastAccessedTooltip = lastAccessedFormatted.includes("Never") ? "Never accessed" : new Date(lastAccessed).toLocaleString('en-GB', { timeZone: 'GMT', dateStyle: 'long', timeStyle: 'short'});
    let dueDateFormatted = dueDate ? global.formatDateFull(new Date(dueDate)) : `<span class="disabled">Not set</span>`;

    project.innerHTML = `
        <td>
            <a href="/projects/#${ID}">
                <div class="project-card">
                    <div class="icon">
                        <span class="material-symbols-rounded">${icon}</span>
                    </div>
                    <div class="name">
                        ${title}
                    </div>
                </div>
            </a>
        </td>
        <td>
            <a href="/projects/#${ID}">
                <div class="name-card">
                    <div class="icon">
                        <img src="${global.employeeAvatarOrFallback(teamLeader)}" class="avatar">
                    </div>
                    <div class="name">
                        ${teamLeaderName}
                    </div>
                </div>
            </a>
        </td>
        <td>${date}</td>
        <td>${dueDateFormatted}</td>
        <td>
            <a href="/projects/#${ID}">
                <div class="tooltip tooltip-above name-card">
                    <p class="tooltiptext">${lastAccessedTooltip}</p>
                    <div class="name">
                        ${lastAccessedFormatted}
                    </div>
                </div>
            </a>
        </td>
        <td>
            <div class="icon-button no-box project-actions">
                <span class="material-symbols-rounded">
                    more_horiz
                </span>
            </div>
        </td>
    `;

    projectTitle.innerHTML = title;

    //sets id to the project id
    project.setAttribute("data-ID", ID);
    project.setAttribute("data-title", title);
    project.setAttribute("data-description", desc);
    project.setAttribute("data-team-leader", JSON.stringify(teamLeader));
    projectsTable.querySelector("tbody").appendChild(project);


    const projectActions = project.querySelector(".project-actions");
    projectActions.addEventListener("click", (e) => {
        e.stopPropagation()
        projectPopup(ID)

    });

    teamLeaderEnableElementsIfTeamLeader();

    return project;
}

function formatLastAccessed(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth() && now.getDate() === date.getDate()) {
        return `Today`;
    } else if (years > 0) {
        return `${years} year${years > 1 ? 's' : ''} ago`;
    } else if (months > 0) {
        return `${months} month${months > 1 ? 's' : ''} ago`;
    } else if (weeks > 0) {
        return weeks === 1 ? 'Last week' : `${weeks} weeks ago`;
    } else {
        return days <= 1 ? 'Yesterday' : `${days} days ago`;
    }
}
async function addTask() {

    console.log("[addTask] Creating popup")
    let popupDiv = document.querySelector('.popup');
    let fullscreenDiv = document.querySelector('.fullscreen');
    popupDiv.innerHTML = `
        <dialog open class='popupDialog' id="add-task-popup">
            <div class="popup-title">
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
            <div class="manhours-row">
                <div class="manhours-label">
                    Expected man hours
                </div>
                <div id="man-hours-and-minutes">
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
                        <div class="manhours-label">
                            Hours
                        </div>
                    </div>

                    <div class="number-picker" id="expected-man-minutes">
                        <div class="number-picker" id="expected-man-minutes">
                            <div class="dropdown" id="manhours-minutes-dropdown" tabindex="0">
                                <div class="dropdown-text">
                                    0
                                </div>
                                <div class="dropdown-chevron">
                                    <span class="material-symbols-rounded">
                                        expand_more
                                    </span>
                                </div>
                                <div class="dropdown-menu">
                                    <div class="dropdown-option" id="manhours-minutes0">0</div>
                                    <div class="dropdown-option" id="manhours-minutes15">15</div>
                                    <div class="dropdown-option" id="manhours-minutes30">30</div>
                                    <div class="dropdown-option" id="manhours-minutes45">45</div>
                                </div>
                            </div>
                            <div class="manhours-label">
                                Minutes
                            </div>
                        </div>
                    </div>
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
                <div class="text-button blue" id="create-button">
                    <div class="button-text">
                        Create
                    </div>
                </div>
            </div>
        </dialog>
    `;

    let manhoursMinutesDropdown = document.querySelector("#manhours-minutes-dropdown")
    let manhoursMinutes0 = document.querySelector("#manhours-minutes0")
    let manhoursMinutes15 = document.querySelector("#manhours-minutes15")
    let manhoursMinutes30 = document.querySelector("#manhours-minutes30")
    let manhoursMinutes45 = document.querySelector("#manhours-minutes45")

    manhoursMinutesDropdown.addEventListener("click", function() {
        this.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
        if (!manhoursMinutesDropdown.contains(e.target)) {
            manhoursMinutesDropdown.classList.remove("open")
        }
    });
    
    manhoursMinutes0.addEventListener("click", () => {
        manhoursMinutesDropdown.querySelector(".dropdown-text").innerText = "0";
    })
    manhoursMinutes15.addEventListener("click", () => {
        manhoursMinutesDropdown.querySelector(".dropdown-text").innerText = "15";
    })
    manhoursMinutes30.addEventListener("click", () => {
        manhoursMinutesDropdown.querySelector(".dropdown-text").innerText = "30";
    })
    manhoursMinutes45.addEventListener("click", () => {
        manhoursMinutesDropdown.querySelector(".dropdown-text").innerText = "45";
    })

    //quill for description
    var quill = new Quill('#description-editor', {
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                ['code-block']
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

    let employeeMap = new Map();

    const searchEmployees = async (q) => {
        let res = await get_api(`/employee/employee.php/all?q=${q}`);
        let employeeList = res.data.employees;
        console.log(employeeList)
        empList.innerHTML = "";
        employeeList.forEach((emp) => {
            let emp_name = global.employeeToName(emp);
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
        employeeList.forEach((emp) => {
            employeeMap.set(emp.empID, emp);
        });

        // add event listeners to employee list
        let employeeListOptions = empList.querySelectorAll(".name-card");
        employeeListOptions.forEach((option) => {
            option.addEventListener("click", () => {

                let empID = option.getAttribute("data-id");

                if (!assignedEmployees.has(empID)) {

                    option.classList.add('selected');
                    option.querySelector('.icon').innerHTML = "check";

                    assignedEmployees.add(empID);

                } else {

                    option.classList.remove('selected');
                    option.querySelector('.icon').innerHTML = "person_add";
                    assignedEmployees.delete(empID);

                }

                updateAssignedEmployees(assignedEmployeesDiv, assignedEmployees, employeeMap);

            })
        })
        
    }

    popupDiv.querySelector(".search").addEventListener("input", (e) => {
        searchEmployees(e.target.value);
    });

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
        let expectedManHours = parseInt(numberPickerInput.value, 10) * 3600;
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
        let emp_name = global.employeeToName(emp);
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
    button.addEventListener("pointerup", async () => {
        if (button.id == "notstarted-add") {
            await addTask();
        } else {
            console.error("invalid state");
        }

    });
});


listAddRow.addEventListener("click", async () => {
    await addTask();
});

let boardAddTaskButton = document.getElementById("add-task-button");
boardAddTaskButton.addEventListener("click", async () => {
    await addTask();
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
        button.addEventListener("pointerup", (event) => {
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
    let taskID = explainerTaskContainer.getAttribute("task-id");
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



async function addProject() {
    

    console.log("[addproject] Creating popup")
    let popupDiv = document.querySelector('.popup');
    console.log(popupDiv)
    let fullscreenDiv = document.querySelector('.fullscreen');
    console.log("[addproject] before popup")
    popupDiv.innerHTML = `
        <dialog open class='popupDialog' id="add-project-popup">
            <div class="popup-title">
            <span>Create project</span>
            <div class="small-icon" id="close-button">
                <span class="material-symbols-rounded">
                    close
                </span>
            </div>
            </div>
            <input type="text" placeholder="project title" class="add-project-title-input">
            
            <div class="add-project-description-container">
                <div id="description-editor"></div>
            </div>
            <div class="dropdown-and-employee-list">
                <div class="search-dropdown" id="employee-select" tabindex="0">
                    <div class="search">
                        <input class="search-input" type="text" autocomplete="off" placeholder="Choose Team Leader">
            
                        
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
                <div class="team-leader-selection">
                
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
                <div class="text-button blue" id="create-button">
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

    let teamLeader; //teamLeader id
    let teamLeaderDiv = popupDiv.querySelector('.team-leader-selection');

    let empList = popupDiv.querySelector('#employee-select > .popover > .employee-list'); //this is crazy it should change later
    let res = await get_api(`/employee/employee.php/all`);
    let employeeList = res.data.employees;
    employeeList.forEach((emp) => {
        let emp_name = global.employeeToName(emp);
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
        option.addEventListener("pointerup", () => {
            let empID = option.getAttribute("data-id");
            teamLeader = empID;
            teamLeaderDiv.innerHTML = `
                <div class="name-card">
                    <img src="${global.employeeAvatarOrFallback(employeeMap.get(empID))}" class="avatar">
                    <span>${global.employeeToName(employeeMap.get(empID))}</span>
                </div>
            `;
        })
    })


    console.log(popupDiv.innerHTML)
    console.log("[addproject] after popup")
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
        console.log("[addprojectCloseButton] rejecting")
    });

    discardButton.addEventListener('click', (event) => {
        event.preventDefault(); 
        dialog.style.transform = 'translateY(-1%)'
        dialog.style.opacity = '0';
        dialog.style.display = 'none';
        fullscreenDiv.style.filter = 'none';
        console.log("[addprojectDiscardButton] rejecting")
    });

    dialog.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            dialog.style.transform = 'translateY(-1%)'
            dialog.style.opacity = '0';
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            console.log("[addprojectEscape] rejecting")
        }
    });

    createButton.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        let name = dialog.querySelector('.add-project-title-input').value;
        let description = quill.root.innerHTML;
        let dueDate = fp.selectedDates[0];
        let dueDateTimestamp = dueDate ? dueDate.getTime() : null;
        
        //post the project
        let res = await post_api(
            `/project/project.php/project`,
            {
                name: name,
                description: description,
                dueDate: dueDateTimestamp,
                teamLeader: teamLeader,
            }
        );

        if (res.success) {
            dialog.style.transform = 'translateY(-1%)'
            dialog.style.opacity = '0';
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            console.log("[addprojectCreateButton] resolving")
            let newProject = res.data;
            await projectObjectRenderAndListeners(newProject);
        } else {
            let error = `${res.error.message} (${res.error.code})`
            console.log("Error creating new project: " + error);   
        }
    })



}

async function projectObjectRenderAndListeners(project) {
    console.log("[projectObjectRenderAndListeners] rendering project: ", project.projID, project.name);
    let session = await global.getCurrentSession();
    let isTeamLeader = (project.teamLeader.empID === session.employee.empID);
    let emps = await global.getEmployeesById([project.teamLeader.empID, project.createdBy.empID]);
    let teamLeader = emps.get(project.teamLeader.empID);


    let teamLeaderName = global.employeeToName(teamLeader);
    let element = renderProject(project.projID, project.name, project.description, teamLeader, isTeamLeader, project.createdAt, project.lastAccessed);

    calculateTaskCount();
    element.data = project;
    return element;
}

let createProjectButton = document.querySelector("#new-project");
createProjectButton.addEventListener("pointerup", async () => {
        console.log("[addProjectButtonClick] add project button clicked")
        await addProject();

    }
);

async function editTaskPopup(task){
    console.log("[editTaskPopup] Running editTaskPopup")
    let popupDiv = document.querySelector('.popup');
    let fullscreenDiv = document.querySelector('.fullscreen');
    popupDiv.innerHTML = `
        <dialog open class='popupDialog' id="add-task-popup">
            <div class="popup-title">
            <span>Edit Task</span>
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
            <div class="manhours-row">
                <div class="manhours-label">
                    Expected Manhours:
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
                <div class="text-button blue" id="create-button">
                    <div class="button-text">
                        Save
                    </div>
                </div>
            </div>
        </dialog>
    `;

    //quill for description
    var quill = new Quill('#description-editor', {
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                ['code-block']
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
        let emp_name = global.employeeToName(emp);
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

            if (!assignedEmployees.has(empID)) {

                option.classList.add('selected');
                option.querySelector('.icon').innerHTML = "check";

                assignedEmployees.add(empID);

            } else {

                option.classList.remove('selected');
                option.querySelector('.icon').innerHTML = "person_add";
                assignedEmployees.delete(empID);

            }

            updateAssignedEmployees(assignedEmployeesDiv, assignedEmployees, employeeMap);

        })
    })

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

}




async function projectPopup(id){
    console.log(`[projectPopup] Running editTaskPopup`)
    let popupDiv = document.querySelector('.popup');
    let fullscreenDiv = document.querySelector('.fullscreen');

    let projectData = await get_api(`/project/project.php/project/${id}`);

    let project = projectData.data;

    // let teamLeader = global.employeeAvatarOrFallback(project.teamLeader);



    popupDiv.innerHTML = `
        <dialog open class='popupDialog' id="add-task-popup">
            <div class="popup-title">
            <span>${project.name}</span>
            <div class="small-icon" id="close-button">
                <span class="material-symbols-rounded">
                    close
                </span>
            </div>
            </div>
            <input type="text" placeholder="${project.name}" class="add-task-title-input">
            
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
                    ${teamLeader}
                </div>
            </div>

            <div class="date-picker" id="due-date">
                <div class="date-picker-icon">
                    <span class="material-symbols-rounded">event</span>
                </div>
                <input class="date-picker-input" type="text" placeholder="${project.dueDate}" tabindex="0"></input>
            </div>
            <div class="confirm-buttons-row">
                <div class="text-button" id="close-button-bottom">
                    <div class="button-text">
                        Close
                    </div>
                </div>
                <div class="text-button blue" id="save-button">
                    <div class="button-text">
                        Save
                    </div>
                </div>
            </div>
        </dialog>
    `;

    //quill for description
    var quill = new Quill('#description-editor', {
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                ['code-block']
            ]
        },
        theme: 'snow'
    });

    quill.setText(`${project.description}`)

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
        let emp_name = global.employeeToName(emp);
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

            if (!assignedEmployees.has(empID)) {

                option.classList.add('selected');
                option.querySelector('.icon').innerHTML = "check";

                assignedEmployees.add(empID);

            } else {

                option.classList.remove('selected');
                option.querySelector('.icon').innerHTML = "person_add";
                assignedEmployees.delete(empID);

            }

            updateAssignedEmployees(assignedEmployeesDiv, assignedEmployees, employeeMap);

        })
    })

    fullscreenDiv.style.filter = 'brightness(0.75)';
    let dialog = popupDiv.querySelector('.popupDialog');
    dialog.style.transform = 'translateY(0px)'
    dialog.style.opacity = '1';
    
    let saveButton = dialog.querySelector('#save-button');
    let closeButton = dialog.querySelector('#close-button');
    let closeButtonBottom = dialog.querySelector('#close-button-bottom');

    closeButton.addEventListener('click', (event) => {
        event.preventDefault(); 
        dialog.style.transform = 'translateY(-1%)'
        dialog.style.opacity = '0';
        dialog.style.display = 'none';
        
        
        fullscreenDiv.style.filter = 'none';
        console.log("[addTaskCloseButton] rejecting")
    });

    closeButtonBottom.addEventListener('click', (event) => {
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

}


document.querySelector(".edit-button").addEventListener("pointerup", async () => {
    let taskID = explainerTaskContainer.getAttribute("task-id");
    //get task from globalTasksList
    console.log(globalTasksList)
    let task = globalTasksList.find((task) => task.taskID == taskID);

    console.log("[editButtonClick] edit button clicked");
    console.log(task)
    await editTaskPopup(task);
});


const projectSearchRollingTimeout = new global.ReusableRollingTimeout(
    () => {
        let search = projectSearchInput.value;
        console.log("[RollingProjectSearch] starting search for", search);
        searchAndRenderProjects(projectSearchInput.value, sortAttribute, sortDirection, pageLimit, currentPage);
    },
    150
);
projectSearchInput.addEventListener("input", (e) => {
    projectSearchRollingTimeout.roll();
})

document.getElementById("task-search").addEventListener("input", (e) => {
    sleep(10).then(() => {
        searchAndRenderTasks()
    })
})


document.getElementById("delete-project-search").addEventListener("pointerup", () => {
    searchAndRenderProjects(projectSearchInput.value = "", sortAttribute, sortDirection, pageLimit, currentPage);
    startOrRollProjectSearchTimeout();

})

document.getElementById("delete-task-search").addEventListener("pointerup", () => {
    taskSearchInput.value = "";
    searchAndRenderTasks()
})

const sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

lastAccessedButton.addEventListener('click', function(event) {
    if (event.button === 0) {
        searchAndRenderProjects(projectSearchInput.value, sortAttribute, sortDirection, pageLimit, currentPage);
    }
    let projectTableHeaders = document.querySelectorAll("#projects-table > thead > tr > th");
    projectTableHeaders.forEach((header) => {
        header.classList.remove("sorting-by", "reverse");
    });
});


pageBackButton.addEventListener('click', function() {
    if (currentPage > 1) {
        currentPage--;
        pageBackButton.classList.remove('disabled');
        pageNumberElement.textContent = currentPage;
        searchAndRenderProjects(projectSearchInput.value, sortAttribute, sortDirection, pageLimit, currentPage);
        console.log(`[pageBackButton] currentPage: ${currentPage}`);
    }
    if (currentPage === 1) {
        pageBackButton.classList.add('disabled');
    } else {
        pageBackButton.classList.remove('disabled');
    }
    pageForwardButton.classList.remove('disabled');
});

pageForwardButton.addEventListener('click', async function() {
    const data = await get_api(`/project/project.php/projects?q=${projectSearchInput.value}&sort_by=${sortAttribute}&sort_direction=${sortDirection}&limit=${pageLimit}&page=${currentPage + 1}`);
    if (data.data.projects.length !== 0) {
        pageBackButton.classList.remove('disabled');
        currentPage++;
        pageNumberElement.textContent = currentPage;
        searchAndRenderProjects(projectSearchInput.value, sortAttribute, sortDirection, pageLimit, currentPage);
        console.log(`[pageForwardButton] currentPage: ${currentPage}`);
        const nextData = await get_api(`/project/project.php/projects?q=${projectSearchInput.value}&sort_by=${sortAttribute}&sort_direction=${sortDirection}&limit=${pageLimit}&page=${currentPage + 1}`);
    }
    await checkNextPage();
});

async function checkNextPage() {
    const nextData = await get_api(`/project/project.php/projects?q=${projectSearchInput.value}&sort_by=${sortAttribute}&sort_direction=${sortDirection}&limit=${pageLimit}&page=${currentPage + 1}`);
    if (nextData.data.projects.length === 0) {
        pageForwardButton.classList.add('disabled');
    } else {
        pageForwardButton.classList.remove('disabled');
    }
}

async function searchAndRenderProjects(search, sortAttribute = 'lastAccessed', sortDirection = 'asc',pageLimit = 10, currentPage = 1) {
    console.log(`Sorting by ${sortAttribute} in ${sortDirection} order`);
    const data = await get_api(`/project/project.php/projects?q=${search}&sort_by=${sortAttribute}&sort_direction=${sortDirection}&limit=${pageLimit}&page=${currentPage}`);
    console.log(`[searchAndRenderProjects(${sortDirection})] sort Direction`);
    console.log(`[searchAndRenderProjects(${search})] fetched projects`);
    console.log(`[searchAndRenderProjects(${sortAttribute})] sortattribute`);
    console.log(`[searchAndRenderProjects(${currentPage})] page`);
    console.log(`[searchAndRenderProjects(${pageLimit})] limit`);
    console.log(data);
    console.log('.project-row.selected');

    if (data.success !== true) {
        return;
    }
    
    clearProjectList();
    console.log("[searchAndRenderAllProjects] projects have been fetched successfully");
    await Promise.all(data.data.projects.map(async (project) => {
        await projectObjectRenderAndListeners(project);
    }));
    
    return data.data.projects;
}


async function searchTasks(query) {
    let tasks = globalTasksList;
    let filteredTasks = [];
    let search = query.toLowerCase();
    tasks.forEach((task) => {
        let title = task.title.toLowerCase();
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
    console.log("[renderTasksFromSearch] filtered tasks");
    clearRenderedTasks()
    renderTasks(tasks);
}

async function applySortingPreferences() {
    const sortTasksType = await global.preferences.get('sortTasksType');
    const sortTasksDirection = await global.preferences.get('sortTasksDirection');

    return { sortTasksType, sortTasksDirection };
}

// const projectRows = document.querySelectorAll('.project-row');

// projectRows.forEach(row => {
//     row.addEventListener('click', async () => {
//         const { sortTasksType, sortTasksDirection } = await applySortingPreferences();

//         const typeToIdMap = {
//             'By Name': 'name-column',
//             'By Title': 'title-column',
//             'By Date': 'date-column'
//         };

//         const elementId = typeToIdMap[sortTasksType];
//         const element = document.getElementById(elementId);

//         if (element) {
//             element.classList.add('sorting-by');

//             if (sortTasksDirection === 'Ascending') {
//                 element.classList.add('asc');
//             } else if (sortTasksDirection === 'Descending') {
//                 element.classList.add('desc');
//             }
//         }
//     });
// });

projectsPerPageDropdown.addEventListener("click", () => {
    projectsPerPageDropdown.classList.toggle("open")
})

document.addEventListener("click", (e) => {
    if (!projectsPerPageDropdown.contains(e.target)) {
        projectsPerPageDropdown.classList.remove("open")
    }
});

view10.addEventListener("click", () => {
    projectsPerPageDropdown.querySelector(".dropdown-text").innerText = "10";
    pageLimit = 10;
    searchAndRenderProjects(projectSearchInput.value, sortAttribute, sortDirection, pageLimit, currentPage);
    console.log(`[view10] limit: ${pageLimit}`);
})

view25.addEventListener("click", () => {
    projectsPerPageDropdown.querySelector(".dropdown-text").innerText = "25";
    pageLimit = 25;
    searchAndRenderProjects(projectSearchInput.value, sortAttribute, sortDirection, pageLimit, currentPage);
    console.log(`[view25] limit: ${pageLimit}`);
})

view50.addEventListener("click", () => {
    projectsPerPageDropdown.querySelector(".dropdown-text").innerText = "50";
    pageLimit = 50;
    searchAndRenderProjects(projectSearchInput.value, sortAttribute, sortDirection, pageLimit, currentPage);
    console.log(`[view50] limit: ${pageLimit}`);
})

view100.addEventListener("click", () => {
    projectsPerPageDropdown.querySelector(".dropdown-text").innerText = "100";
    pageLimit = 100;
    searchAndRenderProjects(projectSearchInput.value, sortAttribute, sortDirection, pageLimit, currentPage);
    console.log(`[view100] limit: ${pageLimit}`);
})

async function getProjectPreferences() {
    try {
        const prefSort = await global.preferences.get('projectSort');
        const prefDirection = await global.preferences.get('projectOrder');
        const attributeSearch = prefSort.or_default();
        const sortDirection = prefDirection.or_default();

        let sortColumn = document.querySelector(`[data-attribute="${attributeSearch}"]`);
        sortColumn.classList.add('sorting-by');
        if (sortDirection === 'asc') {
            sortColumn.classList.add('asc');
        } else {
            sortColumn.classList.add('desc');
        }


        console.log(`[SET DEFAULT PREFERENCES] - projectSort: ${projectSort}`);
        console.log(`[SET DEFAULT PREFERENCES] - projectOrder: ${projectOrder}`);
    } catch (error) {
        console.error(`Failed to get preferences: ${error}`);
    }
}

getProjectPreferences();