const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const auth = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No authentication token, access denied'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User account is deactivated'
            });
        }

        // Add user to request object
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Token is invalid or expired'
        });
    }
};

// Middleware to check user role
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }
        next();
    };
};

// Middleware to check storage limits
const checkStorageLimit = async (req, res, next) => {
    try {
        const user = req.user;
        const currentUsage = await user.getStorageUsage();
        const storageLimit = user.storageLimit || 100 * 1024 * 1024; // Default 100MB

        if (currentUsage >= storageLimit) {
            return res.status(403).json({
                success: false,
                message: 'Storage limit reached. Please upgrade your plan or delete some files.'
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    auth,
    checkRole,
    checkStorageLimit
}; 