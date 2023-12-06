import * as global from "../../global-ui.js";

var nonTechnicalTags = ["Printer", "Stationary", "Meeting Rooms", "Office Supplies", "Filing", "Cleaning", "Mail", "Reception"]
var technicalTags = ["HTML", "CSS", "JavaScript", "Python", "Java", "C++", "Ruby", "PHP", "Swift", "Kotlin", "TypeScript", "Go"]

function getQueryParam() {
    return window.location.hash.substring(1);
}
let postID = getQueryParam();

console.log("query param : " + postID);


async function getPostData(postID){
    const data = await get_api(`/wiki/post.php/post/${postID}`);
    if (!data.success) {
        console.error("[getPostData] error fetching post: ", data.data);
        return;
    }

    const post = data.data;

    document.querySelector(".title").innerText = post.title
    document.querySelector("#postTitle").innerHTML = post.title
    document.querySelector(".content").innerHTML = post.content
    document.querySelector(".author").innerText = global.bothNamesToString(post.createdBy.firstName, post.createdBy.lastName)
    document.querySelector(".date").innerText = global.formatDate(new Date(post.createdAt * 1000))

    global.setBreadcrumb(["Wiki", post.title], ["../", '#' + post.postID])
    return post
}

const postData = await getPostData(postID)
const technical = postData.isTechnical
if (technical == 0) {
    var tag1 = nonTechnicalTags[Math.floor(Math.random() * nonTechnicalTags.length)];
    document.querySelector("#tag1").innerText = tag1
    var tag2 = tag1
    while (tag2 == tag1) {
        tag2 = nonTechnicalTags[Math.floor(Math.random() * nonTechnicalTags.length)];
    }
    document.querySelector("#tag2").innerHTML = tag2
} else if (technical == 1) {
    var tag1 = technicalTags[Math.floor(Math.random() * technicalTags.length)];
    document.querySelector("#tag1").innerText = tag1
    var tag2 = tag1
    while (tag2 == tag1) {
        tag2 = technicalTags[Math.floor(Math.random() * technicalTags.length)];
    }
    document.querySelector("#tag2").innerText = tag2
}
 
