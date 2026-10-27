const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline");

const User = require("../models/User");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function resetPassword() {
  try {
    const email = await ask("Enter your registered admin email: ");
    const newPassword = await ask("Enter your new password (minimum 8 characters): ");

    if (newPassword.length < 8) {
      throw new Error("Password must contain at least 8 characters.");
    }

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from server/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      throw new Error("No account exists with that email.");
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    console.log("\nPassword reset successfully!");
    console.log("Email:", user.email);
    console.log("Role:", user.role);
    console.log("You can now log in using your new password.");
  } catch (error) {
    console.error("\nPassword reset failed:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

resetPassword();