import createApp from "./src/server.ts";

const kv = await Deno.openKv();
const app = createApp(kv);
Deno.serve(app.fetch);
