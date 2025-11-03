import express from "express";
import MenuItem from "../models/MenuItem.js";
import Ingredient from "../models/Ingredient.js";
import Allergen from "../models/Allergen.js";
import { auth } from "../middleware/auth.js";
import { authOptional } from "../middleware/authOptional.js";
import { admin } from "../middleware/admin.js";
import Subcategory from "../models/SubCategory.js";

const router = express.Router();

//get all menu items
router.get("/", async(req,res) => {
  try{
    const menuItem = await MenuItem.find()
    .populate({path: "sub",select: "name description parent", populate:{path: "parent", select: "name"}})
    .populate({path:"ingredients",select:"name allergens",populate:{path: "allergens", select: "name"}})
    .populate("allergens","name")
    .sort({"sub": 1,"name": 1});
    res.status(200).json(menuItem);
  }
  catch(err){
    res.status(500).json({message:"Error getting menu item", error: err.message});
  }
});

//get one item
router.get("/:id",async(req, res) =>{
  try{
    const menuItem = await MenuItem.findById(req.params.id)
    .populate({path: "sub",select: "name description children", populate:{path: "children", select: "name description"}})
    .populate({path:"ingredients",select:"name allergens",populate:{path: "allergens", select: "name"}})
    .populate("allergens","name");

    if (!menuItem) return res.status(404).json({message: "Item not found"});
    res.status(200).json(menuItem);
  }
  catch(err){
    res.status(500).json({message: "Error getting item", error: err.message});
  }
});

//add new menu item
router.post("/", auth, admin, async (req, res) => {
  try {
    const { name, description, price, sub, ingredients = [], allergens = [], isAvailable } = req.body;
    
    if(!name||!sub) return res.status(400).json({message: "Name and subcategory required"});
    
    //check subcategory exists
    const existing = await Subcategory.findById(sub);
    if (!existing) return res.status(400).json({ message: "Subcategory not found" });

    //check price exists and is positive
    if (price === undefined || price < 0) {
      return res.status(400).json({ message: "Price is required and must be positive" });
    }

    //check ingredients exist
    if (ingredients.length > 0) {
      const foundIngredients = await Ingredient.find({ _id: { $in: ingredients } });
      if (foundIngredients.length !== ingredients.length)
        return res.status(400).json({ message: "Ingredients not found" });
    }

    //check extra allergens exist
    if (allergens.length > 0) {
      const foundAllergens = await Allergen.find({ _id: { $in: allergens } });
      if (foundAllergens.length !== allergens.length)
        return res.status(400).json({ message: "Additional allergens not found" });
    }

    const newMenuItem = new MenuItem({
      name: name.trim(),
      sub,
      description,
      price,
      ingredients,
      allergens,
      isAvailable,
    });

    const savedMenuItem = await newMenuItem.save();
    res.status(201).json(savedMenuItem);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Menu item with this name already exists" });
    }
    res.status(500).json({ message: "Error creating menu item", error: err.message });
  } 
});

//update menu item
router.patch("/:id", auth, admin, async (req, res) => {
  try {
    const{name,description,price,sub,ingredients, allergens, isAvailable} = req.body;
     
    //check subcategory exists
    if(sub !== undefined){ //only if subcategory is being updated run
      const existing = await Subcategory.findById(sub);
      if (!existing) return res.status(400).json({ message: "Subcategory not found" });
    }
    //check price is being updated and is positive
    if(price!== undefined){
      if (price < 0) return res.status(400).json({ message: "Price must be positive" });
    }
    //check ingredients exist
    if (ingredients !== undefined){
      if (ingredients.length > 0) {
        const foundIngredients = await Ingredient.find({ _id: { $in: ingredients } });
        if (foundIngredients.length !== ingredients.length)
          return res.status(400).json({ message: "Ingredients not found" });
    }}

    //check extra allergens exist
    if(allergens!== undefined){
      if (allergens.length > 0) {
        const foundAllergens = await Allergen.find({ _id: { $in: allergens } });
        if (foundAllergens.length !== allergens.length)
          return res.status(400).json({ message: "Additional allergens not found" });
    }}

    if (isAvailable !== undefined && typeof isAvailable !== "boolean") {
      return res.status(400).json({ message: "isAvailable must be true or false" });
    }

    if(name) req.body.name = name.trim();

    const updatedMenuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate({path: "sub",select: "name description parent", populate:{path: "parent", select: "name"}})
    .populate({path:"ingredients",select:"name allergens",populate:{path: "allergens", select: "name"}})
    .populate("allergens","name");

    if (!updatedMenuItem)
      return res.status(404).json({ message: "Menu item not found" });

    res.status(200).json(updatedMenuItem);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({ message: `${field} must be unique` });
    }
    res.status(500).json({ message: "Error updating menu item", error: err.message });
  }
});


//delete existing menu item
router.delete("/:id", auth, admin, async(req,res)=>{
  try{
    const deleteMenuItem= await MenuItem.findByIdAndDelete(req.params.id);
    if(!deleteMenuItem) return res.status(404).json({message: "Item not found"});
    res.status(200).json({message: "Menu item deleted"});
  }
  catch(err){
    res.status(500).json({message: "Error deleting item", error: err.message});
  }
});

export default router;

