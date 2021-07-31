/* eslint-disable camelcase */

exports.shorthands = undefined;

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.up = pgm => {
  pgm.createTable("games", {
    id: {
      primaryKey: true,
      type: "text",
      notNull: true,
    },
    game: {
      type: "text",
      notNull: true,
    },
    label: "text",
    created: {
      type: "timestamptz",
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addIndex("games", "created");
};

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.down = pgm => {
  pgm.dropTable("games");
};
