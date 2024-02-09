import * as global from "../../global-ui.js";

var nonTechnicalTags = ["Printer", "Stationary", "Meeting Rooms", "Office Supplies", "Filing", "Cleaning", "Mail", "Reception"]
var technicalTags = ["HTML", "CSS", "JavaScript", "Python", "Java", "C++", "Ruby", "PHP", "Swift", "Kotlin", "TypeScript", "Go"]

function getQueryParam() {
    return window.location.hash.substring(1);
}
let postID = getQueryParam();

console.log("query param : " + postID);

function findTag(tagID) {
    return function(tag) {
        return tag.tagID === tagID;
    }
}

async function fetchTags() {

    const data = await get_api("/wiki/post.php/tags");

    console.log(data);
    if (data.success != true) {
        console.log("Tags failed to be fetched")
        return false;
    }

    console.log("Tags have been fetched")
    return data.data.tags;

}

let tagsList = fetchTags();

function handleTags(postData, tagsList) {

    let tagsHTML = '';
    if (postData.tags == null || postData.tags.length == 0) {

        tagsHTML = `<div class="tag">No Tags</div>`;

    } else {

        for (let tag of postData.tags) {

            tagsHTML += `<div class="tag"><span class="material-symbols-rounded">sell</span>${tag.name}</div>`;
        }
    }
    document.querySelector(".tags").innerHTML += tagsHTML;
}

function handleAuthor(postData) {
    let emp_icon = global.employeeAvatarOrFallback(postData.author);
    document.querySelector(".authorIcon").innerHTML = `<img src="${emp_icon}" class="avatar">`;
}

tagsList.then((tagsList) => {
    getPostData(postID, tagsList).then((postData) => {

        handleTags(postData, tagsList);
        console.log(postData.author.userID);
        handleAuthor(postData);
        
    });
});

async function getPostData(postID, tagsList){
    const data = await get_api(`/wiki/post.php/post/${postID}`);
    if (!data.success) {
        console.error("[getPostData] error fetching post: ", data.data);
        return;
    }

    const post = data.data;

    post.images.forEach((image) => {

        post.content = post.content.replaceAll(
            `\{\{img${image.index}\}\}`,
            `<img src="${global.assetToUrl(global.ASSET_TYPE_POST, post.postID, image.asset.assetID, image.asset.contentType)}" class="post-image">`
            );
    });


    let postElement = document.querySelector(".post")

    document.querySelector(".title").innerText = post.title
    postElement.querySelector("#postTitle").innerHTML = post.title
    postElement.querySelector(".content").innerHTML = post.content
    postElement.querySelector(".author").innerText = global.employeeToName(post.author)
    postElement.querySelector(".date").innerHTML = global.formatDateFull(new Date(post.createdAt * 1000))
    console.log(post)

    global.setBreadcrumb(["Wiki", post.title], ["../", '#' + post.postID])
    if (post.tags != null) {
        let newtags = [];
        console.log(post.tags)
        console.log("TAGS")
        post.tags.forEach((tag) => {
            newtags.push(tagsList.find(findTag(tag)).name)
            console.log(tag)
            console.log("REPLACING TAGS")
        });
    post.tagsNames = newtags;
    }
    return post
}


let watchingButton = document.querySelector("#watching");
watchingButton.addEventListener("click", function() {
    watchingButton.classList.add("active");
    console.log("watching"); //I'm gonna delete this please dont kill me
});

let usefulButton = document.querySelector("#useful");
usefulButton.addEventListener("click", function() {
    usefulButton.classList.add("active");
});