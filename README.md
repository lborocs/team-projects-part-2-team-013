[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-24ddc0f5d75046c5622901739e7c5dd533143b0c8e959d652212380cedb1ea36.svg)](https://classroom.github.com/a/vhV8o9li)

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
