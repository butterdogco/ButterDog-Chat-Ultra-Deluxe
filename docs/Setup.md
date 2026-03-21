# Setting up ButterDog Chat

1. Prerequisites - Required software for running the server.
2. Initial setup - The initial setup required before continuing.
3. Setting up the database - Can be done via the MongoDB website or locally. The website is recommended.
4. Running the server - Self explanatory.

## Prerequisites

- Node JS, any recent version
- MongoDB account (Required unless you're hosting a local database)

## Initial setup

1. Clone this repository

## Setting up the database (via website)

1. Create a database on MongoDB, and note the database URL and secret.
2. Create a file named `.env` in the root directory of this project, and fill in the template below:

```env
MONGO_URI=<database url>
SESSION_SECRET=<random string used to encrypt data>
PORT=<web server port, default is 3000>
```

## Setting up the database (locally)

1. Setup and create a MongoDB database (instructions can be found [on the MongoDB website](https://www.mongodb.com/docs/v8.0/administration/install-community/)).
2. Create a file named `.env` in the root directory of this project, and fill in the template below:

```env
MONGO_URI_LOCAL=<database url>
SESSION_SECRET=<random string used to encrypt data>
PORT=<web server port, default is 3000>
```

## Running the server

1. Open a terminal in the root directory, then run `npm run start`. This may take a moment.
2. Visit the website at the URL logged in your terminal.
