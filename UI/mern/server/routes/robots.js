import express from "express";
import Robot from "../models/Robot.js";
import { auth } from "../middleware/auth.js";
import { authOptional } from "../middleware/authOptional.js";
import { admin } from "../middleware/admin.js";

const router = express.Router();

//get all robots
router.get("/",auth, async(req,res) => {
  try{
    const robots = await Robot.find();
    res.status(200).json(robots);
  }
  catch(err){
    res.status(500).json({message:"Error getting robots", error: err.message});
  }
});

//get one robot
router.get("/:id",auth,async(req, res) =>{
  try{
    const robot = await Robot.findById(req.params.id);
    if (!robot) return res.status(404).json({message: "Robot not found"});
    res.status(200).json(robot);
  }
  catch(err){
    res.status(500).json({message: "Error getting robot", error: err.message});
  }
});

//create a robot
router.post("/", auth, admin, async(req,res)=>{
  try{
    const{name, action, batteryLevel} = req.body;
    const newRobot = new Robot({name:name.trim(), action, batteryLevel});
    const savedRobot = await newRobot.save();

    res.status(201).json(savedRobot);
}
  catch(err){
    if (err.code === 11000) {
      return res.status(400).json({ message: "Robot name already in use" });
    }
    res.status(500).json({message: "Error creating robot", error: err.message});
  }
});

//update robot
router.patch("/:id",auth,admin, async (req, res)=>{
  try{
    if (req.body.name) req.body.name = req.body.name.trim();
    const updateRobot = await Robot.findByIdAndUpdate(
      req.params.id,
      req.body,
      {new: true, runValidators: true}
    );

    if(!updateRobot) return res.status(404).json({message:"Robot not found"});
    res.status(200).json(updateRobot);
  }
  catch(err){
    if (err.code === 11000) {
      return res.status(400).json({ message: "Robot name already exists" });
    }
    res.status(500).json({message: "Error updating robot", error: err.message});
  }
});

//delete a robot
router.delete("/:id", auth, admin, async(req,res)=>{
  try{
    const deleteRobot = await Robot.findByIdAndDelete(req.params.id);
    if(!deleteRobot) return res.status(404).json({message: "Robot not found"});
    res.status(200).json({message: "Robot deleted"});
  }
  catch(err){
    res.status(500).json({message: "Error deleting robot", error: err.message});
  }
});

export default router;

