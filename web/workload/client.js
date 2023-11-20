import * as global from "../global-ui.js"
import { animate } from "../global-ui.js"
console.log("loaded client.js")

//mobile less than 775px
let mediaQueryMobile = window.matchMedia("(max-width: 775px)")
//between mobile and 1520px
let mediaQueryMedium = window.matchMedia("(min-width: 776px) and (max-width: 1520px)")
//larger than 1520px
let mediaQueryDesktop = window.matchMedia("(min-width: 1521px)")

if (mediaQueryMobile.matches) {
    console.log("mobile")
}

mediaQueryMobile.addEventListener("change", (e) => {
    if (e.matches) {
        console.log("mobile")
    }
})

if (mediaQueryMedium.matches) {
    console.log("medium")
}

mediaQueryMedium.addEventListener("change", (e) => {
    if (e.matches) {
        console.log("medium")
    }
})

if (mediaQueryDesktop.matches) {
    console.log("desktop")
}

mediaQueryDesktop.addEventListener("change", (e) => {
    if (e.matches) {
        console.log("desktop")
    } 
})

var xValues = ["Not Started", "In Progress", "Completed"];
var yValues = [7, 15, 24];
var barColors = [
  "#ff9f57",
  "#59c4ff",
  "#8aed8a",
];

new Chart("progress-chart", {
  type: "doughnut",
  data: {
    labels: xValues,
    datasets: [{
      backgroundColor: barColors,
      data: yValues
    }]
  },
  options: {
    legend: {
      display: false,
    },
    responsive: true,
    aspectRatio: 1,
    maintainAspectRatio: true,
    animation: {
      duration: 500,
      animateRotate: true,
      animateScale: true
    }
  }
});