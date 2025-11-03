import mongoose from "mongoose";

//Model for multiple menus (e.g. Main, Vegetarian, Gluten free etc)

const menuSchema = new mongoose.Schema({
  name: {
    type: String, //name of menu
    required: [true, "Menu name is required"],
    trim: true,
  },
  description: { //basic menu description
    type: String,
    default: "",
  },
  isActive: {
    type: Boolean, //bool to toggle whether menu can be viewed
    default: true, //e.g. same christmas menu, turn off viewing most months
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", //optionally tag a user for creating a menu for management purposes
  },
}, { timestamps: true });

//ensure name of menu is unique
menuSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

menuSchema.virtual("subcategories", {
  ref: "Subcategory",          //Get categories for exact menu
  localField: "_id",       
  foreignField: "menu",     
});

menuSchema.set("toObject", { virtuals: true });
menuSchema.set("toJSON", { virtuals: true });
const Menu = mongoose.model("Menu", menuSchema);

export default Menu;
