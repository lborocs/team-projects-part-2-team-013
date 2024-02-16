import * as global from "../global-ui.js";
/* 
DATA RETRIEVED FROM API
wiki stuff:

/wiki/post.php/meta/:POST_ID:  --  returns post subscriptions

/wiki/post.php/tag/:TAG_ID:  --  returns all tags

/manager.php/frequentedposts  --  returns most viewed posts
{
  "success":true,
  "data":[
    {
      "posts":[
        {"empID":"emp id","postID":"post id", "views":"number"}
      ]
    }
  ]
}

/manager.php/frequentedtags/  --  returns most viewed tags
{
  "success":true,
  "data":[
    {
      "tags":[
        {"tagID":"tagid here","tagName":"tag name here", "views":"number"}
      ]
    }
  ]
}

employee performance in projects:

manager.php/employeeprojects/:EMP_ID:  --  returns all projects an employee is in

/project/task.php/tasks/:PROJECT_ID  --  returns all tasks in a project, with assignments so we can match to employee


PLAN:
- most subscribed posts
- employees who have subscribed to the most posts
- the overlap of the two
- most viewed posts in last 30 days
- most viewed tags in last 30 days


- it is fair to assume that if an employee is seeking information on a topic, they are likely to be working on a project related to that topic
- therefore for any given employee we can cross reference:
    a) wether they view any tags / posts more frequently than other topics and tags
    b) whether they have a higher than average ratio of overdue tasks than average employee

- this gives a basic way to identify employees who are struggling with their work, and what they are struggling with.
*/
var allTags = await get_api("/wiki/post.php/tags");
var allTags = allTags.data
var mostViewedPosts = await get_api("/employee/manager.php/frequentedposts");
var mostViewedPosts = mostViewedPosts.data
var mostViewedTags = await get_api("/employee/manager.php/frequentedtags");
var mostViewedTags = mostViewedTags.data


console.table(allTags)
console.table(mostViewedPosts)
console.table(mostViewedTags)