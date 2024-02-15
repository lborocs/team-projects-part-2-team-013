/* global Chart */
import * as global from "../global-ui.js"
import { animate } from "../global-ui.js"
console.log("loaded client.js")

const dashboardContainer = document.querySelector(".dashboard-container")
const gridExpand = document.querySelector("#grid-expand")
const gridShrink = document.querySelector("#grid-shrink")
const gridUndo = document.querySelector("#grid-undo")
const viewScroll = document.querySelector("#view-scroll")
const viewFit = document.querySelector("#view-fit")
const addMetricButton = document.querySelector(".metric-card.add-metric")
const addMetricButtonSmall = document.querySelector("#add-metric-small")
const dashboardTimePeriod = document.querySelector("#dashboard-time-period")
const viewWeek = document.querySelector("#view-week")
const viewMonth = document.querySelector("#view-month")
const viewAll = document.querySelector("#view-all")

let gridActionsQueue = []



window.addEventListener("breadcrumbnavigate", async (event) => {
    console.log("[breadcrumbnavigate] event received" + event.locations);
    await renderFromBreadcrumb(event.locations);
});

const projectID = window.location.hash.substring(1);
var projectData;
if (projectID !== "") {
    console.log("[client.js] projectID: ", projectID);
    projectData = await getProjectData(projectID);
    global.setBreadcrumb(["Manager's Dashboard", projectData.project.name], ["/dashboard/", "/dashboard/#" + projectData.project.projID]);
} else {
    emptyDashboard()
}


