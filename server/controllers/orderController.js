const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");

// ==================================================
// CREATE ORDER AND DEDUCT STOCK
// POST /api/orders
// ==================================================

exports.createOrder = async (req, res) => {
  let session;

  try {
    const {
      customerName,
      phone,
      address,
      notes,
      items,
    } = req.body;

    // 1. Validate customer details.
    if (
      typeof customerName !== "string" ||
      !customerName.trim() ||
      typeof phone !== "string" ||
      !phone.trim() ||
      typeof address !== "string" ||
      !address.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, and address are required.",
      });
    }

    // 2. Validate order items.
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your order must contain at least one product.",
      });
    }

    // 3. Validate and combine duplicate products.
    const quantityByProduct = new Map();

    for (const item of items) {
      const productId = String(item?.productId || "");
      const quantity = Number(item?.quantity);

      if (
        !mongoose.isValidObjectId(productId) ||
        !Number.isSafeInteger(quantity) ||
        quantity < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID or quantity.",
        });
      }

      const combinedQuantity =
        (quantityByProduct.get(productId) || 0) + quantity;

      if (!Number.isSafeInteger(combinedQuantity)) {
        return res.status(400).json({
          success: false,
          message: "Requested quantity is too large.",
        });
      }

      quantityByProduct.set(productId, combinedQuantity);
    }

    // 4. Determine the authenticated customer.
    // Guest checkout is supported.
    const authenticatedUserId =
      req.user?._id || req.user?.id || null;

    if (
      authenticatedUserId &&
      !mongoose.isValidObjectId(authenticatedUserId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid customer authentication.",
      });
    }

    let savedOrder = null;

    // 5. Create order and update stock atomically.
    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const orderItems = [];
      let totalAmount = 0;

      for (const [productId, quantity] of quantityByProduct) {
        const product = await Product.findOneAndUpdate(
          {
            _id: productId,
            isAvailable: { $ne: false },
            stock: { $gte: quantity },
          },
          {
            $inc: {
              stock: -quantity,
            },
          },
          {
            new: true,
            session,
            runValidators: true,
          }
        );

        if (!product) {
          const existingProduct = await Product.findById(productId)
            .session(session)
            .lean();

          if (!existingProduct) {
            const error = new Error(
              "A product in your cart could not be found."
            );

            error.status = 404;
            throw error;
          }

          const error = new Error(
            existingProduct.isAvailable === false
              ? `${existingProduct.name} is currently unavailable.`
              : `Insufficient stock for ${existingProduct.name}.`
          );

          error.status = 400;
          throw error;
        }

        // Always use the database price.
        const price = Number(product.price);

        if (!Number.isFinite(price) || price < 0) {
          const error = new Error(
            `Invalid price for ${product.name}.`
          );

          error.status = 400;
          throw error;
        }

        const itemTotal = price * quantity;

        if (!Number.isFinite(itemTotal)) {
          const error = new Error(
            `Invalid total for ${product.name}.`
          );

          error.status = 400;
          throw error;
        }

        orderItems.push({
          product: product._id,
          name: product.name,
          price,
          quantity,
          image: product.image || "",
        });

        totalAmount += itemTotal;

        if (!Number.isFinite(totalAmount)) {
          const error = new Error("Invalid order total.");

          error.status = 400;
          throw error;
        }
      }

      // 6. Save the order.
      const createdOrders = await Order.create(
        [
          {
            customer: authenticatedUserId,
            customerName: customerName.trim(),
            phone: phone.trim(),
            address: address.trim(),
            notes:
              typeof notes === "string"
                ? notes.trim()
                : "",
            items: orderItems,
            totalAmount,
            status: "Pending",
            paymentStatus: "Unpaid",
          },
        ],
        { session }
      );

      savedOrder = createdOrders[0].toObject();
    });

    return res.status(201).json({
      success: true,
      message: "Order saved successfully and stock updated.",
      order: savedOrder,
    });
  } catch (error) {
    console.error("Create order error:", error);

    return res.status(error.status || 500).json({
      success: false,
      message:
        error.status && error.status < 500
          ? error.message
          : "Unable to save your order. Please try again.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// ==================================================
// GET ALL ORDERS
// GET /api/orders
// ADMIN ONLY
// ==================================================

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("customer", "name email")
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve orders.",
    });
  }
};

// ==================================================
// GET MY ORDERS
// GET /api/orders/my-orders
// AUTHENTICATED CUSTOMER
// ==================================================

exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Please log in to view your orders.",
      });
    }

    const orders = await Order.find({
      customer: userId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get my orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve your orders.",
    });
  }
};

// ==================================================
// UPDATE ORDER STATUS
// PATCH /api/orders/:id/status
// ADMIN ONLY
// ==================================================

