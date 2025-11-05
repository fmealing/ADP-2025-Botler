Botler application for robot waiter ordering system, management, and service tracking.

A full-stack mern (MongoDB, Express, React, Node.js) application 

Installation:
1. Clone the git
2. In terminal, head to your repo, and to ADP-2025-Botler (e.g. terminal>cd <your_repo>/ADP-2025/Botler)
3. Install dependencies:
    cd UI/mern/server
    npm install

    cd ../client
    npm install

4. Setup environment:
    Create a file 'config.env' under mern/server.
    Within the file copy and paste:

    PORT=5050
    ATLAS_URI=
    JWT_SECRET=
    JWT_EXPIRES_IN=7d

5. Setup MongoDB cluster.
    Create an account
    Create a project 
    Go to project >> click "Connect" under Clusters
    Click Drivers
    Follow instructions 
    (within mern/server run 
        >npm install mongodb)
    Copy the connection string
    Paste it in config.env following ATLAS_URI=

    It should look like
        ATLAS_URI=mongodb+srv://<Username>:<db_password>@botlerdb.7ytsfpq.mongodb.net/?appName=BotlerDB
    
    Note do not leave space between ATLAS_URI= and the link.
    
    Fill in Username and password (remove '<>')
        note: this is the password for the MongoDB USER not your MongoDB account
            This is found MongoDB > click project > Database & Network Acess (under security) > EDIT (user) > Edit Password

6. Generate JWT Token:
    In terminal, run:
        > node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

    Copy-paste this into config.env following JWT_SECRET=

        Note do not leave space between JWT_SECRET and the token.

7. Run the app:
    In the terminal, given you are in the ADP-2025-Botler folder run:
        cd UI/mern/server
        npm start

    To start the server

    Then, from ADP-2025-Botler again, in a seperate terminal run:
        cd UI/mern/client
        npm run dev

    To start the client.

    Head to http://localhost:5173/ to view the app.


Author:
Jack F.