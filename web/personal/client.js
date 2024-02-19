import * as global from "../global-ui.js";
/* PERSONALS FORMAT:
{
    assignedTo: {
        empID: '32c2b4e29490c2a226c2b4e29490c2a2'
    }
    itemID: "530cc2b4e29490c2a2244bc2b4e29490"
    dueDate: timestamp
    state: 0
    title: "Meet Linda for coffee"
    createdAt: timestamp
}
*/


var globalPersonalsList = []
var globalPersonalsSort = {
    alphabetical: false,
    createdAt: false,
    dueDate: false,
    descending: true
}

const newPersonalButton = document.getElementById('new-personal')
const mobileNewPersonalButton = document.getElementById('mobile-new-personal')
const activeList = document.getElementById('active-list')
const completedList = document.getElementById('completed-list')
const titleHeaders = document.querySelectorAll('.header > .title')
const personalsSearch = document.getElementById('personals-search')
const mobilePersonalsSearch = document.getElementById('mobile-search-icon')
const mobilePersonalsSearchInput = document.getElementById('mobile-search-input')
const personalsSortDropdown = document.getElementById('personals-sort')
const dropdownMenus = document.querySelectorAll('.dropdown-menu')
const sortAlphabetical = document.getElementById('sort-alphabetical')
const sortCreatedAt = document.getElementById('sort-createdAt')
const sortDueDate = document.getElementById('sort-dueDate')
const personalsSortDirection = document.getElementById('personals-sort-direction')


async function getAllPersonals() {
    const res = await get_api(`/employee/employee.php/personals`)

    if (!res.success) {
        return false
    }

    console.log(`[getPersonals] Personals fetched`)
    globalPersonalsList = res.data.personals
    console.log(globalPersonalsList)

    return true

}

//used to update a single personal in globalPersonalsList with data from the server
async function getPersonal(id) {
    const session = await global.getCurrentSession()
    const employeeID = session.employee.empID

    const res = await get_api(`/employee/employee.php/personal/${employeeID}/${id}`)

    if (!res.success) {
        return false
    }

    console.log(`[getPersonals] Fetched personal ${id}`)
    console.log(res.data)

    const personal = res.data
    const index = globalPersonalsList.findIndex(p => p.itemID === id)

    if (index !== -1) { //-1 used for not found
        globalPersonalsList[index] = personal
    } else {
        console.error(`globalPersonalsList is not up to date with the server. Personal ${id} was not found in the list`)
    }

    return true

}

async function createPersonal(title) {
    const session = await global.getCurrentSession()
    const employeeID = session.employee.empID

    const body = {
        title: title,
        state: 0
    }

    const res = await post_api(`/employee/employee.php/personal/${employeeID}`, body)

    if (!res.success) {
        return false
    }

    console.log(`[createPersonal] Personal created`)
    console.log(res.data)

    globalPersonalsList.push(res.data)

    return true
}

function selectPersonal(id) {
    const personal = getPersonalCardById(id)
    deselectAllPersonals()
    personal.classList.add('selected')
}

function deselectAllPersonals() {
    const personalCards = document.querySelectorAll('.personal-task')
    personalCards.forEach((card) => {
        card.classList.remove('selected')
    })
}


