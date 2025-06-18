const express = require("express");
const AuthSessionController = require("../controllers/Auth/AuthSessionController");
const auth = require("../middleware/Auth");
const { registerValidator } = require("../validators/authValidator");
const router = express.Router();
const {Validate} = require("../middleware/Validate");

router.post("/register", registerValidator, Validate, AuthSessionController.register)
router.post("/login", AuthSessionController.login)

router.use(auth);

router.post('/save-subscribe', AuthSessionController.saveSubscribe);
router.post('/logout', AuthSessionController.logout);
router.post('/get-me', AuthSessionController.getMe);
router.post('/update-me', AuthSessionController.updateMe);

module.exports = router;