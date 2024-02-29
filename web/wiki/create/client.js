import * as global from "../../global-ui.js"

const fullScreenDiv = document.querySelector(".main");


const postTagsList = document.querySelector("#listOfTags > .tags");
const postTagsListEmptyState = document.querySelector("#listOfTags > .empty-state");
const submitButton = document.getElementById("submit-button");
const submitButtonLabel = submitButton.querySelector(".button-text");
const selectTagsButton = document.getElementById("add-tags-button");

const pageTitle = document.getElementById("page-title");


const postTitleInput = document.getElementById("post-title-input");
const categorySelector = document.querySelector(".type-of-post");


const STATE = {
    editing: true,
    originalPost: null,
    currentTags: new Set(),
    anyChanges: false,
    usedImageIDs: new Set(),
    previousImages: new Map(),
    initialDrawComplete: false,
}

document.state = STATE;
const tagMap = new Map();


const promises = {
    tags: fetchTags(),
    post: fetchPost(),
}

setEditing();

function getPostId() {
    return window.location.hash.substring(1);
}

function createImageID() {
    let id = 0;
    while (STATE.usedImageIDs.has(id)) {
        id++;
    };
    STATE.usedImageIDs.add(id);
    return id;
}

selectTagsButton.addEventListener("pointerup", () => {
    selectTagsPopup()
});




function renderTag(tag, parent) {
    let tagDiv = document.createElement("div");

    tagDiv.classList.add("tag");
    tagDiv.setAttribute("name", tag.name);
    tagDiv.setAttribute("tagID", tag.tagID);

    tagDiv.innerHTML = `<span class="material-symbols-rounded">sell</span>${tag.name}`;
    parent.insertBefore(tagDiv, parent.firstChild);
    return tagDiv;
}



async function fetchTags() {
    const res = await get_api("/wiki/post.php/tags");

    if (res.success == true) {
        res.data.tags.forEach((tag) => {
            tagMap.set(tag.tagID, tag);
        });
    } else {
        global.popupAlert(
            "Sorry, we couldn't fetch topics right now, please try again.",
            "The following error occured: " + res.error.message,
            "error"
        );
    }
}

async function fetchPost() {

    let postID = getPostId();

    if (!postID || postID == "") {
        return
    }

    const res = await get_api(`/wiki/post.php/post/${postID}`);
    if (res.success == true) {
        STATE.originalPost = res.data;
    } else {
        global.popupAlert(
            "Sorry, we couldn't find the post you're trying to edit",
            "The following error occured: " + res.error.message,
            "error"
        ).finally(() => {
            STATE.anyChanges = false;
            window.location.href = "/wiki/";
        });
    }
}


async function setEditing() {
    let postID = getPostId();

    document.postID = postID;

    if (!postID || postID == "") {
        global.setBreadcrumb(["Wiki", "Create Post"], ["/wiki/", "/wiki/create/"]);
        pageTitle.innerHTML = "Create Post";
        STATE.editing = false;
        STATE.initialDrawComplete = true;
        return
    }

    STATE.editing = true;

    //sets the breadcrumb, title, submit button text for editing
    pageTitle.innerHTML = "Edit Post";
    document.title = "Edit Post";
    submitButtonLabel.innerText = "Save Changes";

    await promises.post;

    global.setBreadcrumb(["Wiki", `Editing ${STATE.originalPost.title}`], ["/wiki/", `/wiki/create/#${postID}`]);


    await renderPostInEditor(STATE.originalPost);
    STATE.initialDrawComplete = true;

}

async function renderPostInEditor(post) {

    const content = JSON.parse(post.content);

    const indexMap = {};

    content.ops.forEach((op, key) => {
        if (op.insert.image) {
            indexMap[op.insert.image] = key; 
            STATE.usedImageIDs.add(op.insert.image);
        }
    });


    post.images.forEach((image) => {
        const asset = image.asset;
        const op = content.ops[indexMap[image.index]]

        const url = global.assetToUrl(global.ASSET_TYPE_POST, post.postID, asset.assetID, asset.contentType);

        STATE.previousImages.set(url, image.index);

        op.insert.image = url;
        op.insert.previousID = image.index;
    });

    editor.setContents(content);


    postTitleInput.value = post.title;


    if (post.isTechnical == 1) {
        document.getElementsByClassName("type-of-post")[0].getElementsByTagName("input")[0].checked = true;
    } else {
        document.getElementsByClassName("type-of-post")[0].getElementsByTagName("input")[1].checked = true;
    }

    if (post.tags == null || post.tags.length == 0) {
        return
    }

    await promises.tags;

    post.tags.forEach((tagID) => {    
        addTagToCurrentList(tagID);
    });
}


