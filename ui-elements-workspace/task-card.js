function animate(element, animation) {
    element.classList.add(animation);
    const duration = parseFloat(getComputedStyle(element).getPropertyValue('animation-duration')) * 1000;
    setTimeout(() => {
      element.classList.remove(animation);
    }, duration);
}


var taskCards = document.querySelectorAll(".task");
taskCards.forEach((taskCard) => {

    taskCard.addEventListener("mousedown", () => {
        //show explainer
        // console.log(explainer)
        // explainer.classList.remove("hidden")
        // overlay.classList.remove("norender")
        animate(taskCard, "click-small")
        // add the task-focussed class to this task and remove from all other tasks
        taskCards.forEach((taskCard) => {
            taskCard.classList.remove("task-focussed")
        })
        taskCard.classList.add("task-focussed")


    });
    taskCard.addEventListener("mouseup", () => {
        // showTaskInExplainer(taskCard);
    });

    taskCard.addEventListener("touchstart", () => {
        //show explainer
        console.log("[taskCardOnTouch] clicked")
        animate(taskCard, "click-small")
        // showTaskInExplainer(taskRow);
    });

    taskCard.addEventListener("dragstart", () => {
        taskCard.classList.add("beingdragged");
    });

    taskCard.addEventListener("dragend", () => {
        taskCard.classList.remove("beingdragged");
        // showTaskInExplainer(taskCard);
        // calculateTaskCount()
    });
});

