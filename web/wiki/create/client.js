import * as global from "../../global-ui.js"

const tags = document.getElementById("tags");
const input = document.getElementById("input-tag");
const submitButton = document.getElementById("submit-button");
var editing = false;
var postBeingEdited = null;

var anyChanges = false;

var currentTags = [];

var selectTags = [];

const pageTitle = document.getElementById("page-title");

const postTitleInput = document.getElementById("post-title-input");
const categorySelector = document.querySelector(".type-of-post");
var isTechnical = categorySelector.getElementsByTagName("input")[0].checked;

const selectedTagsRow = document.getElementById("listOfTags");

const selectTagsButton = document.getElementById("add-tags-button");
selectTagsButton.addEventListener("click", () => {
    selectTagsPopup()
});

const globalTagsList = await fetchTags();

let globalCurrentTags = [];

function renderTag(tag, parent) {
    let tagDiv = document.createElement("div");

    tagDiv.classList.add("tag");
    tagDiv.setAttribute("name", tag.name);
    tagDiv.setAttribute("tagID", tag.tagID);

    tagDiv.innerHTML = `<span class="material-symbols-rounded">sell</span>${tag.name}`;
    parent.appendChild(tagDiv);
}


function getQueryParam() {
    return window.location.hash.substring(1);
}

function findTag(tagID) {
    return function (tag) {
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


function setEditing() {
    let postID = getQueryParam();

    if (postID == "") {
        global.setBreadcrumb(["Wiki", "Create Post"], ["/wiki/", "/wiki/create/"]);
        pageTitle.innerHTML = "Create Post";
        return
    }

    if (postID != "") {
        editing = true;
    
        //sets the breadcrumb, title, submit button text for editing
        if (editing) {
            global.setBreadcrumb(["Wiki", "Edit Post"], ["/wiki/", `/wiki/create/#${postID}`]);
            pageTitle.innerHTML = "Edit Post";
            document.title = "Edit Post";
            submitButton.innerHTML = '<div class="button-text">Update post </div> <div class="button-icon"> <span class="material-symbols-rounded">done</span> </div>';
            getPostData(postID).then((post) => {
                renderPostInEditor(post);
            });
        }
    }
        
}

function renderPostInEditor(post) {
    console.log("Rendering post in editor");
    console.log(post);
    postBeingEdited = post;
    console.error(postBeingEdited)
    console.error(globalCurrentTags)

    const postContent = JSON.parse(post.content);
    postTitleInput.value = post.title;

    console.log("setting cotnent to", postContent);
    quill.setContents(postContent);

    if (post.isTechnical == 1) {
        document.getElementsByClassName("type-of-post")[0].getElementsByTagName("input")[0].checked = true;
    } else {
        document.getElementsByClassName("type-of-post")[0].getElementsByTagName("input")[1].checked = true;
    }

    if (post.tags == null || post.tags.length == 0) {
        return
    }

    post.tags.forEach((tag) => {
        let tagObj = globalTagsList.find(findTag(tag.tagID));
        globalCurrentTags.push(tagObj);
        renderTag(tagObj, tags);
    });
    console.error(globalCurrentTags)
}




async function getPostData(postID) {
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
    modules: {
        'toolbar': [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'header': '1' }, { 'header': '2' }, 'code-block'],
            ['link', 'image'],
            ['clean'],
        ]
    },
    theme: 'snow'
});
document.editor = quill;





async function createPost(data) {
    const response = await post_api("/wiki/post.php/post", data);
    console.log(response);
    return response.data.postID
}
async function updatePost(postID, data) {
    const response = await patch_api("/wiki/post.php/post/" + postID, data);
    console.log(response);
}
async function updateTags(postID, body) {
    const response = await put_api("/wiki/post.php/post/" + postID + "/tags", body);
    console.log(response);
}

