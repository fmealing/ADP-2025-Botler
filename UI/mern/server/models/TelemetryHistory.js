// server/models/TelemetryHistory.js
import mongoose from "mongoose";

const TelemetryHistorySchema = new mongoose.Schema(
    {
        robot: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Robot",
            required: [true, "Robot reference required"],
        },

        pose: {
            x: { type: Number, required: true },
            y: { type: Number, required: true },
            yaw: { type: Number, required: true },
        },

        velocity: {
            linearX: { type: Number, default: 0 },
            angularZ: { type: Number, default: 0 },
        },

        goal: {
            x: { type: Number },
            y: { type: Number },
            yaw: { type: Number },
        },

        distanceTravelled: {
            type: Number,
            min: 0,
            default: 0,
        },

        battery: {
            percentage: {
                type: Number,
                min: 0,
                max: 100,
                required: true,
            },
        },

        tagAim: {
            type: Number,
            default: null,
        },

        status: {
            type: String,
            enum: ["moving", "stationary", "charging", "ordering"],
            required: true,
        },
    },
    { timestamps: true }
);

TelemetryHistorySchema.index({ robot: 1, createdAt: -1 });

const TelemetryHistory = mongoose.model(
    "TelemetryHistory",
    TelemetryHistorySchema
);

export default TelemetryHistory;
