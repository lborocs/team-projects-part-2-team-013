import * as global from '../global-ui.js';

export var charts = [];

export var projectData = null;
export var completionData = null;
export var tasksPerEmployeeData = null;
export var workloadData = null;
export var archivedData = null;
export var overviewValues = {
    "assignedTasks": 0,
    "completedTasks": 0,
    "overdueTasks": 0,
    "totalManhours": 0
}


const dashboardContainer = document.querySelector(".dashboard-container");
const overviewMetrics = document.querySelectorAll(".overview");


export async function init(id) {

    const trainingElements = document.querySelectorAll(`.training-only`);
    trainingElements.forEach(element => {
        element.classList.add("norender");
    });
    const projectElements = document.querySelectorAll(`.project-only`);
    projectElements.forEach(element => {
        element.classList.remove("norender");
    });

    projectData = await getProjectData(id);

    completionData = await getTaskCompletion(projectData);

    archivedData = await getArchivedTasks(id);

    tasksPerEmployeeData = await getTasksPerEmployee(projectData);

    workloadData = await getManHoursPerEmployee(projectData);

    overviewValues.assignedTasks = projectData.tasks.tasks.length
    overviewValues.completedTasks = completionData.values[2]
    overviewValues.overdueTasks = projectData.tasks.tasks.filter(task => task.dueDate < new Date().getTime() && task.state !== 'completed').length
    overviewValues.totalManhours = 0
    projectData.tasks.tasks.forEach(task => {
        overviewValues.totalManhours += task.expectedManHours / 3600
    });
    console.log("[init] overviewValues: ", overviewValues)

    overviewMetrics.forEach(metric => {

        //the id of each .value element is the same as the id of the metric so we can easily unwrap the object into the UI
        //to add more overviews just add more .overview elements and set their id to a key in the overviewValues object 

        metric.querySelector(".value").innerText = overviewValues[metric.id];

    });


    charts.push(new Chart(document.getElementById("completionChart"), {
        type: 'pie',
        data: {
            labels: completionData.labels,
            datasets: [{
                backgroundColor: ["rgba(245,205,188,0.7)", "rgba(188,219,245,0.7)", "rgba(188,245,188,0.7)"],
                borderColor: ["rgba(245,205,188,1)", "rgba(188,219,245,1)", "rgba(188,245,188,1)"],
                data: completionData.values
            }]
        },
        options: {
            plugins: {
                title: {
                    display: false,
                }
            }
        }
    }));


    charts.push(new Chart(document.getElementById("archivedChart"), {
        type: 'bar',
        data: {
            labels: ['Tasks'],
            datasets: [{
                label: 'Archived',
                data: [archivedData.values[0]],
                backgroundColor: 'rgba(230,230,230,0.7)',
                borderColor: 'rgba(200,200,200, 1)',
                borderWidth: 2
            }, {
                label: 'Active',
                data: [archivedData.values[1]],
                backgroundColor: 'rgba(188,219,245,0.7)',
                borderColor: 'rgba(188,219,245,1)',
                borderWidth: 2
            }]
        },
        options: {
            plugins: {
                title: {
                    display: false,
                },
                legend: {
                    display: true
                }
            },
            scales: {
                x: {
                    display: false,
                    beginAtZero: true,
                    stacked: true
                },
                y: {
                    beginAtZero: true,
                    stacked: true
                }
            }
        }
    }));
    
    
    
    
    
    
    
    charts.push(new Chart(document.getElementById("tasksPerEmployeeChart"), {
        type: 'bar',
        data: {
            labels: tasksPerEmployeeData.labels,
            datasets: [{
                label: "Tasks Per Employee",
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 2,
                data: tasksPerEmployeeData.values
            }]
        },
        options: {
            plugins: {
                title: {
                    display: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: tasksPerEmployeeData.max,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    }));

    const taskProgressData = await getTaskProgress(projectData);
    
    charts.push(new Chart(document.getElementById("taskProgressChart"), {
        type: 'bar',
        data: {
            labels: taskProgressData.labels,
            datasets: [
                {
                    label: 'Start',
                    data: taskProgressData.startData,
                    backgroundColor: 'transparent'
                },
                {
                    label: 'Duration',
                    data: taskProgressData.durationData,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)'
                },
                {
                    label: 'Overdue',
                    data: taskProgressData.overdueData,
                    backgroundColor: 'rgba(255, 0, 0, 0.5)'
                }
            ]
        },
        options: {
            indexAxis: 'y',
            scales: {
                x: {
                    stacked: true,
                    startData: 0,
                    ticks: {
                        callback: function(value, index) {
                            const tickdate = new Date(taskProgressData.day0 + (index * 24 * 60 * 60 * 1000));
                            return global.formatDate(tickdate);
                        }
                    }
                },
                y: {
                    stacked: true,
                    ticks: {
                        display: false
                    }
                }   
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.label === "Start") {

                                const realDate = new Date(taskProgressData.day0 + (context.parsed.x * 24 * 60 * 60 * 1000));
                                return `${context.dataset.label}: ${global.formatDate(realDate)}`
                            } else {
                                return `${context.dataset.label}: ${context.raw} day${context.raw > 1 ? "s" : ""}`
                            }
                        }
                    },
                    position: 'average',
                },
                title: {
                    display: false,
                }

            }
        }
    }));
    
    
    
    charts.push(new Chart(document.getElementById("workloadChart"), {
        type: 'bar',
        data: {
            labels: workloadData.labels,
            datasets: workloadData.data
        },
        options: {
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    suggestedMax: 12
                }
            },
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: false
                }
            }
        }
    }));
    


    renderTableMetric();
    

    return projectData;
}