function renderPersonal(id) {
    const personal = globalPersonalsList.find(personal => personal.itemID === id)
    const personalCard = document.createElement('div')
    personalCard.classList.add('personal-task')

    const checkedState = (personal.state === 1) ? 'checked' : ''

    const hasDueDate = (personal.dueDate) ? '' : 'norender'

    const date = personal.dueDate ? new Date(personal.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : "Add due date";

    personalCard.innerHTML = `
        <div class="personal-checkbox">
            <input type="checkbox" id="${id}" ${checkedState}>
            <label for="task-2" class="checkbox-label"></label>
        </div>
        <div class="personal-main">
            <div class="personal-content">
                <div class="personal-title">
                    <div class="title-text">
                        ${personal.title}
                    </div>
                </div>
            </div>
            <div class="date-picker ${hasDueDate}">
                <div class="date-picker-icon">
                    <span class="material-symbols-rounded">event_upcoming</span>
                </div>
                <input disabled class="date-picker-input" type="text" placeholder="${date}" tabindex="0"></input>
            </div>
            <div class="personal-icons">
                <div class="icon-button no-box edit">
                    <div class="button-icon">
                        <span class="material-symbols-rounded">edit</span>
                    </div>
                </div>
                <div class="icon-button no-box delete modal-skippable">
                    <div class="button-icon">
                        <span class="material-symbols-rounded">delete</span>
                    </div>
                </div>
            </div>
            
            <div class="text-button blue save norender">
                <div class="button-text">
                    Save
                </div>
            </div>
        </div>
    `


    //flatpickr datepicker
    let datePickerInput = personalCard.querySelector('.date-picker-input')
    const today  = new Date()

    let fp = flatpickr(datePickerInput, {
        dateFormat: 'd/m/Y',
        altInput: true,
        altFormat: 'F j, Y',
        disableMobile: false,
        onChange: (selectedDates, dateStr, instance) => {
            datePickerInput.dispatchEvent(new Event('change'))
        }
    })

    fp.allowInput = false

    

    if (personal.state === 1) {
        completedList.appendChild(personalCard)
    } else {
        activeList.appendChild(personalCard)
    }

    personalCard.addEventListener('click', () => {
        selectPersonal(id)
    })

    personalCard.querySelector('.personal-checkbox').addEventListener('click', (e) => {
        e.stopPropagation()
        togglePersonalState(id)
    })

    personalCard.querySelector('.edit').addEventListener('click', (e) => {
        e.stopPropagation()
        personalCardEditMode(id)
    })

    personalCard.querySelector('.delete').addEventListener('click', (e) => {
        e.stopPropagation()
        confirmDelete().then(() => {
            deletePersonal(id).then(() => {
                unrenderPersonal(id)
            })
        }).catch(() => {
            console.log("[deleteButton] Delete aborted")
        });
    })

}


/**
 * Clears the list of personals then re-renders in the order of globalPersonalsList
 */
function renderAllPersonals() {
    global.animate(document.querySelector(".list-container"), "flash")
    unrenderAllPersonals()
    globalPersonalsList.forEach(personal => {
        renderPersonal(personal.itemID)
    })
}


function renderDummyPersonal() {

    return new Promise((resolve, reject) => {

        if (global.checkMutex("renderDummyPersonal")) {
            console.log("[renderDummyPersonal] Mutex is locked, skipping modal")
            reject();
            return;
        }

        const handle = global.takeMutex("renderDummyPersonal");
        newPersonalButton.classList.add('disabled');
        mobileNewPersonalButton.classList.add('disabled');


        const resolveAndUnlock = () => {
            console.log("[renderDummyPersonal] Resolving and releasing mutex")
            newPersonalButton.classList.remove('disabled');
            mobileNewPersonalButton.classList.remove('disabled');
            global.releaseMutex("renderDummyPersonal", handle);
            resolve(true);
        };


        const personalCard = document.createElement('div')
        personalCard.classList.add('personal-task')
        personalCard.id = "dummy"

        personalCard.innerHTML = `
            <div class="dummy-add-icon">
                <span class="material-symbols-rounded">add</span>
            </div>
            <div class="personal-main">
                <div class="personal-content">
                    <div class="personal-title">
                        <div class="title-text">
                            <input type="text" placeholder="What do you want to do?">
                        </div>
                    </div>
                </div>
                <div class="text-button blue save disabled">
                    <div class="button-text">
                        Save
                    </div>
                </div>
            </div>
        `

        activeList.prepend(personalCard);

        const titleInput = personalCard.querySelector('.title-text input')
        titleInput.focus()
        titleInput.addEventListener('input', (e) => {
            if (e.target.value === "" || e.target.value.length > 250) {
                personalCard.querySelector('.save').classList.add('disabled')
            } else {
                personalCard.querySelector('.save').classList.remove('disabled')
            }
        })

        titleInput.addEventListener('keydown', (e) => {

            if (e.key === 'Enter') {
                e.preventDefault()
                if (titleInput.value === "") {
                    return
                }

                unrenderDummyPersonal()
                createPersonal(titleInput.value).then(() => {
                    renderPersonal(globalPersonalsList[globalPersonalsList.length - 1].itemID)
                    resolveAndUnlock();
                })
            } else if (e.key === 'Escape' && titleInput.value === "") {
                e.preventDefault()
                unrenderDummyPersonal()
                resolveAndUnlock();
            }

        })

        personalCard.querySelector('.save').addEventListener('click', () => {
            unrenderDummyPersonal()
            createPersonal(titleInput.value).then(() => {
                renderPersonal(globalPersonalsList[globalPersonalsList.length - 1].itemID)
                resolveAndUnlock();
            })
        })
    });
}

function unrenderDummyPersonal() {
    const dummy = document.getElementById('dummy')
    dummy.remove()
}




function getPersonalCardById(id) {
    //personal checkbox has the ID so we can do idElement.value, but this means we have to travel 2 parent elements up to find the personal card.
    const checkbox = document.getElementById(id)
    if (!checkbox) {
        console.error(`Couln't find a personal! No element with id ${id} found.`)
        return null
    }
    const personal = checkbox.parentNode && checkbox.parentNode.parentNode; //personal card is grandparent of checkbox
    if (!personal) {
        console.error(`Couldn't find a personal! Element with id ${id} is not granchild of a personal card.`);
        return null;
    }
    return personal;
}

function unrenderPersonal(id) {
    const personal = getPersonalCardById(id)
    personal.remove()
}

function unrenderAllPersonals() {
    const personals = document.querySelectorAll('.personal-task')
    personals.forEach(personal => {
        personal.remove()
    })
}

async function togglePersonalState(id) {
    const session = await global.getCurrentSession()
    const employeeID = session.employee.empID

    const personal = globalPersonalsList.find(personal => personal.itemID === id)
    console.log(personal)

    let state = 1
    if (personal.state) {
        state = 0
    }

    const body = {
        state: state
    }

    const res = await patch_api(`/employee/employee.php/personal/${employeeID}/${id}`, body)

    if (!res.success) {
        return false
    }

    await getPersonal(id)

    unrenderPersonal(id)
    renderPersonal(id)
}

async function editPersonal(id, title, dueDate = null) {

    if (!title) {
        console.error(`[editPersonal] No title provided`)
        return false
    }

    const body = {}

    if (dueDate) {
        body.dueDate = dueDate
    }

    if (title) {
        body.title = title
    }

    const session = await global.getCurrentSession()
    const employeeID = session.employee.empID

  
    const res = await patch_api(`/employee/employee.php/personal/${employeeID}/${id}`, body)

    if (!res.success) {
        return false
    }

    const personal = globalPersonalsList.find(personal => personal.itemID === id);
    if (title) {
        personal.title = title
    }
    if (dueDate) {
        personal.dueDate = dueDate
    }

    unrenderPersonal(id)
    renderPersonal(id)

}


async function deletePersonal(id) {
    const session = await global.getCurrentSession()
    const employeeID = session.employee.empID

    const res = await delete_api(`/employee/employee.php/personal/${employeeID}/${id}`)

    if (!res.success) {
        return false
    }

    const index = globalPersonalsList.findIndex(personal => personal.itemID === id)
    globalPersonalsList.splice(index, 1)

    return true

}

function searchPersonals(query) {
    const searchResults = globalPersonalsList.filter(personal => personal.title.includes(query))
    unrenderAllPersonals()
    activeList.innerHTML = ""
    completedList.innerHTML = ""
    searchResults.forEach(personal => renderPersonal(personal.itemID))
    return searchResults
}

function sortPersonals() {
    console.log(globalPersonalsSort)
    if (globalPersonalsSort.alphabetical) {
        console.log("sorting by alphabetical")
        globalPersonalsList.sort((a, b) => {
            if (globalPersonalsSort.descending) {
                return a.title.localeCompare(b.title)
            } else {
                return b.title.localeCompare(a.title)
            }
        })
    } else if (globalPersonalsSort.createdAt) {
        console.log("sorting by createdAt")
        globalPersonalsList.sort((a, b) => {
            if (globalPersonalsSort.descending) {
                return a.createdAt - b.createdAt
            } else {
                return b.createdAt - a.createdAt
            }
        })
    } else if (globalPersonalsSort.dueDate) {
        console.log("sorting by dueDate")
        globalPersonalsList.sort((a, b) => {
            if (globalPersonalsSort.descending) {
                return a.due - b.due
            } else {
                return b.due - a.due
            }
        })
    }
}

//works like a modal promise but its inline editing instead
function personalCardEditMode(id) {
    return new Promise((resolve, reject) => {
        const personalCard = getPersonalCardById(id)
        const saveButton = personalCard.querySelector('.save')
        const personalIcons = personalCard.querySelector('.personal-icons')
        const datePicker = personalCard.querySelector('.date-picker')
        const datePickerInput = personalCard.querySelector('.date-picker-input')

        datePickerInput.disabled = false
        personalCard.classList.add('edit-mode')
        saveButton.classList.remove('norender')
        personalIcons.classList.add('norender')
        datePicker.classList.remove('norender')

        const title = personalCard.querySelector('.title-text')
        var newTitle = title.innerHTML

        title.setAttribute('contenteditable', 'true')
        title.focus()

        const range = document.createRange()
        const sel = window.getSelection()
        range.setStart(title.childNodes[0], title.innerHTML.length)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)

        personalCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                newTitle = title.innerHTML
                editPersonal(id, newTitle)
                personalCard.classList.remove('edit-mode')
                saveButton.classList.add('norender')
                personalIcons.classList.remove('norender')
                datePickerInput.disabled = true
                resolve()
            }
        })

        title.addEventListener('blur', () => {
            newTitle = title.innerHTML
        })

        
        //if personal has a due date, set it in the datepicker
        if (globalPersonalsList.find(personal => personal.itemID === id).dueDate) {
            const dueDate = new Date(globalPersonalsList.find(personal => personal.itemID === id).dueDate)
            fp.setDate(dueDate)
        }
        let newDueDate = null
        datePickerInput.addEventListener('change', () => {
            const dueDate = fp.selectedDates[0]
            console.log(dueDate)
            //convert to ms for api
            let time = dueDate.getTime()

            if (dueDate) {
                newDueDate = time
            }
        })

        saveButton.addEventListener('click', () => {
            //TODO: change to be a single server request
            editPersonal(id, newTitle, newDueDate)
            personalCard.classList.remove('edit-mode')
            saveButton.classList.add('norender')
            personalIcons.classList.remove('norender')
            datePickerInput.disabled = true
            resolve()
        })

    })
}



