
const tags = document.getElementById("tags");
const input = document.getElementById("input-tag");

var quill = new Quill('#editor', {
    theme: 'snow'
  });

input.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    const tag = document.createElement("div");
    const tagContent = input.value.trim();
    if (tagContent !== "") {
      tag.className = "tag";
      tag.innerHTML = tagContent;
      tag.innerHTML += '<i class="fa-solid fa-x"></i>';
      tags.appendChild(tag);
      input.value = "";
    }
  }
});

tags.addEventListener("click", function(event) {
  if (event.target.classList.contains("fa-x")) {
    event.target.parentNode.remove();
  }
});


function getTagList() {
    const tags = document.getElementById("tags");
    const tagList = [];
    for (let i = 0; i < tags.children.length; i++) {
      const tagText = tags.children[i].childNodes[0].nodeValue.trim();
      tagList.push(tagText);
    }
    return tagList;
  }
  
  async function createPost(data) {
      const response = await post_api("/wiki/post.php/post", data);
      console.log(response);
  }
  
  function submitPost(){
      var title = document.getElementsByClassName("post-title")[0].getElementsByTagName("input")[0].value;
      var body = quill.root.innerHTML;
      //THIS CAN BE DONE WHEN TAGS ARE USED                          
      var isTechnical = document.getElementsByClassName("type-of-post")[0].getElementsByTagName("input")[0].checked;

      var data = {
          "isTechnical": isTechnical,
          "title": title,
          "content": body,
      }
      console.log(data);
      createPost(data);
      window.location.href = "../";
  }