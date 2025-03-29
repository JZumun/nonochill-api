import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { imageToArray } from "./image-processor.ts";
import { GamesDatabase } from "./games.ts";

const app = new Hono();
const db = await GamesDatabase.initialize();

app.onError((err, ctx) => {
  console.error(err);
  return ctx.json({
    success: false,
    reason: err.message,
  }, 400);
});

// GAME ROUTES
const gameRouter = new Hono();
gameRouter.get(
  "/",
  async (ctx) => {
    console.log("retrieving games");
    return ctx.json({
      success: true,
      games: await db.retrieveAll(),
    });
  },
);

gameRouter.get(
  "/:game",
  async (ctx) => {
    const id = ctx.req.param("game");
    const game = await db.retrieve(id);

    if (!game) {
      throw new Error("Nothing found");
    }

    return ctx.json({
      success: true,
      game: game.game,
      label: game.label,
    });
  },
);
gameRouter.post(
  "/",
  async (ctx) => {
    const body = await ctx.req.json();
    const id = await db.save(body.game, body.label);
    return ctx.json({
      success: true,
      id,
    });
  },
);

// IMAGE ROUTES
const imageRouter = new Hono();
imageRouter.post(
  "/",
  async (ctx) => {
    const body = await ctx.req.parseBody<{
      size: string;
      colors: string;
      image: File;
    }>();

    if (!body.image) {
      throw new Error("Upload a valid file");
    }

    body.image.type;

    const size = Number.parseInt(body.size) || 10;
    const color = (Number.parseInt(body.colors) || 1) + 1;

    return ctx.json({
      success: true,
      ...imageToArray(await body.image.arrayBuffer(), size, color),
    });
  },
);

app.use(logger());
app.use(cors({
  origin: Deno.env.get("NONOCHILL_FE_ORIGIN") || "http://localhost:8001",
}));
app.route("/", gameRouter);
app.route("/image", imageRouter);

export default app;
