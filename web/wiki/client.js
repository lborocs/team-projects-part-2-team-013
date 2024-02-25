import { search } from "../global-topbar.js";
import * as global from "../global-ui.js"
import { animate } from "../global-ui.js"


var tagsToDelete = new Set();
var postsContainer = document.querySelector('.posts');
var posts = document.querySelectorAll('.post');
const searchInput = document.getElementById("inputField")
const tagSearchInput = document.querySelector("#tag-search > .search-input")
const deleteTagsPopup = document.getElementById("delete-tags-popup");
const deleteTagsHasPostContainer = deleteTagsPopup.querySelector('.tagsContainer > .hasPosts > .tags');
const deleteTagsNoPostContainer = deleteTagsPopup.querySelector('.tagsContainer > .noPosts > .tags');
const deleteTagsConfirmButton = deleteTagsPopup.querySelector("#confirm-button");
const tagSelection = document.querySelector('#tag-selection');


if (document.location.hash == "#nontechnical") {
    document.getElementById("non-technical").checked = true;
    document.getElementById("technical").checked = false;
}

function setCurrentBreadcrumb(category) {
    console.error(category);
    category = parseInt(category);
    let label;
    if (category === 2) {
        label = "All";
    } else if (category === 0) {
        label = "Non-Technical";
    } else if (category === 1) {
        label = "Technical";
    } else {
        console.error("Invalid category");
    }

    global.setBreadcrumb(["Wiki", label], ["/wiki/", `#${label.toLowerCase().replace(" ", "-")}`]);
}

function setSearchPlaceholder(category) {
    let placeholder;
    category = parseInt(category);
    if (category === 2) {
        placeholder = "Search all posts";
    } else if (category === 0) {
        placeholder = "Search non-technical posts";
    } else if (category === 1) {
        placeholder = "Search technical posts";
    } else {
        console.error("Invalid category");
    }

    searchInput.placeholder = placeholder;
}



class Tag {

    element;
    tag;
    
    constructor(inner) {
        this.tag = inner;
    }

    renderTag() {
        const elem = document.createElement('div');

        const parent =  this.tag.hasPosts ? deleteTagsHasPostContainer : deleteTagsNoPostContainer;

        elem.classList.add('tag');
        elem.tabIndex = 0;
        elem.setAttribute('tagID', this.tag.tagID);
        elem.setAttribute('name', this.tag.name);
        elem.innerHTML = `<span class="material-symbols-rounded">sell</span>${this.tag.name}&nbsp;`;
        parent.appendChild(elem);
        this.element = elem;
        this.addEventListeners();
    }
    addEventListeners() {

        const deleteListener = () => {
            if (this.element.classList.contains('selectedDel')) {
                this.element.classList.toggle('selectedDel');
                tagsToDelete.delete(this.tag.tagID);
            } else {
                this.element.classList.toggle('selectedDel');
                tagsToDelete.add(this.tag.tagID);
            }
            if (tagsToDelete.size > 0) {
                document.getElementById("confirm-button").classList.remove("disabled");
            }
            else {
                document.getElementById("confirm-button").classList.add("disabled");
            }
        };


        this.element.addEventListener('click', deleteListener);
        this.element.addEventListener('keydown', (event) => {
            if (event.key === "Enter") {
                deleteListener();
            }
        });
    }
}


function renderTagInDeleter(tag) {
    (new Tag(tag)).renderTag();
}


const postMap = new Map();
const tagMap = new Map();


async function searchPosts() {
    let search = searchInput.value;
    let tags = [];

    var selectedTags = document.querySelectorAll('.tag.selected');
    var selectedCategory = document.querySelector('input[name="category"]:checked');
    var category = selectedCategory.value;
    category = parseInt(category);

    selectedTags.forEach((tag) => {
        tags.push(tag.getAttribute("tagID"));
    });
    
    if (category === 2) {
        await fetchPosts(search, tags);
        setCurrentBreadcrumb(category);
        setSearchPlaceholder(category);
    } else {
        await fetchPosts(search, tags, category);
        setCurrentBreadcrumb(category);
        setSearchPlaceholder(category);
    }

}


const roller = new global.ReusableRollingTimeout(() => {
    searchPosts();
}, 150);

async function updatePosts() {
    roller.roll();
}


