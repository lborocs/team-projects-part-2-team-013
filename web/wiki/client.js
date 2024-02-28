import { search } from "../global-topbar.js";
import * as global from "../global-ui.js"
import { animate } from "../global-ui.js"


var tagsToDelete = new Set();
var postsContainer = document.querySelector('.posts-container');
var posts = document.querySelectorAll('.post');
const postSearchBar = document.querySelector(".post-search");
const searchBarFilters = document.querySelector(".post-filters");
const searchInput = document.getElementById("inputField")
const tagSearchInput = document.querySelector("#tag-search > .search-input");
const tagSelection = document.querySelector('#tag-selection');




if (document.location.hash === "#nontechnical") {
    document.getElementById("non-technical").checked = true;
    document.getElementById("technical").checked = false;
    document.getElementById("all").checked = false;
} else if (document.location.hash === "#all") {
    document.getElementById("non-technical").checked = false;
    document.getElementById("technical").checked = false;
    document.getElementById("all").checked = true;
} else if (document.location.hash === "#technical") {
    document.getElementById("non-technical").checked = false;
    document.getElementById("technical").checked = true;
    document.getElementById("all").checked = false;
}

function setCurrentBreadcrumb(category) {
    console.error(category);
    category = parseInt(category);
    let label;
    let hash;
    if (category === 2) {
        label = "All";
        hash = "all";
    } else if (category === 0) {
        label = "Non-Technical";
        hash = "nontechnical";
    } else if (category === 1) {
        label = "Technical";
        hash = "technical";
    } else {
        console.error("Invalid category");
    }

    global.setBreadcrumb(["Wiki", label], ["/wiki/", `#${hash}`]);
}

