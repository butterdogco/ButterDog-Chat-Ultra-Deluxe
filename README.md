# ButterDogChat Ultra Deluxe V2

This is a chat application built with NodeJS, Express, and MongoDB.

## Features

- User authentication with sessions
- Customizable user profiles (avatar color, username, about)
- Direct messaging and group chats
- Message editing and deletion
- Real-time chat functionality
- MongoDB integration for storing user data and chat history

## Running the Server

1. Install NodeJS (If you don't have it already)
2. Run `npm install` to install dependencies
3. Create a `.env` in the root directory and fill it with the following variables:

   - `MONGO_URI`: Your MongoDB connection string (if applicable/for production)
   - `MONGO_URI_LOCAL`: Your local MongoDB connection string (if applicable)
   - `SESSION_SECRET`: A secret string for session management
   - `PORT`: The port number you want the server to run on (default is 3000)

4. Run `npm start` to start the server
5. Open your browser and visit `http://localhost:3000`

## About

Version 2 was created for my IB Computer Science Internal Assessment, but primarily because I wanted to improve upon the original ButterDogChat by adding more features and finally finishing it.
