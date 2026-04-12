const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");
const testRoutes = require("./routes/testRoutes");
const authRoutes = require("./routes/authRoutes");
const roomsRoutes = require("./routes/roomsRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomsRoutes);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup aborted due to DB connection error");
    process.exit(1);
  }
};

startServer();
