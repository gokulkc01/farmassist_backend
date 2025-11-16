const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModels = require('../models/User.models');

async function register(req, res) {
    try {
        const { name, email, password, phone, location, language } = req.body;

        // Check if user already exists
        const ifUserExists = await UserModels.findOne({ email });

        if (ifUserExists) {
            return res.status(409).json({
                success: false,
                message: "User already exists with this email"
            });
        }

        // Create new user
        const user = await UserModels.create({
            name,
            password: await bcrypt.hash(password, 10),
            email,
            phone,
            location,
            language
        });

        // Generate JWT token (NO await needed - jwt.sign is synchronous)
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '7d' } // Token expires in 7 days
        );

        // Set cookie (optional - only if you want cookie-based auth)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Send response
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    location: user.location,
                    language: user.language
                },
                token: token
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        
        // Handle duplicate key error (MongoDB)
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email already exists"
            });
        }
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                details: error.message
            });
        }
        
        // Generic error
        res.status(500).json({
            success: false,
            message: "Internal server error",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

async function loginController(req, res) {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find user
        const user = await UserModels.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Verify password
        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '7d' }
        );

        // Set cookie (optional)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Send response (200 for login, not 201)
        res.status(200).json({
            success: true,
            message: "User logged in successfully",
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    location: user.location,
                    language: user.language
                },
                token: token
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

async function logout(req, res) {
    try {
        // Clear the cookie
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: "Error logging out"
        });
    }
}

module.exports = { register, loginController, logout };

module.exports = { register, loginController, logout };