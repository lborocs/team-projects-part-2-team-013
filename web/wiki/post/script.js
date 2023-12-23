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

    let postElement = document.querySelector(".post")

    postElement.querySelector(".title").innerText = post.title
    postElement.querySelector("#postTitle").innerHTML = post.title
    postElement.querySelector(".content").innerHTML = post.content
    postElement.querySelector(".author").innerText = global.bothNamesToString(post.author.firstName, post.author.lastName)
    postElement.querySelector(".date").innerText = global.formatDateFull(new Date(post.createdAt * 1000))
    console.log(post)

    global.setBreadcrumb(["Wiki", post.title], ["../", '#' + post.postID])
    return post
}

const postData = await getPostData(postID)
if (postData.tags == null || postData.tags.length == 0) {
    document.querySelector(".tags").innerHTML += `<div class="tag">No Tags</div>`
}
else {
for (let i = 0; i < postData.tags.length; i++) {
    document.querySelector(".tags").innerHTML += `<div class="tag"><i class="fa-solid fa-tag"></i>${postData.tags[i]}</div>`
}
}
 console.log(postData.author.userID);
let emp_icon = global.employeeAvatarOrFallback(postData.author);
document.querySelector(".authorIcon").innerHTML = `<img src="${emp_icon}" class="avatar">`

document.querySelector("#watching").addEventListener("click", function() {
    button = document.querySelector("#watching");
    button.toggleAttribute("active");
});

document.querySelector("#useful").addEventListener("click", function() {
    button = document.querySelector("#useful");
    button.toggleAttribute("active");
});