const tags = document.getElementById("tags");
const input = document.getElementById("input-tag");
const submitButton = document.getElementById("submitButton");
var editing = false;
var currentTags = [];
var selectTags = [];

class Tag {
    constructor(name, tagID) {
        this.tagID = tagID;
        this.name = name;
        this.element = null;
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
        if (tag.tagID != 0) {
            selectTags.push(this);
        }       
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
        this.tagID = await this.createTag(this.name);
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
        return result.data.tagID;
    }

    addToSelect(){
        const newSelectTag = document.createElement("div");
        newSelectTag.className = "name-card";
        newSelectTag.innerHTML = `<span class="material-symbols-rounded">sell</span>${this.name}`;
        document.querySelector(".employee-list").appendChild(newSelectTag);
        this.element = newSelectTag;
        this.addSelectListener();
    }

    addSelectListener() {
        this.element.addEventListener("click", (event) => this.clickedSelect());
    }

    clickedSelect() {
        currentTags.push(this);
        this.addTag();
        this.removeFromSelect();
    }

    removeFromSelect() {
        document.querySelector(".employee-list").removeChild(this.element);
        selectTags = selectTags.filter(a => a.tagID !== this.tagID);
        organiseSelect();
    }

    deRender() {
        this.element.classList.add("norender");
    }

    render() {
        this.element.classList.remove("norender");
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

function organiseSelect() {
    selectTags.sort((a, b) => a.name.localeCompare(b.name));
    sleep(10).then(() => {
    var input = document.querySelector("#input-tag").value.trim();
    if (input === "") {
        var index = 0;
        selectTags.forEach((tag) => {
            if (index < 5) {
                tag.render();
                index++;
            } else {
                tag.deRender();
            }
        });
    } else {
        var count = 0;
        selectTags.forEach((tag) => {
            if (count < 5 && tag.name.includes(input)) {
                tag.render();
                count++;
            } else {
                tag.deRender();
            }
        });
    }
});
}
    

let tagsList = fetchTags();
tagsList.then((tagsList) => {
    tagsList.forEach((tag) => {
        temp = new Tag(tag.name, tag.tagID);
        selectTags.push(temp);
        temp.addToSelect();

    });
    organiseSelect();
    let postID = getQueryParam();
    if (postID != "") {
        editing = true;
        document.querySelector("#submitButton").innerHTML = 'Update post &nbsp <span class="material-symbols-rounded">done</span>';
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
                    temp = new Tag(tagsList.find(findTag(tag)).name, tag);
                    currentTags.push(temp);
                    temp.addTag();
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
    const tagExists = selectTags.find(tag => tag.name === tagContent);
    console.log(tagExists);
    console.log("This is tagExists")
    if (tagExists) {
        currentTags.push(tagExists);
        tagExists.addTag();
        selectTags = selectTags.filter(tag => tag.tagID !== tagExists.tagID);
        tagExists.removeFromSelect();
        organiseSelect();
    }
    else{
        tempTag = new Tag(tagContent, 0);
        currentTags.push(tempTag);
        tempTag.addTag();
    }
    input.value = "";
    }
    else if (event.key === "Backspace" && input.value === "") {
        currentTags.pop().removeTag();//WORK IN PROGRESS
    }
    else if (event.key === "Tab") {
        event.preventDefault();
        if (selectTags.length > 0) {
            selectTags.find(tag => !tag.element.classList.contains("norender")).clickedSelect();
        }
    }
    else {
        organiseSelect();
    }
});


async function createPost(data) {
    const response = await post_api("/wiki/post.php/post", data);
    console.log(response);
    return response.data.postID
}
async function updatePost(postID, data) {
    const response = await patch_api("/wiki/post.php/post/" + postID, data);
    console.log(response);
}
async function updateTags(postID, data2) {
    const response = await put_api("/wiki/post.php/post/" + postID + "/tags", data2);
    console.log(response);
}

function submitPost(){
    var title = document.getElementsByClassName("post-title")[0].getElementsByTagName("input")[0].value;
    var body = quill.root.innerHTML;                       
    var isTechnical = document.getElementsByClassName("type-of-post")[0].getElementsByTagName("input")[0].checked;
    const checkTempPromises = currentTags.map((tag) => tag.checkTemp());
    Promise.all(checkTempPromises)
        .then(() => {
            var tagsToSubmit = [];
            currentTags.forEach((tag) => {
                tagsToSubmit.push(tag.tagID);
            });
            console.log(tagsToSubmit);
            var data = {
                "isTechnical": isTechnical + 0,
                "title": title,
                "content": body,
            };
            var data2 = {
                "tags": tagsToSubmit,
            }; 
            console.log("Next bit is data2")
            console.log(data2);
            if (editing) {
                let postID = getQueryParam();
                updatePost(postID, data).then(() => {
                updateTags(postID, data2).then(() => {
                    window.location.href = "../";
                });
            });
            } else {
                let postID = createPost(data);
                postID.then((postID) => {
                    console.log(postID);
                    console.log("This is the post ID")
                    console.log(data2);
                    console.log("This is the data2")
                    updateTags(postID, data2).then(() => {
                        window.location.href = "../";
                    });
                });
            }
        });
}

const sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

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
