import * as global from "../../global-ui.js";

const postElement = document.querySelector(".post");


let currentPost;

const renderer = new Quill("#renderer-content", {
    readOnly: true,
    theme: "snow",
    modules: {
        toolbar: false
    }
});

document.renderer = renderer;

const postMeta = {subscribed:0, feedback: 0};

function getQueryParam() {
    return window.location.hash.substring(1);
}
let postID = getQueryParam();

console.log("query param : " + postID);


async function fetchTags() {

    const res = await get_api("/wiki/post.php/tags");

    if (res.success != true) {
        console.log("Tags failed to be fetched")
        return false;
    }

    console.log("Tags have been fetched")
    
    const tagMap = new Map();
    res.data.tags.forEach((tag) => {
        tagMap.set(tag.tagID, tag);
    });

    return tagMap;

}

const postPromise = getPostData(postID);

postPromise.finally(() => {
    postElement.classList.remove("animate-spinner");
});

fetchTags().then(async (tagMap) => {

    await postPromise;

    if (currentPost.tags == null || currentPost.tags.length == 0) {
        document.querySelector(".tags").innerHTML += `<div class="tag">No Tags</div>`
    }
    else {
        currentPost.tags.forEach((tagID) => {
            let tag = tagMap.get(tagID);
            document.querySelector(".tags").innerHTML += `<div class="tag"><span class="material-symbols-rounded">sell</span>${tag.name} &nbsp </div>`
        });
    }
});


async function getPostData(postID) {
    const response = await get_api(`/wiki/post.php/post/${postID}`);
    if (!response.success) {
        console.error("[getPostData] error fetching post: ", response.data);
        return;
    }

    const post = response.data;
    currentPost = post;

    const content = JSON.parse(post.content);

    const indexMap = {};

    content.ops.forEach((op, key) => {
        if (op.insert.image) {
            indexMap[op.insert.image] = key;
        }
    });


    post.images.forEach((image) => {
        const asset = image.asset;
        content.ops[indexMap[image.index]].insert.image = global.assetToUrl(global.ASSET_TYPE_POST, post.postID, asset.assetID, asset.contentType)
    });


    document.querySelector(".title").innerText = post.title
    postElement.querySelector("#postTitle").innerHTML = post.title
    console.log("setting cotnent to", content);
    renderer.setContents(content);
    postElement.querySelector(".author").innerText = global.employeeToName(post.author)
    postElement.querySelector(".date").innerHTML = global.formatDateFull(new Date(post.createdAt))
    postElement.querySelector(".post-category > .name").innerHTML = post.isTechnical ? "Technical" : "Non-Technical"
    postElement.querySelector(".post-category > .icon > span").innerHTML = post.isTechnical ? "terminal" : "newsstand"
    console.log("Post Technical Status: ", post.isTechnical);
    console.log(post)

    let postType = post.isTechnical ? "Technical" : "Non-Technical";
    const hash = post.isTechnical ? "#technical" : "#nontechnical";
    global.setBreadcrumb(["Wiki", postType, post.title], ["../", `../${hash}`, '#' + post.postID]);

    postMeta.subscribed = post.subscribed;
    postMeta.feedback = post.feedback;

    if (postMeta.subscribed) {
        document.querySelector("#watching").classList.add("active");
    }
    if (postMeta.feedback) {
        document.querySelector("#useful").classList.add("active");
    }

    let emp_icon = global.employeeAvatarOrFallback(post.author);
    document.querySelector(".authorIcon").innerHTML = `<img src="${emp_icon}" class="avatar">`

    return post
}

document.querySelector(".main").onscroll = scrolling;

function scrolling() {
    if (document.querySelector(".main").scrollTop > 200) {
        document.querySelector("#scroll-to-top").classList.remove("norender");
    } else {
        document.querySelector("#scroll-to-top").classList.add("norender");
    }
}

document.querySelector("#scroll-to-top").addEventListener("click", function () {
    console.log("scrolling to top")
    document.querySelector(".main").scroll({
        top: 0,
        behavior: "smooth",
      })
})


async function updateMeta(postID) {
    const response = await put_api(`/wiki/post.php/meta/${postID}`, postMeta);
}

let watchingButton = document.querySelector("#watching");
watchingButton.addEventListener("click", function () {
    if (watchingButton.classList.contains("active")) {
        watchingButton.classList.remove("active");
        postMeta.subscribed = 0;
        updateMeta(postID);
        return
    }
    watchingButton.classList.add("active");
    postMeta.subscribed = 1;
    updateMeta(postID);
});

let usefulButton = document.querySelector("#useful");
usefulButton.addEventListener("click", function () {
    if (usefulButton.classList.contains("active")) {
        usefulButton.classList.remove("active");
        postMeta.feedback = 0;
        updateMeta(postID);
        return
    }
    usefulButton.classList.add("active");
    postMeta.feedback = 1;
    updateMeta(postID,);
});

