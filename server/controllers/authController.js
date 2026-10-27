const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// ==========================================
// GENERATE JWT TOKEN
// ==========================================

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

// ==========================================
// CREATE EMAIL TRANSPORTER
// ==========================================

const createEmailTransporter = () => {
  const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS,
  } = process.env;

  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
    throw new Error("Email configuration is missing in the .env file.");
  }

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: Number(EMAIL_PORT) === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
};

// ==========================================
// REGISTER
// POST /api/auth/register
// ==========================================

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, address } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof phone !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: hashedPassword,
      address: typeof address === "string" ? address.trim() : "",
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
    });
  }
};

// ==========================================
// LOGIN
// POST /api/auth/login
// ==========================================

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

// ==========================================
// UPDATE CUSTOMER PROFILE
// PATCH /api/auth/profile
// ==========================================

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please log in to update your profile.",
      });
    }

    const { name, phone, address } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name is required.",
      });
    }

    if (phone !== undefined && typeof phone !== "string") {
      return res.status(400).json({
        success: false,
        message: "Phone number must be text.",
      });
    }

    if (address !== undefined && typeof address !== "string") {
      return res.status(400).json({
        success: false,
        message: "Delivery address must be text.",
      });
    }

    const updateFields = {
      name: name.trim(),
    };

    if (phone !== undefined) {
      updateFields.phone = phone.trim();
    }

    if (address !== undefined) {
      updateFields.address = address.trim();
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password -resetPasswordToken -resetPasswordExpires");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user,
    });
  } catch (error) {
    console.error("Update profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update profile. Please try again.",
    });
  }
};

// ==========================================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// ==========================================

exports.forgotPassword = async (req, res) => {
  let user;

  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter your registered email address.",
      });
    }

    const genericMessage =
      "If an account exists with that email, password reset instructions will be sent.";

    user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    // Do not disclose whether an email is registered.
    if (!user) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    if (!process.env.FRONTEND_URL) {
      throw new Error("FRONTEND_URL is not configured.");
    }

    // Generate a secure random token.
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store only the SHA-256 hash in the database.
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);

    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL.replace(/\/+$/, "");

    const resetUrl =
      `${frontendUrl}/reset-password/${resetToken}`;

    const transporter = createEmailTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: user.email,
      subject: "Reset Your NANJUNDESHWARA TRADERS Password",

      text: [
        `Hello ${user.name},`,
        "",
        "We received a request to reset your password.",
        "",
        `Reset your password here: ${resetUrl}`,
        "",
        "This link expires in 15 minutes and can only be used once.",
        "If you did not request this, ignore this email.",
      ].join("\n"),

      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#1f2937;">NANJUNDESHWARA TRADERS</h2>

          <p>Hello ${escapeHtml(user.name)},</p>

          <p>We received a request to reset your account password.</p>

          <p>Click below to choose a new password.</p>

          <p style="margin:28px 0;">
            <a
              href="${resetUrl}"
              style="background:#087f5b;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block;"
            >
              Reset Password
            </a>
          </p>

          <p>This link expires in <strong>15 minutes</strong> and can only be used once.</p>

          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    // Clear the token if the email could not be sent.
    if (user) {
      try {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save({ validateBeforeSave: false });
      } catch (saveError) {
        console.error(
          "Unable to clear reset token:",
          saveError.message
        );
      }
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to send password reset instructions. Please try again later.",
    });
  }
};

// ==========================================
// RESET PASSWORD
// POST /api/auth/reset-password/:token
// ==========================================

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (typeof token !== "string" || !token) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing password reset token.",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "This password reset link is invalid or expired. Please request a new one.",
      });
    }

    // Hash the new password.
    user.password = await bcrypt.hash(password, 12);

    // Invalidate the token after successful use.
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to reset your password. Please try again.",
    });
  }
};

// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(value) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return String(value).replace(/[&<>"']/g, (character) => {
    return entities[character];
  });
}