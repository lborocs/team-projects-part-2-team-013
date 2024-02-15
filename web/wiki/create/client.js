const tags = document.getElementById("tags");
const input = document.getElementById("input-tag");
const submitButton = document.getElementById("submitButton");
var editing = false;
var currentTags = [];

class Tag {
    constructor(name, tagID) {
        this.tagID = tagID;
        this.name = name;
    }
    addTag() {
        const newTag = document.createElement("div");
        document.querySelector("#placeholderTag").classList.add("norender")
        newTag.className = "tag";
        newTag.innerHTML = '<span class="material-symbols-rounded">sell</span>' + this.name + '<span class="material-symbols-rounded" id="tagCloseButton">close</span>';
        document.querySelector("#listOfTags").appendChild(newTag);
        this.addDeleteListener(newTag);
    }

    addDeleteListener(tag) {
        tag.addEventListener("click", (event) => this.removeTag(tag));
    }

    removeTag(tag) {
        document.querySelector("#listOfTags").removeChild(tag);
        currentTags = currentTags.filter(a => a.name !== this.name);
        if (currentTags.length == 0){
            document.querySelector("#placeholderTag").classList.remove("norender")
        }
    }

    async checkTemp(){
        console.log("Checking tag: ", this.name);
        console.log("Tag ID: ", this.tagID);
        if (this.tagID != 0){
            return
        }
        try {
            this.tagID = await this.createTag(this.name);
        } catch (error) {
            console.log("Error creating tag: ", error);
        }
    }

    async createTag(tag){
        console.log("Creating tag: ", tag);
        var data = {
            "name": tag,
            "colour": 0
        }
        const result = await post_api(`/wiki/post.php/tag`, data);
        if (!result.success) {
            console.error("[getPostData] error making tag: ", result.data);
            return;
        }
        result.then((result) => {
            console.log("Tag created: ", result.data.tagID);
        return result.data.tagID;
        });
    }

}



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
        console.log(data.data.tags);
        return data.data.tags;
    } else {
        console.log("Tags failed to be fetched")
    }
}

let tagsList = fetchTags();
tagsList.then((tagsList) => {
    let postID = getQueryParam();
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


input.addEventListener("keydown", function(event) {
if (event.key === "Enter") {
    event.preventDefault();
    tagContent = input.value.trim();
    tempTag = new Tag(tagContent, 0);
    currentTags.push(tempTag);
    tempTag.addTag();
    input.value = "";
    }
});


async function createPost(data) {
    const response = await post_api("/wiki/post.php/post", data);
    console.log(response);
    return response.postID
}
async function updatePost(postID, data) {
    const response = await patch_api("/wiki/post.php/post/" + postID, data);
    console.log(response);
}
async function updateTags(postID, data) {
    const response = await put_api("/wiki/post.php/post/" + postID, data);
    console.log(response);
}

function submitPost(){
    var title = document.getElementsByClassName("post-title")[0].getElementsByTagName("input")[0].value;
    var body = quill.root.innerHTML;
    //THIS CAN BE DONE WHEN TAGS ARE USED                          
    var isTechnical = document.getElementsByClassName("type-of-post")[0].getElementsByTagName("input")[0].checked;
    tagsToSubmit = [];

    // Create an array of promises for each tag's checkTemp() method
    const checkTempPromises = currentTags.map((tag) => tag.checkTemp());

    // Wait for all the promises to resolve
    Promise.all(checkTempPromises)
        .then(() => {
            currentTags.forEach((tag) => {
                tagsToSubmit.push(tag.tagID);
            });

            var data = {
                "isTechnical": isTechnical + 0,
                "title": title,
                "content": body,
            };
            var data2 = {
                "tags": tagsToSubmit,
            };
            console.log(data2);
            console.log(data);
            if (editing) {
                let postID = getQueryParam();
                updatePost(postID, data);
                updateTags(postID, data2);
            } else {
                let postID = createPost(data);
                postID.then((postID) => {
                    console.log(postID);
                    updateTags(postID, data2);
                });
            }
            //window.location.href = "../";
        });
}

document.querySelector(".search-input").addEventListener("focus", function() {
   document.querySelector("#glass").classList.add("norender");
   document.querySelector("#ex").classList.remove("norender");
});

document.querySelector(".search-input").addEventListener("blur", function() {
    document.querySelector("#glass").classList.remove("norender");
    document.querySelector("#ex").classList.add("norender");
});

document.querySelector("#ex").addEventListener("click", function() {
    document.querySelector(".search-input").value = "";
    document.querySelector("#glass").classList.remove("norerender");
});

document.querySelector("#ex").classList.add("norender");

submitButton.addEventListener("click", submitPost);
