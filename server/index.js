const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");

const connectDB = require("./config/db");
const testRoutes = require("./routes/testRoutes");
const authRoutes = require("./routes/authRoutes");
const roomsRoutes = require("./routes/roomsRoutes");
const invitationsRoutes = require("./routes/invitationsRoutes");
const executionRoutes = require("./routes/executionRoutes");
const { initializeRealtime } = require("./socket/realtime");
const { buildAllowedOriginChecker } = require("./config/allowedOrigins");

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;
const isAllowedOrigin = buildAllowedOriginChecker();

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json());

app.use("/api", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/invitations", invitationsRoutes);
app.use("/api/execute", executionRoutes);

initializeRealtime(httpServer, isAllowedOrigin);

const startServer = async () => {
  try {
    await connectDB();
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup aborted due to DB connection error");
    process.exit(1);
  }
};

startServer();
