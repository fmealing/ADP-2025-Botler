import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", //who placed the order - optional
  },
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
      specialInstructions: {
        type: String,
        default: "", //instruction for the kitchen e.g. replace fries with chunky chips
      },
    },
  ],
  status: {
    type: String, //Order status to display in user app
    enum: ["Pending", "In-progress", "Completed", "Cancelled"],
    default: "Pending",
  },
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

// Calculate total price before saving
orderSchema.pre("save", async function (next) {
  if (!this.isModified("items")) return next();

  try {
    const MenuItem = mongoose.model("MenuItem");
    let total = 0;

    for (const item of this.items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (menuItem) {
        total += menuItem.price * item.quantity;
      }
    }

    this.totalPrice = total;
    next();
  } catch (err) {
    next(err);
  }
});

const Order = mongoose.model("Order", orderSchema);

export default Order;
