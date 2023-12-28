let contextMenuButtons = document.querySelectorAll('.context-menu')

contextMenuButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
        e.stopPropagation()
        button.querySelector('.context-menu-popover').classList.toggle('visible')
    })

    document.addEventListener('click', (e) => {
        if (!button.contains(e.target)) {
            button.querySelector('.context-menu-popover').classList.remove('visible')
        }
    })
    
})
