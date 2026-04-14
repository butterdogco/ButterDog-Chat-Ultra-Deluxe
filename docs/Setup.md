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
2. Install dependencies: `npm install`.

## Setting up the database

### MongoDB Atlas (Cloud)

1. Create a database on MongoDB, and note the database URL and secret.
2. Create a file named `.env` in the root directory of this project, and fill in the template below:

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
2. Visit the website at the URL logged in your terminal. (e.g., [http://localhost:3000](http://localhost:3000))
