import mongoose from "mongoose";

const orderHistorySchema = new mongoose.Schema({
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Table", //table for which the order is placed
    required: true,
  },
  waiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Robot", //robot handling the order
  },
  menu: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Menu", //menu of order
  },

  items: [
    {
      menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MenuItem", //specific menu item
        required: true,
      },
      quantity: {
        type: Number, //amount of each menu item
        required: true,
        min: [1, "Quanitity cannot be 0"],
      },
    },
  ],
  totalPrice: {
    type: Number, //Price of menu item(s)
    required: true,
    min: [0, "Price must be greater than 0"],
  },
  placedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

const orderHistory = mongoose.model("orderHistory", orderHistorySchema);

export default orderHistory;
