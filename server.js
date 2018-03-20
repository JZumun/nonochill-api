const express    = require('express');
const app        = express();
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const shortid = require("shortid");

const db = require('monk')(process.env.MONGODB_URI || "localhost:27017/nono2");
const games = db.get("games");

const router = express.Router();
router.get("/", (req, res) => {
	res.json({success: true});
})
router.get("/:game", (req, res) => {
	const id = req.params.game;
	console.log(`Retrieving game ${id}`);
	games.findOne({id})
		.then(doc => {
			if (doc !== null) {
				console.log(doc);
				res.json({
					success: true,
					game: doc.game
				})
			} else {
				res.json({
					success: false
				})
			}
		}).catch(e => {
			res.json({success: false});
		})
});
router.post("/", (req, res) => {
	const id = shortid.generate();
	const game = req.body.game;
	console.log(`Saving game ${id} - ${game}`);
	games.insert({
		id,
		game
	}, {castIds: false}).then(doc => {
		res.json({
			success: true,
			id: doc.id
		})
	}).catch(e => res.json({success:false}));
});
app.use("/", router);

const port = process.env.PORT || 8080;

app.listen(port);
console.log(`Listening on port ${port}`);
