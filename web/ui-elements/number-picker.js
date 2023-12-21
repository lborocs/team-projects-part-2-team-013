let numberPickers = document.querySelectorAll('.number-picker')

numberPickers.forEach(numberPicker => {
    let input = numberPicker.querySelector('input[type="number"]')
    let plus = numberPicker.querySelector('.stepper.increment')
    let minus = numberPicker.querySelector('.stepper.decrement')

    plus.addEventListener('click', e => {
        e.preventDefault()
        input.stepUp()
    })

    minus.addEventListener('click', e => {
        e.preventDefault()
        input.stepDown()
    })

    input.addEventListener('focus', e => {
        input.select()
    })
})