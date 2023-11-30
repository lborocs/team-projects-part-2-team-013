# Infrastructure overview
![Network diagram detailing the server side setup](https://cdn.013.team/development/Screenshot-2023-11-30-010257.png)

There are also 2 other sites used as CDNS:
- cdn.013.team - used for hosting static web asssets (images, videos, icons etc)
- usercontent.013.team - used for hosting usercontent such as avatars etc.

# Infrastructure configuration
The api requires for each node to be able to include a php file containing secrets and config info using the following format:
```php
<?php
// infrastrucure
const MYSQL_DATABASE = "team013";
const MYSQL_USERNAME = "team013";
const MYSQL_PASSWORD = "database password";
const MYSQL_SERVER = "localhost";
const SESSION_VALIDATION_BASE = "http://localhost:4231/";

// encryption
const SESSION_HMAC_ALGO = "sha3-256";
const SESSION_ENCRYPTION_ALGO = "aes-256-cbc";
const SESSION_ENCRYPTION_KEY_HEX = "session encryption key";
const SESSION_HMAC_KEY_HEX = "session signing key";
?>
```


# Run on local machine

1. Install [PHP VS16 x64 Non Thread Safe (direct download)](https://windows.php.net/downloads/releases/php-8.2.12-nts-Win32-vs16-x64.zip)
2. Extract to `C:\php`
3. Rename `php.ini-development` to `php.ini`
4. Un-comment these lines by removing the semicolon:
    - `;extension=curl`
    - `;extension=mysqli`
    - `;extension=openssl`
5. Install the [PHP Server](https://marketplace.visualstudio.com/items?itemName=brapifra.phpserver) extension for VS Code
6. Change the php server location to serve from `web/` OR open the `web/` folder directly in vscode 
7. In the extension settings give the directory of your php folder and php.ini to PHP Server
8. Start the php server in the `web` folder

    *Make sure there is a trailing slash in URLs because php server wont load styles or scripts if there isnt.*

    *URLs should look like this:* `localhost:3000/dashboard/` `localhost:3000/`

The site should now function like normal on your local machine.

# Important notes for pt2
- Fontawesome import has now changed to be hosted on cdnjs.cloudflare.com
- We are no longer going to use the 3rd party avatar api as it shares data (employee names with a 3rd party site)
- assets like images should be stored on the cdn, not the repo
- hostable user data (like wiki post images) should never be accessed via the root domain (013.team), only the usercontent cdn (usercontent.013.team)
- dont use inline anything (no css in html, no scripts in html, no onClick attributes for elements)

### jamie
![30th feb moment](https://cdn.013.team/Screenshot2023-11-28-024447.png)
