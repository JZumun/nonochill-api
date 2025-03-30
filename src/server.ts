import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { bearerAuth } from "hono/bearer-auth";
import { imageToArray } from "./image-processor.ts";
import { GamesDatabase } from "./games.ts";
import retrieveImage from "./unsplash.ts";

export default function createApp(kv: Deno.Kv) {
  const auth = bearerAuth({
    token: Deno.env.get("ADMIN_ACCESS_KEY") ?? crypto.randomUUID(),
  });

  // GAME ROUTES
  const db = new GamesDatabase(kv);
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
        return ctx.json({
          success: false,
          reason: "Game not found",
        }, 404);
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

  gameRouter.delete(
    "/:game",
    auth,
    async (ctx) => {
      const id = ctx.req.param("game");
      await db.remove(id);
      return ctx.json({
        success: true,
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

      const imageBuffer = await body.image.arrayBuffer();
      const settings = await imageToArray(imageBuffer, size, color);
      return ctx.json({
        success: true,
        ...settings,
      });
    },
  );

  // UNSPLASH IMAGE PROXY
  const unsplashRouter = new Hono();
  unsplashRouter.get(
    "/",
    async (ctx) => {
      console.log("hi");
      return ctx.json({
        success: true,
        image: await retrieveImage(kv),
      });
    },
  );

  // MAIN ROUTER
  const app = new Hono();
  app.onError((err, ctx) => {
    if (err instanceof HTTPException) {
      console.dir(err);
      return ctx.json({
        success: false,
      }, err.status);
    }
    console.error(err);
    return ctx.json({
      success: false,
      reason: err.message,
    }, 400);
  });

  const FE_ORIGIN = Deno.env.get("NONOCHILL_FE_ORIGIN") ||
    "https://nonochill.jzumun.ph";
  console.log(`Listening for requests from ${FE_ORIGIN}`);
  app.use(
    "/*",
    (ctx, next) => {
      const handler = cors({ origin: FE_ORIGIN });
      return handler(ctx, next);
    },
  );
  app.use("/*", logger());
  app.route("/image", imageRouter);
  app.route("/bg", unsplashRouter);
  app.route("/", gameRouter);

  return app;
}
