Written/designed by aidan F223129

# Sessions
sessions expire after 30 minutes  
they must be renewed via /session.php/session  
  
in a production system, we would store a list of invalidated sessions instead of just allowing them to expire  
we can do this using a bloom filter to store invalidated sessions and an authoritive server to remove false positives in the small chance of false positives
  
also for production generally keys would be stored somewhere more secure