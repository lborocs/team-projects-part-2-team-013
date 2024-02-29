import * as global from '../global-ui.js';

export var data = null;

const CHART_DATA_LIMIT = 5;
const CHART_LABEL_LIMIT = 16;
const dashboardContainer = document.querySelector(".dashboard-container");

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
    
    

    //creates metric-cards to put the charts in
    renderEmptyMetric("popular-posts-chart", "Top Viewed Posts");
    renderEmptyMetric("popular-tags-chart", "Top Viewed Topics");
    renderEmptyMetric("watched-posts-chart", "Most Watched Posts");
    renderEmptyMetric("helpful-posts-chart", "Most Helpful Posts");;

    //gets all the needed data into a single point
    let trainingData = await getData();
    console.error(trainingData);

    //formats the wiki data into the chartjs format, limiting labels so they dont cram the chart really small
    const postViews = trainingData.popularPosts.map(post => post.views)
    const postLabels = trainingData.popularPosts.map(post => global.trimText(post.title, CHART_LABEL_LIMIT))
    const postTooltips = trainingData.popularPosts.map(post => post.title)

    const tagViews = trainingData.popularTags.map(tag => tag.views)
    const tagLabels = trainingData.popularTags.map(tag => global.trimText(tag.name, CHART_LABEL_LIMIT))
    const tagTooltips = trainingData.popularTags.map(tag => tag.name)

    const watchedPosts = trainingData.watchedPosts.map(post => post.subscriptions)
    const watchedLabels = trainingData.watchedPosts.map(post => global.trimText(post.title, CHART_LABEL_LIMIT))
    const watchedTooltips = trainingData.watchedPosts.map(post => post.title)

    const helpfulPosts = trainingData.helpfulPosts.map(post => post.helpful)
    const helpfulLabels = trainingData.helpfulPosts.map(post => global.trimText(post.title, CHART_LABEL_LIMIT))
    const helpfulTooltips = trainingData.helpfulPosts.map(post => post.title)


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

function renderEmptyMetric(id, title) {
    let metricCard = document.createElement("div");
    metricCard.classList.add("metric-card");

    let metricTitle = document.createElement("div");
    metricTitle.classList.add("metric-title");
    metricTitle.innerHTML = `
        <div class="title-text">
            ${title}
        </div>
    `;

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