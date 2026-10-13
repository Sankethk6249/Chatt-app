# Chatt-app

# Simple Chat Application

Real-time chat app with user authentication and persistent chat history.

## Tech Stack
- Front-End: HTML, CSS, JavaScript (WebSockets)
- Back-End: Node.js, Express, `ws` library
- Database: MongoDB (Mongoose)
- Auth: JWT + bcrypt

## Features
- User registration and login
- Real-time messaging with WebSockets
- Message persistence (last 50 messages loaded on login)
- Online users count
- Auto-reconnect

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET`
3. Make sure MongoDB is running (or use a MongoDB Atlas URI)
4. `npm start`
5. Open http://localhost:3000 in two browser tabs and register two users to test

## API
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/messages` (requires Bearer token)