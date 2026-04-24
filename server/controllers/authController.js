const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client();

const signAppToken = (user) =>
  jwt.sign(
    { userId: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      authProvider: "local",
      password,
    });

    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    console.error("Register error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.authProvider === "google" || !user.password) {
      return res.status(400).json({ message: "This account uses Google sign-in. Continue with Google." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT secret is not configured" });
    }

    const token = signAppToken(user);

    return res.status(200).json({ token });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const googleAuthUser = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ message: "Google ID token is required" });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: "Google client ID is not configured" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT secret is not configured" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleSub = payload?.sub;
    const email = payload?.email?.trim().toLowerCase();
    const emailVerified = payload?.email_verified;
    const name = payload?.name?.trim() || "Google User";

    if (!googleSub || !email || !emailVerified) {
      return res.status(401).json({ message: "Invalid Google account payload" });
    }

    let user = await User.findOne({
      $or: [{ googleId: googleSub }, { email }],
    });

    if (!user) {
      user = await User.create({
        name,
        email,
        authProvider: "google",
        googleId: googleSub,
      });
    } else {
      let isUpdated = false;

      if (!user.googleId) {
        user.googleId = googleSub;
        isUpdated = true;
      }

      if (user.authProvider !== "google") {
        user.authProvider = "google";
        isUpdated = true;
      }

      if (!user.name && name) {
        user.name = name;
        isUpdated = true;
      }

      if (isUpdated) {
        await user.save();
      }
    }

    const token = signAppToken(user);
    return res.status(200).json({ token });
  } catch (error) {
    console.error("Google auth error:", error.message);
    return res.status(401).json({ message: "Google authentication failed" });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const user = await User.findById(req.user.userId).select("name email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  googleAuthUser,
  getCurrentUser,
};
