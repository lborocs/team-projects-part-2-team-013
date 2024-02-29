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
    return id;
}

selectTagsButton.addEventListener("click", () => {
    selectTagsPopup()
});




function renderTag(tag, parent) {
    let tagDiv = document.createElement("div");

    tagDiv.classList.add("tag");
    tagDiv.setAttribute("name", tag.name);
    tagDiv.setAttribute("tagID", tag.tagID);

    tagDiv.innerHTML = `<span class="material-symbols-rounded">sell</span>${tag.name}`;
    parent.appendChild(tagDiv);
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

    const res = await get_api(`/wiki/post.php/post/${postID}`);
    if (res.success == true) {
        STATE.originalPost = res.data;
    } else {
        global.popupAlert(
            "Sorry, we couldn't find the post you're trying to edit",
            "The following error occured: " + res.error.message,
            "error"
        ).finally(() => {
            window.location.href = "/wiki/";
        });
    }
}


async function setEditing() {
    let postID = getPostId();

    if (postID == "") {
        global.setBreadcrumb(["Wiki", "Create Post"], ["/wiki/", "/wiki/create/"]);
        pageTitle.innerHTML = "Create Post";
        STATE.editing = false;
        return
    }

    STATE.editing = true;

    //sets the breadcrumb, title, submit button text for editing
    global.setBreadcrumb(["Wiki", "Edit Post"], ["/wiki/", `/wiki/create/#${postID}`]);
    pageTitle.innerHTML = "Edit Post";
    document.title = "Edit Post";
    submitButtonLabel.innerText = "Save Changes";

    await promises.post;

    await renderPostInEditor(STATE.originalPost);

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

            <div id="modal-tags-list" class="tag-selection">
                
            </div>
        </div>
        `;

        ctx.cancelButton.classList.add("norender");

        const tagSearchList = ctx.content.querySelector("#modal-tags-list");
        tagSearchList.appendChild(fragment);


        Array.from(tagSearchList.children).forEach((tag) => {
            if (!tag.classList.contains("tag")) {
                return;
            }
            const tagID = tag.getAttribute("tagID");

            if (STATE.currentTags.has(tagID)) {
                tag.classList.add("selected");
            }

            tag.addEventListener("click", () => {
                

                if (STATE.currentTags.has(tagID)) {
                    removeTagFromCurrentList(tagID);
                    tag.classList.remove("selected");
                } else {
                    addTagToCurrentList(tagID);
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

    console.log(STATE.currentTags)

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

    console.log(STATE.currentTags)

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


    if (content !== previousContent) {
        body.content = JSON.stringify(content);
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

    fullScreenDiv.classList.add("animate-spinner");
    const res = await patch_api(`/wiki/post.php/post/${STATE.originalPost.postID}`, body);
    fullScreenDiv.classList.remove("animate-spinner");

    if (res.success == true) {
        global.popupAlert(
            "Post updated successfully",
            "Your post has been updated",
            "success"
        ).finally(() => {
            window.location.href = `/wiki/post/#${STATE.originalPost.postID}`;
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
const changeListener = setInterval(() => {
    let quillContent = JSON.stringify(editor.getContents());
    let postTitle = postTitleInput.value;
    let isTechnical = categorySelector.getElementsByTagName("input")[0].checked;

    STATE.anyChanges = false;
    if (STATE.editing) {
        
        if (quillContent !== JSON.stringify(STATE.originalPost.content)) {
            STATE.anyChanges = true;
        }

        if (postTitle !== STATE.originalPost.title) {
            STATE.anyChanges = true;
        }

        if (isTechnical !== STATE.originalPost.isTechnical) {
            STATE.anyChanges = true;
        }

    } else {
        if (quillContent !== '{"ops":[{"insert":"\\n"}]}') {
            STATE.anyChanges = true;
        }
        if (postTitle !== "") {
            STATE.anyChanges = true;
        }
    }
    submitButton.classList.remove("disabled");
}, 1000);


window.addEventListener('beforeunload', (event) => {
    if (!STATE.anyChanges) {
        return;
    }
    return
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

