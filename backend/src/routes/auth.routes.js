const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const AuthController = require('../controllers/auth.controller');

// Register new user
router.post('/register', AuthController.register);

// Login user
router.post('/login', AuthController.login);

// Get user profile
router.get('/profile', auth, AuthController.getProfile);

// Update user profile
router.put('/profile', auth, AuthController.updateProfile);

// Change password
router.put('/change-password', auth, AuthController.changePassword);

// Forgot password
router.post('/forgot-password', AuthController.forgotPassword);

// Reset password
router.post('/reset-password', AuthController.resetPassword);

// Social login routes
router.post('/google', AuthController.googleLogin);
router.post('/facebook', AuthController.facebookLogin);

module.exports = router; 