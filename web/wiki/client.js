import { search } from "../global-topbar.js";
import * as global from "../global-ui.js"
import { animate } from "../global-ui.js"

class Tag {
    constructor(name, tagID) {
        this.tagID = tagID;
        this.name = name;
        this.numPosts = 0;
        this.content = null
    }
    renderTag() {
        const tag = document.createElement('div');
        tag.classList.add('tag');
        tag.setAttribute('id', "delTag")
        tag.setAttribute('tagID', this.tagID);
        tag.innerHTML = `<span class="material-symbols-rounded">sell</span>${this.name}&nbsp;<span class="numPosts">${this.numPosts}</span>`;
        document.querySelector('.tagsContainer').appendChild(tag);
        this.content = tag;
        this.addEventListeners();
    }
    addEventListeners() {
        this.content.addEventListener('click', () => {
            if (this.content.classList.contains('selectedDel')) {
                this.content.classList.toggle('selectedDel');
                tagsToDelete = tagsToDelete.filter((e) => e !== this.tagID);
            } else {
                this.content.classList.toggle('selectedDel');
                tagsToDelete.push(this.tagID);
            }
            if (tagsToDelete.length > 0) {
                document.getElementById("create-button").classList.remove("disabled");
            }
            else {
                document.getElementById("create-button").classList.add("disabled");
            }
        });
    }
    addPostNum() {
        this.numPosts++;
        deleteTagsDisplay.sort((a, b) => b.numPosts - a.numPosts);
    }
}

var deleteTagsDisplay = [];
var tagsToDelete = [];
var postsContainer = document.querySelector('.posts');
var posts = document.querySelectorAll('.post');
const searchInput = document.getElementById("inputField")

var postsMap = new Map();


async function searchPosts() {
    let search = searchInput.value;
    let tags = [];

    var selectedTags = document.querySelectorAll('.tag.selected');

    selectedTags.forEach((tag) => {
        tags.push(tag.getAttribute("tagID"));
    });
    var selectedCategory = document.querySelector('input[name="category"]:checked');
    await fetchPosts(tagsList, selectedCategory.value, search, tags);
}


const roller = new global.ReusableRollingTimeout(() => {
    searchPosts();
}, 150);

async function updatePosts() {
    roller.roll();
}

async function countPostTags() {
    const nonTechnicalData = await get_api(`/wiki/post.php/posts?is_technical=0&q=`);
    const technicalData = await get_api(`/wiki/post.php/posts?is_technical=1&q=`);
    if (nonTechnicalData.success !== true) {
        console.log("Posts failed to be fetched");
        return;
    }
    nonTechnicalData.data.posts.forEach(post => {
        if (post.tags != null) {
            post.tags.forEach((tag) => {
                deleteTagsDisplay.find(findTag(tag)).addPostNum();
            });
        }
    });
    technicalData.data.posts.forEach(post => {
        if (post.tags != null) {
            post.tags.forEach((tag) => {
                deleteTagsDisplay.find(findTag(tag)).addPostNum();
            });
        }
    });
    deleteTagsDisplay.forEach((tag) => {
        tag.renderTag();
    });
}

async function fetchPosts(tagsList, isTechnical = 1, searchQuery = "", selectedTags = []) {

    const tagParam = selectedTags.length ? `&tags=${selectedTags.join(",")}` : "";
    const technicalPostsData = await get_api(`/wiki/post.php/posts?is_technical=${isTechnical}&q=${searchQuery}${tagParam}`);
    const nonTechnicalPostsData = await get_api(`/wiki/post.php/posts?is_technical=${isTechnical ? 0 : 1}&q=${searchQuery}${tagParam}`);

    console.log(technicalPostsData);
    console.log(nonTechnicalPostsData);

    if (technicalPostsData.success !== true) {
        console.log("Posts failed to be fetched");
        return;
    }

    if (nonTechnicalPostsData.success !== true) {
        console.log("Posts failed to be fetched");
        return;
    }

    document.querySelectorAll('.post').forEach((post) => { post.remove() });

    console.log("Posts have been fetched");
    technicalPostsData.data.posts.forEach(post => {
        console.log(post);
        console.log(post.tags);

        if (post.tags != null) {

            let newtags = [];
            console.log(post.tags);
            console.log("TAGS");

            post.tags.forEach((tag) => {
                newtags.push(tagsList.find(findTag(tag)).name);
                console.log(tag);
                console.log("REPLACING TAGS");
            });

            post.tagsNames = newtags;
        }

        console.log("Rendering post");
        renderPost(post.postID, post.title, post.author, post.isTechnical, post.tagsNames);
        
        postsMap.set(post.postID, post);
        console.log(post);

    });
    setUpPostsEventListeners();
    posts = document.querySelectorAll('.post');
    console.log(postsMap);
}

