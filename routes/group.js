const express = require("express");

const GroupController = require("../controllers/GroupController");
const router = express.Router();

router.post('/group/create', GroupController.save);
router.get('/group/get', GroupController.get);

module.exports = router;