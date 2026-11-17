
const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const cors = require("cors");

const connectDB = require("./config/db");
const productRoutes = require("./routes/productroutes");
const errorMiddleware = require("./middleware/errormiddleware");



const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
connectDB();

// Home route
app.get("/", (req, res) => {
    res.send("Inventory Management System API is Running!");
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Server is healthy"
    });
});

// Product routes
app.use("/api/products", productRoutes);

// Error handling
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