async function fetchTags() {
    const data = await get_api("/wiki/post.php/tags");

    if (data.success !== true) {
        console.log("Tags failed to be fetched");
        return;
    }

    console.log("Tags have been fetched");
    document.querySelector('.tag-selection').innerHTML = '';
    data.data.tags.forEach(tag => {
        document.querySelector('.tag-selection').innerHTML += `<div class="tag" tagID="${tag.tagID}" name="${tag.name}" id="normal"><span class="material-symbols-rounded">sell</span>${tag.name}</div>`;
        let tempTag = new Tag(tag.name, tag.tagID);
        deleteTagsDisplay.push(tempTag);
    });
    return data.data.tags;
}

async function deleteTag(tagID) {
    let result = await delete_api(`/wiki/post.php/tag/${tagID}`);
    console.log(result);
    if (result.success !== true) {
        console.log("Tags failed to be deleted");
        return;
    }
}

document.querySelector('#create-button').addEventListener('click', () => {
    if (tagsToDelete.length > 0) {
        const deleteSelectedTags = tagsToDelete.map((tag) => deleteTag(tag));
        Promise.all(deleteSelectedTags).then(() => {
            console.log("Tags have been deleted");
            //location.reload();
            tagsToDelete = [];
            document.querySelectorAll(".tag.selectedDel").forEach((tag) => {
                tag.classList.remove("selectedDel");
                tag.remove();
            });
            document.getElementById("create-button").classList.add("disabled");
            fetchPosts(tagsList);
            fetchTags()
            closePopup();
            });

    }
});

let tagsList;
fetchTags().then((tags) => {
    document.querySelectorAll('.tag').forEach((tag) => {
        tag.addEventListener('click', () => {
            if (tag.attributes.getNamedItem('id').value === "delTag") {
                return;
                if (tag.classList.contains('selectedDel')) {
                    tag.classList.toggle('selectedDel');
                    tagsToDelete = tagsToDelete.filter((e) => e !== tag.getAttribute("tagID"));
                } else {
                    tag.classList.toggle('selectedDel');
                    tagsToDelete.push(tag.getAttribute("tagID"));
                }
                if (tagsToDelete.length > 0) {
                    document.getElementById("create-button").classList.remove("disabled");
                }
                else {
                    document.getElementById("create-button").classList.add("disabled");
                }
            } else {
                tag.classList.toggle('selected');
                updatePosts();
            }
            console.log(tagsToDelete);
        })
    });

    fetchPosts(tags);
    tagsList = tags;
    countPostTags();
});


let postList = document.querySelectorAll('.post');
function setUpPostsEventListeners() {
    postList = document.querySelectorAll('.post');
    postList.forEach((post) => {
        post.querySelector(".delete-post").addEventListener("click", (event) => {
            event.stopPropagation();
            confirmDelete().then(() => {
                post.remove();
                let postID = post.getAttribute("data-postID");
                console.log(postID);
                delete_api(`/wiki/post.php/post/${postID}`).then((data) => {
                    console.log(data);
                });
            }).catch(() => {
                console.log('Deletion cancelled');
            });
        });

        post.querySelector(".edit-post").addEventListener("click", (event) => {
            event.stopPropagation();
            let postID = post.getAttribute("data-postID")
            window.location.href = `/wiki/create/#${postID}`;
        });
        post.addEventListener("click", () => {
            let postID = post.getAttribute("data-postID")
            console.log("Post clicked")
            window.location.href = `/wiki/post/#${postID}`;
        })
    })
}

function findTag(tagID) {
    return function (tag) {
        return tag.tagID === tagID;
    }
}

function findTagName(tagName) {
    return function (tag) {
        return tag.name === tagName;
    }
}

/**
 * Constructs a post HTML element and appends it to the posts container.
 *
 * @param {string} postID 
 * @param {string} title 
 * @param {string} author
 * @param {boolean} isTechnical - 1 if the post is technical, 0 if it is non-technical.
 * @param {Array<string>} tags - array of tags associated with the post. Defaults to ["No Tags"] to avoid null checks.
 */
