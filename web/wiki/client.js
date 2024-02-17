import { search } from "../global-topbar.js";
import * as global from "../global-ui.js"
import { animate } from "../global-ui.js"

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


async function fetchPosts(tagsList, isTechnical = 1, search = "", tags = []) {
    global.setBreadcrumb(["Wiki"], ["./"]);

    const tagParam = tags.length ? `&tags=${tags.join(",")}` : "";
    const data = await get_api(`/wiki/post.php/posts?is_technical=${isTechnical}&q=${search}${tagParam}`);
    console.log(data);

    if (data.success !== true) {
        console.log("Posts failed to be fetched");
        return;
    }

    document.querySelectorAll('.post').forEach((post) => { post.remove() });    

    console.log("Posts have been fetched");
    data.data.posts.forEach(post => {
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
        console.log(post.tags);
        console.log(post.tagsNames);
        console.log("Rendering post");
        renderPost(post.postID, post.title, post.author, post.isTechnical, post.tagsNames);
        postsContainer = document.querySelector('.posts');
        // Store the post in the Map using postID as the key
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
    data.data.tags.forEach(tag => {
        document.querySelector('.tag-selection').innerHTML += `<div class="tag" tagID="${tag.tagID}" name="${tag.name}"><span class="material-symbols-rounded">sell</span>${tag.name}</div>`;
    });
    return data.data.tags;
}

let tagsList;
fetchTags().then((tags) => {
    document.querySelectorAll('.tag').forEach((tag) => {
        tag.addEventListener('click', () => {
            tag.classList.toggle('selected');
            updatePosts();
        })
    });

    fetchPosts(tags);
    tagsList = tags;
});


let postList = document.querySelectorAll('.post');
function setUpPostsEventListeners() {
    postList = document.querySelectorAll('.post');
    postList.forEach((post) => {
        post.querySelector("#trash").addEventListener("click", (event) => {
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

        post.querySelector("#edit").addEventListener("click", (event) => {
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
    return function(tag) {
        return tag.tagID === tagID;
    }
}

/**
 * @param {Array} tags 
 */
function renderPost(postID, title, author, isTechnical, tags) {
    
    let post = document.createElement("div")
    post.classList.add("post")
    let postHTML = `
    <div class="post-info">
        <div class="title">${title}</div>
        <div class="tags">`;

    if (tags != null) {
        tags.forEach((tag) => {
            postHTML += `<div class="tag" name="${tag}"><span class="material-symbols-rounded">sell</span>${tag}</div>`;
        });
    } else {
        postHTML += `<div class="tag" name="NoTags">No Tags</div>`;
    }

    postHTML += `</div>
        <div class="author">
            <img class="avatar" src="${global.employeeAvatarOrFallback(author)}" width="30" height="30">
            ${global.employeeToName(author)}
        </div>
    `

    postHTML += `
        </div>
        <div class="post-icons manager-only">
            <div class="icon-button no-box" id="edit">
                <div class="button-icon">
                    <span class="material-symbols-rounded">
                        edit
                    </span>
                </div>
            </div>
            <div class="icon-button no-box" id="trash">
            <div class="button-icon">
                    <span class="material-symbols-rounded">
                        delete
                    </span>
                </div>
            </div>
        </div>
    `;

    post.innerHTML = postHTML;

        post.setAttribute("data-postID", postID)
        post.setAttribute("data-isTechnical", isTechnical)

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

function editTags() {
    let popupDiv = document.querySelector('.popup');
    let fullscreenDiv = document.querySelector('.fullscreen');
    fullscreenDiv.style.filter = 'brightness(0.75)';
    let dialog = popupDiv.querySelector('.popupDialog');
    dialog.style.transform = 'translateY(0px)'
    dialog.style.opacity = '1';
    dialog.style.display = 'block';
    let createButton = dialog.querySelector('#create-button');
    let closeButton = dialog.querySelector('#close-button');

    closeButton.addEventListener('click', (event) => {
        event.preventDefault(); 
        dialog.style.transform = 'translateY(-1%)'
        dialog.style.opacity = '0';
        dialog.style.display = 'none';
        fullscreenDiv.style.filter = 'none';
    });
}