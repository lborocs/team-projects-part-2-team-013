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

async function fetchPosts() {
    
    try {

        const data = await get_api("/api/wiki/post.php/posts");
        console.log(data);
        if (data.success == true) {
            console.log("Posts have been fetched")
            data.data.posts.forEach( post => {
                let name = global.bothNamesToString(post.firstName, post.lastName);
                renderPost(post.postID, post.title, name, post.isTechnical)
                postsContainer = document.querySelector('.posts');
                console.log(postsContainer);
            });
            posts = document.querySelectorAll('.post');
        } else {
            console.log("Posts failed to be fetched")
        }



  
    } catch (error) {
        console.error(error);

    }
}


fetchPosts().then(() => {
    posts.forEach((post) => {
        let postTags = post.querySelectorAll(".tag");
        let postTagNames = [];
        postTags.forEach((tag) => {
            postTagNames.push(tag.innerText);
        })
        console.log(postTagNames);
        let containsTag = false;
        selectedTags.forEach((tag) => {
            if (postTagNames.includes(tag.innerText)) {
                containsTag = true;
            }
        })
        if (!containsTag) {
            post.classList.add("norender");
        } else {
            post.classList.remove("norender"); 
        }
        selectedCategory = document.querySelector('input[name="category"]:checked')
        selectedValue = selectedCategory.value
        if (post.getAttribute("data-isTechnical") != selectedValue) {
            post.classList.add("norender");
        } else {
            post.classList.remove("norender"); 
        }
    })
    

    
}).catch((error) => {
    console.error(error);
});


let postList = document.querySelectorAll('.post');
function setUpPostsEventListeners() {
    postList = document.querySelectorAll('.post');
    postList.forEach((post) => {
        post.querySelector(".delete").addEventListener("click", (event) => {
            event.stopPropagation();
            confirmDelete().then(() => {
                post.remove();
            }).catch(() => {
                console.log('Deletion cancelled');
            });
        });

        post.addEventListener("click", () => {
            let postID = post.getAttribute("data-postID")
            console.log("Post clicked")
            window.location.href = `/wiki/post/index.html#${postID}`;
        })
    })
}


function renderPost(postID, title, author, isTechnical) {
    if (isTechnical == 0) {
        var tag1 = nonTechnicalTags[Math.floor(Math.random() * nonTechnicalTags.length)];
        var tag2 = tag1
        while (tag2 == tag1) {
            tag2 = nonTechnicalTags[Math.floor(Math.random() * nonTechnicalTags.length)];
        }
    } else if (isTechnical == 1) {
        var tag1 = technicalTags[Math.floor(Math.random() * technicalTags.length)];
        var tag2 = tag1
        while (tag2 == tag1) {
            tag2 = technicalTags[Math.floor(Math.random() * technicalTags.length)];
        }
    }
    let post = document.createElement("div")
    post.classList.add("post")
    post.innerHTML = `
        <div class="title">${title}</div>
        <div class="author">
            <img class="avatar" src="${global.nameToAvatar(author)}" width="30" height="30">
            ${author}
        </div>
        <div class="tags">
            <div class="tag" name="${tag1}"><i class="fa-solid fa-tag"></i>
                ${tag1}
            </div>
            <div class="tag" name="${tag2}"><i class="fa-solid fa-tag"></i>
                ${tag2}
            </div>
            <div class="delete manager-only">
                <i class="fa-regular fa-trash-can"></i>
            </div>
        </div>
    `;

    post.setAttribute("data-postID", postID)
    post.setAttribute("data-isTechnical", isTechnical)

    postsContainer.appendChild(post)
    setUpPostsEventListeners()
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
        console.log(posts.length)
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
    updateTags()
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
        updatePosts();
        updateTags();
    })
});


function confirmDelete() {
    return new Promise((resolve, reject) => {
        let popupDiv = document.querySelector('.popup');
        let fullscreenDiv = document.querySelector('.fullscreen');

        popupDiv.innerHTML = `
            <dialog open class='popupDialog'>
                <p>Are you sure you want to delete this post?</p>
                <p><strong>This change cannot be undone.</strong></p>
                <form method="dialog" class = "buttonForm">
                    <button class="closeButton">Cancel</button>
                    <button class="deleteButton">Delete</button> 
                </form>
            </dialog>
        `;
        fullscreenDiv.style.filter = 'brightness(0.6)';

        let dialog = popupDiv.querySelector('.popupDialog');
        let closeButton = dialog.querySelector('.closeButton');
        let deleteButton = dialog.querySelector('.deleteButton');

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
