import express from "express";
import cors from "cors";
import dotenv from "dotenv";


//security stuff
import helmet from "helmet";
import winston from "winston";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import {removeId} from "./middleware/deleteId.js";

import allergens from "./routes/allergens.js";
import ingredients from "./routes/ingredients.js";
import menuItems from "./routes/menuItems.js";
import menus from "./routes/menus.js";
import orders from "./routes/orders.js";
import robots from "./routes/robots.js";
import subcategories from "./routes/subCategories.js";
import tables from "./routes/tables.js";
import users from "./routes/users.js";

import "./db/connection.js";

const PORT = process.env.PORT || 5050;
dotenv.config();
const app = express();

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use(cors({origin: "http://localhost:5173"}));
app.use(express.json());

app.use(helmet());  //secure HTTP headers
//rate limiting for ddos attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  //15 minutes
  max: 100,                  //each IP up to 100 requests
  message: "Too many requests from IP, please try again later."
});
app.use(limiter);

//prevent NoSQL injection
app.use(mongoSanitize());

//prevent XSS attacks
app.use(xss());

//remove ids from being changed in posts and patches
app.use(removeId);

app.use("/allergens", allergens);
app.use("/ingredients", ingredients);
app.use("/menuItems", menuItems);
app.use("/menus", menus);
app.use("/orders", orders);
app.use("/robots", robots);
app.use("/subCategories", subcategories);
app.use("/tables", tables);
app.use("/users", users);

//winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" })],
});

//log unhandled errors
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});

//start the server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
