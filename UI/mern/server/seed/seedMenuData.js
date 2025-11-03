// server/seed/seedMenuData.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Menu from "../models/Menu.js";
import Subcategory from "../models/SubCategory.js";
import MenuItem from "../models/MenuItem.js";
import Ingredient from "../models/Ingredient.js";
import Allergen from "../models/Allergen.js";

dotenv.config({ path: "../config.env" });
console.log("🔍 ATLAS_URI:", process.env.ATLAS_URI);


const seedMenuData = async () => {
  try {
    await mongoose.connect(process.env.ATLAS_URI);
    console.log("Connected to MongoDB");

    await Menu.deleteMany();
    await Subcategory.deleteMany();
    await MenuItem.deleteMany();

    const allergens = await Allergen.find();
    const ingredients = await Ingredient.find();

    const getAllergenId = (name) =>
      allergens.find((a) => a.name.toLowerCase() === name.toLowerCase())?._id;

    const getIngredientId = (name) =>
      ingredients.find((i) => i.name.toLowerCase() === name.toLowerCase())?._id;

    //create main menu
    const mainMenu = await Menu.create({
      name: "Main Menu",
      description: "The primary restaurant menu featuring Greek starters, mains, and drinks",
      isActive: true,
    });

    //create subcategories
    const starters = await Subcategory.create({
      name: "Starters",
      description: "Appetizers and small bites to begin your meal",
      menu: mainMenu._id,
    });

    const mains = await Subcategory.create({
      name: "Mains",
      description: "Traditional and modern Greek main dishes",
      menu: mainMenu._id,
    });

    const drinks = await Subcategory.create({
      name: "Drinks",
      description: "Alcoholic and non-alcoholic beverages",
      menu: mainMenu._id,
    });

    // Nested drinks
    const draft = await Subcategory.create({
      name: "Draft",
      description: "Beer and cider on tap",
      menu: mainMenu._id,
      parent: drinks._id,
    });

    const redWine = await Subcategory.create({
      name: "Red Wine",
      description: "A selection of red wines",
      menu: mainMenu._id,
      parent: drinks._id,
    });

    const whiteWine = await Subcategory.create({
      name: "White Wine",
      description: "A selection of white wines",
      menu: mainMenu._id,
      parent: drinks._id,
    });

    //add menu items
    const items = [
        //starters
      { name: "Pita and Hummous",
        description: "Warm pita bread served with classic hummous dip",
        price: 8.5,
        sub: starters._id,
        ingredients: [getIngredientId("Pitta")],
        allergens: [],},
      {
        name: "Tzatziki with Bread Selection",
        description: "Cool cucumber and garlic yogurt dip served with artisan bread slices",
        price: 5.80,
        sub: starters._id,
        ingredients: [getIngredientId("Bread")],
        allergens: [
          getAllergenId("Dairy"),
          getAllergenId("Lactose"),
        ].filter(Boolean),
      },
      {
        name: "Grilled Octopus",
        description: "Tender octopus chargrilled with olive oil and herbs",
        price: 9.50,
        sub: starters._id,
        allergens: [getAllergenId("Shellfish")].filter(Boolean),
      },

      //mains
      {
        name: "Chicken Gyros",
        description: "Greek-style marinated chicken wrapped in pitta with salad and tzatziki",
        price: 13.0,
        sub: mains._id,
        ingredients: [getIngredientId("Chicken"), getIngredientId("Pitta")],
        allergens: [
          getAllergenId("Dairy"),
          getAllergenId("Lactose"),
          getAllergenId("Meat"),
        ].filter(Boolean),
      },
      {
        name: "Halloumi Burger",
        description: "Grilled halloumi, lettuce, tomato and mayo in a soft bun",
        price: 10.5,
        sub: mains._id,
        ingredients: [getIngredientId("Halloumi"), getIngredientId("Mayonaise")],
        allergens: [
          getAllergenId("Dairy"),
          getAllergenId("Lactose"),
        ].filter(Boolean),
      },
      {
        name: "Greek Salad",
        description: "Feta cheese, olives, tomato, cucumber, and oregano",
        price: 8.5,
        sub: mains._id,
        allergens: [getAllergenId("Dairy")].filter(Boolean),
      },
      {
        name: "Spanakopita",
        description: "Crispy filo pastry filled with spinach and feta cheese",
        price: 9.0,
        sub: mains._id,
        allergens: [getAllergenId("Dairy")].filter(Boolean),
      },
      {
        name: "Lamb Burger with Tzatziki",
        description: "Juicy lamb burger topped with tzatziki sauce",
        price: 12.5,
        sub: mains._id,
        allergens: [
          getAllergenId("Dairy"),
          getAllergenId("Lactose"),
          getAllergenId("Meat"),
        ].filter(Boolean),
      },

      // Drinks - Draft
      {
        name: "Mythos",
        description: "Greek lager beer, crisp and refreshing",
        price: 5.5,
        sub: draft._id,
      },
      {
        name: "Heineken",
        description: "Dutch pale lager beer",
        price: 5.5,
        sub: draft._id,
      },
      {
        name: "Thatchers Gold",
        description: "Medium dry cider from Somerset apples",
        price: 5.0,
        sub: draft._id,
      },

      // Drinks - Red Wine
      {
        name: "Merlot",
        description: "Smooth red wine with dark berry notes",
        price: 6.0,
        sub: redWine._id,
      },
      {
        name: "Cabernet Sauvignon",
        description: "Full-bodied red with hints of blackcurrant and oak",
        price: 6.5,
        sub: redWine._id,
      },
      {
        name: "Malbec",
        description: "Rich red with plum and chocolate flavours",
        price: 6.5,
        sub: redWine._id,
      },

      // Drinks - White Wine
      {
        name: "Chardonnay",
        description: "Crisp white with hints of oak and citrus",
        price: 6.0,
        sub: whiteWine._id,
      },
      {
        name: "Sauvignon Blanc",
        description: "Light-bodied, zesty white wine",
        price: 6.0,
        sub: whiteWine._id,
      },
      {
        name: "Pinot Grigio",
        description: "Dry white wine with citrus and floral notes",
        price: 6.0,
        sub: whiteWine._id,
      },
    ];

    await MenuItem.insertMany(items);
    console.log(`🍽️  Inserted ${items.length} menu items`);

    console.log("✅ Menu data seeded successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding menu data:", err);
    process.exit(1);
  }
};

seedMenuData();
