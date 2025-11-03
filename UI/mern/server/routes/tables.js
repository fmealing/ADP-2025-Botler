import express from "express";
import Table from "../models/Table.js";
import { auth } from "../middleware/auth.js";
import { authOptional } from "../middleware/authOptional.js";
import { admin } from "../middleware/admin.js";

const router = express.Router();

//get all tables
router.get("/",authOptional, async(req,res) => {
  try{
    const isStaff = req.user && ["admin","staff"].includes(req.user.role);
    const projection = isStaff ? "_id tableNumber headCount isOccupied" : "_id tableNumber";

    const tables = await Table.find({}, projection).sort({tableNumber:1});
    res.status(200).json(tables);
  }
  catch(err){
    res.status(500).json({message:"Error getting tables", error: err.message});
  }
});

//get one table
router.get("/:id",authOptional,async(req, res) =>{
  try{
    const isStaff = req.user && ["admin","staff"].includes(req.user.role);
    const projection = isStaff ? "_id tableNumber headCount isOccupied" : "_id tableNumber";

    const table = await Table.findById(req.params.id,projection);
    if (!table) return res.status(404).json({message: "Table not found"});
    res.status(200).json(table);
  }
  catch(err){
    res.status(500).json({message: "Error getting table", error: err.message});
  }
});


router.post("/", auth, admin, async(req,res)=>{
  try{
    const{tableNumber, headCount, isOccupied} = req.body;
    const existing = await Table.findOne({tableNumber});
    if(existing){
      return res.status(400).json({message:"Table already exists"});
    }
    const newTable = new Table({tableNumber, headCount, isOccupied});
    const savedTable = await newTable.save();

    res.status(201).json(savedTable);
}
  catch(err){
    res.status(500).json({message: "Error creating table", error: err.message});
  }
});

router.patch("/:id",auth, async (req, res)=>{
  try{
    const updateTable = await Table.findByIdAndUpdate(
      req.params.id,
      req.body,
      {new: true, runValidators: true}
    );

    if(!updateTable) return res.status(404).json({message:"Table not found"});
    res.status(200).json(updateTable);
  }
  catch(err){
    res.status(500).json({message: "Error updating table", error: err.message});
  }
});

router.delete("/:id", auth, admin, async(req,res)=>{
  try{
    const deletTable = await Table.findByIdAndDelete(req.params.id);
    if(!deletTable) return res.status(404).json({message: "Table not found"});
    res.status(200).json({message: "Table deleted"});
  }
  catch(err){
    res.status(500).json({message: "Error deleting table", error: err.message});
  }
});

export default router;

