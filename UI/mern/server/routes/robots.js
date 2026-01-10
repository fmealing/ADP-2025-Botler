import express from "express";
import Robot from "../models/Robot.js";
import Order from "../models/Order.js";
import RobotHistory from "../models/RobotHistory.js";
import { auth } from "../middleware/auth.js";
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
    const robots = await Robot.find()
      .populate("pendingAssignment.table")
      .populate("pendingAssignment.order");
    res.status(200).json(robots);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error getting robots", error: err.message });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const robot = await Robot.findById(req.params.id)
      .populate("pendingAssignment.table")
      .populate("pendingAssignment.order");
    if (!robot) return res.status(404).json({ message: "Robot not found" });
    res.status(200).json(robot);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error getting robot", error: err.message });
  }
});

router.post("/", auth, admin, async (req, res) => {
  try {
    const { name, action, batteryLevel } = req.body;
    const newRobot = new Robot({
      name: name.trim(),
      action,
      batteryLevel,
    });
    const savedRobot = await newRobot.save();

    await startHistory(savedRobot._id, savedRobot.action, null, null);

    res.status(201).json(savedRobot);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "Robot name already in use" });
    }
    res
      .status(500)
      .json({ message: "Error creating robot", error: err.message });
  }
});

router.patch("/:id", auth, admin, async (req, res) => {
  try {
    const updates = req.body;

    const robot = await Robot.findById(req.params.id);
    if (!robot) return res.status(404).json({ message: "Robot not found" });

    const prevAction = robot.action;
    const prevBattery = robot.batteryLevel;

    if (updates.name) robot.name = updates.name.trim();
    if (typeof updates.action === "string") robot.action = updates.action;
    if (typeof updates.batteryLevel === "number")
      robot.batteryLevel = updates.batteryLevel;
    if (updates.pendingAssignment) {
      robot.pendingAssignment = {
        table: updates.pendingAssignment.table || null,
        order: updates.pendingAssignment.order || null,
      };
    }

    await robot.save();

    if (updates.action && updates.action !== prevAction) {
      await endCurrentHistory(robot._id);
      await startHistory(robot._id, robot.action, null, null);
    }

    if (
      typeof updates.batteryLevel === "number" &&
      prevBattery < 60 &&
      robot.batteryLevel >= 60 &&
      robot.action === "charging" &&
      robot.pendingAssignment &&
      robot.pendingAssignment.order
    ) {
      const { table, order: orderId } = robot.pendingAssignment;

      await endCurrentHistory(robot._id);

      robot.action = "serving";
      robot.pendingAssignment = { table: null, order: null };
      await robot.save();

      const order = await Order.findById(orderId);
      if (order) {
        order.waiter = robot._id;
        await order.save();
      }

      await startHistory(robot._id, "serving", table, orderId);
    }

    const populatedRobot = await Robot.findById(robot._id)
      .populate("pendingAssignment.table")
      .populate("pendingAssignment.order");

    res.status(200).json(populatedRobot);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "Robot name already exists" });
    }
    res
      .status(500)
      .json({ message: "Error updating robot", error: err.message });
  }
});

router.delete("/:id", auth, admin, async (req, res) => {
  try {
    const deleteRobot = await Robot.findByIdAndDelete(req.params.id);
    if (!deleteRobot)
      return res.status(404).json({ message: "Robot not found" });

    await endCurrentHistory(deleteRobot._id);

    res.status(200).json({ message: "Robot deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting robot", error: err.message });
  }
});

export default router;
