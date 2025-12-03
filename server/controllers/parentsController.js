const Parent = require("../models/parentsSchema");

// Create new parent
const createParent = async (req, res) => {
    try {
        const {
            fullName,
            email,
            password,
            phoneNumber,
            gender,
            relationship,
            occupation,
            photo,
            address,
            childrenIds,
            emergencyContact
        } = req.body;

        console.log('Creating parent with data:', { fullName, email });

        // Validate required fields
        if (!fullName || !email || !password || !phoneNumber || !gender || !relationship) {
            return res.status(400).json({ 
                error: "Missing required fields: fullName, email, password, phoneNumber, gender, relationship" 
            });
        }

        // Check if email already exists
        const existingEmail = await Parent.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ error: "Email already exists" });
        }

        // Create new parent
        const newParent = new Parent({
            fullName,
            email,
            password,
            phoneNumber,
            gender,
            relationship,
            occupation,
            photo,
            address,
            childrenIds,
            emergencyContact
        });

        await newParent.save();

        console.log('Parent created successfully:', newParent._id);
        res.status(201).json(newParent);
    } catch (error) {
        console.error('Error creating parent:', error);
        res.status(500).json({ error: error.message || "Error creating parent" });
    }
};

// Get all parents
const getAllParents = async (req, res) => {
    try {
        console.log('Fetching all parents');
        const parents = await Parent.find().sort({ createdAt: -1 });
        console.log('Found parents:', parents.length);
        res.status(200).json(parents);
    } catch (error) {
        console.error('Error fetching parents:', error);
        res.status(500).json({ error: error.message || "Error fetching parents" });
    }
};

// Get single parent by ID
const getParent = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Fetching parent:', id);

        const parent = await Parent.findById(id);
        if (!parent) {
            return res.status(404).json({ error: "Parent not found" });
        }

        console.log('Parent found:', parent._id);
        res.status(200).json(parent);
    } catch (error) {
        console.error('Error fetching parent:', error);
        res.status(500).json({ error: error.message || "Error fetching parent" });
    }
};

// Search parents
const searchParents = async (req, res) => {
    try {
        const { query } = req.query;
        console.log('Searching parents with query:', query);

        if (!query) {
            return res.status(400).json({ error: "Search query is required" });
        }

        const parents = await Parent.find({
            $or: [
                { fullName: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                { phoneNumber: { $regex: query, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 });

        console.log('Search results:', parents.length);
        res.status(200).json(parents);
    } catch (error) {
        console.error('Error searching parents:', error);
        res.status(500).json({ error: error.message || "Error searching parents" });
    }
};

// Update parent
const updateParent = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        console.log('Updating parent:', id);

        // Don't allow updating email if it already exists
        if (updateData.email) {
            const existingEmail = await Parent.findOne({ 
                email: updateData.email, 
                _id: { $ne: id } 
            });
            if (existingEmail) {
                return res.status(400).json({ error: "Email already exists" });
            }
        }

        const updatedParent = await Parent.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedParent) {
            return res.status(404).json({ error: "Parent not found" });
        }

        console.log('Parent updated successfully:', updatedParent._id);
        res.status(200).json(updatedParent);
    } catch (error) {
        console.error('Error updating parent:', error);
        res.status(500).json({ error: error.message || "Error updating parent" });
    }
};

// Delete parent
const deleteParent = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Deleting parent:', id);

        const deletedParent = await Parent.findByIdAndDelete(id);

        if (!deletedParent) {
            return res.status(404).json({ error: "Parent not found" });
        }

        console.log('Parent deleted successfully:', id);
        res.status(200).json({ message: "Parent deleted successfully", parent: deletedParent });
    } catch (error) {
        console.error('Error deleting parent:', error);
        res.status(500).json({ error: error.message || "Error deleting parent" });
    }
};

// Get parents by children IDs
const getParentsByChildren = async (req, res) => {
    try {
        const { childId } = req.query;
        console.log('Fetching parents for child:', childId);

        if (!childId) {
            return res.status(400).json({ error: "Child ID is required" });
        }

        const parents = await Parent.find({ childrenIds: childId });
        console.log('Found parents:', parents.length);
        res.status(200).json(parents);
    } catch (error) {
        console.error('Error fetching parents by children:', error);
        res.status(500).json({ error: error.message || "Error fetching parents" });
    }
};

module.exports = {
    createParent,
    getAllParents,
    getParent,
    searchParents,
    updateParent,
    deleteParent,
    getParentsByChildren
};
