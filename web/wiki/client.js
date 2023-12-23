import * as global from "../global-ui.js"
import { animate } from "../global-ui.js"

var postsContainer = document.querySelector('.posts');
var selectedTags = document.querySelectorAll('.tag.selected');
var posts = document.querySelectorAll('.post');
var selectedCategory = document.querySelector('input[name="category"]:checked');
var selectedValue = selectedCategory.value;
var nonTechnicalTags = ["Printer", "Stationary", "Meeting Rooms", "Office Supplies", "Filing", "Cleaning", "Mail", "Reception"]
var technicalTags = ["HTML", "CSS", "JavaScript", "Python", "Java", "C++", "Ruby", "PHP", "Swift", "Kotlin", "TypeScript", "Go"]
console.log(selectedTags);

var postsMap = new Map();

async function fetchPosts() {
    global.setBreadcrumb(["Wiki"], ["./"]);

    const data = await get_api("/wiki/post.php/posts");
    console.log(data);
    if (data.success == true) {
        console.log("Posts have been fetched")
        data.data.posts.forEach(post => {
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

//I removed the tag assigning code here because we will be getting tags from the database
//tag rendering code should live in the renderPost
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
            window.location.href = `/wiki/edit/#${postID}`;
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
    if (tags == null) {
        tags = ["Tag 1", "Tag 2"];
    }

    let tag1 = tags[0];
    let tag2 = tags[1];
    
    let post = document.createElement("div")
    post.classList.add("post")
    post.innerHTML = `
        <div class="post-info">
            <div class="title">${title}</div>
            <div class="author">
                <img class="avatar" src="${global.employeeAvatarOrFallback(author)}" width="30" height="30">
                ${global.bothNamesToString(author.firstName, author.lastName)}
            </div>
            <div class="tags">
                <div class="tag" name="${tag1}"><span class="material-symbols-rounded">sell</span>
                    ${tag1}
                </div>
                <div class="tag" name="${tag2}"><span class="material-symbols-rounded">sell</span>
                    ${tag2}
                </div>
                
            </div>
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

    post.setAttribute("data-postID", postID)
    post.setAttribute("data-isTechnical", isTechnical)

    postsContainer.appendChild(post)
}

function updatePosts() {
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

function updateTags() {
    selectedCategory = document.querySelector('input[name="category"]:checked');
    selectedValue = selectedCategory.value;
    let tagSelection = document.querySelector('.tag-selection');
    let tags = tagSelection.querySelectorAll('.tag');
    tags.forEach((tag) => {
        if (tag.getAttribute("is-technical") === selectedValue || tag.getAttribute("is-technical") === "2") {
            tag.classList.remove("norender");
        } else {
            tag.classList.add("norender");
        }
    })
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

document.querySelectorAll('.tag').forEach((tag) => {
    tag.addEventListener('click', () => {
        tag.classList.toggle('selected');
        updatePosts();
    })
});

document.querySelectorAll('input[name="category"]').forEach((radio) => {
    radio.addEventListener('change', () => {
        document.querySelectorAll('.tag').forEach((tag) => {
            tag.classList.remove('selected');
        });
        updatePosts();
        updateTags();
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