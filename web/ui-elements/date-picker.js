let datePickerInputs = document.querySelectorAll('.date-picker-input')
datePickerInputs.forEach(input => {
    let fp = flatpickr(input, {
        dateFormat: 'd/m/Y',
        altInput: true,
        altFormat: 'F j, Y',
        disableMobile: true,
        onChange: (selectedDates, dateStr, instance) => {
            input.dispatchEvent(new Event('change'))
        }
    })
})