function setSearchPlaceholder(category) {
    let placeholder;
    category = parseInt(category);
    if (category === 2) {
        placeholder = "Search all posts";
    } else if (category === 0) {
        placeholder = "Search Non-Technical posts";
    } else if (category === 1) {
        placeholder = "Search Technical posts";
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

    renderTag(hasPostsContainer, noPostsContainer) {
        const elem = document.createElement('div');

        const parent =  this.tag.hasPosts ? hasPostsContainer : noPostsContainer;

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

            this.element.classList.toggle('selectedDel');
            if (this.element.classList.contains('selectedDel')) {
                tagsToDelete.add(this.tag.tagID);
                console.log(tagsToDelete)
            } else {
                tagsToDelete.delete(this.tag.tagID);
                console.log(tagsToDelete)
            }
            if (tagsToDelete.size > 0) {
                document.querySelector("#action-button").classList.remove("disabled");
            }
            else {
                document.querySelector("#action-button").classList.add("disabled");
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


function renderTagInDeleter(tag, hasPostsContainer, noPostsContainer) {
    (new Tag(tag)).renderTag(hasPostsContainer, noPostsContainer);
}


const postMap = new Map();
const tagMap = new Map();
const tagPromise = fetchTags();
const searchPromise = searchPosts();

global.siteSettings.get('postsEnabled').then((enabled) => {
    if (!enabled) {
        document.getElementById("new-post").classList.add("disabled");
    }
});


async function searchPosts() {
    let search = searchInput.value;
    let tags = [];

    var selectedTags = document.querySelectorAll('.tag.selected');
    var searchBarTags = searchBarFilters.querySelectorAll('.tag');
    var selectedCategory = document.querySelector('input[name="category"]:checked');
    var category = selectedCategory.value;
    category = parseInt(category);

    //removs all tags from search bar to re render new tags
    searchBarTags.forEach((tag) => {
        searchBarFilters.removeChild(tag);
    });
    postSearchBar.classList.remove('contains-tags')
    //adds selected tags to search bar
    selectedTags.forEach((tag) => {
        tags.push(tag.getAttribute("tagID")); 
        postSearchBar.classList.add('contains-tags')
        let tagClone = tag.cloneNode(true);
        tagClone.classList.remove('selected');
        tagClone.classList.add('disabled');
        tagClone.removeAttribute('tabindex');
        tagClone.classList.add('filter-tag');
        searchBarFilters.appendChild(tagClone);
    });
    
    if (category === 2) {
        const posts = await fetchPosts(search, tags);
        renderPosts(posts);
        setCurrentBreadcrumb(category);
        setSearchPlaceholder(category);
    } else {
        const posts = await fetchPosts(search, tags, category);
        renderPosts(posts);
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

/** 
 * fetches posts from the server
 * 
 * @param {string} searchQuery - optional search query to filter posts by.
 * @param {Array<string>} selectedTags - optional array of tagIDs to filter posts by.
 * @param {number} isTechnical - optional flag to filter posts by category. 1 = technical, 0 = non-technical, null = all.
 * 
 */
async function fetchPosts(searchQuery = "", selectedTags = [], isTechnical = null) {
    const tagParam = selectedTags.length ? `&tags=${selectedTags.join(",")}` : "";
    var res;
    if (isTechnical === null) {
        res = await get_api(`/wiki/post.php/posts?q=${searchQuery}${tagParam}`);
    } else {
        res = await get_api(`/wiki/post.php/posts?is_technical=${isTechnical ?? ''}&q=${searchQuery}${tagParam}`);
    }

    if (res.success !== true) {
        console.log("Posts failed to be fetched");
        return;
    }

    console.log("Posts have been fetched");

    return res.data.posts;
}


async function renderPosts(posts) {
    //fragment for batch rendering

    await tagPromise;

    const fragment = new DocumentFragment();

    posts.forEach(post => {
        console.log(post);
        console.log(post.tags);

        if (post.tags !== null) {
            // fill in rich post tags
            post.tags = post.tags.map(tagID => tagMap.get(tagID));
        } else {
            post.tags = [];
        }

        console.log("Rendering post");
        const postElement = renderPostToFragment(post.postID, post.title, post.author, post.isTechnical, post.tags);
        fragment.appendChild(postElement);
        postMap.set(post.postID, post);
        console.log(post);

    });

    postsContainer.innerHTML = "";
    postsContainer.appendChild(fragment);
    animate(postsContainer, "flash");
    setUpPostsEventListeners();
    posts = document.querySelectorAll('.post');
    console.log(postMap);
}

async function fetchTags() {
    const res = await get_api("/wiki/post.php/tags");

    if (res.success !== true) {
        console.log("Tags failed to be fetched");
        return;
    }

    console.log("Tags have been fetched");
    tagSelection.replaceChildren();
    res.data.tags.forEach(tag => {
        tagMap.set(tag.tagID, tag);
        renderTag(tag);
    });
    return res.data.tags;
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

    //we show this on the client by removing the tag from memory and the page
    tagMap.delete(tagID);
    document.querySelectorAll('.tag').forEach((tag) => {
        if (tag.getAttribute('tagID') === tagID) {

            //if the tag is inside a post and there are no other tags in that container, we render the no-tags tag instead of leaving blank
            if (tag.parentElement.parentElement.classList.contains('post-info') && tag.parentElement.querySelectorAll('.tag').length === 1){
                const noTags = document.createElement('div');
                noTags.classList.add('no-tags');
                noTags.textContent = "No Topics";
                tag.parentElement.appendChild(noTags);
                tag.remove();
            } else {
                tag.remove();
            }

        }
    })

}


async function setUpPostsEventListeners() {
    const me = (await global.getCurrentSession()).employee;
    const postList = document.querySelectorAll('.post');
    postList.forEach((post) => {
        
        const postID = post.getAttribute("data-postID");
        const author = post.getAttribute("data-authorID");

        const deleteButton = post.querySelector(".delete-post");
        const editButton = post.querySelector(".edit-post");


        if (!me.isManager && me.empID != author) {
            deleteButton.remove();
            editButton.remove();
        }


        deleteButton.addEventListener("click", (event) => {
            event.stopPropagation();
            event.preventDefault();
            confirmDelete().then(async () => {
                
                const res = await delete_api(`/wiki/post.php/post/${postID}`);

                if (res.successs) {
                    post.remove();
                    global.popupAlert(
                        "Post Deleted",
                        "The post has been successfully deleted.",
                        "success"
                    );
                } else {
                    global.popupAlert(
                        "Unable to delete post",
                        "The following error occurred: " + res.error.message,
                        "error"
                    );
                }

            }).catch();
        });

        editButton.addEventListener("click", (event) => {
            event.stopPropagation();
            event.preventDefault();
            window.location.href = `/wiki/create/#${postID}`;
        });
    })
}


/**
 * Constructs a post HTML element to be rendered in a fragment.
 *
 * @param {string} postID 
 * @param {string} title 
 * @param {string} author
 * @param {boolean} isTechnical - 1 if the post is technical, 0 if it is non-technical.
 * @param {Array<string>} tags - array of tags associated with the post. Defaults to "No Topics" to avoid null checks.
 * @returns {HTMLElement} - constructed post element to be rendered in a fragment.
 */
function renderPostToFragment(postID, title, author, isTechnical, tags) {
    const post = document.createElement("a")
    post.href = `/wiki/post/#${postID}`
    post.className = "post"
    post.setAttribute("data-postID", postID)
    post.setAttribute("data-authorID", author.empID)
    post.setAttribute("data-isTechnical", isTechnical)

    const postInfo = document.createElement("div")
    postInfo.className = "post-info"

    const postTitle = document.createElement("div")
    postTitle.className = "title"
    postTitle.textContent = title

    const tagsContainer = document.createElement("div")
    tagsContainer.className = "tags"
    const tagsArray = tags.length ? tags : null;
    if (tagsArray) {
        tagsArray.forEach(tag => {
            console.error(tag)
            const tagDiv = document.createElement("div")
            tagDiv.className = "tag"
            if (tag.tagID === 0) {
                tagDiv.classList.add("no-tags")
            }
            tagDiv.setAttribute("name", tag.name)
            tagDiv.setAttribute("tagid", tag.tagID)
            tagDiv.innerHTML = `<span class="material-symbols-rounded">sell</span>${tag.name}`;
            tagsContainer.appendChild(tagDiv)
        });
    } else {
        const tagDiv = document.createElement("div")
        tagDiv.className = "no-tags"
        tagDiv.textContent = "No Topics"
        tagsContainer.appendChild(tagDiv)
    }

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
   

    return post
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

function manageTagsPopup() {
    const callback = (ctx) => {
        ctx.content.innerHTML = `
            <div class="modal-text">Select tags to delete</div>
            <div class="tagsContainer">
                <div class="title">
                    Assigned to posts
                </div>
                <div class="has-posts">
                </div>
                <div class="title">
                    Not assigned to any post
                </div>
                <div class="no-posts">
                </div>
            </div>
        `;

        let hasPostsContainer = ctx.content.querySelector('.has-posts');
        let noPostsContainer = ctx.content.querySelector('.no-posts');

        tagMap.forEach((tag) => {
            renderTagInDeleter(tag, hasPostsContainer, noPostsContainer);
        });

    }

    

    return global.popupModal(
        false,
        "Manage Tags",
        callback,
        {text: "Remove", class:"red"}
    );
}

document.getElementById("new-post").addEventListener("click", () => {
    window.location.href = "/wiki/create/";
});

document.getElementById("manage-tags").addEventListener("click", () => {
    manageTagsPopup().then(() => {
        tagsToDelete.forEach((tagID) => {
            deleteTag(tagID);
        });
        tagsToDelete.clear();
        document.getElementById("confirm-button").classList.add("disabled");
        fetchTags().then(() => {
            searchPosts();
        });
    }).catch(() => {
        console.log('Deletion cancelled');
    });
});



