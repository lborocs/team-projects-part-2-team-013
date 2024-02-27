/* global Chart */
import * as global from "../global-ui.js"
import { animate } from "../global-ui.js"
import * as training from "./training.js"
import * as project from "./project.js"

console.log("loaded client.js")

const dashboardContainer = document.querySelector(".dashboard-container")
const gridExpand = document.querySelector("#grid-expand")
const gridShrink = document.querySelector("#grid-shrink")
const gridUndo = document.querySelector("#grid-undo")
const viewScroll = document.querySelector("#view-scroll")
const viewFit = document.querySelector("#view-fit")
const addMetricButton = document.querySelector(".metric-card.add-metric")
const addMetricButtonSmall = document.querySelector("#add-metric-small")
const viewWeek = document.querySelector("#view-week")
const viewMonth = document.querySelector("#view-month")
const viewAll = document.querySelector("#view-all")
const backToProject = document.querySelector("#back-to-project")


let gridActionsQueue = []



window.addEventListener("breadcrumbnavigate", async (event) => {
    console.log("[breadcrumbnavigate] event received" + event.locations);
    await renderFromBreadcrumb(event.locations);
});

const projectID = window.location.hash.substring(1);
var projectData;
var trainingData;
if (projectID !== "") {
    console.log("[client.js] projectID: ", projectID);
    projectData = await project.init(projectID);
    global.setBreadcrumb(["Manager's Dashboard", projectData.project.name], ["/dashboard/", "/dashboard/#" + projectData.project.projID]);
    backToProject.href = `/projects/#${projectData.project.projID}/`;

} else {
    console.log("[client.js] training dashboard");
    trainingData = training.init();
    global.setBreadcrumb(["Manager's Dashboard"], ["/dashboard/"]);
}




//chartjs styling
Chart.defaults.font.family = 'system-ui';
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
Chart.defaults.animations = true;






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







