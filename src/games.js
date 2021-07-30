import pg from "pg";
import { deserialize } from "./serializer.js";
import shortid from "shortid";
export class GamesDatabase {
  #pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  async retrieveAll() {
    const client = await this.#pool.connect();
    const result = await client.query("SELECT * FROM games ORDER BY id DESC LIMIT 10 ");
    return result.rows.map(row => {
      const { width, colors, colorScheme } = deserialize(row.game);
      return {
        id: row.shortId,
        width,
        colors,
        colorScheme,
        label: row.label,
      };
    });
  }

  async retrieve(id) {
    const client = await this.#pool.connect();
    const result = await client.query("SELECT * FROM games WHERE shortId=$1", [id]);

    return result.rows[0];
  }

  async save(game, label) {
    const id = shortid();
    const normalizedLabel = label ? normalize(label) : "";
    const fullId = `${label ? `${kebabify(normalizedLabel)}-` : ""}${id}`;

    const client = await this.#pool.connect();
    await client.query("INSERT INTO games (shortId, game, label) VALUES ($1,$2,$3)", [
      fullId,
      game,
      normalize,
    ]);

    return fullId;
  }
}

const normalize = label => label.substring(0, 20).replace(/[^A-Za-z\-_0-9À-ž\s]/g, "");
const kebabify = label =>
  label
    .toLowerCase()
    .replace(/\s/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
