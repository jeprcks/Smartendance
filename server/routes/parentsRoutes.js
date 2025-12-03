const express = require("express");
const router = express.Router();
const {
    createParent,
    getAllParents,
    getParent,
    searchParents,
    updateParent,
    deleteParent,
    getParentsByChildren
} = require("../controllers/parentsController");

// POST: Create a new parent
router.post("/", createParent);

// GET: Retrieve all parents
router.get("/", getAllParents);

// GET: Search parents
router.get("/search", searchParents);

// GET: Get parents by children IDs
router.get("/children", getParentsByChildren);

// GET: Retrieve a single parent by ID
router.get("/:id", getParent);

// PATCH: Update a parent
router.patch("/:id", updateParent);

// DELETE: Delete a parent
router.delete("/:id", deleteParent);

module.exports = router;
