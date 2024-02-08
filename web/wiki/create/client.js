const tags = document.getElementById("tags");
const input = document.getElementById("input-tag");

function getQueryParam() {
    return window.location.hash.substring(1);
}

function findTag(tagID) {
    return function(tag) {
        return tag.tagID === tagID;
    }
}

async function fetchTags() {
    const data = await get_api("/wiki/post.php/tags");
    console.log(data);
    if (data.success == true) {
        console.log("Tags have been fetched")
        return data.data.tags;
    } else {
        console.log("Tags failed to be fetched")
    }
}

let tagsList = fetchTags();
tagsList.then((tagsList) => {
    let postID = getQueryParam();
    let editing = false;
    if (postID != "") {
        editing = true;
        document.querySelector("#submitPostButton").innerHTML = 'Update post &nbsp <span class="material-symbols-rounded">done</span>';
        document.querySelector("#title").innerHTML = "Edit Post";
        getPostData(postID).then((post) => {
            console.log(post);
            document.getElementsByClassName("post-title")[0].getElementsByTagName("input")[0].value = post.title;
            quill.root.innerHTML = post.content;
            if (post.isTechnical == 1) {
                document.getElementsByClassName("type-of-post")[0].getElementsByTagName("input")[0].checked = true;
            }
            else {
                document.getElementsByClassName("type-of-post")[0].getElementsByTagName("input")[1].checked = true;
            }
            if (post.tags == null || post.tags.length == 0) {
                //if the post you're editing has no tags
            }
            else {
                document.querySelector("#placeholderTag").classList.add("norender")
                post.tags.forEach((tag) => {
                    document.querySelector("#listOfTags").innerHTML += `<div class="tag" id="${tag}"><span class="material-symbols-rounded">sell</span>${tagsList.find(findTag(tag)).name}<span class="material-symbols-rounded" id="tagCloseButton">close</span></div>`
                    addDeleteListener(document.getElementById(tag));
                });
            }
        });
    }
});

async function createTag(tag){
    console.log(tag);
    var data = {
        "body": tag
    }
    const result = await post_api(`/wiki/post.php/tag`, data);
    if (!result.success) {
        console.error("[getPostData] error making tag: ", result.data);
        return;
    }
    console.log(data.data);
}



async function getPostData(postID){
    const data = await get_api(`/wiki/post.php/post/${postID}`);
    if (!data.success) {
        console.error("[getPostData] error fetching post: ", data.data);
        return;
    }
    const post = data.data;

    //post.title
    //post.content
    //post.author.firstName
    //post.author.lastName)
    // global.formatDateFull(new Date(post.createdAt * 1000))
    //post.postID
    return post
}

var quill = new Quill('#editor', {
    theme: 'snow'
});

function createVisualTag(tagName){
    const tag = document.createElement("div");
    console.log(tagContent);
    if (tagContent !== "") {
        //createTag(tagContent);
    document.querySelector("#placeholderTag").classList.add("norender")
    tag.className = "tag";
    tag.innerHTML = '<span class="material-symbols-rounded">sell</span>' + tagContent + '<span class="material-symbols-rounded" id="tagCloseButton">close</span>';
    document.querySelector("#listOfTags").appendChild(tag);
    addDeleteListener(tag);
    }
}
input.addEventListener("keydown", function(event) {
if (event.key === "Enter") {
    event.preventDefault();
    tagContent = input.value.trim();
    createVisualTag(tagContent);
    input.value = "";
    }
});

function addDeleteListener(thisTag, tags){
    thisTag.addEventListener("click", function(event) {
    if (event.target.classList.contains("material-symbols-rounded")) {
        event.target.parentNode.remove();
        var tags = document.querySelectorAll(".tag");
        if (tags.length == 0){
        document.querySelector("#placeholderTag").classList.remove("norender")}
        }
    });
}

function getTagList() {
    const tags = document.querySelectorAll(".tag");
    const tagList = [];
    for (let i = 0; i < tags.children.length; i++) {
    const tagText = tags.children[i].childNodes[0].nodeValue.trim();
    tagList.push(tagText);
    }
    return tagList;
}

async function createPost(data) {
    const response = await post_api("/wiki/post.php/post", data);
    console.log(response);
}
async function updatePost(data) {
    const response = await patch_api("/wiki/post.php/post/" + postID, data);
    console.log(response);
}

function submitPost(){
    var title = document.getElementsByClassName("post-title")[0].getElementsByTagName("input")[0].value;
    var body = quill.root.innerHTML;
    //THIS CAN BE DONE WHEN TAGS ARE USED                          
    var isTechnical = document.getElementsByClassName("type-of-post")[0].getElementsByTagName("input")[0].checked;

    var data = {
        "isTechnical": isTechnical+0,
        "title": title,
        "content": body,
    }
    console.log(data);
    if (editing) {
        updatePost(data);
    }
    else{
        createPost(data);
    }
    window.location.href = "../";
}