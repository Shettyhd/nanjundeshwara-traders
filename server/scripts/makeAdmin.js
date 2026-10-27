// server/scripts/makeAdmin.js

const dns = require("dns");

// Configure DNS before connecting to MongoDB Atlas
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");

async function makeAdmin() {
  try {
    // Check environment variables
    const mongoUri = process.env.MONGODB_URI;
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!mongoUri) {
      throw new Error("MONGODB_URI is missing from server/.env");
    }

    if (!adminEmail) {
      throw new Error("ADMIN_EMAIL is missing from server/.env");
    }

    console.log("Connecting to MongoDB Atlas...");

    // Connect to MongoDB
    await mongoose.connect(mongoUri);

    console.log("MongoDB connected successfully!");

    // Find the registered user and promote them to admin
    const user = await User.findOneAndUpdate(
      {
        email: adminEmail.trim().toLowerCase(),
      },
      {
        $set: {
          role: "admin",
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      throw new Error(
        "User not found. Register the administrator email before running this script."
      );
    }

    console.log("\n==================================");
    console.log("ADMIN ACCOUNT CONFIGURED SUCCESSFULLY");
    console.log("==================================");
    console.log("Name:", user.name);
    console.log("Email:", user.email);
    console.log("Role:", user.role);
    console.log("==================================\n");
  } catch (error) {
    console.error("\nAdmin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

makeAdmin();