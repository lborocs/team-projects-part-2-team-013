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
    const index = globalPersonalsList.findIndex(p => p.itemID === id);

    if (index !== -1) { //-1 used for not found
        globalPersonalsList[index] = personal;
    } else {
        console.error(`globalPersonalsList is not up to date with the server. Personal ${id} was not found in the list`);
    }

    return true

}

function selectPersonal(id) {
    const personalCheckbox = document.getElementById(id)
    //personal checkbox has the ID so we can do idElement.value, but this means we have to travel 2 parent elements up to find the personal card.
    const personal = personalCheckbox.parentNode.parentNode 

    const personalCards = document.querySelectorAll('.personal-task')
    personalCards.forEach((card) => {
        card.classList.remove('selected')
    })

    personal.classList.add('selected')
}

function renderPersonal(id) {
    const personal = globalPersonalsList.find(personal => personal.itemID === id)
    const personalCard = document.createElement('div')
    personalCard.classList.add('personal-task')

    const checkedState = (personal.state === true) ? 'checked' : ''

    personalCard.innerHTML = `
        <div class="personal-checkbox">
            <input type="checkbox" id="${id}" ${checkedState}>
            <label for="task-2" class="checkbox-label"></label>
        </div>
        <div class="personal-content">
            <div class="personal-title">
                <div class="title-text">
                    ${personal.title}
                </div>
            </div>
            <div class="personal-icons">
                <div class="icon-button no-box edit">
                    <div class="button-icon">
                        <span class="material-symbols-rounded">edit</span>
                    </div>
                </div>
                <div class="icon-button no-box delete">
                    <div class="button-icon">
                        <span class="material-symbols-rounded">delete</span>
                    </div>
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
        editPersonal(id)
    })

}

function unrenderPersonal(id) {
    const checkbox = document.getElementById(id)
    const personal = checkbox.parentNode.parentNode //personal card is grandparent of checkbox
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


//initialise the page
global.setBreadcrumb(["My List"], ["./"])

getAllPersonals().then(() => {
    globalPersonalsList.forEach(personal => {
        renderPersonal(personal.itemID)
    })
})

getPersonal("c2b4e29490c2a2c2b4e29490c2a2c2b4")


