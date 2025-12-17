import express from "express";
import orderHistory from "../models/OrderHistory.js";
import Order from "../models/Order.js";
import MenuItem from "../models/MenuItem.js";
import Table from "../models/Table.js";
import { auth } from "../middleware/auth.js";
import { admin } from "../middleware/admin.js";

const router = express.Router();

//get all orders
router.get("/", auth, admin, async (req, res) => {
  try {
    let orders;

    if (req.user?.role === "admin"){
    orders = await Order.find()
      .populate("table", "tableNumber")
      .populate("waiter", "name")
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
router.get("/:id", auth, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
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

    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ message: "Error fetching order", error: err.message });
  }
});




export default router;