//event listeners

newPersonalButton.addEventListener('click', () => {
    renderDummyPersonal();
})

mobileNewPersonalButton.addEventListener('click', () => {
    renderDummyPersonal();
})

titleHeaders.forEach((title) => {
    title.addEventListener('click', () => {
        const header = title.parentNode
        const list = header.nextElementSibling
        const chevron = title.querySelector('.material-symbols-rounded')
        list.classList.toggle('collapsed')
        chevron.innerHTML = (list.classList.contains('collapsed')) ? '<span class="material-symbols-rounded">expand_less</span>' : '<span class="material-symbols-rounded">expand_more</span>'
    })
})

personalsSearch.addEventListener('input', (e) => {
    const result = searchPersonals(e.target.value)

    const completed = result.filter(personal => personal.state === 1).length
    const active = result.length - completed

    if (active === 0) {
        activeList.innerHTML = `<div class="no-results">We couldn't find any matches.</div>`
    }
    if (completed === 0) {
        completedList.innerHTML = `<div class="no-results">We couldn't find any matches.</div>`
    }

})

mobilePersonalsSearch.addEventListener('click', () => {
    if (mobilePersonalsSearchInput.classList.contains('open') === false) {
        mobilePersonalsSearchInput.value = ""
        mobilePersonalsSearchInput.focus()
        mobilePersonalsSearchInput.classList.add('open')
        document.querySelector('.controls>.title').classList.add('norender')
    } else {
        mobilePersonalsSearchInput.classList.remove('open')
        mobilePersonalsSearchInput.blur()
        document.querySelector('.controls>.title').classList.remove('norender')
    }

})

