require("dotenv").config();

const dns = require("dns");

// DNS configuration for MongoDB Atlas SRV connections.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ==========================================
// CONFIGURATION
// ==========================================

const PORT = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.use(express.json({ limit: "1mb" }));

app.use(express.urlencoded({ extended: true }));

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Nanjundeshwara Traders API is running",
  });
});

// ==========================================
// API ROUTES
// ==========================================

// Authentication routes.
app.use(
  "/api/auth",
  require("./routes/authRoutes")
);

// Product routes.
app.use(
  "/api/products",
  require("./routes/productRoutes")
);

// Order routes.
// Analytics is registered inside orderRoutes.js.
app.use(
  "/api/orders",
  require("./routes/orderRoutes")
);

// ==========================================
// NOT FOUND HANDLER
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "An internal server error occurred"
        : err.message || "Internal server error",
  });
});

// ==========================================
// CONNECT TO MONGODB AND START SERVER
// ==========================================

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is missing from server/.env"
      );
    }

    if (!process.env.JWT_SECRET) {
      throw new Error(
        "JWT_SECRET is missing from server/.env"
      );
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully");

    const server = app.listen(PORT, () => {
      console.log(
        `Server running at http://localhost:${PORT}`
      );

      console.log(
        `Health check: http://localhost:${PORT}/`
      );

      console.log(
        `Products API: http://localhost:${PORT}/api/products`
      );

      console.log(
        `Authentication API: http://localhost:${PORT}/api/auth`
      );

      console.log(
        `Orders API: http://localhost:${PORT}/api/orders`
      );

      console.log(
        `Sales Analytics API: http://localhost:${PORT}/api/orders/analytics`
      );
    });

    // Handle unexpected server errors.
    server.on("error", (error) => {
      console.error("HTTP server error:", error.message);
    });
  } catch (error) {
    console.error(
      "Failed to start server:",
      error.message
    );

    process.exit(1);
  }
}

startServer();