function renderPost(postID, title, author, isTechnical, tags) {
    const post = document.createElement("div")
    post.className = "post"
    post.setAttribute("data-postID", postID)
    post.setAttribute("data-isTechnical", isTechnical)

    const postInfo = document.createElement("div")
    postInfo.className = "post-info"

    const postTitle = document.createElement("div")
    postTitle.className = "title"
    postTitle.textContent = title

    const tagsContainer = document.createElement("div")
    tagsContainer.className = "tags"
    const tagsArray = Array.isArray(tags) ? tags : ["No Tags"]
    tagsArray.forEach(tag => {
        const tagDiv = document.createElement("div")
        tagDiv.className = "tag"
        tagDiv.setAttribute("name", tag)
        tagDiv.innerHTML = `<span class="material-symbols-rounded">sell</span>${tag}`;
        tagsContainer.appendChild(tagDiv)
    });

    const authorDiv = document.createElement("div")
    authorDiv.className = "author"
    authorDiv.innerHTML = `
        <div class="icon">
            <img class="avatar" src="${global.employeeAvatarOrFallback(author)}" width="30" height="30">
        </div>
        <div class="name">
            ${global.employeeToName(author)}
        </div>
    `;  

    const postIcons = document.createElement("div")
    postIcons.className = "post-icons manager-only"
    postIcons.innerHTML = `
        <div class="icon-button no-box edit-post"><span class="material-symbols-rounded">edit_square</span></div>
        <div class="text-button red delete-post"><span class="material-symbols-rounded">delete</span></div>
    `;

    postInfo.appendChild(postTitle)
    postInfo.appendChild(tagsContainer)

    authorDiv.appendChild(postIcons)    
    postInfo.appendChild(authorDiv)

    post.appendChild(postInfo)
   

    postsContainer.appendChild(post)
}


searchInput.addEventListener("input", updatePosts)


document.querySelectorAll('input[name="category"]').forEach((radio) => {
    radio.addEventListener('change', () => {
        updatePosts();
    })
});


function confirmDelete() {
    return new Promise((resolve, reject) => {
        let popupDiv = document.querySelector('.popup');
        let fullscreenDiv = document.querySelector('.fullscreen');

        popupDiv.innerHTML = `
            <dialog open class='popup-dialog'>
                <div class="popup-title">
                    Delete Post
                    <div class="small-icon close-button">
                        <span class="material-symbols-rounded">
                            close
                        </span>
                    </div>
                </div>
                <div class="popup-text">Are you sure you want to delete this post?</div>
                <div class="popup-text">This action cannot be undone?</div>
                <div class="popup-text">Reason for deleting</div>
                <ul class="popup-list">
                    <li class="popup-list-item"><input type="radio" name="deleteReason" value="1">Duplicate</li>
                    <li class="popup-list-item"><input type="radio" name="deleteReason" value="2">Out of Date</li>
                    <li class="popup-list-item"><input type="radio" name="deleteReason" value="3">Incorrect information</li>
                    <li class="popup-list-item"><input type="radio" name="deleteReason" value="4">Other</li>
                </ul>
                <div class="popup-buttons">
                    <div class="text-button" id="cancel-button">
                        <div class="button-text">Cancel</div>
                    </div>
                    <div class="text-button red" id="delete-button">
                        <div class="button-text">Delete</div>
                    </div>
                </div>
            </dialog>
        `;
        fullscreenDiv.style.filter = 'brightness(0.75)';

        let dialog = popupDiv.querySelector('.popup-dialog');
        let closeButton = dialog.querySelector('.close-button');
        let cancelButton = dialog.querySelector('#cancel-button');
        let deleteButton = dialog.querySelector('#delete-button');

        closeButton.addEventListener('click', (event) => {
            event.preventDefault();
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            reject();
        });

        cancelButton.addEventListener('click', (event) => {
            event.preventDefault();
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            reject();
        });

        deleteButton.addEventListener('click', (event) => {
            event.preventDefault();
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            resolve();
        });
    });
}

document.getElementById("new-post").addEventListener("click", () => {
    window.location.href = "/wiki/create/";
});

document.getElementById("manage-tags").addEventListener("click", () => {
    editTags();
});

function closePopup() {
    let popupDiv = document.querySelector('.popup');
    let fullscreenDiv = document.querySelector('.fullscreen');
    let dialog = popupDiv.querySelector('.popup-dialog');
    dialog.style.transform = 'translateY(-1%)'
    dialog.style.opacity = '0';
    dialog.style.display = 'none';
    fullscreenDiv.style.filter = 'none';
}

function editTags() {
    let popupDiv = document.querySelector('.popup');
    let fullscreenDiv = document.querySelector('.fullscreen');
    fullscreenDiv.style.filter = 'brightness(0.75)';
    let dialog = popupDiv.querySelector('.popup-dialog');
    dialog.style.transform = 'translateY(0px)'
    dialog.style.opacity = '1';
    dialog.style.display = 'flex';
    let createButton = dialog.querySelector('#create-button');
    let closeButton = dialog.querySelector('#close-button');

    closeButton.addEventListener('click', (event) => {
        event.preventDefault();
        closePopup();
    });
}


//initialise the page
global.setBreadcrumb(["Wiki"], ["./"]);