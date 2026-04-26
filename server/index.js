const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

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
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again later." },
});
const executeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many code execution requests. Please slow down and try again shortly." },
});

app.use(helmet());
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
app.use(express.json({ limit: "256kb" }));

app.use("/api", testRoutes);
app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/invitations", invitationsRoutes);
app.use("/api/execute", executeRateLimiter, executionRoutes);

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
