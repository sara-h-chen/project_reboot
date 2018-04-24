# Load Balancing for Virtual Environments in Distributed Systems (3rd Year Project)
This is the source code accompanying the project.

## Installation
To get up and running, the following tools need to be installed:
- Node.js
- MongoDB
- Redis
- Git

### Node.js
Node.js v8.7.0 was used in the building and testing of this code. It runs the backend of the cluster. To install Node.js, you can either install it straight into your system, or use `nvm` to manage your Node versions.

To install and use `nvm`, the instructions can be found [here](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-with-nvm-node-version-manager-on-a-vps).

Otherwise, install Node.js according to your own architecture, following the instructions that can be found [here](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions).

Before beginning, ensure that you use the right version of Node.js. To check your Node version, use the following command:

    node -v

Once Node.js has been installed, the Node packages that accompany this project have to be installed onto your local system. To do so, run the following command:

    npm install

This will download all the code dependencies required for the project that are listed out in `packages.json`.

### MongoDB
MongoDB is used to manage the database, and you can follow the installation instructions [here](https://docs.mongodb.com/manual/installation/).

The MongoDB server has to be started manually on the command line, using the following command:

    mongod

By default, `mongodb` starts on Port `27017`, so please ensure that this port is free before attempting to run the code.

### Redis
Redis is used solely as a Message Queue in this project. Installation instructions can be found [here](https://redis.io/download).

Once installed, the Redis server has to be started on the command line, using the following command:

    redis-server

### Git
Git is the version control system used throughout development for this project. The `.git` folder is required to switch branches to activate specific functionality. Git can be installed following the instructions [here](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git).

The `demo` branch contains largely stable code, and was used for the purposes of demonstration of functionality. The `dynamic` branch has integrated fault tolerance; however, the code is unstable.

## Starting Up
**WARNING:** Please ensure that both the MongoDB and Redis servers have started before attempting to deploy the cluster. The code will not work otherwise.

The components in the cluster have to be deployed in the following order:
1. MongoDB, Redis
2. Master
3. Gate
4. Logic

The master server is initialized on port **8000**. To start the master server with simple static load balancing (the default), simply run the following command on a terminal session:

    node master.js

However, to activate the dynamic load balancing, the following parameters have to be added to the command:

    node master.js -dc

The gate server by default allows for clients to be allocated to all active servers. However, for the purposes of testing, the gate server may also restrict allocation to only one server, using the following command:

    node gate.js -oo

To start the gate without this restriction, simply use the same command without the `-oo` flag.

The code currently relies on the logic servers being on the following ports: **6050, 6051, 6052, 6053, 6054**. Please ensure that the ports listed are available before attempting to run the code. Each server has to be started on an individual terminal session, using the following command:

    node server.js PORT=605X

where `X` refers to the server number.

The cluster should now be running, and the virtual environment can now be accessed from `localhost:8080`. To monitor the status of the cluster, the master server provides a web interface on `localhost:8000`.

### AI Bots
The AI bots are stored within the `ai/` directory. They come with 2 modes of behavior: simple and complex.

To activate the bots, go to the `ai_emulator.js` file, and look at Line 124 and 125 of the code:

    totalBots = 50;
    for (var i = 0; i < totalBots; i++) {
        // BotClients.push(createBotClient(i, doBotStuff));
        BotClients.push(createBotClient(i, wander));
        BotClients[i].requestData();
    }

The AI behavior is specified by the `push()` function, where `doBotStuff` specifies for the bots to be initialized with simple behavior, while `wander` specifies complex behavior. Ensure that the chosen bot behavior has been uncommented.

To increase or decrease the number of bots, simply change the integer number being passed to the `totalBots` variable.

The bots' behavior can be observed on `localhost:8075`.
