// server/models/RobotHistory.js
import mongoose from "mongoose";

const robotHistorySchema = new mongoose.Schema(
    {
        robot: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Robot",
            required: true,
        },
        action: {
            type: String,
            required: true,
        },
        table: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Table",
            default: null,
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null,
        },
        startedAt: {
            type: Date,
            default: Date.now,
        },
        endedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

robotHistorySchema.index({ robot: 1, startedAt: -1 });

const RobotHistory = mongoose.model("RobotHistory", robotHistorySchema);

export default RobotHistory;