async function fetchPosts(searchQuery = "", selectedTags = [], isTechnical = 2) {
    const tagParam = selectedTags.length ? `&tags=${selectedTags.join(",")}` : "";
    var res;
    if (isTechnical === 2) {
        res = await get_api(`/wiki/post.php/posts?q=${searchQuery}${tagParam}`);
    } else {
        res = await get_api(`/wiki/post.php/posts?is_technical=${isTechnical ?? ''}&q=${searchQuery}${tagParam}`);
    }

    console.log(res);

    if (res.success !== true) {
        console.log("Posts failed to be fetched");
        return;
    }


    document.querySelectorAll('.post').forEach((post) => { post.remove() });

    console.log("Posts have been fetched");
    res.data.posts.forEach(post => {
        console.log(post);
        console.log(post.tags);

        if (post.tags !== null) {
            // fill in rich post tags
            post.tags = post.tags.map(tagID => tagMap.get(tagID));
        } else {
            post.tags = [];
        }

        console.log("Rendering post");
        renderPost(post.postID, post.title, post.author, post.isTechnical, post.tags.map(tag => tag.name));
        
        postMap.set(post.postID, post);
        console.log(post);

    });
    setUpPostsEventListeners();
    posts = document.querySelectorAll('.post');
    console.log(postMap);
}

async function fetchTags() {
    const data = await get_api("/wiki/post.php/tags");

    if (data.success !== true) {
        console.log("Tags failed to be fetched");
        return;
    }

    console.log("Tags have been fetched");
    tagSelection.replaceChildren();
    data.data.tags.forEach(tag => {
        tagMap.set(tag.tagID, tag);
        renderTag(tag);
        renderTagInDeleter(tag);
    });
    return data.data.tags;
}

function renderTag(tag) {
    const elem = document.createElement('div');
    elem.classList.add('tag');
    elem.tabIndex = 0;
    elem.setAttribute('tagID', tag.tagID);
    elem.setAttribute('name', tag.name);
    elem.innerHTML = `<span class="material-symbols-rounded">sell</span>${tag.name}`;

    elem.addEventListener('click', () => {
        elem.classList.toggle('selected');
        searchPosts();
    });

    elem.addEventListener('keydown', (event) => {
        if (event.key === "Enter") {
            elem.classList.toggle('selected');
            searchPosts();
        }
    });

    tagSelection.appendChild(elem);
}

async function deleteTag(tagID) {
    let result = await delete_api(`/wiki/post.php/tag/${tagID}`);
    console.log(result);
    if (result.success !== true) {
        console.log("Tags failed to be deleted");
        return;
    }
}

deleteTagsConfirmButton.addEventListener('click', () => {
    if (tagsToDelete.size > 0) {
        const deleteSelectedTags = tagsToDelete.map((tag) => deleteTag(tag));
        Promise.all(deleteSelectedTags).then(() => {
            console.log("Tags have been deleted");
            //location.reload();
            tagsToDelete = new Set();
            document.querySelectorAll(".tag.selectedDel").forEach((tag) => {
                tag.remove();
            });
            deleteTagsConfirmButton.classList.add("disabled");
            searchPosts();
            fetchTags()
            closePopup();
            });

    }
});

fetchTags().then((tags) => {
    searchPosts();
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
    })
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
    const post = document.createElement("a")
    post.href = `/wiki/post/#${postID}`
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
    const tagsArray = tags.length ? tags : ["No Tags"]
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

tagSearchInput.addEventListener("input", () => {

    const tags = tagSelection.querySelectorAll('.tag')

    let found = false
    tags.forEach((tag) => {
        const tagName = tag.getAttribute('name')
        const query = tagSearchInput.value

        if (query == null) {
            tag.classList.remove('norender')
            return
        }

        if (tagName.toLowerCase().includes(query.toLowerCase())) {
            found = true
            tag.classList.remove('norender')
        } else {
            tag.classList.add('norender')
        }

    })

    if (!found) {
        document.querySelector('.tag-selection-no-results').classList.remove('norender')
        tagSelection.classList.add('norender')
    } else {
        document.querySelector('.tag-selection-no-results').classList.add('norender')
        tagSelection.classList.remove('norender')
    }

})

document.querySelectorAll('input[name="category"]').forEach((radio) => {
    radio.addEventListener('change', () => {
        updatePosts();
    })
});


function confirmDelete() {
    const callback = (ctx) => {
        ctx.content.innerHTML = `
            <div class="modal-text">Are you sure you want to delete this post?</div>
            <div class="modal-subtext">This action cannot be undone.</div>
        `;
    }

    return global.popupModal(
        false,
        "Delete post",
        callback,
        {text: "Delete", class:"red"}
    );
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

    let closeButton = dialog.querySelector('#close-button');

    closeButton.addEventListener('click', (event) => {
        event.preventDefault();
        closePopup();
    });
}

