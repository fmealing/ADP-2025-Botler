import express from "express";
import Telemetry from "../models/Telemetry.js";
import Robot from "../models/Robot.js";
import { auth } from "../middleware/auth.js";
import { admin } from "../middleware/admin.js";

const router = express.Router();

// get telemetry for all robots
router.get("/", auth, admin, async (req, res) => {
    try {
        const telemetries = await Telemetry.find()
            .populate("robot", "name action");

        res.status(200).json(telemetries);
    } catch (err) {
        res
            .status(500)
            .json({ message: "Error fetching robot telemetries", error: err.message });
    }
});

// get telemetry for a specific robot
router.get("/:robotId", auth, admin, async (req, res) => {
    try {
        const telemetry = await Telemetry.findOne({
            robot: req.params.robotId,
        }).populate("robot", "name action");

        if (!telemetry)
            return res.status(404).json({ message: "Telemetry not found" });

        res.status(200).json(telemetry);
    } catch (err) {
        res
            .status(500)
            .json({ message: "Error fetching telemetry", error: err.message });
    }
});

// update telemetry (every second)
router.patch("/:robotId", auth, admin, async (req, res) => {
    try {
        const { robotId } = req.params;

        const robot = await Robot.findById(robotId);
        if (!robot) return res.status(404).json({ message: "Robot not found" });

        const updates = {
            pose: req.body.pose,
            velocity: req.body.velocity,
            goal: req.body.goal,
            distanceTravelled: req.body.distanceTravelled,
            tagAim: req.body.tagAim,
            status: req.body.status,
            goalStatus: req.body.goalStatus,
            updatedAt: new Date(),
        };

        // battery is optional for reporting every 10s
        if (req.body.battery?.percentage !== undefined) {
            updates.battery = {
                percentage: req.body.battery.percentage,
            };
        }

        const telemetry = await Telemetry.findOneAndUpdate(
            { robot: robotId },
            { $set: updates },
            { new: true, upsert: true }
        );

        res.status(200).json(telemetry);
    } catch (err) {
        res
            .status(500)
            .json({ message: "Error updating telemetry", error: err.message });
    }
});

export default router;
