const express    = require("express");
const app        = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const deserialize = require("./Serializer").deserialize;

const upload = require("multer")({
	fileFilter(req, file, cb) {
		return cb(null, ["image/jpeg","image/png"].includes(file.mimetype));
	}
});

const imageProcessor = require("./ImageProcessor");

app.set("view engine", "pug");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

const shortid = require("shortid");

const db = require("monk")(process.env.MONGODB_URI || "localhost:27017/nono2");
const games = db.get("games");

const router = express.Router();

const fail = (res, reason) => res.status(400).json({
	success: false,
	reason
});

router.use((req,res,next)=>{
	console.log("Getting request");
	next();
});
router.get("/", (req, res) => {
	games.find({}, {
		fields: { id: 1, "_id": 0, game: 1 },
		limit: 10,
		sort: { "_id": -1 }
	}).then((docs) => {
		res.json({
			success: true,
			games: docs.map(doc => {
				try {
					const { width, colors, colorScheme } = deserialize(doc.game);
					return { id: doc.id, width, colors, colorScheme };
				} catch(e) {
					return null;
				}

			})
		});
	});
});
router.get("/test", (req, res) => {
	res.render("index");
});

router.post("/image", upload.single("image"), (req, res) => {
	const size = Number.parseInt(req.body.size) || 10;
	const color = (Number.parseInt(req.body.colors) || 1) + 1;

	if (!req.file || !req.file.buffer) {
		fail(res, "Upload a valid file");
	}

	imageProcessor.imageToArray(req.file.buffer, size, color).then(colors => {
		res.json(colors);
	}).catch(err => {
		return fail(res, err.message);
	});
});

router.get("/:game", (req, res) => {
	const id = req.params.game;
	if (!shortid.isValid(id)) {
		return fail(res, "Invalid game id");
	}
	console.log(`Retrieving game ${id}`);
	games.findOne({id})
		.then(doc => {
			if (doc !== null) {
				res.json({
					success: true,
					game: doc.game
				});
			} else fail(res, "Nothing found.");
		}).catch(e => fail(res, e));
});
router.post("/", (req, res) => {
	const id = shortid.generate();
	const game = req.body.game;

	if (game == null || game.trim().length == 0) {
		return fail(res, "Empty input");
	}

	console.log(`Saving game ${id} - ${game}`);
	games.insert({
		id,
		game
	}, {castIds: false}).then(doc => {
		res.json({
			success: true,
			id: doc.id
		});
	}).catch(e => fail(res, e));
});


app.use("/", router);

const port = process.env.PORT || 8080;

app.listen(port);
console.log(`Listening on port ${port}`);
