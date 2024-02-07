import * as global from "../global-ui.js"
import { animate } from "../global-ui.js"

var postsContainer = document.querySelector('.posts');
var selectedTags = document.querySelectorAll('.tag.selected');
var posts = document.querySelectorAll('.post');
var selectedCategory = document.querySelector('input[name="category"]:checked');
var selectedValue = selectedCategory.value;

var postsMap = new Map();

async function fetchPosts() {
    global.setBreadcrumb(["Wiki"], ["./"]);

    const data = await get_api("/wiki/post.php/posts");
    console.log(data);
    if (data.success == true) {
        console.log("Posts have been fetched")
        data.data.posts.forEach(post => {
            console.log(post)
            console.log(post.tags)
            console.log("Rendering post")
            renderPost(post.postID, post.title, post.author, post.isTechnical, post.tags)
            postsContainer = document.querySelector('.posts');
            // Store the post in the Map using postID as the key
            postsMap.set(post.postID, post);
            console.log(post)
        });
        setUpPostsEventListeners();
        posts = document.querySelectorAll('.post');
        console.log(postsMap)
    } else {
        console.log("Posts failed to be fetched")
    }
}

async function fetchTags() {
    const data = await get_api("/wiki/post.php/tags");
    console.log(data);
    if (data.success == true) {
        console.log("Tags have been fetched")
        data.data.tags.forEach(tag => {
            document.querySelector('.tag-selection').innerHTML += `<div class="tag"><span class="material-symbols-rounded">sell</span>${tag.name}</div>`
        });
        return data.data.tags;
    } else {
        console.log("Tags failed to be fetched")
    }
}

let tags = fetchTags();
tags.then((tags) => {
    document.querySelectorAll('.tag').forEach((tag) => {
        tag.addEventListener('click', () => {
            tag.classList.toggle('selected');
            updatePosts();
        })
    });
});

fetchPosts().then(() => {
    posts.forEach((post) => {
        selectedCategory = document.querySelector('input[name="category"]:checked')
        selectedValue = selectedCategory.value
        if (post.getAttribute("data-isTechnical") != selectedValue) {
            post.classList.add("norender");
        } else {
            post.classList.remove("norender"); 
        }
    })
});


let postList = document.querySelectorAll('.post');
function setUpPostsEventListeners() {
    postList = document.querySelectorAll('.post');
    postList.forEach((post) => {
        post.querySelector("#trash").addEventListener("click", (event) => {
            event.stopPropagation();
            confirmDelete().then(() => {
                post.remove();
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


/**
 * @param {Array} tags 
 */
function renderPost(postID, title, author, isTechnical, tags) {
    
    let post = document.createElement("div")
    post.classList.add("post")
    let postHTML = `
    <div class="post-info">
        <div class="title">${title}</div>
        <div class="author">
            <img class="avatar" src="${global.employeeAvatarOrFallback(author)}" width="30" height="30">
            ${global.employeeToName(author)}
        </div>
        <div class="tags">`;

    if (tags != null) {
        tags.forEach((tag) => {
            postHTML += `<div class="tag" name="${tag.name}"><span class="material-symbols-rounded">sell</span>${tag}</div>`;
        });
    } else {
        postHTML += `<div class="tag" name="NoTags">No Tags</div>`;
    }

    postHTML += `</div>
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

function updatePosts() {
    console.log("updating posts")
    selectedCategory = document.querySelector('input[name="category"]:checked');
    selectedValue = selectedCategory.value;
    selectedTags = [];
    document.querySelectorAll('.tag.selected').forEach((tagElement) => {
        selectedTags.push(tagElement.getAttribute("name"));
    });
    console.log(selectedTags);
    console.log(selectedTags.length)
    if (selectedTags.length === 0) {
        var isTechnical = document.getElementById('technical').checked;
        posts.forEach((post) => {
            if (post.dataset.istechnical === '0' && isTechnical === false) {
                post.classList.remove("norender");
            } else if (post.dataset.istechnical === '1' && isTechnical === true) {
                post.classList.remove("norender");
            } else {
                post.classList.add("norender");
            }
        })
    } else {
        console.log(`posts length ${posts.length}`)
        posts.forEach((post) => {
            let postTags = post.querySelectorAll(".tag");
            let postTagNames = [];
            let postCategory = post.getAttribute("data-isTechnical");
            postTags.forEach((tag) => {
                postTagNames.push(tag.getAttribute("name"));
            })
            console.log(postTagNames)
            let containsTag = false;
            selectedTags.forEach((tag) => {
                if (postTagNames.includes(tag)) {
                    console.log(tag)
                    containsTag = true;
                }
                console.log(containsTag)
            })
            console.log(selectedValue)
            console.log(postCategory)
            if (!containsTag || postCategory != selectedValue) {
                console.log("Post does not contain tag OR is not in selected category")
                post.classList.add("norender");
            } else {
                console.log("Post contains tag")
                post.classList.remove("norender"); 
            }
        })
    }
}


addEventListener("keydown", filterFromSearch)

function filterFromSearch() {
    console.log("searching")
    console.log(document.getElementById("inputField").value)
    let search = document.getElementById("inputField");
    updatePosts()
    if (search.length !== 0) {
        let searchValue = search.value.toUpperCase();
        let postTitles = document.querySelectorAll(".title");
        postTitles.forEach((title) => {
            let titleValue = title.innerText.toUpperCase();
            if (!titleValue.includes(searchValue)) {
                title.parentElement.classList.add("norender");
            }
        })
    } else {
        posts.forEach((post) => {
            post.classList.remove("norender");
        })
    
    }
}

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
                    <div class="text-button" id="closeButton">
                        <div class="button-text">Cancel</div>
                    </div>
                    <div class="text-button red" id="deleteButton">
                        <div class="button-text">Delete</div>
                    </div>
                </div>
            </dialog>
        `;
        fullscreenDiv.style.filter = 'brightness(0.75)';

        let dialog = popupDiv.querySelector('.popup-dialog');
        let closeButton = dialog.querySelector('#close-button');
        let deleteButton = dialog.querySelector('#delete-button');

        closeButton.addEventListener('click', (event) => {
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
})