async function getProjectData(id) {

    const res = await get_api(`/project/project.php/project/${id}`, {no_track: true});

    const project = res.data;

    console.log("[getProjectData] project: ", project);
    const tasks = await get_api(`/project/task.php/tasks/${project.projID}`, {no_track: true});

    const employees = await global.getEmployeesById(
        tasks.data.assignments.map(assignment => assignment.employee.empID).concat(
            [project.createdBy.empID, project.teamLeader.empID]
        ))

    document.getElementById("project-name").innerText = project.name;

    return {
        project: project,
        tasks: tasks.data,
        employees: employees,
    }
}


async function getTaskCompletion(projectData) {
    let completed = 0;
    let inProgress = 0;
    let toDo = 0;
    projectData.tasks.tasks.forEach(task => {
        switch (task.state) {
            case 0:
                toDo++;
                break;
            case 1:
                inProgress++;
                break;
            case 2:
                completed++;
                break;
        }
    });
    return {
        labels: ["To-do", "In-Progress", "Finished"],
        values:[toDo, inProgress, completed]
    };
}

async function getArchivedTasks(id) {

    const res = await get_api(`/project/task.php/tasks/${id}?archived=1`, {no_track: true});
    let archived = res.data.tasks.length;
    console.error(res)
    let active = projectData.tasks.tasks.length;
    return {
        labels: ["Archived", "Active"],
        values: [archived, active]
    }
}



async function getTasksPerEmployee(projectData) {
    let tasksPerEmployee = {};
    projectData.tasks.assignments.forEach(assignment => {
        if (tasksPerEmployee[assignment.employee.empID] === undefined) {
            tasksPerEmployee[assignment.employee.empID] = 1;
        } else {
            tasksPerEmployee[assignment.employee.empID]++;
        }
    });

    const data = {};

    await Promise.all(Object.keys(tasksPerEmployee).map(async (empID) => {
        const saturated = (await global.getEmployeesById([empID])).get(empID);
        data[global.employeeToName(saturated)] = tasksPerEmployee[empID];
    }));

    // sort by value
    const sorted = Object.fromEntries(
        Object.entries(data).sort(([empA,tasksA],[empB,tasksB]) => tasksB-tasksA)
    );

    return {
        labels: Object.keys(sorted),
        values: Object.values(sorted),
        max: Math.max(...Object.values(sorted)) * 1.5
    };

}

async function getManHoursPerEmployee(projectData) {

    // labels: [emp1 emp2]
    // data: [task1: [emp1 spent, emp2 spent]]

    const taskNameMap = new Map();
    projectData.tasks.tasks.forEach(task => {
        taskNameMap.set(task.taskID, task.title);
    });

    const employees = new Set();
    const taskEmpSpent = new Map();

    projectData.tasks.assignments.forEach(assignment => {
        if (!taskEmpSpent.has(assignment.task.taskID)) {
            taskEmpSpent.set(assignment.task.taskID, new Map());
        }

        employees.add(assignment.employee.empID);
        taskEmpSpent.get(assignment.task.taskID).set(assignment.employee.empID, assignment.manHours / 3600);
    });

    var labels = Array.from(employees);
    var data = [];

    taskEmpSpent.forEach((empSpent, taskID) => {


        const colour = global.hsvToHex(Number("0x" + taskID.substr(-3)) % 360, 40, 90)
        data.push({
            label: taskID,
            data: labels.map((empID) => {return empSpent.get(empID) ?? 0}),
            backgroundColor: `#${colour}7f`,
            borderColor: `#${colour}`,
            borderWidth: 1
        })
    });

    labels = labels.map(empID => {return global.employeeToName(projectData.employees.get(empID))});
    data = data.map((task) => {
        task.label = taskNameMap.get(task.label);
        return task
    });

    console.log("[getManHoursPerEmployee] labels: ", labels);
    console.log("[getManHoursPerEmployee] data: ", data);

    return {
        labels: labels,
        data: data
    };


}

