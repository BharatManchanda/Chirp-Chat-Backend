const express = require("express");
const PeopleController = require("../controllers/peopleController");
const router = express.Router();

router.get('/get-people', PeopleController.getList);

module.exports = router;