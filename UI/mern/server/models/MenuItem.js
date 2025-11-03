import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String, //name of menu item
    required: [true, "Menu item name required"],
    trim: true,
  },
  description: { //basic description, optional
    type: String,
    default: "",
  },
  price: {
    type: Number, //price per item
    required: [true, "Item price is required"],
    min: [0, "Price must not be negative"],
  },
  sub: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subcategory", //references which subcategory the item is found under
    required: true,
  },
  ingredients: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ingredient", //references ingredient model
    }
  ],
  allergens: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Allergen" //extra allergens not tied to specific ingredients
    }
  ],
  isAvailable: {
    type: Boolean, //optional toggle for menu item unavailable
    default: true,
  },
}, { timestamps: true });

menuItemSchema.set("toObject", { virtuals: true });
menuItemSchema.set("toJSON", { virtuals: true });

//ensure name of item is unique
menuItemSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

const MenuItem = mongoose.model("MenuItem", menuItemSchema);

export default MenuItem;
