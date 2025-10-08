const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModels = require('../models/User.models');

async function register(req, res) {
    try {
        const { name, email, password, phone, location, language } = req.body;

        const ifUserExits = await UserModels.findOne({ email });

        if (ifUserExits) {
            return res.json({
                msg: "User already exits",
                user
            })
        }

        const user = await UserModels.create({
            name,
            password: await bcrypt.hash(password, 10),
            email,
            phone,
            location,
            language
        });

        const token = await jwt.sign({
            id: user._id,
        }, process.env.JWT_SECRET_KEY);

        res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
});

        res.status(201).json({
            success: true,
            message: "User Registered Successfully",
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
    catch (error) { // <-- Catch the error variable here!
        console.error(error); // <-- Log the actual error
        // Send a 500 status response to the client
        res.status(500).json({
            msg: "Internal Server Error",
            details: error.message // Include error message for debugging (in dev only)
        });
    }
}
async function loginController(req, res) {
    try{
        const {email, password} = req.body;

        const user = await UserModels.findOne({email});

        if(!user) {
            return res.status(404).json({
                success: false,
                message: "Invalid email or password"
            })
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if(!isPasswordCorrect) {
            return res.status(404).json({
               success: false,
                message: "Invalid email or password"                  

            })
        }

        const token = jwt.sign({id:user._id}, process.env.JWT_SECRET_KEY);

        res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
});


         res.status(201).json({
           success: true,
            message: "User Logged In Successfully",
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
    catch (err){
        console.error(err);
        res.status(500).json({
            msg: "Internal server error",
            error: err.message
        });
    }
}
module.exports = { register , loginController};

