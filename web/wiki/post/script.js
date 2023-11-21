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
    console.log(data.data)
    console.log(document.getElementById("title"))
    document.querySelector(".title").innerText = data.data.title
    document.querySelector(".content").innerHTML = data.data.content
    console.log(data.data.firstName)
    document.querySelector(".author").innerText = data.data.firstName + " " + data.data.lastName
    document.querySelector(".date").innerText = global.formatDate(new Date(data.data.createdAt * 1000))
    console.log(data.data.content)
    return data.data
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
 
