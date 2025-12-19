import express from "express";
import telemetryHistory from "../models/TelemetryHistory.js";
import Robot from "../models/Robot.js";
import { auth } from "../middleware/auth.js";
import { admin } from "../middleware/admin.js";

const router = express.Router();

// get telemetry history for a robot
router.get("/robot/:robotId", auth, admin, async (req, res) => {
    try {
        const { robotId } = req.params;
        const { limit = 1000 } = req.query;

        const robot = await Robot.findById(robotId);
        if (!robot) return res.status(404).json({ message: "Robot not found" });

        const history = await telemetryHistory.find({ robot: robotId })
            .sort({ createdAt: -1 })
            .limit(Number(limit));

        res.status(200).json(history);
    } catch (err) {
        res.status(500).json({
            message: "Error fetching telemetry history",
            error: err.message,
        });
    }
});

// get telemetry history within a time range (for analysis)
router.get("/robot/:robotId/range", auth, admin, async (req, res) => {
    try {
        const { robotId } = req.params;
        const { start, end } = req.query;

        const query = { robot: robotId };

        if (start || end) {
            query.createdAt = {};
            if (start) query.createdAt.$gte = new Date(start);
            if (end) query.createdAt.$lte = new Date(end);
        }

        const history = await telemetryHistory.find(query).sort({
            createdAt: 1,
        });

        res.status(200).json(history);
    } catch (err) {
        res.status(500).json({
            message: "Error fetching telemetry history range",
            error: err.message,
        });
    }
});

// reset telemetry history (daily / weekly job)
router.delete("/robot/:robotId/reset", auth, admin, async (req, res) => {
    try {
        await telemetryHistory.deleteMany({
            robot: req.params.robotId,
        });

        res.status(200).json({ message: "Telemetry history reset" });
    } catch (err) {
        res.status(500).json({
            message: "Error resetting telemetry history",
            error: err.message,
        });
    }
});

export default router;
