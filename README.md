# BarterHub - Barter Trading System

A web-based barter trading system for listing items and exchanging them through trade proposals.

## Technologies
- React and Vite
- Node.js and Express.js
- MySQL
- JWT Authentication
- bcryptjs
- Multer
- Lucide React

## Requirements
- Node.js and npm
- MySQL Server 8.0+
- Git

## Installation

1. Create a MySQL database named barter_trading.
2. Import database/barter_trading.sql.
3. Open backend and run npm install.
4. Copy backend/.env.example to backend/.env.
5. Configure your own MySQL credentials and JWT secret.
6. Run npm run dev inside backend.
7. Open another terminal, go to frontend, and run npm install.
8. Run npm run dev inside frontend.
9. Open http://localhost:5173.

## Features
- Registration and Login
- Item Listing
- Browse Items
- Trade Proposals
- Accept and Decline Trades
- Trade History
- Notifications
- User Profiles
- Change Password
- Reviews

## Important
The SQL file contains database structure only. Each user must configure their own .env file.