async function submitPost() {
    const title = postTitleInput.value;

    // js has no native deep copy so we have to use json
    const content = JSON.parse(JSON.stringify(quill.getContents()));
    const images = {};

    Object.entries(content.ops).forEach(([key, value]) => {
        if (value.insert.image) {
            // remove the data:image tag
            images[key] = value.insert.image.split(",")[1];
            content.ops[key].insert.image = `${key}`;
        }
    });


    var body = JSON.stringify(content);
    var isTechnical = categorySelector.getElementsByTagName("input")[0].checked;

    const checkTempPromises = currentTags.map((tag) => tag.checkTemp());
    Promise.all(checkTempPromises)
        .then(async () => {
            var tagsToSubmit = [];
            currentTags.forEach((tag) => {
                tagsToSubmit.push(tag.tagID);
            });
            console.log(tagsToSubmit);
           
            var tagBody = {
                "tags": tagsToSubmit,
            };
            console.log("tag body")
            console.log(tagBody);
            if (editing) {

                let postBody = {}

                let postID = getQueryParam()

                const existingData = await getPostData(postID)

                if (existingData.title != title) {
                    console.log(existingData.title, title)
                    postBody.title = title;
                }

                if (existingData.content != body) {
                    console.log(existingData.content)
                    console.log(body)
                    postBody.content = body;
                }

                if (existingData.isTechnical != isTechnical) {
                    console.log(existingData.isTechnical, isTechnical)
                    postBody.isTechnical = isTechnical + 0;
                }

                if (Object.keys(images).length > 0) {
                    console.log(images)
                    postBody.images = images;
                }

                if (Object.keys(postBody).length === 0) {
                    console.log("No changes to post")
                    updateTags(postID, tagBody).then(() => {
                        // window.location.href = "../";
                    });
                    return;
                }

                updatePost(postID, postBody).then(() => {
                    updateTags(postID, tagBody).then(() => {
                        // window.location.href = "../";
                    });
                });
            } else {

                let postBody = {
                    "isTechnical": isTechnical + 0,
                    "title": title,
                    "content": body,
                    "images": images
                }
                
                console.log(postBody);

                let postID = createPost(postBody);
                postID.then((postID) => {
                    console.log(postID);
                    console.log("This is the post ID")
                    console.log(tagBody);
                    console.log("This is the tagBody")
                    updateTags(postID, tagBody).then(() => {
                        // window.location.href = "../";
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

submitButton.addEventListener("click", submitPost);



//modal for when the user wants to add tags
async function selectTagsPopup() {

    let fragment = document.createDocumentFragment();
    globalTagsList.forEach((tag) => {
        renderTag(tag, fragment);
    });

    const callback = (ctx) => {
        ctx.content.innerHTML = `
        <div class="select-tags-container">
            <div class="search">
                <input class="search-input"  id="tag-modal-search" type="text" autocomplete="off" placeholder="Search Topics">

                </input>
                <div class="search-icon">
                    <span class="material-symbols-rounded">search</span>
                </div>
                <div class="search-icon clear-icon" stlye="display: none;">
                    <span class="material-symbols-rounded">close</span>
                </div>
            </div>

            <div class="tags-list">
                
            </div>
        </div>
        `;
        const tagSearchList = ctx.content.querySelector(".tags-list");
        tagSearchList.appendChild(fragment);

        tagSearchList.forEach((tag) => {
            if (!tag.classList.contains("tag")) {
                return;
            }
            tag.addEventListener("click", () => {
                let tagID = tag.getAttribute("tagID");
 
                if (globalCurrentTags.includes(tagID)) {
                    globalCurrentTags = globalCurrentTags.filter((tag) => tag !== tagID);
                    tag.classList.remove("selected");
                } else {
                    globalCurrentTags.push(tagID);
                    tag.classList.add("selected");
                }

            });

        });

                
                




        let searchInput = ctx.content.querySelector("#tag-modal-search");

        searchInput.addEventListener("input", () => {
            let searchValue = searchInput.value;
            let tags = tagSearchList.querySelectorAll(".tag");
            tags.forEach((tag) => {
                if (tag.getAttribute("name").toLowerCase().includes(searchValue.toLowerCase())) {
                    tag.style.display = "block";
                } else {
                    tag.style.display = "none";
                }
            });
        })


        
        

    }

    
    await global.popupModal(
        false,
        "Select Topics",
        callback,
        {text:"Submit", class:"blue"},
    )
    let manHours = hoursInput * 3600 + minutesInput * 60;
    
    //we dont submit if they havent entered any hours
    if (manHours === 0) {
        return;
    }

    //api requires the full man hours, not just the current addition
    let totalManHours = task.totalManHours + manHours;
    totalManHours = parseInt(totalManHours);
    totalManHours = Math.floor(totalManHours);

    let projID = globalCurrentProject.projID;
    let taskID = task.taskID;

    let res = await put_api(`/project/task.php/manhours/${projID}/${taskID}`, {manHours: totalManHours});

    if (res.success) {
        console.log(`[addManHoursPopup] Added ${manHours} to task ${taskID}`);
        let session = await global.getCurrentSession();
        let empID = session.employee.empID;
        let entry = task.employeeManHours.find(entry => entry.empID === empID);
        if (entry) {
            entry.manHours += manHours;
        } else {
            task.employeeManHours.push({empID: empID, manHours: manHours});
        }
        task.totalManHours = totalManHours;
        global.popupAlert(
            "Manhours submitted",
            "Your manhours have been logged successfully",
            "success",
        ).then(() => {
            showTaskInExplainer(taskID);
        });
    } else {
        global.popupAlert(
            "Failed to log your manhours",
            "The following error was occured: " + res.error.message,
            "error",
        );

        console.error(`[addManHoursPopup] Failed to add ${manHours} to task ${taskID}`);
    }

}



//stops user accidentally discarding changes by refreshing or closing the page
const changeListener = setInterval(() => {
    let quillContent = JSON.stringify(quill.getContents());
    let postTitle = postTitleInput.value;
    let isTechnical = categorySelector.getElementsByTagName("input")[0].checked;

    anyChanges = false;
    if (editing && postBeingEdited) {
        
        if (quillContent !== JSON.stringify(postBeingEdited.content)) {
            anyChanges = true;
        }

        if (postTitle !== postBeingEdited.title) {
            anyChanges = true;
        }

        if (isTechnical !== postBeingEdited.isTechnical) {
            anyChanges = true;
        }

    } else {
        if (quillContent !== '{"ops":[{"insert":"\\n"}]}') {
            anyChanges = true;
        }
        if (postTitle !== "") {
            anyChanges = true;
        }
    }
    submitButton.classList.remove("disabled");
}, 1000);
window.addEventListener('beforeunload', (event) => {
    if (!anyChanges) {
        return;
    }
    event.preventDefault();

    //resets the sidebar item selection if they made one
    let sidebarItems = document.querySelectorAll(".sidebar-item")
    sidebarItems.forEach((item) => {
        item.classList.remove("selected");
    })
    document.getElementById('wiki').classList.add("selected");
    
    return "";
})


//init the page

setEditing();

