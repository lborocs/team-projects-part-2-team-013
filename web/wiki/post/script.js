import * as global from "../../global-ui.js";


const renderer = new Quill("#renderer-content", {
    readOnly: true,
    theme: "snow",
    modules: {
        toolbar: false
    }
});

document.renderer = renderer;

window.postMeta = [0, 0]; // Subscribed, Liked

function getQueryParam() {
    return window.location.hash.substring(1);
}
let postID = getQueryParam();

console.log("query param : " + postID);

function findTag(tagID) {
    return function (tag) {
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

tagsList.then((tagsList) => {
    getPostData(postID, tagsList).then((postData) => {
        if (postData.tags == null || postData.tags.length == 0) {
            document.querySelector(".tags").innerHTML += `<div class="tag">No Tags</div>`
        }
        else {
            for (let i = 0; i < postData.tags.length; i++) {
                let currentTag = tagsList.find(findTag(postData.tags[i]));
                document.querySelector(".tags").innerHTML += `<div class="tag"><span class="material-symbols-rounded">sell</span>${currentTag.name} &nbsp </div>`
            }
        }
        console.log(postData.author.userID);
        let emp_icon = global.employeeAvatarOrFallback(postData.author);
        document.querySelector(".authorIcon").innerHTML = `<img src="${emp_icon}" class="avatar">`
    });
});

async function getPostMeta(postID) {
    const response = await get_api(`/wiki/post.php/meta/${postID}`);
    if (!response.success || !response.data) {
        console.error("[getPostMeta] error fetching post meta: ", response.data);
        return { subscribed: 0, feedback: 0 };
    }
    console.log("[getPostMeta] post meta fetched: ", response.data);
    return response.data.meta;
}

async function getPostData(postID, tagsList) {
    const response = await get_api(`/wiki/post.php/post/${postID}`);
    if (!response.success) {
        console.error("[getPostData] error fetching post: ", response.data);
        return;
    }

    const post = response.data;

    const content = JSON.parse(post.content);

    post.images.forEach((image) => {
        const asset = image.asset;
        content.ops[image.index].insert.image = global.assetToUrl(global.ASSET_TYPE_POST, post.postID, asset.assetID, asset.contentType)
    });


    let postElement = document.querySelector(".post")
    document.querySelector(".title").innerText = post.title
    postElement.querySelector("#postTitle").innerHTML = post.title
    console.log("setting cotnent to", content);
    renderer.setContents(content);
    postElement.querySelector(".author").innerText = global.employeeToName(post.author)
    postElement.querySelector(".date").innerHTML = global.formatDateFull(new Date(post.createdAt))
    postElement.querySelector(".typeOfPost").innerHTML = post.isTechnical ? "Technical" : "Non-Technical"
    console.log("Post Technical Status: ", post.isTechnical);
    console.log(post)

    let postType = post.isTechnical ? "Technical" : "Non-Technical";
    const hash = post.isTechnical ? "#technical" : "#non-technical";
    global.setBreadcrumb(["Wiki", postType, post.title], ["../", `../${hash}`, '#' + post.postID]);

    if (!post.tags) {
        return post;
    }
    let newtags = [];

    post.tags.forEach((tag) => {
        newtags.push(tagsList.find(findTag(tag)).name)
    });
    post.tagsNames = newtags;

    return post
}

async function updateMeta(postID, subscribed, feedback) {
    subscribed = subscribed || 0;
    feedback = feedback || 0;
    console.log("[updateMeta] updating post meta: ", postID, subscribed, feedback);
    const response = await put_api(`/wiki/post.php/meta/${postID}`, { subscribed, feedback });
    if (!response.success) {
        console.error("[updateMeta] error updating post meta: ", response.data);
        return;
    }
    console.log("[updateMeta] post meta updated: ", response.data);
}

getPostMeta(postID).then((meta) => {
    if (!meta) {
        return;
    }
    console.log("Post Meta: " + meta.subscribed + " " + meta.feedback);
    postMeta = [meta.subscribed, meta.feedback];
    if (meta.subscribed) {
        document.querySelector("#watching").classList.add("active");
    }
    if (meta.feedback) {
        document.querySelector("#useful").classList.add("active");
    }
    console.log("Is the user subscribed: " + meta.subscribed);
    console.log("Has the user liked: " + meta.feedback);

});

let watchingButton = document.querySelector("#watching");
watchingButton.addEventListener("click", function () {
    if (watchingButton.classList.contains("active")) {
        watchingButton.classList.remove("active");
        postMeta[0] = 0;
        updateMeta(postID, postMeta[0], postMeta[1]);
        return
    }
    watchingButton.classList.add("active");
    postMeta[0] = 1;
    updateMeta(postID, postMeta[0], postMeta[1]);
});

let usefulButton = document.querySelector("#useful");
usefulButton.addEventListener("click", function () {
    if (usefulButton.classList.contains("active")) {
        usefulButton.classList.remove("active");
        postMeta[1] = 0;
        updateMeta(postID, postMeta[0], postMeta[1]);
        return
    }
    usefulButton.classList.add("active");
    postMeta[1] = 1;
    console.log("Post Meta: " + postMeta[0] + " " + postMeta[1]);
    updateMeta(postID, postMeta[0], postMeta[1]);
});