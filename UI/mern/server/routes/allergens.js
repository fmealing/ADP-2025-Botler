import express from "express";
import Allergen from "../models/Allergen.js";
import { auth } from "../middleware/auth.js";
import { authOptional } from "../middleware/authOptional.js";
import { admin } from "../middleware/admin.js";

const router = express.Router();

//get all allergens
router.get("/", async(req,res) => {
  try{
    const allergen = await Allergen.find();
    res.status(200).json(allergen);
  }
  catch(err){
    res.status(500).json({message:"Error getting allergens", error: err.message});
  }
});

//get one allergen
router.get("/:id",async(req, res) =>{
  try{
    const allergen = await Allergen.findById(req.params.id);
    if (!allergen) return res.status(404).json({message: "Allergen not found"});
    res.status(200).json(allergen);
  }
  catch(err){
    res.status(500).json({message: "Error getting allergen", error: err.message});
  }
});

router.post("/", auth, admin, async(req,res)=>{
  try{
    const{name, description} = req.body;
    const newAllergen = new Allergen({name: name.trim(), description});
    const savedAllergen = await newAllergen.save();

    res.status(201).json(savedAllergen);
}
  catch(err){
    if (err.code === 11000) {
      return res.status(400).json({ message: "Allergen already exists" });
    }
    res.status(500).json({message: "Error creating allergen", error: err.message});
  }
});

router.patch("/:id", auth, admin, async (req, res) => {
  try {
    const {name, description} = req.body;
    //check if name if being updated
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({message: "Name must be a non-empty string"});
      }
      req.body.name = name.trim();
    }

    //check if description is being updated
    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({ message:"Description must be a string"});
      }
      req.body.description = description.trim();}

    const updatedAllergen = await Allergen.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedAllergen) {
      return res.status(404).json({ message: "Allergen not found" });
    }

    res.status(200).json(updatedAllergen);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Allergen already exists" });
    }
    res.status(500).json({ message: "Error updating allergen", error: err.message });
  }
});


router.delete("/:id", auth, admin, async(req,res)=>{
  try{
    const deleteAllergen = await Allergen.findByIdAndDelete(req.params.id);
    if(!deleteAllergen) return res.status(404).json({message: "Allergen not found"});
    res.status(200).json({message: "Allergen deleted"});
  }
  catch(err){
    res.status(500).json({message: "Error deleting allergen", error: err.message});
  }
});

export default router;

