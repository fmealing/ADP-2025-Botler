import express from "express";
import Order from "../models/Order.js";
import MenuItem from "../models/MenuItem.js";
import Table from "../models/Table.js";
import { auth } from "../middleware/auth.js";
import { authOptional } from "../middleware/authOptional.js";
import { admin } from "../middleware/admin.js";

const router = express.Router();

//get all orders
router.get("/", auth, admin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "username")
      .populate("table", "name")
      .populate("waiter", "name")
      .populate("menu", "name")
      .populate({path: "items.menuItem", select: "name price"})
      .sort({ placedAt: -1 });

    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: "Error fetching orders", error: err.message });
  }
});

//get one order
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "username")
      .populate("table", "name")
      .populate("waiter", "name")
      .populate("menu", "name")
      .populate({path: "items.menuItem", select: "name price"});

    if (!order) return res.status(404).json({ message: "Order not found" });
    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ message: "Error fetching order", error: err.message });
  }
});

//create new order
router.post("/", auth, async (req, res) => {
  try {
    const { table, items, waiter } = req.body;

    if (!table) return res.status(400).json({ message: "Table required" });
    if (!items || items.length === 0) return res.status(400).json({ message: "Items required" });

    //validate table exists
    const foundTable = await Table.findById(table);
    if (!foundTable) return res.status(400).json({ message: "Table not found" });

    //validate menu items exist
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem) return res.status(400).json({ message: `Menu item not found: ${item.menuItem}` });
    }

    const newOrder = new Order({
      user: req.user._id,  //optional
      table,
      waiter,
      items
    });

    const savedOrder = await newOrder.save();

    res.status(201).json(savedOrder);
  } catch (err) {
    res.status(500).json({ message: "Error creating order", error: err.message });
  }
});

//update order status or items
router.patch("/:id", auth, async (req, res) => {
  try {
    const { status, items, waiter } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (status) order.status = status;
    if (waiter) order.waiter = waiter;
    if (items && items.length > 0) order.items = items;

    const updatedOrder = await order.save();
    const populatedOrder = await updatedOrder.populate([
      {path: "user", select: "username" },
      {path: "table", select: "name"},
      {path: "waiter", select: "name"},
      {path: "menu", select: "name"},
      {path: "items.menuItem", select: "name price"}
    ]);

    res.status(200).json(populatedOrder);
  } catch (err) {
    res.status(500).json({ message: "Error updating order", error: err.message });
  }
});

//delete an order
router.delete("/:id", auth, admin, async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) return res.status(404).json({ message: "Order not found" });

    res.status(200).json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting order", error: err.message });
  }
});

export default router;
