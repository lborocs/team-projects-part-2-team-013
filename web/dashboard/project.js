export var charts = [];

export var projectData = null;
export var completionData = null;
export var tasksPerEmployeeData = null;
export var workloadData = null;





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

    tasksPerEmployeeData = await getTasksPerEmployee(projectData);

    workloadData = await getManHoursPerEmployee(projectData);


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
    
    
    
    charts.push(new Chart(document.getElementById("manHoursChart"), {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'],
            datasets: [{
                label: 'Expected Man Hours',
                data: [40, 50, 45, 60, 55, 54, 60],
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.15
            }, {
                label: 'Actual Man Hours',
                data: [36, 48, 46, 65, 53, 60, 73],
                fill: false,
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.15
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: false
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
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
    //still example data at this point
    let startData = Array.from({length: 20}, (_, i) => i + Math.floor(Math.random() * 3) - 1);
    let durationData = Array.from({length: 20}, () => Math.floor(Math.random() * 10) + 1);
    let overdueData = Array.from({length: 20}, () => Math.floor(Math.random() * 5));
    
    charts.push(new Chart(document.getElementById("taskProgressChart"), {
        type: 'bar',
        data: {
            labels: ['Task A', 'Task B', 'Task C', 'Task D', 'Task E', 'Task F', 'Task G', 'Task H', 'Task I', 'Task J', 'Task K', 'Task L', 'Task M', 'Task N', 'Task O', 'Task P', 'Task Q', 'Task R', 'Task S', 'Task T'],
            datasets: [
                {
                    label: 'Start',
                    data: startData,
                    backgroundColor: 'transparent'
                },
                {
                    label: 'Duration',
                    data: durationData,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)'
                },
                {
                    label: 'Overdue',
                    data: overdueData,
                    backgroundColor: 'rgba(255, 0, 0, 0.5)'
                }
            ]
        },
        options: {
            indexAxis: 'y',
            scales: {
                x: {
                    stacked: true,
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
                            if (context.dataset.label === 'Duration') {
                                return `Duration: ${context.raw} days`;
                            } else if (context.dataset.label === 'Overdue') {
                                return `Overdue: ${context.raw} days`;
                            } else {
                                return `Start: Day ${context.raw}`;
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
    
    //still example data at this point
    charts.push(new Chart(document.getElementById("timeBudgetChart"), {
        type: 'doughnut',
        data: {
            datasets: [{
    
                data: [60, 40],
                backgroundColor: ['#4caf50', '#e0e0e0'],
            }]
        },
        options: {
            circumference: 180,
            rotation: -90,
            cutout: '80%',
            plugins: {
                tooltip: {
                    enabled: false
                },
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Project is due in 40 days'
                },
                subtitle: {
                    display: true,
                    text: 'Time budget used: 60%'
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
        taskEmpSpent.get(assignment.task.taskID).set(assignment.employee.empID, Math.floor(Math.random() * 3));
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
        <div class="icon-button no-box context-menu">
            <div class="button-icon">
                <span class="material-symbols-rounded">
                    more_horiz
                </span>
            </div>
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
    console.log(assignments)
    tasks.forEach(task => {
        console.log(task)

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







