import express from "express";
import Order from "../models/Order.js";
import MenuItem from "../models/MenuItem.js";
import Table from "../models/Table.js";
import { auth } from "../middleware/auth.js";
import { authOptional } from "../middleware/authOptional.js";
import { admin } from "../middleware/admin.js";

const router = express.Router();

//get all orders
router.get("/", auth, async (req, res) => {
  try {
    let orders;

    if (req.user?.role === "admin"){
    orders = await Order.find()
      .populate("user", "username")
      .populate("table", "tableNumber")
      .populate("waiter", "name")
      .populate("menu", "name")
      .populate({
        path: "items.menuItem", select: "name price",
        populate: {
          path: "ingredients", select: "name allergens",
          populate: { path: "allergens", select: "name" }
        }
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
      updatedAt: order.updatedAt
    }));
    
    return res.status(200).json(limitedOrders);
  
  } catch (err) {
    res.status(500).json({ message: "Error fetching orders", error: err.message });
  }
});

//get one order
router.get("/:id", authOptional, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "username")
      .populate({ path: "table", select: "tableNumber" })
      .populate("waiter", "name")
      .populate("menu", "name")
      .populate({
        path: "items.menuItem", select: "name price",
        populate: {
          path: "ingredients", select: "name allergens",
          populate: { path: "allergens", select: "name" }
        }
      });

    if (!order) return res.status(404).json({ message: "Order not found" });

    //if user is not authenticated, only return minimal info
    // if no logged-in user, return limited info
    if (!req.user) {
      const limitedOrder = {
        _id: order._id,
        table: order.table,
        menu: order.menu,
        items: order.items.map((i) => ({
          menuItem: i.menuItem,
          quantity: i.quantity,
          specialInstructions: i.specialInstructions,
        })),
        totalPrice: order.totalPrice,
        status: order.status,
      };

      return res.status(200).json(limitedOrder);
    }

    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ message: "Error fetching order", error: err.message });
  }
});


//create new order
router.post("/", authOptional, async (req, res) => {
  try {
    const { table, menu, items = [] } = req.body;

    if (!table) return res.status(400).json({ message: "Table required" });

    //does table exist
    const foundTable = await Table.findById(table);
    if (!foundTable) return res.status(400).json({ message: "Table not found" });

    //reuse any pending order for this table
    let existing = await Order.findOne({ table, status: "Pending" });
    if (existing) return res.status(200).json(existing);

    //if no pending order, create a fresh one
    for (const i of items) {
      const exists = await MenuItem.findById(i.menuItem);
      if (!exists) return res.status(400).json({ message: "Menu item not found" });
    }

    //calc total price
    let totalP = 0;
    for (const i of items) {
      const item = await MenuItem.findById(i.menuItem);
      if (item) totalP += item.price * i.quantity;
    }

    //create the order
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
    console.error("Error creating or fetching order:", err);
    res.status(500).json({ message: "Error creating order", error: err.message });
  }
});

//add, update, remove items from order
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
      if (index > -1) {
        order.items[index].quantity += quantity || 1;
      } else {
        order.items.push({ menuItem, quantity: quantity || 1, specialInstructions });
      }
    } else if (action === "update") {
      if (index === -1)
        return res.status(400).json({ message: "Item not found in order" });
      if (quantity !== undefined) order.items[index].quantity = quantity;
      if (specialInstructions !== undefined)
        order.items[index].specialInstructions = specialInstructions;
    } else if (action === "remove") {
      if (index === -1)
        return res.status(400).json({ message: "Item not found in order" });
      order.items.splice(index, 1);
    } else if (action == "clear") {
      order.items = [];
    } else if (action == "submit") {
      order.status = "Submitted";
    }
    else {
      return res.status(400).json({ message: "Invalid action" });
    }

    // Total recalculated by pre-save hook
    const updated = await order.save();
    const populatedOrder = await updated.populate([
      { path: "table", select: "tableNumber" },
      {
        path: "items.menuItem",
        select: "name price description"
      },
    ]);

    res.status(200).json(populatedOrder);
  } catch (err) {
    res.status(500).json({ message: "Error updating order", error: err.message });
  }
});

//admin controls - update order status, waiter
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
