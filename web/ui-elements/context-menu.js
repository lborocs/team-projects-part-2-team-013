
//module supports both functional passing of context menu buttons and also a global variable to store all context menu buttons
export var buttons = document.querySelectorAll('.context-menu')

/**
 * gets all the elements with the class 'context-menu' in the document.
 * asigns this to the global contextMenuButtons and returns it
 *
 * @returns {NodeList} contextMenuButtons
 */
export function getAllMenus() {
    buttons = document.querySelectorAll('.context-menu')
    return buttons
}

/**
 * adds click event listeners for opening/closing context menus
 * 
 * @param {NodeList} menuButtons defaults to all menu buttons on the page
 */
export function addEventListeners(menuButtons = buttons) {
    const menus = document.querySelectorAll('.context-menu-popover')

    menuButtons.forEach((button) => {
        const thisMenu = button.querySelector('.context-menu-popover')

        button.addEventListener('pointerdown', (e) => {
            e.stopPropagation()
        })

        button.addEventListener('click', (e) => {
            e.stopPropagation()

            

            if (thisMenu.classList.contains('visible')) {
                close(thisMenu)
            } else {
                closeAll()
                open(thisMenu)
            }

        })

        document.addEventListener('pointerdown', (e) => {
            if (!button.contains(e.target)) {
                close(thisMenu)
            }
        })

        thisMenu.addEventListener('click', (e) => {
            e.stopPropagation()
        })
    })
}

export function registerRightClickElement(element) {
    element.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()
        closeAll()

        const menu = element.querySelector('.context-menu-popover')
        if (!menu) {
            console.error('no context menu found for the registered element')
            return
        }

        open(menu)

    })
}

function close(menu) {
    menu.classList.remove('visible')
    menu.parentElement.classList.remove("active")
}

export function closeAll() {
    const menus = document.querySelectorAll('.context-menu-popover')
    menus.forEach(menu => {
        close(menu)
    })
}

function open(menu) {
    closeAll()
    menu.classList.add('visible')
    menu.parentElement.classList.add("active")
}
