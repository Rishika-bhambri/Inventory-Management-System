const express = require("express");
const router = express.Router();
const Product = require("../models/product");


// GET all products with filtering, sorting and pagination
router.get("/", async (req, res) => {
    try {
        const {
            category,
            minPrice,
            maxPrice,
            sortBy = "createdAt",
            order = "desc",
            page = 1,
            limit = 10
        } = req.query;

        let filter = {};

        if (category) {
            filter.category = category;
        }

        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        const pageNumber = Math.max(1, Number(page) || 1);
        const limitNumber = Math.max(1, Math.min(100, Number(limit) || 10));

        const sortOrder = order === "asc" ? 1 : -1;
        const sortOptions = { [sortBy]: sortOrder };

        const products = await Product.find(filter)
            .sort(sortOptions)
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber);

        const totalProducts = await Product.countDocuments(filter);

        res.status(200).json({
            success: true,
            totalProducts,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalProducts / limitNumber),
            products
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// STOCK ADJUSTMENT - Restock and Sale
router.patch("/:id/stock", async (req, res) => {
    try {
        const { type, quantity } = req.body;

        if (!["restock", "sale"].includes(type) ||
            !Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                message: "Provide type (restock/sale) and positive quantity"
            });
        }

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        if (type === "sale" && product.quantity < quantity) {
            return res.status(400).json({ message: "Insufficient stock" });
        }

        product.quantity += type === "restock" ? quantity : -quantity;
        await product.save();

        res.json({
            message: "Stock updated successfully",
            product
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


// LOW STOCK ALERT REPORT
router.get("/low-stock", async (req, res) => {
    try {
        const threshold = Number(req.query.threshold) || 10;

        const products = await Product.find({
            quantity: { $lte: threshold }
        });

        res.json({
            success: true,
            threshold,
            totalLowStockProducts: products.length,
            products
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// CATEGORY-WISE INVENTORY SUMMARY
router.get("/summary", async (req, res) => {
    try {
        const summary = await Product.aggregate([
            {
                $group: {
                    _id: "$category",
                    totalProducts: { $sum: 1 },
                    totalQuantity: { $sum: "$quantity" },
                    totalInventoryValue: {
                        $sum: { $multiply: ["$quantity", "$price"] }
                    }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        res.json({
            success: true,
            summary
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// GET single product
router.get("/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ADD product
router.post("/", async (req, res) => {
    try {
        const product = new Product(req.body);
        const savedProduct = await product.save();

        res.status(201).json(savedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// UPDATE product
router.put("/:id", async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json(updatedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE product
router.delete("/:id", async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);

        if (!deletedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json({ message: "Product deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
