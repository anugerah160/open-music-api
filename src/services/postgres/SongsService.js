const { Pool } = require("pg");
const { nanoid } = require("nanoid");
const InvariantError = require("../../exceptions/InvariantError");
const NotFoundError = require("../../exceptions/NotFoundError");

class SongsService {
  constructor() {
    this._pool = new Pool();
  }

  async addSong({ title, year, genre, performer, duration, albumId }) {
    const id = `song-${nanoid(16)}`;
    const query = {
      text: "INSERT INTO songs (id, title, year, genre, performer, duration, album_id) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      values: [id, title, year, genre, performer, duration, albumId],
    };

    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError("Lagu gagal ditambahkan");
    }
    return result.rows[0].id;
  }

  async getSongs({ title, performer }) {
    let queryText = "SELECT id, title, performer FROM songs";
    const queryValues = [];

    if (title && performer) {
      queryValues.push(`%${title}%`);
      queryValues.push(`%${performer}%`);
      queryText += " WHERE title ILIKE $1 AND performer ILIKE $2";
    } else if (title) {
      queryValues.push(`%${title}%`);
      queryText += " WHERE title ILIKE $1";
    } else if (performer) {
      queryValues.push(`%${performer}%`);
      queryText += " WHERE performer ILIKE $1";
    }

    const { rows } = await this._pool.query(queryText, queryValues);
    return rows;
  }

  async getSongById(id) {
    const query = {
      text: "SELECT id, title, year, performer, genre, duration, album_id FROM songs WHERE id = $1",
      values: [id],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Lagu tidak ditemukan");
    }
    // eslint-disable-next-line no-param-reassign
    result.rows[0].albumId = result.rows[0].album_id;
    delete result.rows[0].album_id;
    return result.rows[0];
  }

  async editSongById(id, { title, year, genre, performer, duration, albumId }) {
    const query = {
      text: "UPDATE songs SET title = $1, year = $2, genre = $3, performer = $4, duration = $5, album_id = $6 WHERE id = $7 RETURNING id",
      values: [title, year, genre, performer, duration, albumId, id],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Gagal memperbarui lagu. Id tidak ditemukan");
    }
  }

  async deleteSongById(id) {
    const query = {
      text: "DELETE FROM songs WHERE id = $1 RETURNING id",
      values: [id],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Lagu gagal dihapus. Id tidak ditemukan");
    }
  }
}

module.exports = SongsService;
