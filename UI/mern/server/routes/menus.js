import express from "express";
import Menu from "../models/Menu.js";
import { auth } from "../middleware/auth.js";
import { authOptional } from "../middleware/authOptional.js";
import { admin } from "../middleware/admin.js";
import mongoose, { mongo } from "mongoose";

const router = express.Router();

//get all active menus
router.get("/", async(req,res) => {
  try{
    const menu = await Menu.find({isActive: true});
    res.status(200).json(menu);
  }
  catch(err){
    res.status(500).json({message:"Error getting menu", error: err.message});
  }
});

//get all menus- admin needed
router.get("/all", auth, admin, async(req,res) => {
  try{
    const menu = await Menu.find();
    res.status(200).json(menu);
  }
  catch(err){
    res.status(500).json({message:"Error getting menu", error: err.message});
  }
});

//get one menu
router.get("/:id",async(req, res) =>{
  try{
    if(!mongoose.Types.ObjectId.isValid(req.params.id)){
      return res.status(400).json({message: "Invalid menu ID format"})
    }

    const menu = await Menu.findById(req.params.id)
    .populate({path: "subcategories", select: "name description children items",
      populate: [{path: "children", select: "name description children items",
      populate: [{path: "items", select: "name price description"}, ],},
      {path: "items", select: "name price description"},
    ],
  }).lean();

    if (!menu) return res.status(404).json({message: "Menu not found"});
    res.status(200).json(menu);
  }
  catch(err){
    res.status(500).json({message: "Error getting menu", error: err.message});
  }
});

//add new menu
router.post("/", auth, admin, async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    
    const newMenu = new Menu({
      name: name.trim(),
      description,
      isActive,
      createdBy: req.user?.id, //assign menu-creating user automatically
    });

    const savedMenu = await newMenu.save();
    res.status(201).json(savedMenu);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Menu already exists" });
    }
    res.status(500).json({ message: "Error creating menu", error: err.message });
  }
});


//update menu
router.patch("/:id",auth, admin, async (req, res)=>{
  try{
    if (req.body.name) req.body.name = req.body.name.trim();
    const updateMenu = await Menu.findByIdAndUpdate(
      req.params.id,
      req.body,
      {new: true, runValidators: true}
    );

    if(!updateMenu) return res.status(404).json({message:"Menu not found"});
    res.status(200).json(updateMenu);
  }
  catch(err){
    if (err.code === 11000) {
      return res.status(400).json({ message: "Menu already exists" });
    }
    res.status(500).json({message: "Error updating menu", error: err.message});
  }
});

//delete existing menu
router.delete("/:id", auth, admin, async(req,res)=>{
  try{
    const deleteMenu= await Menu.findByIdAndDelete(req.params.id);
    if(!deleteMenu) return res.status(404).json({message: "Menu not found"});
    res.status(200).json({message: "Menu deleted"});
  }
  catch(err){
    res.status(500).json({message: "Error deleting menu", error: err.message});
  }
});

export default router;

