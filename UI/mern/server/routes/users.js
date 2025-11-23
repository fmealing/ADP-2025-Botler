import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import { admin } from "../middleware/admin.js";

dotenv.config();
const router = express.Router();

/* ----------------------------------------
   REGISTER (Admin only)
---------------------------------------- */
router.post("/register", auth, admin, async (req, res) => {
  try {
    let { username, password, role } = req.body;
    username = username?.trim();

    if (!username || !password)
      return res.status(400).json({ message: "Username and password required" });

    const user = new User({
      username,
      password,
      role: role || "staff",
    });

    await user.save();
    res.status(201).json({ message: "User registered" });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: "Username already exists" });

    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ----------------------------------------
   LOGIN
---------------------------------------- */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid username" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ----------------------------------------
   GET CURRENT USER
---------------------------------------- */
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ----------------------------------------
   UPDATE CURRENT USER (username/password)
---------------------------------------- */
router.patch("/me", auth, async (req, res) => {
  try {
    const updates = {};

    if (req.body.username) updates.username = req.body.username.trim();

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(req.body.password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ----------------------------------------
   ADMIN: GET ALL USERS
---------------------------------------- */
router.get("/", auth, admin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ----------------------------------------
   ADMIN: UPDATE USER (username, role)
---------------------------------------- */
router.patch("/:id", auth, admin, async (req, res) => {
  try {
    const updates = {};

    if (req.body.username) updates.username = req.body.username.trim();
    if (req.body.role) updates.role = req.body.role;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json(updatedUser);
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: "Username already exists" });

    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ----------------------------------------
   ADMIN: RESET USER PASSWORD
---------------------------------------- */
router.patch("/:id/reset-password", auth, admin, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword)
      return res.status(400).json({ message: "New password required" });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { password: hashed },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ----------------------------------------
   ADMIN: DELETE USER
---------------------------------------- */
router.delete("/:id", auth, admin, async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);

    if (!deleted)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
