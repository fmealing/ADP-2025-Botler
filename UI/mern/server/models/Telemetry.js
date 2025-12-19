// server/models/Telemetry.js
import mongoose from "mongoose";

const TelemetrySchema = new mongoose.Schema(
    {
        robot: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Robot",
            required: [true, "Robot name required"],
            unique: true,
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

        goalStatus: {
            type: String,
            enum: ["ACTIVE", "SUCCEEDED", "FAILED"],
            default: "pending",
        },

        path: [
            {
                x: { type: Number, required: true },
                y: { type: Number, required: true },
            },
        ],

        apriltags: [
            {
                id: { type: Number, required: true },
                distance: { type: Number, required: true },
                confidence: { type: Number, required: true },
            },
        ],

        distanceTravelled: {
            type: Number,
            default: 0,
            min: 0,
        },

        battery: {
            voltage: { type: Number },
            percentage: {
                type: Number,
                min: 0,
                max: 100,
                default: 100,
            },
        },

        tagAim: {
            type: Number,
            default: null,
        },

        status: {
            type: String,
            enum: ["serving", "taking order", "charging", "awaiting instruction", "fetching order"],
            default: "awaiting instruction",
        },
    },
    { timestamps: true }
);

TelemetrySchema.index({ robot: 1 });

const Telemetry = mongoose.model(
    "Telemetry",
    TelemetrySchema
);

export default Telemetry;
