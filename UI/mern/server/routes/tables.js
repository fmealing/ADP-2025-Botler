// server/routes/tables.js
import express from "express";
import Table from "../models/Table.js";
import Order from "../models/Order.js";
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

// choose robot according to rules
async function findRobotForSeating() {
  // prefer awaiting instruction
  const awaiting = await Robot.findOne({ action: "awaiting instruction" }).sort({
    updatedAt: 1,
  });
  if (awaiting) {
    return { robot: awaiting, mode: "immediate" };
  }

  // then charging
  const charging = await Robot.findOne({ action: "charging" }).sort({
    batteryLevel: -1,
  });
  if (charging) {
    if (charging.batteryLevel >= 60) {
      return { robot: charging, mode: "immediate" };
    }
    return { robot: charging, mode: "pending" };
  }

  // no awaiting/charging robots, but maybe others (serving, fetching, etc.)
  const busy = await Robot.findOne({});
  if (busy) {
    return { robot: busy, mode: "busy" };
  }

  // no robots at all
  return { robot: null, mode: "none" };
}

// get all tables
router.get("/", authOptional, async (req, res) => {
  try {
    const isStaff = req.user && ["admin", "staff"].includes(req.user.role);
    const projection = isStaff
      ? "_id tableNumber headCount isOccupied"
      : "_id tableNumber";

    const tables = await Table.find({}, projection).sort({ tableNumber: 1 });
    res.status(200).json(tables);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error getting tables", error: err.message });
  }
});

// get one table
router.get("/:id", authOptional, async (req, res) => {
  try {
    const isStaff = req.user && ["admin", "staff"].includes(req.user.role);
    const projection = isStaff
      ? "_id tableNumber headCount isOccupied"
      : "_id tableNumber";

    const table = await Table.findById(req.params.id, projection);
    if (!table) return res.status(404).json({ message: "Table not found" });
    res.status(200).json(table);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error getting table", error: err.message });
  }
});

// seat a table (assign robot + create/reset pending order)
router.patch("/:id/seat", auth, async (req, res) => {
  try {
    if (!["admin", "staff"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { headCount } = req.body;
    const tableId = req.params.id;

    if (!headCount || headCount < 1) {
      return res.status(400).json({ message: "Head count required" });
    }

    const table = await Table.findByIdAndUpdate(
      tableId,
      { headCount, isOccupied: true },
      { new: true }
    );
    if (!table) return res.status(404).json({ message: "Table not found" });

    const { robot, mode } = await findRobotForSeating();

    if (mode === "busy" && robot) {
      return res.status(409).json({
        message: `Robot busy, current action: ${robot.action}`,
        robot,
      });
    }

    if (mode === "none" || !robot) {
      return res
        .status(409)
        .json({ message: "No robots configured for this restaurant" });
    }

    // find or create pending order for this table
    let order = await Order.findOne({
      table: tableId,
      status: "Pending",
    }).sort({ createdAt: -1 });

    if (order) {
      // reset existing pending order
      order.items = [];
      order.status = "Pending";
      order.totalPrice = 0;
      order.menu = null;
    } else {
      // create new pending order
      order = new Order({
        table: tableId,
        user: req.user?._id || null,
        waiter: null,
        menu: null,
        items: [],
        totalPrice: 0,
        status: "Pending",
      });
    }

    // robot "knows" the table/order even when charging
    order.waiter = robot._id;
    await order.save();

    if (mode === "immediate") {
      await endCurrentHistory(robot._id);

      robot.action = "serving";
      robot.pendingAssignment = { table: null, order: null };
      await robot.save();

      await startHistory(robot._id, "serving", tableId, order._id);
    }

    if (mode === "pending") {
      robot.pendingAssignment = { table: tableId, order: order._id };
      await robot.save();
      // robot stays "charging", history continues as charging
    }

    const populatedOrder = await Order.findById(order._id)
      .populate("table", "tableNumber headCount isOccupied")
      .populate("waiter", "name")
      .populate("menu", "name");

    res.status(200).json({
      message:
        mode === "immediate"
          ? "Table seated and robot assigned"
          : "Table seated; robot will attend after charging",
      table,
      order: populatedOrder,
      waiter: robot,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error seating table", error: err.message });
  }
});

// mark table as left (archive order + free robot)
router.patch("/:id/leave", auth, async (req, res) => {
  try {
    if (!["admin", "staff"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const tableId = req.params.id;

    const table = await Table.findByIdAndUpdate(
      tableId,
      { isOccupied: false, headCount: null },
      { new: true }
    );
    if (!table) return res.status(404).json({ message: "Table not found" });

    const order = await Order.findOne({
      table: tableId,
      status: { $ne: "Archived" },
    }).sort({ createdAt: -1 });

    if (order) {
      order.status = "Archived";
      await order.save();

      if (order.waiter) {
        const robot = await Robot.findById(order.waiter);
        if (robot) {
          await endCurrentHistory(robot._id);

          robot.action = "awaiting instruction";
          robot.pendingAssignment = { table: null, order: null };
          await robot.save();

          await startHistory(robot._id, "awaiting instruction", null, null);
        }
      }
    }

    res.status(200).json({
      message: "Table cleared and order archived",
      table,
      order: order || null,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error clearing table", error: err.message });
  }
});

// create table
router.post("/", auth, admin, async (req, res) => {
  try {
    const { tableNumber, headCount, isOccupied } = req.body;
    const existing = await Table.findOne({ tableNumber });
    if (existing) {
      return res.status(400).json({ message: "Table already exists" });
    }
    const newTable = new Table({ tableNumber, headCount, isOccupied });
    const savedTable = await newTable.save();

    res.status(201).json(savedTable);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating table", error: err.message });
  }
});

// generic table update
router.patch("/:id", auth, async (req, res) => {
  try {
    const updateTable = await Table.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updateTable)
      return res.status(404).json({ message: "Table not found" });
    res.status(200).json(updateTable);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating table", error: err.message });
  }
});

// delete table
router.delete("/:id", auth, admin, async (req, res) => {
  try {
    const deletTable = await Table.findByIdAndDelete(req.params.id);
    if (!deletTable)
      return res.status(404).json({ message: "Table not found" });
    res.status(200).json({ message: "Table deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting table", error: err.message });
  }
});

export default router;