class Dashboard {
    constructor() {
        //maps screen width to default column count
        this.defaultNs = {
            0: 1,
            1600: 2,
            2000: 3,
            2500: 4,
            3200: 5
        }

        let screenWidth = window.innerWidth
        let n = this.defaultNs[0]
        for (let key in this.defaultNs) {
            if (screenWidth >= key) {
                n = this.defaultNs[key]
            }
        }

        this.n = n
        this.changeColumns(n)

        this.minCellWidth = 400
        this.cellWidth = dashboardContainer.clientWidth / n
        //turns out you cant use .resize() on anything other than the window
        //this looks like java.
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {      
                if (entry.contentBoxSize) {
                    let isTooSmall = this.detectWontFit(this.n)
                    if (isTooSmall) {
                        this.decreaseColumns()
                    }
                    //if column width is > 900px, add a new column
                    if (this.cellWidth > 900) {
                        this.increaseColumns()
                    }
                }
            }
        })
        resizeObserver.observe(dashboardContainer)
    }

    changeColumns(n) {
        let items = dashboardContainer.children.length;
        let rows = Math.ceil(items / n);
        if (dashboardContainer.classList.contains('fit-screen')) {
            dashboardContainer.style.gridTemplateColumns = `repeat(${n}, 1fr)`
            dashboardContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`
        } else {
            dashboardContainer.style.gridTemplateColumns = `repeat(${n}, 1fr)`
            dashboardContainer.style.gridTemplateRows = `repeat(${rows}, ${this.cellWidth}px)`
        }
        Array.from(dashboardContainer.children).forEach((child, index) => {
            child.querySelector("canvas")?.style.setProperty("width", "100%")
        })
    }

    detectWontFit(n) {
        if (dashboardContainer.classList.contains('fit-screen')) {
            return false;
        }

        this.cellWidth = dashboardContainer.clientWidth / n;
        if (this.cellWidth < this.minCellWidth) {
            console.log(`Warning: ${n} columns will not fit in the dashboard-container.`);
            return true;
        }
        return false;
    }

    increaseColumns() {
        let newN = this.n + 1
        if (this.detectWontFit(newN)) {
            console.log("Cannot increase columns any further.")
            return
        } else {
            this.n = newN
            this.changeColumns(newN)
        }
    }

    decreaseColumns() {
        let newN = this.n - 1
        if (newN < 1) {
            console.log("Cannot decrease columns any further.")
            return
        } else {
            this.n = newN
            this.changeColumns(newN)
        }
    }

    resetColumns() {
        this.changeColumns(this.n = 2)
    }
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

function emptyDashboard() {
    dashboardContainer.classList.add("empty");
    dashboardContainer.innerHTML = `
        <div class="empty-dashboard">
            <div class="empty-dashboard-icon">
                <span class="material-symbols-rounded">dashboard</span>
            </div>
            <div class="empty-dashboard-text">
                We couldn't find this project :/
            </div>
        </div>
    `;
}


//chartjs styling
Chart.defaults.font.family = 'Open Sans, sans-serif';
Chart.defaults.font.size = 14;
Chart.defaults.font.style = 'normal';
Chart.defaults.font.weight = 'normal';
Chart.defaults.color = '#666';
Chart.defaults.plugins.legend.position = 'bottom';
Chart.defaults.plugins.tooltip.animation.duration = 100;
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.animation.duration = 0;
Chart.defaults.animations.x = false;
Chart.defaults.animations.y = false;
Chart.defaults.animations = false;



let charts = [];


const completionData = await getTaskCompletion(projectData);

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



const tasksPerEmployeeData = await getTasksPerEmployee(projectData);

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

const workloadData = await getManHoursPerEmployee(projectData);

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



async function addMetric() {
    let popupDiv = document.querySelector('.popup');
    let fullscreenDiv = document.querySelector('.fullscreen');

    popupDiv.innerHTML = `
        <dialog open class='popupDialog' id="add-metric-window">
            <div class="popup-title">
                <span>Choose a metric</span>
                <div class="small-icon" id="close-button">
                    <span class="material-symbols-rounded">close</span>
                </div>
            </div>
            <div class="metric-picker">
                <div class="categories">
                    <div class="text-button category selected">
                        <div class="button-text">
                            All
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="text-button category">
                        <div class="button-text">
                            Project Progress
                        </div>
                    </div>
                    <div class="text-button category">
                        <div class="button-text">
                            Employee Workload
                        </div>
                    </div>
                    <div class="text-button category">
                        <div class="button-text">
                            Time Based Metrics
                        </div>
                    </div>
                </div>

                <div class="split-area">
                    <div class="metrics-container">
                        <div class="metric">
                            <div class="small-icon">
                                <span class="material-symbols-rounded">
                                    pie_chart
                                </span>
                            </div>
                            <div class="title">
                                Completion
                            </div>
                        </div>

                        <div class="metric">
                            <div class="small-icon">
                                <span class="material-symbols-rounded">
                                    stacked_bar_chart
                                </span>
                            </div>
                            <div class="title">
                                Employee Workload
                            </div>
                        </div>

                        <div class="metric">
                            <div class="small-icon">
                                <span class="material-symbols-rounded">
                                    bar_chart
                                </span>
                            </div>
                            <div class="title">
                                Man Hours per Project
                            </div>
                        </div>

                        <div class="metric">
                            <div class="small-icon">
                                <span class="material-symbols-rounded">
                                    data_table
                                </span>
                            </div>
                            <div class="title">
                                Task List
                            </div>
                        </div>

                        <div class="metric">
                            <div class="small-icon">
                                <span class="material-symbols-rounded">
                                    grouped_bar_chart
                                </span>
                            </div>
                            <div class="title">
                                Employee Workload
                            </div>
                        </div>

                        <div class="metric selected">
                            <div class="small-icon">
                                <span class="material-symbols-rounded">
                                    stacked_line_chart
                                </span>
                            </div>
                            <div class="title">
                                Expected vs Actual Man Hours
                            </div>
                        </div>

                        <div class="metric">
                            <div class="small-icon">
                                <span class="material-symbols-rounded">
                                    query_stats
                                </span>
                            </div>
                            <div class="title">
                                Search Stats
                            </div>
                        </div>
                    </div>
                    <div class="metric-preview">
                        <div class="metric-title">
                            Expected vs Actual Man Hours
                        </div>
                        <div class="metric-preview-chart">
                            <canvas id="metric-preview-chart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            <div class="text-button blue" id="add-button">
                <div class="button-text">
                    Add Metric
                </div>
            </div>
        </dialog>`

    fullscreenDiv.style.filter = 'brightness(0.75)';

    let dialog = popupDiv.querySelector('.popupDialog');
    dialog.style.transform = 'translateY(0px)'
    dialog.style.opacity = '1';

    //preview chart
    let metricPreviewCanvas = document.getElementById("metric-preview-chart")
    let metricPreviewChart = new Chart(metricPreviewCanvas, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
            datasets: [{
                label: 'Expected Man Hours',
                data: [40, 50, 45, 60, 55],
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }, {
                label: 'Actual Man Hours',
                data: [35, 55, 40, 65, 50],
                fill: false,
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1
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
    });

    let categories = dialog.querySelectorAll('.category')
    categories.forEach(category => {
        category.addEventListener('click', (event) => {
            categories.forEach(category => {
                category.classList.remove('selected')
            })
            category.classList.add('selected')
        })
    })

    let metrics = dialog.querySelectorAll('.metric')
    metrics.forEach(metric => {
        metric.addEventListener('click', (event) => {
            metrics.forEach(metric => {
                metric.classList.remove('selected')
            })
            metric.classList.add('selected')
        })
    })
    
    let addButton = dialog.querySelector('#add-button');
    let closeButton = dialog.querySelector('#close-button');

    addButton.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        dialog.style.transform = 'translateY(-1%)'
        dialog.style.opacity = '0';
        dialog.style.display = 'none';
        fullscreenDiv.style.filter = 'none';
        console.log("[addTaskCreateButton] resolving")
    })

    closeButton.addEventListener('click', (event) => {
        event.preventDefault(); 
        dialog.style.transform = 'translateY(-1%)'
        dialog.style.opacity = '0';
        dialog.style.display = 'none';
        fullscreenDiv.style.filter = 'none';
        console.log("[addTaskCloseButton] rejecting")
    });
}



const dashboard = new Dashboard()

gridExpand.addEventListener("click", () => {
    dashboard.increaseColumns()
    gridUndo.classList.remove("disabled")
    gridActionsQueue.push("increase")
})

gridShrink.addEventListener("click", () => {
    dashboard.decreaseColumns()
    gridUndo.classList.remove("disabled")
    gridActionsQueue.push("decrease")

})

gridUndo.addEventListener("click", () => {
    dashboard.resetColumns()
    gridUndo.classList.add("disabled")
})

viewScroll.addEventListener("click", () => {
    viewFit.classList.toggle("norender")
    viewScroll.classList.toggle("norender")
    dashboardContainer.classList.toggle("fit-screen")
    dashboard.changeColumns(dashboard.n)
    gridUndo.classList.remove("disabled")
})

viewFit.addEventListener("click", () => {
    viewFit.classList.toggle("norender")
    viewScroll.classList.toggle("norender")
    dashboardContainer.classList.toggle("fit-screen")
    dashboard.changeColumns(dashboard.n)
    gridUndo.classList.remove("disabled")
})

addMetricButton.addEventListener("click", () => {
    addMetric()
})

addMetricButtonSmall.addEventListener("click", () => {
    addMetric()
})


dashboardTimePeriod.addEventListener("click", () => {
    dashboardTimePeriod.classList.toggle("open")
})

document.addEventListener("click", (e) => {
    if (!dashboardTimePeriod.contains(e.target)) {
        dashboardTimePeriod.classList.remove("open")
    }
});

viewWeek.addEventListener("click", () => {
    dashboardTimePeriod.querySelector(".dropdown-text").innerText = "Last 7 Days";
})
viewMonth.addEventListener("click", () => {
    dashboardTimePeriod.querySelector(".dropdown-text").innerText = "Last 30 Days";
})
viewAll.addEventListener("click", () => {
    dashboardTimePeriod.querySelector(".dropdown-text").innerText = "All Time";
})