import express from "express";
import Order from "../models/Order.js";
import MenuItem from "../models/MenuItem.js";
import Table from "../models/Table.js";
import Robot from "../models/Robot.js";
import RobotHistory from "../models/RobotHistory.js";
import { auth } from "../middleware/auth.js";
import { authOptional } from "../middleware/authOptional.js";
import { admin } from "../middleware/admin.js";

const router = express.Router();

async function endCurrentHistory(robotId) {
  await RobotHistory.updateOne(
    { robot: robotId, endedAt: null },
    { endedAt: new Date() }
  );
}

async function startHistory(robotId, action, tableId = null, orderId = null) {
  await RobotHistory.create({
    robot: robotId,
    action,
    table: tableId || null,
    order: orderId || null,
  });
}

router.get("/", auth, async (req, res) => {
  try {
    let orders;

    if (req.user?.role === "admin") {
      orders = await Order.find()
        .populate("user", "username")
        .populate("table", "tableNumber")
        .populate("waiter", "name")
        .populate("menu", "name")
        .populate({
          path: "items.menuItem",
          select: "name price",
          populate: {
            path: "ingredients",
            select: "name allergens",
            populate: { path: "allergens", select: "name" },
          },
        })
        .sort({ createdAt: -1 });

      return res.status(200).json(orders);
    }

    orders = await Order.find()
      .populate("table", "tableNumber")
      .populate("waiter", "name")
      .populate("menu", "name")
      .sort({ createdAt: -1 });

    const limitedOrders = orders.map((order) => ({
      _id: order._id,
      status: order.status,
      table: order.table,
      menu: order.menu,
      waiter: order.waiter,
      totalPrice: order.totalPrice,
      placedAt: order.placedAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    res.status(200).json(limitedOrders);
  } catch (err) {
    res.status(500).json({ message: "Error fetching orders", error: err.message });
  }
});

router.get("/:id", authOptional, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "username")
      .populate({ path: "table", select: "tableNumber" })
      .populate("waiter", "name")
      .populate("menu", "name")
      .populate({
        path: "items.menuItem",
        select: "name price",
        populate: {
          path: "ingredients",
          select: "name allergens",
          populate: { path: "allergens", select: "name" },
        },
      });

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (!req.user) {
      return res.status(200).json({
        _id: order._id,
        table: order.table,
        menu: order.menu,
        items: order.items,
        totalPrice: order.totalPrice,
        status: order.status,
      });
    }

    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ message: "Error fetching order", error: err.message });
  }
});

router.post("/", authOptional, async (req, res) => {
  try {
    const { table, menu, items = [] } = req.body;

    if (!table) return res.status(400).json({ message: "Table required" });

    const foundTable = await Table.findById(table);
    if (!foundTable) return res.status(400).json({ message: "Table not found" });

    let existing = await Order.findOne({ table, status: "Pending" });
    if (existing) return res.status(200).json(existing);

    for (const i of items) {
      const exists = await MenuItem.findById(i.menuItem);
      if (!exists) return res.status(400).json({ message: "Menu item not found" });
    }

    let totalP = 0;
    for (const i of items) {
      const item = await MenuItem.findById(i.menuItem);
      if (item) totalP += item.price * i.quantity;
    }

    const newOrder = new Order({
      user: req.user?._id || null,
      table,
      menu,
      items,
      totalPrice: totalP,
    });

    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    res.status(500).json({ message: "Error creating order", error: err.message });
  }
});

router.patch("/:id", authOptional, async (req, res) => {
  try {
    const { action, menuItem, quantity, specialInstructions } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const index = order.items.findIndex(
      (i) =>
        i.menuItem.toString() === menuItem &&
        i.specialInstructions === (specialInstructions || "")
    );

    if (action === "add") {
      if (index > -1) order.items[index].quantity += quantity || 1;
      else order.items.push({ menuItem, quantity: quantity || 1, specialInstructions });
    } else if (action === "update") {
      if (index === -1) return res.status(400).json({ message: "Item not found in order" });
      if (quantity !== undefined) order.items[index].quantity = quantity;
      if (specialInstructions !== undefined)
        order.items[index].specialInstructions = specialInstructions;
    } else if (action === "remove") {
      if (index === -1) return res.status(400).json({ message: "Item not found in order" });
      order.items.splice(index, 1);
    } else if (action === "clear") {
      order.items = [];
    } else if (action === "submit") {
      order.status = "Submitted";
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    const updated = await order.save();
    const populatedOrder = await updated.populate([
      { path: "table", select: "tableNumber" },
      { path: "items.menuItem", select: "name price description" },
    ]);

    res.status(200).json(populatedOrder);
  } catch (err) {
    res.status(500).json({ message: "Error updating order", error: err.message });
  }
});

router.patch("/:id/send", auth, async (req, res) => {
  try {
    if (!["admin", "staff"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "Submitted") {
      return res.status(400).json({ message: "Order not ready to send" });
    }

    if (!order.waiter) {
      return res.status(400).json({ message: "No robot assigned to order" });
    }

    const robot = await Robot.findById(order.waiter);
    if (!robot) return res.status(404).json({ message: "Robot not found" });

    await endCurrentHistory(robot._id);

    order.status = "In-progress";
    await order.save();

    robot.action = "serving";
    await robot.save();

    await startHistory(robot._id, "serving", order.table, order._id);

    const populatedOrder = await Order.findById(order._id)
      .populate("table", "tableNumber")
      .populate("waiter", "name");

    res.status(200).json(populatedOrder);
  } catch (err) {
    res.status(500).json({ message: "Error sending order", error: err.message });
  }
});

router.patch("/:id/admin", auth, async (req, res) => {
  try {
    const { status, waiter } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (status) order.status = status;
    if (waiter) order.waiter = waiter;

    const updated = await order.save();
    const populatedOrder = await updated.populate([
      { path: "user", select: "username" },
      { path: "table", select: "tableNumber" },
      { path: "waiter", select: "name" },
      { path: "menu", select: "name" },
      { path: "items.menuItem", select: "name price" },
    ]);

    res.status(200).json(populatedOrder);
  } catch (err) {
    res.status(500).json({ message: "Error updating order", error: err.message });
  }
});

router.delete("/:id", auth, admin, async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) return res.status(404).json({ message: "Order not found" });

    res.status(200).json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting order", error: err.message });
  }
});

router.get("/table/:tableId/active", authOptional, async (req, res) => {
  try {
    const { tableId } = req.params;

    let order = await Order.findOne({
      table: tableId,
      status: { $in: ["Pending", "In-progress", "Submitted"] },
    })
      .populate("table", "tableNumber")
      .populate({
        path: "items.menuItem",
        select: "name price",
      });

    if (!order) {
      order = new Order({
        table: tableId,
        user: req.user?._id || null,
        items: [],
        totalPrice: 0,
        status: "Pending",
      });
      await order.save();
    }

    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({
      message: "Failed to resolve order",
      error: err.message,
    });
  }
});


export default router;
