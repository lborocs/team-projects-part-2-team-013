const tags = document.getElementById("tags");
const input = document.getElementById("input-tag");

function getQueryParam() {
    return window.location.hash.substring(1);
}

async function getTagsData(){
    const data = await get_api(`/wiki/post.php/tags`);
    if (!data.success) {
        console.error("[getPostData] error fetching post: ", data.data);
        return;
    }
    const tagsList = data.data.innerText;
    return tagsList
}

getTagsData().then((tagsList) => {
    tagsList = tagsList.replace(/'/g, '"');
    console.log('tags' + tagsList);
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

let postID = getQueryParam();
let editing = false;
if (postID != "") {
    editing = true;
    document.querySelector("#submitPostButton").innerHTML = 'Update post &nbsp <i class="fa-solid fa-check"></i>';
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
            //document.querySelector(".tags").innerHTML += `<div class="tag"><i class="fa-solid fa-tag"></i>No Tags</div>`
        }
        else {
            document.querySelector("#placeholderTag").classList.add("norender")
            for (let i = 0; i < post.tags.length; i++) {
                document.querySelector("#listOfTags").innerHTML += `<div class="tag"><span class="material-symbols-rounded">sell</span>${post.tags[i]}<i class="fa-solid fa-x"></i></div>`
            }
        }
    });
}

console.log(postID);
console.log("editing : " + editing);

var quill = new Quill('#editor', {
    theme: 'snow'
});

input.addEventListener("keydown", function(event) {
if (event.key === "Enter") {
    event.preventDefault();
    const tag = document.createElement("div");
    tagContent = input.value.trim();
    console.log(tagContent);
    if (tagContent !== "") {
        //createTag(tagContent);
    document.querySelector("#placeholderTag").classList.add("norender")
    tag.className = "tag";
    tag.innerHTML = '<span class="material-symbols-rounded">sell</span>' + tagContent + '<i class="fa-solid fa-x"></i>';
    document.querySelector("#listOfTags").appendChild(tag);
    input.value = "";
    }
}
});

tags.addEventListener("click", function(event) {
if (event.target.classList.contains("fa-x")) {
    event.target.parentNode.remove();
    if (tags.children.length == 0){
    document.querySelector("#placeholderTag").classList.remove("norender")}
}
});


function getTagList() {
    const tags = document.getElementById("tags");
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