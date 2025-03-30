import { deserialize } from "./serializer.js";
import { nanoid as shortid } from "nanoid";
import { ulid } from "@std/ulid";

const GAMES_TABLE = "games";
const GAMES_BY_ID_IDX = [GAMES_TABLE, "id"];
const GAMES_BY_DATE_IDX = [GAMES_TABLE, "recent"];

export interface GameEntry {
  id: string;
  game: string;
  label: string;
  did: string;
}

export class GamesDatabase {
  #pool: Deno.Kv;

  constructor(pool: Deno.Kv) {
    this.#pool = pool;
  }

  async retrieveAll() {
    const result = this.#pool.list<GameEntry>({ prefix: GAMES_BY_DATE_IDX }, {
      limit: 10,
      reverse: true,
    });

    const games = [];
    for await (const row of result) {
      const { width, colors, colorScheme } = deserialize(row.value.game);
      games.push({
        id: row.value.id,
        width,
        colors,
        colorScheme,
        label: row.value.label,
        did: row.value.did,
        key: row.key,
      });
    }

    return games;
  }

  async retrieve(id: string) {
    const result = await this.#pool.get<GameEntry>([...GAMES_BY_ID_IDX, id]);
    return result.value;
  }

  async remove(id: string) {
    await this.#pool.delete([...GAMES_BY_ID_IDX, id]);
    await this.#pool.delete([...GAMES_BY_DATE_IDX, id]);
  }

  async save(game: string, label: string) {
    const id = shortid();
    const normalizedLabel = label ? normalize(label) : "";
    const fullId = `${label ? `${kebabify(normalizedLabel)}-` : ""}${id}`;
    const did = ulid();

    const entry = {
      id: fullId,
      game,
      label: normalizedLabel,
      did,
    };

    await Promise.all([
      this.#pool.set([...GAMES_BY_ID_IDX, fullId], entry),
      this.#pool.set([...GAMES_BY_DATE_IDX, did], entry),
    ]);

    return fullId;
  }
}

const normalize = (label: string) =>
  label.substring(0, 20).replace(/[^A-Za-z\-_0-9À-ž\s]/g, "");
const kebabify = (label: string) =>
  label
    .toLowerCase()
    .replace(/\s/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