mobilePersonalsSearchInput.addEventListener('input', (e) => {
    if (mobilePersonalsSearch.classList.contains('open') === false) {
        mobilePersonalsSearch.classList.add('open')
    }
    const result = searchPersonals(e.target.value)

    const completed = result.filter(personal => personal.state === 1).length
    const active = result.length - completed

    if (active === 0) {
        activeList.innerHTML = `<div class="no-results">We couldn't find any matches.</div>`
    }
    if (completed === 0) {
        completedList.innerHTML = `<div class="no-results">We couldn't find any matches.</div>`
    }

})



/**
 * updates personal todo sorting and rerenders the list
 * 
 * @param {string} sortOption a valid sort option: 'Alphabetical', 'Time created', 'Due date'
 * @returns {boolean} true / false if a valid sort option was passed in
 */
function updateSortOption(sortOption) {
    const options = {
        'Alphabetical': {
            selected: 'alphabetical',
            unselected: ['createdAt', 'dueDate']
        },
        'Time created': {
            selected: 'createdAt',
            unselected: ['alphabetical', 'dueDate']
        },
        'Due date': {
            selected: 'dueDate',
            unselected: ['alphabetical', 'createdAt']                   
        }
    }

    const { selected, unselected } = options[sortOption]

    //makes it obvious if a nonexistent option is selected
    if (!selected || !unselected) {
        console.error(`[updateSortOption] Invalid sort option se;ected"`)
        return false
    }

    //selects option in dropdown preview
    personalsSortDropdown.querySelector('.dropdown-text').textContent = sortOption
    personalsSortDropdown.querySelector('.material-symbols-rounded').textContent = "arrow_downward"

    //selects same option in global sort
    globalPersonalsSort[selected] = true
    unselected.forEach(option => globalPersonalsSort[option] = false)

    //marks selected option as selected in dropdown menu
    personalsSortDropdown.querySelectorAll('.dropdown-option').forEach(option => {
        if (option.id.includes(selected)) {
            option.classList.add('selected')
        } else {
            option.classList.remove('selected')
        }
    })
    
    console.log(globalPersonalsSort)
    console.log(globalPersonalsList)
    //sorts and renders based on this new list order
    sortPersonals()
    renderAllPersonals()
    return true
}

