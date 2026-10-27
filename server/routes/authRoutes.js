const express = require("express");
const router = express.Router();

const {
  register,
  login,
  updateProfile,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

// ==========================================
// REGISTER
// POST /api/auth/register
// ==========================================
router.post("/register", register);

// ==========================================
// LOGIN
// POST /api/auth/login
// ==========================================
router.post("/login", login);

// ==========================================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// ==========================================
router.post("/forgot-password", forgotPassword);

// ==========================================
// RESET PASSWORD
// POST /api/auth/reset-password/:token
// ==========================================
router.post("/reset-password/:token", resetPassword);

// ==========================================
// UPDATE CUSTOMER PROFILE
// PATCH /api/auth/profile
// ==========================================
router.patch("/profile", protect, updateProfile);

module.exports = router;