import mongoose from "mongoose";

//Model for multiple subcategories under one menu (e.g. mains, starters, alcohol etc))

const subSchema = new mongoose.Schema({
  name: {
    type: String, //name of menu
    required: [true, "Subcategory name is required"],
    trim: true,
  },
  description: { //basic category description
    type: String,
    default: "",
  },
  menu: {
    type: mongoose.Schema.Types.ObjectId, //menu it is a part of
    ref: "Menu", 
    required: true,
  },
  picture: {
  type: String,
  default: "/images/menus/placeholder.jpg", //shown if no image is provided
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId, //Subcategory it is a part of
    ref: "Subcategory", //e.g. Main menu -> drinks subcategory -> white wine subcategory
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", //optionally tag a user for management purposes
  },
}, { timestamps: true });

//ensure name of subcategory is unique
subSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

subSchema.virtual("children", {
  ref: "Subcategory",          //Get subcategories within subcategories
  localField: "_id",       
  foreignField: "parent",     
});

subSchema.virtual("items", {
  ref: "MenuItem",          //Get items for subcategory
  localField: "_id",       
  foreignField: "sub",     
});

subSchema.set("toObject", { virtuals: true });
subSchema.set("toJSON", { virtuals: true });
const Subcategory = mongoose.model("Subcategory", subSchema);

export default Subcategory;
