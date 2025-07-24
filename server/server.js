const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const connectDB = require('./db/connect');
const adminRoutes = require('./routers/adminRoutes'); // ✅ New
const cors = require('cors');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware

app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true 
}));

app.use(bodyParser.json());

app.use('/admin', adminRoutes); // ✅ Mount admin routes

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
});