/**
 * reverses the sort direction, updates the arrow in the dropdown and rerenders the list
 */
function reverseSortDirection() {
    globalPersonalsSort.descending = !globalPersonalsSort.descending
    personalsSortDropdown.querySelector('.material-symbols-rounded').textContent = (globalPersonalsSort.descending) ? "arrow_downward" : "arrow_upward"
    sortPersonals()
    console.log(globalPersonalsList)
    renderAllPersonals()
}



sortAlphabetical.addEventListener('click', () => {
    updateSortOption('Alphabetical')
})

sortCreatedAt.addEventListener('click', () => {
    updateSortOption('Time created')
})

sortDueDate.addEventListener('click', () => {
    updateSortOption('Due date')
})

//dropdown open/close logic
personalsSortDropdown.addEventListener("click", () => {
    personalsSortDropdown.classList.toggle("open")
})
document.addEventListener("click", (e) => {
    if (!personalsSortDropdown.contains(e.target)) {
        personalsSortDropdown.classList.remove("open")
    }

    if (!mobilePersonalsSearch.contains(e.target)) {
        mobilePersonalsSearchInput.classList.remove('open')
        mobilePersonalsSearchInput.blur()
        document.querySelector('.controls>.title').classList.remove('norender')
    }
})

personalsSortDirection.addEventListener("click", reverseSortDirection);













//initialise the page
global.setBreadcrumb(["My List"], ["./"])

getAllPersonals().then(() => {
    globalPersonalsList.forEach(personal => {
        renderPersonal(personal.itemID)
    })
})

//modified confirmDelete from wiki.
function confirmDelete() {
    return new Promise((resolve, reject) => {

        if (global.checkMutex("confirmDelete")) {
            console.log("[confirmDelete] Mutex is locked, skipping modal")
            reject();
            return;
        }

        const handle = global.takeMutex("confirmDelete");

        const resolveAndUnlock = () => {
            console.log("[confirmDelete] Resolving and releasing mutex")
            global.releaseMutex("confirmDelete", handle);
            resolve();
        };
        const rejectAndUnlock = () => {
            console.log("[confirmDelete] Rejecting and releasing mutex")
            global.releaseMutex("confirmDelete", handle);
            reject();
        };


        if (global.queryModalSkip()) {
            resolveAndUnlock();
            return;
        }

        let popupDiv = document.querySelector('.popup');
        let fullscreenDiv = document.querySelector('.fullscreen');

        popupDiv.innerHTML = `
            <dialog open class='popup-dialog'>
                <div class="popup-title">
                    Delete To-Do Item
                    <div class="small-icon close-button">
                        <span class="material-symbols-rounded">
                            close
                        </span>
                    </div>
                </div>
                <div class="popup-text">Are you sure you want to delete this To-Do item?</div>
                <div class="popup-text">
                <b>This action cannot be undone.</b> 
                    <br></br>
                </div>
                <div class="modal-buttons-and-tip">
                    <div class="modal-tip">
                        <span class="modal-tip-title">TIP</span>
                        <span class="modal-tip-text">Hold <kbd>SHIFT</kbd> to skip this popup</span>
                    </div>
                    
                    <div class="popup-buttons">
                        <div class="text-button" id="cancel-button">
                            <div class="button-text">Cancel</div>
                        </div>
                        <div class="text-button red" id="delete-button">
                            <div class="button-text">Delete</div>
                        </div>
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
            rejectAndUnlock();
        });

        cancelButton.addEventListener('click', (event) => {
            event.preventDefault();
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            rejectAndUnlock();
        });

        deleteButton.addEventListener('click', (event) => {
            event.preventDefault();
            dialog.style.display = 'none';
            fullscreenDiv.style.filter = 'none';
            resolveAndUnlock();
        });
    });
}




