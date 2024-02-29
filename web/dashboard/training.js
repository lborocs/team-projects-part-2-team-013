import * as global from '../global-ui.js';

export var data = null;

var CHART_DATA_LIMIT = 5;
const CHART_LABEL_LIMIT = 16;
const dashboardContainer = document.querySelector(".dashboard-container");
const maxValuesDropdown = document.getElementById("max-values-dropdown");

export async function init() {
    const trainingElements = document.querySelectorAll(`.training-only`);
    trainingElements.forEach(element => {
        element.classList.remove("norender");
    });
    const projectElements = document.querySelectorAll(`.project-only`);
    projectElements.forEach(element => {
        element.classList.add("norender");
    });

    const metrics = document.querySelectorAll(".metric-card");
    metrics.forEach(metric => {
        metric.remove();
    });

    
    maxValuesDropdown.addEventListener("click", function() {
        this.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
        if (!maxValuesDropdown.contains(e.target)) {
            maxValuesDropdown.classList.remove("open")
        }
    });
    
    maxValuesDropdown.querySelectorAll(".dropdown-option").forEach((option) => {
        option.addEventListener("click", async () => {
            maxValuesDropdown.querySelector(".dropdown-text").innerText = option.innerText;
            CHART_DATA_LIMIT = parseInt(option.getAttribute("value"));

            //redo data calculation 
            postViews = trainingData.popularPosts.map(post => post.views)
            postLabels = trainingData.popularPosts.map(post => global.trimText(post.title, CHART_LABEL_LIMIT))
            postTooltips = trainingData.popularPosts.map(post => post.title)

            tagViews = trainingData.popularTags.map(tag => tag.views)
            tagLabels = trainingData.popularTags.map(tag => global.trimText(tag.name, CHART_LABEL_LIMIT))
            tagTooltips = trainingData.popularTags.map(tag => tag.name)

            watchedPosts = trainingData.watchedPosts.map(post => post.subscriptions)
            watchedLabels = trainingData.watchedPosts.map(post => global.trimText(post.title, CHART_LABEL_LIMIT))
            watchedTooltips = trainingData.watchedPosts.map(post => post.title)

            helpfulPosts = trainingData.helpfulPosts.map(post => post.helpful)
            helpfulLabels = trainingData.helpfulPosts.map(post => global.trimText(post.title, CHART_LABEL_LIMIT))
            helpfulTooltips = trainingData.helpfulPosts.map(post => post.title)

            //conditionally checks if the lenght actually exceed the limit, if we dont check the charts stretch out
            if (postViews.length > CHART_DATA_LIMIT) {
                postViews.length = CHART_DATA_LIMIT;
            }
            if (postLabels.length > CHART_DATA_LIMIT) {
                postLabels.length = CHART_DATA_LIMIT;
            }
            if (tagViews.length > CHART_DATA_LIMIT) {
                tagViews.length = CHART_DATA_LIMIT;
            }
            if (tagLabels.length > CHART_DATA_LIMIT) {
                tagLabels.length = CHART_DATA_LIMIT;
            }
            if (watchedPosts.length > CHART_DATA_LIMIT) {
                watchedPosts.length = CHART_DATA_LIMIT;
            }
            if (watchedLabels.length > CHART_DATA_LIMIT) {
                watchedLabels.length = CHART_DATA_LIMIT;
            }
            if (helpfulPosts.length > CHART_DATA_LIMIT) {
                helpfulPosts.length = CHART_DATA_LIMIT;
            }
            if (helpfulLabels.length > CHART_DATA_LIMIT) {
                helpfulLabels.length = CHART_DATA_LIMIT;
            }

            //update the charts
            postsChart.data.labels = postLabels;
            postsChart.data.datasets[0].data = postViews;
            postsChart.update();

            popularTagsChart.data.labels = tagLabels;
            popularTagsChart.data.datasets[0].data = tagViews;
            popularTagsChart.update();

            watchedPostsChart.data.labels = watchedLabels;
            watchedPostsChart.data.datasets[0].data = watchedPosts;
            watchedPostsChart.update();

            helpfulPostsChart.data.labels = helpfulLabels;
            helpfulPostsChart.data.datasets[0].data = helpfulPosts;
            helpfulPostsChart.update();


        })
    })
    
    

    //creates metric-cards to put the charts in
    renderEmptyMetric("popular-posts-chart", "Top Viewed Posts", "The top viewed posts in the last 30 days");
    renderEmptyMetric("popular-tags-chart", "Top Viewed Topics", "The top viewed topics in the last 30 days");
    renderEmptyMetric("watched-posts-chart", "Most Watched Posts", "The posts with the most employees watching them");
    renderEmptyMetric("helpful-posts-chart", "Most Helpful Posts", "The posts which the most employees marked 'Found this Helpul' in the last 30 days");

    //gets all the needed data into a single point
    let trainingData = await getData();
    console.error(trainingData);

    //formats the wiki data into the chartjs format, limiting labels so they dont cram the chart really small
    let postViews = trainingData.popularPosts.map(post => post.views)
    let postLabels = trainingData.popularPosts.map(post => global.trimText(post.title, CHART_LABEL_LIMIT))
    let postTooltips = trainingData.popularPosts.map(post => post.title)

    let tagViews = trainingData.popularTags.map(tag => tag.views)
    let tagLabels = trainingData.popularTags.map(tag => global.trimText(tag.name, CHART_LABEL_LIMIT))
    let tagTooltips = trainingData.popularTags.map(tag => tag.name)

    let watchedPosts = trainingData.watchedPosts.map(post => post.subscriptions)
    let watchedLabels = trainingData.watchedPosts.map(post => global.trimText(post.title, CHART_LABEL_LIMIT))
    let watchedTooltips = trainingData.watchedPosts.map(post => post.title)

    let helpfulPosts = trainingData.helpfulPosts.map(post => post.helpful)
    let helpfulLabels = trainingData.helpfulPosts.map(post => global.trimText(post.title, CHART_LABEL_LIMIT))
    let helpfulTooltips = trainingData.helpfulPosts.map(post => post.title)


    //limits the number of items shown by the charts so the data isnt overwhelming
    //the ability to change this may be implemented
    postViews.length = CHART_DATA_LIMIT;
    postLabels.length = CHART_DATA_LIMIT;
    tagViews.length = CHART_DATA_LIMIT;
    tagLabels.length = CHART_DATA_LIMIT;
    watchedPosts.length = CHART_DATA_LIMIT;
    watchedLabels.length = CHART_DATA_LIMIT;
    helpfulPosts.length = CHART_DATA_LIMIT;
    helpfulLabels.length = CHART_DATA_LIMIT;



    const postsChartContext = document.getElementById('popular-posts-chart').getContext('2d');
    const postsChart = new Chart(postsChartContext, {
        type: 'bar',
        data: {
            labels: postLabels,
            datasets: [{
                label: 'Views',
                data: postViews,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                ],
                borderColor: [
                    'rgba(255,99,132,1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                ],
                borderRadius: 3,
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    ticks: {
                        maxTicksLimit: 5,
                        precision: 0
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                colors: {
                    enabled: false
                }
            }
        }
    });

    const popularTagsChartContext = document.getElementById('popular-tags-chart').getContext('2d');
    const popularTagsChart = new Chart(popularTagsChartContext, {
        type: 'bar',
        data: {
            labels: tagLabels,
            datasets: [{
                label: 'Views per Tag',
                data: tagViews, 
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderRadius: 3,
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    ticks: {
                        maxTicksLimit: 5,
                        precision: 0
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                colors: {
                    enabled: false
                }
            }
        }
    });


    const watchedPostsChartContext = document.getElementById('watched-posts-chart').getContext('2d');
    const watchedPostsChart = new Chart(watchedPostsChartContext, {
        type: 'bar',
        data: {
            labels: watchedLabels, 
            datasets: [{
                label: 'Number of employees watching post',
                data: watchedPosts, 
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderRadius: 3,
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    ticks: {
                        precision: 0
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                colors: {
                    enabled: false
                }
            }
        }
    });

    const helpfulPostsChartContext = document.getElementById('helpful-posts-chart').getContext('2d');
    const helpfulPostsChart = new Chart(helpfulPostsChartContext, {
        type: 'bar',
        data: {
            labels: helpfulLabels, 
            datasets: [{
                label: "Number of 'Found This Helpful's per Post",
                data: helpfulPosts, 
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderRadius: 3,
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    ticks: {
                        precision: 0
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                colors: {
                    enabled: false
                }
            }
        }
    });

}

function renderEmptyMetric(id, title, description = "") {
    let metricCard = document.createElement("div");
    metricCard.classList.add("metric-card");
    metricCard.classList.add("training")

    let metricTitle = document.createElement("div");
    metricTitle.classList.add("metric-title");
    metricTitle.innerHTML = `
        <div class="title-text">
            ${title}
        </div>
    `;

    if (description) {
        metricTitle.innerHTML += `
            <div class="info tooltip tooltip-left">
                <span class="material-symbols-rounded">info</span>
                <p class="tooltiptext">${description}</p>
            </div>
        `;
    }

    metricCard.appendChild(metricTitle);

    let chartBox = document.createElement("div");
    chartBox.classList.add("chart-box");

    let canvas = document.createElement("canvas");
    canvas.id = id;

    chartBox.appendChild(canvas);

    metricCard.appendChild(chartBox);

    dashboardContainer.appendChild(metricCard);

    return id
}
/**
 * Fetches data from various API endpoints and returns an object containing the results.
 * 
 * @param {number} daysInPast number of days in the past to fetch data for - defualts to 30 days
 * @returns {Promise<object>} object containing the results.
 */
export async function getData(daysInPast = 30) {
    //api takes the delta in milliseconds so we do lots of multiplication
    const time = daysInPast * 24 * 60 * 60 * 1000;
    const tagsRes = await get_api(`/employee/manager.php/mostviewedtags?delta=${time}`)
    const viewsRes = await get_api(`/employee/manager.php/mostviewedposts?delta=${time}`)
    const subscriptionsRes = await get_api(`/employee/manager.php/mostsubscribedposts`)
    const helpfulRes = await get_api(`/employee/manager.php/mosthelpfulposts`)
    const unhelpfulRes = await get_api(`/employee/manager.php/leasthelpfulposts`)

    const popularTags = tagsRes.data.tags;
    const popularPosts = viewsRes.data.posts;
    const watchedPosts = subscriptionsRes.data.posts;
    const helpfulPosts = helpfulRes.data.posts;
    const unhelpfulPosts = unhelpfulRes.data.posts;






    data = {
        popularTags,
        popularPosts,
        helpfulPosts,
        watchedPosts,
    }
    return data;
}