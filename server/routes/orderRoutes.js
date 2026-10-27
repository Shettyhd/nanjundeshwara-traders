const express = require("express");

const router = express.Router();

// Import order controller functions.
const {
  createOrder,
  getOrders,
  getMyOrders,
  updateOrderStatus,
  getSalesAnalytics,
} = require("../controllers/orderController");

// Import authentication middleware.
const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

// ==================================================
// CREATE ORDER
// POST /api/orders
// Supports authenticated customers and guest checkout.
// ==================================================

router.post("/", (req, res, next) => {
  const authorization = req.headers.authorization;

  // Authenticate requests that supply a Bearer token.
  if (authorization?.startsWith("Bearer ")) {
    return protect(req, res, next);
  }

  // Allow guest checkout when no token is supplied.
  next();
}, createOrder);

// ==================================================
// GET CUSTOMER ORDERS
// GET /api/orders/my-orders
// ==================================================

router.get(
  "/my-orders",
  protect,
  getMyOrders
);

// ==================================================
// SALES ANALYTICS
// GET /api/orders/analytics
// ADMIN ONLY
// ==================================================

router.get(
  "/analytics",
  protect,
  adminOnly,
  getSalesAnalytics
);

// ==================================================
// GET ALL ORDERS
// GET /api/orders
// ADMIN ONLY
// ==================================================

router.get(
  "/",
  protect,
  adminOnly,
  getOrders
);

// ==================================================
// UPDATE ORDER STATUS
// PATCH /api/orders/:id/status
// ADMIN ONLY
// ==================================================

router.patch(
  "/:id/status",
  protect,
  adminOnly,
  updateOrderStatus
);

module.exports = router;