exports.updateOrderStatus = async (req, res) => {
  let session;

  try {
    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    const { status } = req.body;
    const { id } = req.params;

    // 1. Validate request.
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status.",
      });
    }

    session = await mongoose.startSession();

    let updatedOrder;

    await session.withTransaction(async () => {
      const order = await Order.findById(id).session(session);

      if (!order) {
        const error = new Error("Order not found.");

        error.status = 404;
        throw error;
      }

      const previousStatus = order.status;

      if (previousStatus === status) {
        updatedOrder = order.toObject();
        return;
      }

      // 2. Restore stock when cancelling an order.
      if (
        status === "Cancelled" &&
        previousStatus !== "Cancelled"
      ) {
        for (const item of order.items) {
          const result = await Product.updateOne(
            { _id: item.product },
            {
              $inc: {
                stock: item.quantity,
              },
            },
            { session }
          );

          if (result.matchedCount !== 1) {
            const error = new Error(
              `Cannot restore stock: ${item.name} was not found.`
            );

            error.status = 409;
            throw error;
          }
        }
      }

      // 3. Reserve stock again when reopening a cancelled order.
      if (
        previousStatus === "Cancelled" &&
        status !== "Cancelled"
      ) {
        for (const item of order.items) {
          const product = await Product.findOneAndUpdate(
            {
              _id: item.product,
              isAvailable: { $ne: false },
              stock: { $gte: item.quantity },
            },
            {
              $inc: {
                stock: -item.quantity,
              },
            },
            {
              new: true,
              session,
              runValidators: true,
            }
          );

          if (!product) {
            const error = new Error(
              `Insufficient stock to reopen the order for ${item.name}.`
            );

            error.status = 409;
            throw error;
          }
        }
      }

      // 4. Save the updated order status.
      order.status = status;

      await order.save({ session });

      updatedOrder = order.toObject();
    });

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Update order status error:", error);

    return res.status(error.status || 500).json({
      success: false,
      message:
        error.status && error.status < 500
          ? error.message
          : "Unable to update order status.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// ==================================================
// SALES ANALYTICS DASHBOARD
// GET /api/orders/analytics
// ADMIN ONLY
// ==================================================

exports.getSalesAnalytics = async (req, res) => {
  try {
    // Fetch every order for status statistics.
    const allOrders = await Order.find()
      .sort({ createdAt: -1 })
      .lean();

    // Exclude cancelled orders from sales calculations.
    const validOrders = allOrders.filter(
      (order) => order.status !== "Cancelled"
    );

    // 1. Order statistics.
    const totalOrders = allOrders.length;

    const pendingOrders = allOrders.filter(
      (order) => order.status === "Pending"
    ).length;

    const deliveredOrders = allOrders.filter(
      (order) => order.status === "Delivered"
    ).length;

    const cancelledOrders = allOrders.filter(
      (order) => order.status === "Cancelled"
    ).length;

    // 2. Order value excludes cancelled orders.
    const totalOrderValue = validOrders.reduce(
      (total, order) =>
        total + Number(order.totalAmount || 0),
      0
    );

    // 3. Confirmed revenue counts only orders marked Paid.
    const totalRevenue = validOrders.reduce(
      (total, order) => {
        return order.paymentStatus === "Paid"
          ? total + Number(order.totalAmount || 0)
          : total;
      },
      0
    );

    // 4. Monthly sales for the last six months.
    const monthlySales = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      const nextMonth = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        1
      );

      const monthOrders = validOrders.filter((order) => {
        const createdAt = new Date(order.createdAt);

        return (
          createdAt >= monthDate &&
          createdAt < nextMonth
        );
      });

      const monthOrderValue = monthOrders.reduce(
        (total, order) =>
          total + Number(order.totalAmount || 0),
        0
      );

      const monthRevenue = monthOrders.reduce(
        (total, order) =>
          order.paymentStatus === "Paid"
            ? total + Number(order.totalAmount || 0)
            : total,
        0
      );

      monthlySales.push({
        month: monthDate.toLocaleDateString("en-IN", {
          month: "short",
          year: "numeric",
        }),
        orders: monthOrders.length,
        orderValue: monthOrderValue,
        revenue: monthRevenue,
      });
    }

    // 5. Best-selling products by quantity ordered.
    const productSales = new Map();

    validOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const productId = String(item.product);

        if (!productSales.has(productId)) {
          productSales.set(productId, {
            productId,
            name: item.name,
            quantitySold: 0,
            orderValue: 0,
          });
        }

        const product = productSales.get(productId);

        product.quantitySold += Number(item.quantity || 0);

        product.orderValue +=
          Number(item.price || 0) *
          Number(item.quantity || 0);
      });
    });

    const bestSellingProducts = Array.from(
      productSales.values()
    )
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5);

    // 6. Five most recent non-cancelled orders.
    const recentSales = validOrders.slice(0, 5).map((order) => ({
      _id: order._id,
      customerName: order.customerName,
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
    }));

    return res.status(200).json({
      success: true,
      analytics: {
        totalOrders,
        pendingOrders,
        deliveredOrders,
        cancelledOrders,
        totalOrderValue,
        totalRevenue,
        monthlySales,
        bestSellingProducts,
        recentSales,
      },
    });
  } catch (error) {
    console.error("Sales analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load sales analytics.",
    });
  }
};