const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class AuthController {
    // Register new user
    async register(req, res) {
        try {
            const { fullName, email, password } = req.body;

            // Check if user already exists
            let user = await User.findOne({ email });
            if (user) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists'
                });
            }

            // Create new user
            user = new User({
                fullName,
                email,
                password
            });

            await user.save();

            // Generate JWT token
            const token = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.status(201).json({
                success: true,
                token,
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error registering user',
                error: error.message
            });
        }
    }

    // Login user
    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Check if user exists
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Check password
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Update last login
            user.lastLogin = new Date();
            await user.save();

            // Generate JWT token
            const token = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.status(200).json({
                success: true,
                token,
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error logging in',
                error: error.message
            });
        }
    }

    // Get user profile
    async getProfile(req, res) {
        try {
            const user = await User.findById(req.user._id).select('-password');
            res.status(200).json({
                success: true,
                data: user
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching profile',
                error: error.message
            });
        }
    }

    // Update user profile
    async updateProfile(req, res) {
        try {
            const { fullName } = req.body;
            const user = await User.findById(req.user._id);

            user.fullName = fullName;
            await user.save();

            res.status(200).json({
                success: true,
                data: user
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating profile',
                error: error.message
            });
        }
    }

    // Change password
    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const user = await User.findById(req.user._id);

            // Check current password
            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            // Update password
            user.password = newPassword;
            await user.save();

            res.status(200).json({
                success: true,
                message: 'Password updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error changing password',
                error: error.message
            });
        }
    }

    // Forgot password
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            const user = await User.findOne({ email });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            user.resetPasswordToken = crypto
                .createHash('sha256')
                .update(resetToken)
                .digest('hex');
            user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

            await user.save();

            // Send reset email (implement email service)
            // await sendResetEmail(user.email, resetToken);

            res.status(200).json({
                success: true,
                message: 'Password reset email sent'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error processing forgot password',
                error: error.message
            });
        }
    }

    // Reset password
    async resetPassword(req, res) {
        try {
            const { token, password } = req.body;

            // Hash token
            const resetPasswordToken = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            const user = await User.findOne({
                resetPasswordToken,
                resetPasswordExpire: { $gt: Date.now() }
            });

            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired reset token'
                });
            }

            // Update password
            user.password = password;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();

            res.status(200).json({
                success: true,
                message: 'Password reset successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error resetting password',
                error: error.message
            });
        }
    }

    // Google login
    async googleLogin(req, res) {
        try {
            const { token } = req.body;
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID
            });
            const payload = ticket.getPayload();

            let user = await User.findOne({ email: payload.email });
            if (!user) {
                user = new User({
                    fullName: payload.name,
                    email: payload.email,
                    password: crypto.randomBytes(32).toString('hex')
                });
                await user.save();
            }

            const jwtToken = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.status(200).json({
                success: true,
                token: jwtToken,
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error with Google login',
                error: error.message
            });
        }
    }

    // Facebook login
    async facebookLogin(req, res) {
        try {
            const { accessToken } = req.body;
            const response = await axios.get(
                `https://graph.facebook.com/v12.0/me?fields=id,name,email&access_token=${accessToken}`
            );
            const { id, name, email } = response.data;

            let user = await User.findOne({ email });
            if (!user) {
                user = new User({
                    fullName: name,
                    email,
                    password: crypto.randomBytes(32).toString('hex')
                });
                await user.save();
            }

            const token = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.status(200).json({
                success: true,
                token,
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error with Facebook login',
                error: error.message
            });
        }
    }
}

module.exports = new AuthController(); 