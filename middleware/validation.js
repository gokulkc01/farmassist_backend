const Joi = require('joi');

// User registration validation
const registerValidation = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().min(2).max(100).trim().required()
            .messages({
                'string.empty': 'Name is required',
                'string.min': 'Name must be at least 2 characters long',
                'string.max': 'Name cannot be more than 100 characters'
            }),
        email: Joi.string().email().lowercase().trim().required()
            .messages({
                'string.empty': 'Email is required',
                'string.email': 'Please enter a valid email address'
            }),
        phone: Joi.string().min(10).max(15).trim().required()
            .pattern(/^[0-9]+$/)
            .messages({
                'string.empty': 'Phone number is required',
                'string.pattern.base': 'Phone number must contain only digits',
                'string.min': 'Phone number must be at least 10 digits',
                'string.max': 'Phone number cannot be more than 15 digits'
            }),
        password: Joi.string().min(6).required()
            .messages({
                'string.empty': 'Password is required',
                'string.min': 'Password must be at least 6 characters long'
            }),
        role: Joi.string().valid('farmer', 'admin', 'expert').default('farmer'),
        location: Joi.object({
            state: Joi.string().trim(),
            district: Joi.string().trim(),
            village: Joi.string().trim(),
            coordinates: Joi.object({
                lat: Joi.number().min(-90).max(90),
                lng: Joi.number().min(-180).max(180)
            })
        }),
        language: Joi.string().valid('en', 'hi', 'te', 'kn').default('en')
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }

    next();
};

// User login validation
const loginValidation = (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string().email().lowercase().trim().required()
            .messages({
                'string.empty': 'Email is required',
                'string.email': 'Please enter a valid email address'
            }),
        password: Joi.string().required()
            .messages({
                'string.empty': 'Password is required'
            })
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }

    next();
};

// Update profile validation
const updateProfileValidation = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().min(2).max(100).trim(),
        phone: Joi.string().min(10).max(15).trim()
            .pattern(/^[0-9]+$/)
            .messages({
                'string.pattern.base': 'Phone number must contain only digits'
            }),
        location: Joi.object({
            state: Joi.string().trim(),
            district: Joi.string().trim(),
            village: Joi.string().trim(),
            coordinates: Joi.object({
                lat: Joi.number().min(-90).max(90),
                lng: Joi.number().min(-180).max(180)
            })
        }),
        language: Joi.string().valid('en', 'hi', 'te', 'kn')
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }

    next();
};

module.exports = {
    registerValidation,
    loginValidation,
    updateProfileValidation
};