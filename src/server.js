import "dotenv/config";
import { default as express, Router, urlencoded, json } from "express";
import cors from "cors";
import multer from "multer";
import { imageToArray } from "./image-processor.js";
import { GamesDatabase } from "./games.js";

const app = express();
const db = new GamesDatabase();

app.use(urlencoded({ extended: true }));
app.use(json());
app.use(cors());

const wrap = fn => async (req, res, next) => {
  try {
    const result = await fn(req, res, next);
    console.log("returning", result);
    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({
      success: false,
      reason: err.message,
    });
  }
};

// GAME ROUTES
const gameRouter = Router();
gameRouter.use((req, res, next) => {
  console.log("Getting request", req.body);
  next();
});

gameRouter.get(
  "/",
  wrap(async () => {
    console.log("retrieving games");
    return {
      games: await db.retrieveAll(),
    };
  })
);
gameRouter.get(
  "/:game",
  wrap(async req => {
    const id = req.params.game;
    const game = await db.retrieve(id);

    if (!game) {
      throw new Error("Nothing found");
    }

    return {
      game: game.game,
      label: game.label,
    };
  })
);
gameRouter.post(
  "/",
  wrap(async req => {
    const id = await db.save(req.body.game, req.body.label);
    return { id };
  })
);

// IMAGE ROUTES
const upload = multer({
  fileFilter(req, file, cb) {
    return cb(null, ["image/jpeg", "image/png"].includes(file.mimetype));
  },
});
const imageRouter = Router();
imageRouter.post(
  "/",
  upload.single("image"),
  wrap(async req => {
    if (!req.file || !req.file.buffer) {
      throw new Error("Upload a valid file");
    }

    const size = Number.parseInt(req.body.size) || 10;
    const color = (Number.parseInt(req.body.colors) || 1) + 1;

    return imageToArray(req.file.buffer, size, color);
  })
);

app.use("/", gameRouter);
app.use("/image", imageRouter);

const port = process.env.PORT || 8080;
app.listen(port);

console.log(`Listening on port ${port}`);
export default app;
