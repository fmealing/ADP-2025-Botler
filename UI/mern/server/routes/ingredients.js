import express from "express";
import Ingredient from "../models/Ingredient.js";
import Allergen from "../models/Allergen.js";
import { auth } from "../middleware/auth.js";
import { authOptional } from "../middleware/authOptional.js";
import { admin } from "../middleware/admin.js";

const router = express.Router();

//get all ingredients
router.get("/", async(req,res) => {
  try{
    const ingredients = await Ingredient.find().populate("allergens","name description");
    res.status(200).json(ingredients);
  }
  catch(err){
    res.status(500).json({message:"Error getting ingredients", error: err.message});
  }
});

//get one ingredient
router.get("/:id",async(req, res) =>{
  try{
    const ingredient = await Ingredient.findById(req.params.id).populate("allergens","name description");
    if (!ingredient) return res.status(404).json({message: "Ingredient not found"});
    res.status(200).json(ingredient);
  }
  catch(err){
    res.status(500).json({message: "Error getting ingredient", error: err.message});
  }
});

//add new ingredient
router.post("/", auth, admin, async (req, res) => {
  try {
    const { name, allergens = [], isAvailable } = req.body;
    //validate allergen references
    if (allergens.length > 0) {
      const found = await Allergen.find({ _id: { $in: allergens } });
      if (found.length !== allergens.length) {
        return res.status(400).json({ message: "Allergens not found" });
      }
    }

    const newIngredient = new Ingredient({
      name: name.trim(),
      allergens,
      isAvailable,
    });

    const savedIngredient = await newIngredient.save();
    res.status(201).json(savedIngredient);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Ingredient already exists" });
    }
    res.status(500).json({ message: "Error creating ingredient", error: err.message });
  }
});



//update ingredient
router.patch("/:id", auth, admin, async (req, res) => {
  try {
    if (req.body.name) req.body.name = req.body.name.trim();

    if (req.body.allergens && req.body.allergens.length > 0) {
      const found = await Allergen.find({ _id: { $in: req.body.allergens } });
      if (found.length !== req.body.allergens.length) {
        return res.status(400).json({ message: "Allergens not found" });
      }
    }

    const updatedIngredient = await Ingredient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedIngredient)
      return res.status(404).json({ message: "Ingredient not found" });

    res.status(200).json(updatedIngredient);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Ingredient already exists" });
    }
    res.status(500).json({ message: "Error updating ingredient", error: err.message });
  }
});


//delete existing ingredient
router.delete("/:id", auth, admin, async(req,res)=>{
  try{
    const deleteIngredient= await Ingredient.findByIdAndDelete(req.params.id);
    if(!deleteIngredient) return res.status(404).json({message: "Ingredient not found"});
    res.status(200).json({message: "Ingredient deleted"});
  }
  catch(err){
    res.status(500).json({message: "Error deleting ingredient", error: err.message});
  }
});

export default router;

