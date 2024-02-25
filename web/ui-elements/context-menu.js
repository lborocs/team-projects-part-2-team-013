
//module supports both functional passing of context menu buttons and also a global variable to store all context menu buttons
export var contextMenuButtons = document.querySelectorAll('.context-menu')

/**
 * gets all the elements with the class 'context-menu' in the document.
 * asigns this to the global contextMenuButtons and returns it
 *
 * @returns {NodeList} contextMenuButtons
 */
export function getAllMenus() {
    contextMenuButtons = document.querySelectorAll('.context-menu')
    return contextMenuButtons
}

/**
 * adds click event listeners for opening/closing context menus
 * 
 * @param {NodeList} menuButtons defaults to all menu buttons on the page
 */
export function addEventListeners(menuButtons = contextMenuButtons) {

    const menus = menuButtons.querySelectorAll('.context-menu-popover')
    menuButtons.forEach((button) => {

        const thisMenu = button.querySelector('.context-menu-popover')
        button.addEventListener('click', (e) => {
            e.stopPropagation()

            menus.forEach(menu => {
                if (menu !== thisMenu) {
                    menu.classList.remove("visible");
                    menu.parentElement.classList.remove("active");
                }
            });

            thisMenu.classList.toggle('visible')
            button.classList.toggle("active");
        })

        document.addEventListener('click', (e) => {
            if (!button.contains(e.target)) {
                thisMenu.classList.remove('visible')
            }
        })

        thisMenu.addEventListener('click', (e) => {
            e.stopPropagation()
        })

    })
    
}

