const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const connectDB = require("./db/connect");
const employeeRoutes = require("./routers/employeeRoutes");
const ctoRoutes = require("./routers/ctoRoutes");
const cors = require("cors");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(bodyParser.json());

app.use("/employee", employeeRoutes);
app.use("/cto", ctoRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
});
