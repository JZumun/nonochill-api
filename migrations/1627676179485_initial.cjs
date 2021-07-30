/* eslint-disable camelcase */

exports.shorthands = undefined;

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.up = pgm => {
  pgm.createTable("games", {
    id: "id",
    shortId: {
      unique: true,
      type: "text",
      notNull: true,
    },
    game: {
      type: "text",
      notNull: true,
    },
    label: "text",
  });
};

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.down = pgm => {
  pgm.dropTable("games");
};
