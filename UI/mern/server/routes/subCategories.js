import express from "express";
import Subcategory from "../models/SubCategory.js";
import { auth } from "../middleware/auth.js";
import { authOptional } from "../middleware/authOptional.js";
import { admin } from "../middleware/admin.js";

const router = express.Router();

//get all subcategories - authentication needed
router.get("/", auth, async (req, res) => {
  try {
    const sub = await Subcategory.find();
    res.status(200).json(sub);
  }
  catch (err) {
    res.status(500).json({ message: "Error getting subcategories", error: err.message });
  }
});


//get one subcategory
router.get("/:id", async (req, res) => {
  try {
    const sub = await Subcategory.findById(req.params.id)
      .populate({
        path: "items",
        populate: [{
          path: "ingredients",
          select: "name allergens",
          populate: { path: "allergens", select: "name" },
        }, { path: "allergens", select: "name" },
        ],
      })
      .populate({
        path: "children",
        match: { parent: req.params.id },
        populate: [{
          path: "items", select: "name price description",
          populate: {
            path: "ingredients", select: "name allergens",
            populate: { path: "allergens", select: "name" },
          },
        },
        { path: "children", select: "name description" }
        ]
      }).lean();
    if (!sub) return res.status(404).json({ message: "Subcategory not found" });
    res.status(200).json(sub);
  }
  catch (err) {
    res.status(500).json({ message: "Error getting subcategory", error: err.message });
  }
});

//add new subcategory
router.post("/", auth, admin, async (req, res) => {
  try {
    const { name, description, menu, parent } = req.body;

    const newSub = new Subcategory({
      name: name.trim(),
      description,
      menu,
      parent,
      createdBy: req.user?.id, //assign category-creating user automatically
    });

    const savedSub = await newSub.save();
    res.status(201).json(savedSub);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Subcategory already exists" });
    }
    res.status(500).json({ message: "Error creating subcategory", error: err.message });
  }
});


//update subcategory
router.patch("/:id", auth, admin, async (req, res) => {
  try {
    if (req.body.name) req.body.name = req.body.name.trim();
    const updateSub = await Subcategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updateSub) return res.status(404).json({ message: "Subcategory not found" });
    res.status(200).json(updateSub);
  }
  catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Subcategory already exists" });
    }
    res.status(500).json({ message: "Error updating subcategory", error: err.message });
  }
});

//delete existing subcategory
router.delete("/:id", auth, admin, async (req, res) => {
  try {
    const deleteSub = await Subcategory.findByIdAndDelete(req.params.id);
    if (!deleteSub) return res.status(404).json({ message: "Subcategory not found" });
    res.status(200).json({ message: "Subcategory deleted" });
  }
  catch (err) {
    res.status(500).json({ message: "Error deleting subcategory", error: err.message });
  }
});

export default router;

