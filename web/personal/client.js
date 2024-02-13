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

async function getPersonals() {
    const res = await get_api(`/employee/employee.php/personals`);
    if (res.success === true) {
        console.log(`[getPersonals] Personals fetched`)
        globalPersonalsList = res.data
    }
}



getPersonals()

global.setBreadcrumb(["My List"], ["./"]);