const editor = new Quill('#editor', {
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



//modal for when the user wants to add tags
async function selectTagsPopup() {

    await promises.tags;
    await promises.post;

    let fragment = document.createDocumentFragment();
    tagMap.forEach((tag) => {
        renderTag(tag, fragment);
    });

    const callback = (ctx) => {
        ctx.content.innerHTML = `
        <div class="select-tags-container">
            <div class="input-container">
                <div class="search">
                    <input class="search-input"  id="tag-modal-search" type="text" autocomplete="off" placeholder="Type to search or create">
                    </input>
                    <div class="search-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="search-icon clear-icon">
                        <span class="material-symbols-rounded">close</span>
                    </div>
                </div>
                <div class="text-button blue disabled" id="create-new-topic">
                    <div class="button-text">Create New</div>
                </div>
            </div>

            <div id="modal-tags-list" class="tag-selection">
                
            </div>
        </div>
        `;

        ctx.cancelButton.classList.add("norender");

        const tagSearchList = ctx.content.querySelector("#modal-tags-list");
        const createButton = ctx.content.querySelector("#create-new-topic");
        let searchInput = ctx.content.querySelector("#tag-modal-search");



        tagSearchList.appendChild(fragment);

        createButton.addEventListener("pointerup", async () => {
            if (createButton.classList.contains("disabled")) {
                return;
            }
            ctx.content.classList.add("animate-spinner");

            const tagName = searchInput.value;

            const res = await post_api("/wiki/post.php/tag", { name: tagName, colour: 0 });

            ctx.content.classList.remove("animate-spinner");
            
            if (res.success == true) {
                tagMap.set(res.data.tagID, res.data);
                let elem = renderTag(res.data, tagSearchList);
                elem.classList.add("selected");
                addTagToCurrentList(res.data.tagID);
                STATE.anyChanges = true;
                submitButton.classList.remove("disabled");
                createButton.classList.add("disabled");
            }
            
            
        });

        Array.from(tagSearchList.children).forEach((tag) => {
            if (!tag.classList.contains("tag")) {
                return;
            }
            const tagID = tag.getAttribute("tagID");

            if (STATE.currentTags.has(tagID)) {
                tag.classList.add("selected");
            }

            tag.addEventListener("pointerup", () => {
                
                STATE.anyChanges = true;
                submitButton.classList.remove("disabled");

                if (STATE.currentTags.has(tagID)) {
                    removeTagFromCurrentList(tagID);
                    tag.classList.remove("selected");
                } else {
                    addTagToCurrentList(tagID);
                    tag.classList.add("selected");
                }
            });

        });

        searchInput.addEventListener("input", () => {
            let searchValue = searchInput.value;

            if (searchValue.length == 0) {
                createButton.classList.add("disabled");
            } else {
                createButton.classList.remove("disabled");
            }

            let tags = tagSearchList.querySelectorAll(".tag");
            tags.forEach((tag) => {
                if (tag.getAttribute("name").toLowerCase().includes(searchValue.toLowerCase())) {
                    tag.classList.remove("norender");
                } else {
                    tag.classList.add("norender");
                }
            });
        })
    }

    
    await global.popupModal(
        false,
        "Select Topics",
        callback,
        {text:"Done", class:"blue"},
    )

}


function addTagToCurrentList(tagID) {
    let tag = tagMap.get(tagID);


    console.log("[addTagToCurrentList] adding",tag.name)

    if (STATE.currentTags.has(tagID)) {
        return;
    }
    STATE.currentTags.add(tagID);
    renderTag(tag, postTagsList);
    tagListShowAsNeeded();
}

function removeTagFromCurrentList(tagID) {
    let tag = tagMap.get(tagID);

    console.log("[removeTagFromCurrentList] removing",tag.name)

    if (!STATE.currentTags.has(tagID)) {
        return;
    }
    STATE.currentTags.delete(tagID);
    let element = postTagsList.querySelector(`[tagID="${tagID}"]`);
    element.remove();
    tagListShowAsNeeded();
}

function tagListShowAsNeeded() {
    if (STATE.currentTags.size != 0) {
        postTagsListEmptyState.classList.add("norender");
        postTagsList.classList.remove("norender");
    } else {
        postTagsListEmptyState.classList.remove("norerender");
        postTagsList.classList.add("norender");
    }
}


submitButton.addEventListener("pointerup", async () => {

    if (submitButton.classList.contains("disabled")) {
        return;
    }

    if (STATE.editing) {
        await editPost();
    } else {
        await createPost();
    }

});

async function createPost() {

    fullScreenDiv.classList.add("animate-spinner");

    const imageMap = new Map();

    const content = JSON.parse(JSON.stringify(editor.getContents()));

    content.ops.forEach((op) => {
        if (op.insert.image) {
            const data = op.insert.image;
            const imageData = data.split(",")[1];
            const imageID = createImageID();
            imageMap.set(imageID, imageData);
            op.insert.image = imageID;
        }
    });

    const body = {
        title: postTitleInput.value,
        content: JSON.stringify(content),
        isTechnical: categorySelector.getElementsByTagName("input")[0].checked + 0,
        images: Object.fromEntries(imageMap),
    }

    const res = await post_api("/wiki/post.php/post", body);
    fullScreenDiv.classList.remove("animate-spinner");

    if (res.success == true) {
        const setTagsPromise = setPostTags(false, res.data.postID);
        global.popupAlert(
            "Post created successfully",
            "Your post has been created",
            "success"
        ).finally(async () => {
            const tagRes = await setTagsPromise;
            handleTagRes(tagRes).then(() => {
                STATE.anyChanges = false;
                window.location.href = `/wiki/post/#${res.data.postID}`;
            });
        });
    } else {
        global.popupAlert(
            "Sorry, we couldn't create the post",
            "The following error occured: " + res.error.message,
            "error"
        );
    }

}



function setEquality(set1, set2) {
    if (set1.size != set2.size) {
        return false;
    }
    for (let item of set1) {
        if (!set2.has(item)) {
            return false;
        }
    }
    return true;
}


async function setPostTags(editing, postID) {

    if (editing) {
        // if editing then we only set tags if they have changed
        if (setEquality(STATE.currentTags, new Set(STATE.originalPost.tags))) { return; }
    } else {
        // if creating then we only set tags if there are any
        if (STATE.currentTags.size == 0) { return; }
    }


    const tags = Array.from(STATE.currentTags);

    const body = {
        tags: tags,
    }

    const res = await put_api(`/wiki/post.php/post/${postID}/tags`, body);

    return res;
}

async function handleTagRes(res) {

    if (res == undefined) {
        return;
    }


    if (res.success == true) {
        console.log("tags set successfully");
    } else {
        return global.popupAlert(
            "Unable to set topics for post",
            "The following error occured: " + res.error.message,
            "error"
        );
    }

}



async function editPost() {
    
    const imageMap = new Map();

    // deep copy the content so we dont mess it up on failure
    const content = JSON.parse(JSON.stringify(editor.getContents()));
    const previousContent = JSON.parse(STATE.originalPost.content);

    console.log("content", content);
    console.log("previousImages", STATE.previousImages); 

    content.ops.forEach((op) => {
        if (op.insert.image) {

            const data = op.insert.image;

            // old image, no need to edit
            if (data.startsWith("https")) {
                op.insert.image = STATE.previousImages.get(data);
                return;
            }

            // remove the data url
            const imageData = data.split(",")[1];
            const imageID = createImageID();
            imageMap.set(imageID, imageData);
            op.insert.image = imageID;
        }
    });


    const body = {}


    const jsonContent = JSON.stringify(content);
    if (jsonContent !== STATE.originalPost.content) {
        body.content = jsonContent;
        if (imageMap.size != 0) {
            body.images = Object.fromEntries(imageMap);
        }
    }

    if (postTitleInput.value !== STATE.originalPost.title) {
        body.title = postTitleInput.value;
    }

    if (categorySelector.getElementsByTagName("input")[0].checked+0 !== STATE.originalPost.isTechnical) {
        body.isTechnical = categorySelector.getElementsByTagName("input")[0].checked + 0;
    }

    let res;
    // only edit if there are changes
    if (Object.keys(body).length != 0) {
        fullScreenDiv.classList.add("animate-spinner");
        res = await patch_api(`/wiki/post.php/post/${STATE.originalPost.postID}`, body);
        fullScreenDiv.classList.remove("animate-spinner");
    }

    // only change tags if there are changes
    if (res == undefined) {
        const tagRes = await setPostTags(true, STATE.originalPost.postID);
        if (tagRes == undefined) {
            return;
        }

        if (tagRes.success == true) {
            global.popupAlert(
                "Post updated successfully",
                "The topics for your post have been updated successfully",
                "success"
            ).finally(() => {
                STATE.anyChanges = false;
                window.location.href = `/wiki/post/#${STATE.originalPost.postID}`;
            });
        } else {
            global.popupAlert(
                "Sorry, we couldn't update the post topics",
                "The following error occured: " + tagRes.error.message,
                "error"
            );
        }
        return;
    }


    if (res.success == true) {
        const setTagsPromise = setPostTags(true, STATE.originalPost.postID);
        global.popupAlert(
            "Post updated successfully",
            "Your post has been updated",
            "success"
        ).finally(async () => {
            const tagRes = await setTagsPromise;
            handleTagRes(tagRes).then(() => {
                STATE.anyChanges = false;
                window.location.href = `/wiki/post/#${res.data.postID}`;
            });
        });
    } else {
        global.popupAlert(
            "Sorry, we couldn't update the post",
            "The following error occured: " + res.error.message,
            "error"
        );
    }

}




//stops user accidentally discarding changes by refreshing or closing the page
postTitleInput.addEventListener("input", () => {

    submitButton.classList.remove("disabled");


    STATE.anyChanges = true;
});

editor.on("text-change", () => {


    if (!STATE.initialDrawComplete) {
        return;
    }

    submitButton.classList.remove("disabled");
    STATE.anyChanges = true;
});

categorySelector.addEventListener("input", () => {
    submitButton.classList.remove("disabled");
    STATE.anyChanges = true;
});




window.addEventListener('beforeunload', (event) => {
    if (!STATE.anyChanges) {
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

