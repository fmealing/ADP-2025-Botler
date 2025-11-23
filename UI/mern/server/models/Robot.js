// server/models/Robot.js
import mongoose from "mongoose";

const robotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Robot name required"],
      trim: true,
    },
    action: {
      type: String,
      enum: ["serving", "taking order", "charging", "awaiting instruction", "fetching order"],
      default: "awaiting instruction",
    },
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    pendingAssignment: {
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
    },
  },
  { timestamps: true }
);

// ensure name of robot is unique
robotSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

const Robot = mongoose.model("Robot", robotSchema);

export default Robot;
