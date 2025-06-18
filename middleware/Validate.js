const { validationResult } = require('express-validator');
const fs = require('fs');
exports.Validate = (req, res, next) => {
	const result = validationResult(req);

	if (!result.isEmpty()) {

		// if (req.file && req.file.path) {
        //     fs.unlink(req.file.path, (err) => {
        //         if (err) console.error("Error deleting file:", err);
        //     });
        // }
		// if (req.files) {
		// 	for (const file of req.files) {
		// 		fs.unlink(file.path, (err) => {
		// 			if (err) console.error("Error deleting file:", err);
		// 		});
		// 	}
		// }

		const allErrors = result.array();
		const uniqueErrors = {};
		for (const err of allErrors) {
			if (uniqueErrors[err.path] == undefined) {
				uniqueErrors[err.path] = err.msg;
			}
		}
		return res.status(422).json({
			status: false,
			message: 'Validation failed.',
			errors: uniqueErrors,
		});
	}
	next();
};

