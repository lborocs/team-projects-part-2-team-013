/* global Chart */
import * as global from "../global-ui.js"
import { animate } from "../global-ui.js"
console.log("loaded client.js")

const dashboardContainer = document.querySelector(".dashboard-container")
const gridExpand = document.querySelector("#grid-expand")
const gridShrink = document.querySelector("#grid-shrink")
const gridReset = document.querySelector("#grid-reset")

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
                }
            }
        })
        resizeObserver.observe(dashboardContainer)
    }

    changeColumns(n) {
        dashboardContainer.style.gridTemplateColumns = `repeat(${n}, 1fr)`
    }

    detectWontFit(n) {
        this.cellWidth = dashboardContainer.clientWidth / n
        if (this.cellWidth < this.minCellWidth) {
            console.log(`Warning: ${n} columns will not fit in the dashboard-container.`)
            return true
        }
        return false
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

Chart.defaults.font.family = 'Open Sans, sans-serif';
Chart.defaults.font.size = 14;
Chart.defaults.font.style = 'normal';
Chart.defaults.font.weight = 'normal';
Chart.defaults.color = '#666';
Chart.defaults.plugins.tooltip.animation.duration = 100;
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.animation.duration = 0;


let charts = [];

charts.push(new Chart(document.getElementById("completionChart"), {
    type: 'pie',
    data: {
        labels: ["Completed", "Remaining"],
        datasets: [{
            backgroundColor: ["#3e95cd", "#8e5ea2"],
            data: [60, 10]
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
    type: 'bar',
    data: {
        labels: ["Task 1", "Task 2", "Task 3"],
        datasets: [
            {
                label: "Expected",
                backgroundColor: "#3e95cd",
                data: [12, 19, 3]
            }, {
                label: "Actual",
                backgroundColor: "#8e5ea2",
                data: [10, 17, 5]
            }
        ]
    },
    options: {
        plugins: {
            title: {
                display: false,
            }
        },
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
}));


charts.push(new Chart(document.getElementById("utilizationChart"), {
    type: 'bar',
    data: {
        labels: ["Employee 1", "Employee 2", "Employee 3"],
        datasets: [{
            label: "Utilization Rate (%)",
            backgroundColor: ["#3cba9f", "#e8c3b9", "#c45850"],
            data: [75, 50, 60]
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
                suggestedMax: 100
            }
        }
    }
}));




charts.push(new Chart(document.getElementById("taskProgressChart"), {
    type: 'bar',
    data: {
        labels: ['Task A', 'Task B', 'Task C', 'Task D'],
        datasets: [
            {
                label: 'Start',
                data: [0, 1, 3, 4],
                backgroundColor: 'rgba(255, 99, 132, 0.5)'
            },
            {
                label: 'Duration',
                data: [1, 2, 3, 4],
                backgroundColor: 'rgba(54, 162, 235, 0.5)'
            }
        ]
    },
    options: {
        indexAxis: 'y',
        scales: {
            x: {
                stacked: true,
            }
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        if (context.dataset.label === 'Duration') {
                            return `Duration: ${context.raw} days`;
                        } else {
                            return `Start: Day ${context.raw}`;
                        }
                    }
                }
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
        labels: ['Member A', 'Member B', 'Member C'],
        datasets: [
            {
                label: 'Task A',
                data: [5, 2, 0],
                backgroundColor: 'rgba(255, 99, 132, 0.5)'
            },
            {
                label: 'Task B',
                data: [0, 3, 2],
                backgroundColor: 'rgba(54, 162, 235, 0.5)'
            },
            {
                label: 'Task C',
                data: [3, 0, 4],
                backgroundColor: 'rgba(255, 206, 86, 0.5)'
            },
            {
                label: 'Task D',
                data: [2, 2, 1],
                backgroundColor: 'rgba(75, 192, 192, 0.5)'
            }
        ]
    },
    plugins: {
        title: {
            display: false,
        }
    },
    options: {
        scales: {
            x: {
                stacked: true
            },
            y: {
                stacked: true
            }
        }
    }
}));

charts.push(new Chart(document.getElementById("manHoursProjectsChart"), {
    type: 'bar',
    data: {
        labels: ['Project 1', 'Project 2', 'Project 3', 'Project 4'],
        datasets: [{
            label: 'Total Man Hours',
            data: [120, 200, 150, 220],
            backgroundColor: [
                'rgba(255, 99, 132, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(75, 192, 192, 0.2)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)'
            ],
            borderWidth: 1
        }]
    },
    plugins: {
        title: {
            display: false,
        }
    },
    options: {
        scales: {
            y: {
                beginAtZero: true
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




const dashboard = new Dashboard()

gridExpand.addEventListener("click", () => {
    dashboard.increaseColumns()
})

gridShrink.addEventListener("click", () => {
    dashboard.decreaseColumns()
})

gridReset.addEventListener("click", () => {
    dashboard.resetColumns()
})

// for (let chart of charts) {
//     chart.options.animation.duration = 0
//     chart.update()
//     console.log(chart.options.animation)
// }
// setTimeout(() => {
//     for (let chart of charts) {
//         chart.options.animation.duration = 100
//         chart.update()
//     }
// }, 1000)