async function getTaskProgress(projectData) {
    let tasks = projectData.tasks.tasks.sort((a, b) => a.createdAt - b.createdAt);
    // get last 12 tasks
    tasks = tasks.slice(-12);

    const labels = tasks.map(task => task.title);
    const startData = [];
    const durationData = [];
    const overdueData = [];
    
    const now = new Date().getTime();

    // get min start date
    const day0 = tasks[0].createdAt;


    tasks.forEach(task => {
        let start;
        let duration;
        let overdue;
        
        start = task.createdAt - day0;


        if (task.completedAt) {
            // completed late
            if (task.completedAt > task.dueDate) {
                duration = start + task.completedAt - task.dueDate;
                overdue = duration + task.completedAt - task.dueDate;
            } else {
                duration = start + task.completedAt - task.dueDate
            }
        } 
        // not completed and overdue
        else if (now > task.dueDate) {
            duration = start + (task.createdAt - task.createdAt)
            overdue = duration + (now - task.dueDate);

        }
        // not completed and not overdue
        else {
            duration = start + (now - task.createdAt);
        }

        start = Math.floor(start / (1000 * 60 * 60 * 24));
        duration = Math.floor(duration / (1000 * 60 * 60 * 24));
        overdue = Math.floor(overdue / (1000 * 60 * 60 * 24));

        startData.push(start);
        durationData.push(duration);
        overdueData.push(overdue);
    });

    return {
        labels: labels,
        startData: startData,
        durationData: durationData,
        overdueData: overdueData,
        day0: day0
    }

}

//the amount of innerHTML here is crazy, will be refactored.
function renderTableMetric() {

    //first makes the card and table header and body
    let metricCard = document.createElement("div");
    metricCard.classList.add("metric-card");
    metricCard.classList.add("non-canvas");

    let metricTitle = document.createElement("div");
    metricTitle.classList.add("metric-title");
    metricTitle.innerHTML = `
        <div class="title-text">
            Task List
        </div>
    `

    let taskList = document.createElement("div");
    taskList.classList.add("task-list");
    let tasksTable = document.createElement("table");
    tasksTable.id = "tasks-table";
    tasksTable.innerHTML = `
        <thead>
            <tr>
                <th>
                    <div class="header-td">
                        <div class="name">
                            Name
                        </div>
                        <div class="icon">
                            <span class="material-symbols-rounded">
                                arrow_drop_down
                            </span>
                        </div>
                    </div>
                </th>
                <th>
                    <div class="header-td">
                        <div class="name">
                            Assignees
                        </div>
                        <div class="icon">
                            <span class="material-symbols-rounded">
                                arrow_drop_down
                            </span>
                        </div>
                    </div>
                </th>
                <th class="status-column">
                    <div class="header-td">
                        <div class="name">
                            Status
                        </div>
                        <div class="icon">
                            <span class="material-symbols-rounded">
                                arrow_drop_down
                            </span>
                        </div>
                    </div>
                </th>
                <th></th>
            </tr>
        </thead>
    `

    let tasksTableBody = document.createElement("tbody");
    tasksTable.appendChild(tasksTableBody);


    //here is where the data actually comes in
    let tasks = projectData.tasks.tasks;
    let assignments = projectData.tasks.assignments;
    tasks.forEach(task => {
        let avatars = "";
        assignments.forEach(assignment => {
            if (assignment.task.taskID === task.taskID) {
                let emp = projectData.employees.get(assignment.employee.empID);
                avatars += `
                    <div class="assignment">
                        <img class="avatar" src="${global.employeeAvatarOrFallback(emp)}" alt="avatar">
                    </div>
                `
            }
        })

        //this could be a function in global-ui.js
        let statusClassName = "";
        let statusIcon = "";
        let statusText = "";
        switch (task.state) {
            case 0:
                statusClassName = "not-started";
                statusIcon = "push_pin";
                statusText = "Not Started";
                break;
            case 1:
                statusClassName = "in-progress";
                statusIcon = "timeline";
                statusText = "In Progress";
                break;
            case 2:
                statusClassName = "finished";
                statusIcon = "check_circle";
                statusText = "Finished";
                break;
        }

        let statusCell = `
            <div class="status-cell">
                <div class="icon">
                    <span class="material-symbols-rounded">
                        ${statusIcon}
                    </span>
                </div>
                <div class="text">
                    ${statusText}
                </div>
            </div>
        `

        let row = document.createElement("tr");
        row.classList.add("task-row");
        row.innerHTML = `
            <td>
                <span class="task-name">
                    ${task.title}
                </span>
            </td>
            <td>
                <div class="task-assignees">
                    ${avatars}
                </div>
            </td>
            <td class=${statusClassName}>
                <div class="${statusClassName}">
                    ${statusCell}
                </div>
            </td>
            <td>
                <div class="icon-button no-box context-menu">
                    <div class="button-icon">
                        <span class="material-symbols-rounded">
                            more_horiz
                        </span>
                    </div>
                </div>
            </td>
        `
        tasksTableBody.appendChild(row);
    })

    metricCard.appendChild(metricTitle);
    taskList.appendChild(tasksTable);
    metricCard.appendChild(taskList);
    dashboardContainer.appendChild(metricCard);

}







