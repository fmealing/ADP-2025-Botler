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

// Seat table (staff or admin)
router.patch("/:id/seat", auth, async (req, res) => {
  try {
    const { headCount, menu } = req.body;
    const tableId = req.params.id;

    if (!headCount || headCount < 1)
      return res.status(400).json({ message: "Head count required" });

    const table = await Table.findByIdAndUpdate(
      tableId,
      { headCount, isOccupied: true },
      { new: true }
    );
    if (!table) return res.status(404).json({ message: "Table not found" });

    // Assign Robit if exists- this logic should be improved later
    const robot = await Robot.findOne().sort({ _id: 1 }); 

    // Find order, else create it
    let order = await Order.findOne({ table: tableId, status: "Pending" });

    if (!order) {
      order = new Order({
        table: tableId,
        menu: menu || null,
        user: req.user?._id || null,
        waiter: robot?._id || null,
        items: [],
        totalPrice: 0,
      });
      await order.save();
    } else {
      // update robot assignment
      if (robot) {
        order.waiter = robot._id;
        await order.save();
      }
    }
    
    const populated = await Order.findById(order._id)
      .populate("table", "tableNumber headCount isOccupied")
      .populate("waiter", "name")
      .populate("menu", "name");

    res.status(200).json({
      message: "Table seated successfully",
      table,
      order: populated,
      waiter: robot || null,
    });

  } catch (err) {
    res.status(500).json({
      message: "Error seating table",
      error: err.message,
    });
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

