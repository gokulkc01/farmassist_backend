const express = require('express');
const router = express.Router();
const {register, loginController, logout} = require('../controllers/auth.controller')

router.post('/register', register);
router.post('/login', loginController);
router.post('/logout', logout);

module.exports = router;