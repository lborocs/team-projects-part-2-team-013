import * as global from "../global-ui.js";
/* PERSONALS FORMAT:
{
    assignedTo: {
        empID: '32c2b4e29490c2a226c2b4e29490c2a2'
    }
    content: null
    itemID: "530cc2b4e29490c2a2244bc2b4e29490"
    state: 0
    title: "Meet Linda for coffee"
}
*/

//important shit
var globalPersonalsList = []
const activeList = document.getElementById('active-list')
const completedList = document.getElementById('completed-list')

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
    const personalCheckbox = document.getElementById(id)
    
    const personal = getPersonalCardById(id)

    const personalCards = document.querySelectorAll('.personal-task')
    personalCards.forEach((card) => {
        card.classList.remove('selected')
    })

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

    const hasDescription = personal.content !== null
    const chevronOrAddDescription = hasDescription ? `
        <div class="personal-chevron"><span class="material-symbols-rounded">expand_more</span></div>` 
        : 
        '<div class="small-icon add-description"><span class="material-symbols-rounded">docs_add_on</span></div>'

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
                <div class="personal-description">${personal.content ? personal.content : ''}</div>
            </div>
            ${chevronOrAddDescription}
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
        })
    })

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

async function editPersonal(id, title, description) {
    const session = await global.getCurrentSession()
    const employeeID = session.employee.empID

    const body = {}

    if (title) {
        body.title = title
    }
    if (description) {
        body.content = description
    }

    const res = await patch_api(`/employee/employee.php/personal/${employeeID}/${id}`, body)

    if (!res.success) {
        return false
    }

    const personal = globalPersonalsList.find(personal => personal.itemID === id);
    if (title) {
        personal.title = title
    }
    if (description) {
        personal.content = description
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

//works like a modal promise but its inline editing instead
function personalCardEditMode(id) {
    return new Promise((resolve, reject) => {
        const personal = globalPersonalsList.find(personal => personal.itemID === id)
        const personalCard = getPersonalCardById(id)
        const saveButton = personalCard.querySelector('.save')


        personalCard.classList.add('edit-mode')
        saveButton.classList.remove('norender')

        const title = personalCard.querySelector('.title-text')
        var newTitle = title.innerHTML
        const description = personalCard.querySelector('.personal-description')
        var newDescription = description.innerHTML
        
        title.setAttribute('contenteditable', 'true')
        title.focus()
        title.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                title.blur()
            }
        })

        description.setAttribute('contenteditable', 'true')
        description.focus()
        description.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                description.blur()
            }
        })

        title.addEventListener('blur', () => {
            newTitle = title.innerHTML
        })

        description.addEventListener('blur', () => {
            newDescription = description.innerHTML
        })

        saveButton.addEventListener('click', () => {
            //TODO: change to be a single server request
            editPersonal(id, newTitle, newDescription)
            personalCard.classList.remove('edit-mode')
            saveButton.classList.add('norender')
            resolve()
        })

        

    });
}



//event listeners
document.getElementById('new-personal').addEventListener('click', () => {
    const title = "poctavian"
    if (title === null) {
        return
    }
    createPersonal(title).then(() => {
        renderPersonal(globalPersonalsList[globalPersonalsList.length - 1].itemID)
    })

})




//initialise the page
global.setBreadcrumb(["My List"], ["./"])

getAllPersonals().then(() => {
    globalPersonalsList.forEach(personal => {
        renderPersonal(personal.itemID)
    })
})








function displayPersonalModal(id) {
    const personal = globalPersonalsList.find(personal => personal.itemID === id)
    console.log(personal)

    let popupContainer = document.querySelector('.popup');
    let fullscreen = document.querySelector('.fullscreen');

    popupContainer.innerHTML = `
        <dialog open class='popup-dialog'>
            <div class="popup-title">
                ${personal.title}
                <div class="small-icon close-button">
                    <span class="material-symbols-rounded">
                        close
                    </span>
                </div>
            </div>
            <div class="popup-text">${personal.content}</div>
            <div class="popup-text">State ${personal.state}</div>

            <div class="popup-buttons">
                <div class="text-button blue edit-button">
                    <div class="button-text">Edit</div>
                </div>
            </div>
        </dialog>
    `;
    fullscreen.style.filter = 'brightness(0.75)';

    let dialog = popupContainer.querySelector('.popup-dialog');
    let closeButton = dialog.querySelector('.close-button');
    let deleteButton = dialog.querySelector('.edit-button');

    closeButton.addEventListener('click', (event) => {
        event.preventDefault(); 
        dialog.style.display = 'none';
        fullscreen.style.filter = 'none';
        reject();
    });

}


//modified confirmDelete from wiki.
function confirmDelete() {
    return new Promise((resolve, reject) => {

        if (global.queryModalSkip()) {
            resolve();
            return;
        }

        let popupDiv = document.querySelector('.popup');
        let fullscreenDiv = document.querySelector('.fullscreen');

        popupDiv.innerHTML = `
            <dialog open class='popup-dialog'>
                <div class="popup-title">
                    Delete Todo Item
                    <div class="small-icon close-button">
                        <span class="material-symbols-rounded">
                            close
                        </span>
                    </div>
                </div>
                <div class="popup-text">Are you sure you want to delete this Todo item?<br>This action cannot be undone.</div>
                <div class="modal-buttons-and-tip">
                    <span class="modal-tip-text">TIP:<br>You can hold <kbd>SHIFT</kbd> to skip this modal</span>
                    <div class="popup-buttons modal-tip">
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




