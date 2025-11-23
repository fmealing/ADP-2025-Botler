// server/routes/robotHistory.js
import express from "express";
import RobotHistory from "../models/RobotHistory.js";
import Robot from "../models/Robot.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// history for a specific robot
router.get("/robot/:robotId", auth, async (req, res) => {
    try {
        const { robotId } = req.params;
        const { tableId } = req.query;

        const robot = await Robot.findById(robotId);
        if (!robot) return res.status(404).json({ message: "Robot not found" });

        const query = { robot: robotId };
        if (tableId) query.table = tableId;

        let historiesQuery = RobotHistory.find(query)
            .populate("table", "tableNumber")
            .populate("order", "_id status")
            .sort({ startedAt: -1 });

        if (req.user.role !== "admin" && !tableId) {
            historiesQuery = historiesQuery.limit(20);
        }

        const histories = await historiesQuery.exec();

        res.status(200).json(histories);
    } catch (err) {
        res
            .status(500)
            .json({ message: "Error fetching robot history", error: err.message });
    }
});

// optional: history for a specific table
router.get("/table/:tableId", auth, async (req, res) => {
    try {
        const { tableId } = req.params;

        const histories = await RobotHistory.find({ table: tableId })
            .populate("robot", "name")
            .populate("order", "_id status")
            .sort({ startedAt: -1 });

        res.status(200).json(histories);
    } catch (err) {
        res
            .status(500)
            .json({ message: "Error fetching table robot history", error: err.message });
    }
});

export default router;
