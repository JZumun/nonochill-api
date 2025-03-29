import app from "./src/server.ts"

Deno.serve(app.fetch);