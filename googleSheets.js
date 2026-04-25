{
  "name": "workforce-backend",
  "version": "1.0.0",
  "description": "Backend for workforce scheduling app",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "express-cors": "^0.0.3",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "xlsx": "^0.18.5",
    "better-sqlite3": "^9.4.3",
    "nodemailer": "^6.9.9",
    "node-cron": "^3.0.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.4.5",
    "googleapis": "^140.0.1",
    "express-validator": "^7.0.1",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
