const router = express.Router();
const database = require('../config/accessFirebase');
const messageRef = database.ref('/Messages');


module.exports = router;