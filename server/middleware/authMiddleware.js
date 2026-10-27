const jwt = require("jsonwebtoken");

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Check whether the Authorization header exists.
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Please log in to continue.",
      });
    }

    // 2. Extract the JWT token.
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing.",
      });
    }

    // 3. Ensure the JWT secret is configured.
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from server environment variables.");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error.",
      });
    }

    // 4. Verify the token.
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // 5. Validate the user ID contained in the token.
    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token: user ID is missing.",
      });
    }

    // 6. Attach authenticated user information to the request.
    // Keep `id` because your existing controllers use req.user.id.
    req.user = {
      id: decoded.id,
      _id: decoded.id,
      role: decoded.role,
    };

    // 7. Continue to the requested route.
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please log in again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token. Please log in again.",
      });
    }

    console.error("Authentication error:", error);

    return res.status(401).json({
      success: false,
      message: "Authentication failed. Please log in again.",
    });
  }
};

// ==========================================
// ADMIN AUTHORIZATION MIDDLEWARE
// ==========================================

const adminOnly = (req, res, next) => {
  // The protect middleware must run before adminOnly.
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please log in to continue.",
    });
  }

  // Only administrators can access admin routes.
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
  }

  return next();
};

// ==========================================
// EXPORT MIDDLEWARE
// ==========================================

module.exports = {
  protect,
  adminOnly,
};