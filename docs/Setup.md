# Setting up ButterDog Chat Ultra Deluxe

## Table of Contents

1. [Prerequisites](#prerequisites) - Required software for running the server.
2. [Initial setup](#initial-setup) - The initial setup is required before continuing.
3. [Setting up the database](#setting-up-the-database) - Can be done via the MongoDB website or locally. The website is recommended.
4. [Running the server](#running-the-server) - Starting up the server after completing setup.

## Prerequisites

- Node.js, any recent version such as v24.14.1 (LTS).
- npm, any recent version.
- MongoDB account (Required unless you're hosting a local database).

## Initial setup

1. Clone this repository: `git clone https://github.com/butterdogco/ButterDog-Chat-Ultra-Deluxe.git`.
2. Navigate to the cloned repository (e.g., `cd ./ButterDog-Chat-Ultra-Deluxe/`, command differs between operating systems)
3. Install dependencies: `npm install`.

## Setting up the database

### MongoDB Atlas (Cloud)

1. Create a database on MongoDB. Instructions can be found on the [MongoDB Atlas docs](https://www.mongodb.com/docs/atlas/).
2. After creating and setting up a database, please make sure to note the database URL and secret.
3. Create a file named `.env` in the root directory of this project, and fill in the template below:

```env
MONGO_URI=<database url>
SESSION_SECRET=<random string used to encrypt data>
PORT=<web server port, default is 3000>
```

### MongoDB Community Edition (Local)

1. Set up and create a MongoDB database. Instructions can be found on the [MongoDB Community Edition docs](https://www.mongodb.com/docs/v8.0/administration/install-community/).
2. Create a file named `.env` in the root directory of this project, and fill in the template below:

```env
MONGO_URI_LOCAL=<database url>
SESSION_SECRET=<random string used to encrypt data>
PORT=<web server port, default is 3000>
```

## Running the server

1. Open a terminal in the root directory, then run `npm run start`. This may take a moment.
2. To visit the website, navigate to the URL logged in the terminal in a web browser. (e.g., [http://localhost:3000](http://localhost:3000))
