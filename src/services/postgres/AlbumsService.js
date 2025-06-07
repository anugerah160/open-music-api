const { Pool } = require("pg");
const { nanoid } = require("nanoid");
const InvariantError = require("../../exceptions/InvariantError");
const NotFoundError = require("../../exceptions/NotFoundError");

class AlbumsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addAlbum({ name, year }) {
    const id = `album-${nanoid(16)}`;
    const query = {
      text: "INSERT INTO albums VALUES($1, $2, $3) RETURNING id",
      values: [id, name, year],
    };

    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError("Album gagal ditambahkan");
    }
    return result.rows[0].id;
  }

  async getAlbumById(id) {
    const query = {
      text: `SELECT a.id, a.name, a.year, a.cover_url as "coverUrl",
             s.id as song_id, s.title as song_title, s.performer as song_performer
             FROM albums a
             LEFT JOIN songs s ON s.album_id = a.id
             WHERE a.id = $1`,
      values: [id],
    };
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }

    const album = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      year: result.rows[0].year,
      coverUrl: result.rows[0].coverUrl,
      songs: result.rows[0].song_id
        ? result.rows.map((row) => ({
            id: row.song_id,
            title: row.song_title,
            performer: row.song_performer,
          }))
        : [],
    };

    return album;
  }

  async editAlbumById(id, { name, year }) {
    const query = {
      text: "UPDATE albums SET name = $1, year = $2 WHERE id = $3 RETURNING id",
      values: [name, year, id],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Gagal memperbarui album. Id tidak ditemukan");
    }
  }

  async deleteAlbumById(id) {
    const query = {
      text: "DELETE FROM albums WHERE id = $1 RETURNING id",
      values: [id],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Album gagal dihapus. Id tidak ditemukan");
    }
  }

  async addAlbumCover(id, coverUrl) {
    const query = {
      text: "UPDATE albums SET cover_url = $1 WHERE id = $2 RETURNING id",
      values: [coverUrl, id],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Gagal memperbarui sampul. Id tidak ditemukan.");
    }
  }

  async likeAlbum(albumId, userId) {
    // Verif album
    await this.getAlbumById(albumId);

    const id = `like-${nanoid(16)}`;
    const query = {
      text: "INSERT INTO user_album_likes (id, user_id, album_id) VALUES ($1, $2, $3) RETURNING id",
      values: [id, userId, albumId],
    };
    try {
      const result = await this._pool.query(query);
      // Del cache
      await this._cacheService.delete(`likes:${albumId}`);
      return result.rows[0].id;
    } catch (error) {
      if (error.code === "23505") {
        throw new InvariantError("Anda sudah menyukai album ini");
      }
      throw error;
    }
  }

  async unlikeAlbum(albumId, userId) {
    const query = {
      text: "DELETE FROM user_album_likes WHERE album_id = $1 AND user_id = $2 RETURNING id",
      values: [albumId, userId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new InvariantError(
        "Gagal batal menyukai album. Like tidak ditemukan."
      );
    }
    // Del cache
    await this._cacheService.delete(`likes:${albumId}`);
  }

  async getAlbumLikes(albumId) {
    try {
      // Try get from cache dulu
      const result = await this._cacheService.get(`likes:${albumId}`);
      return { count: JSON.parse(result), fromCache: true };
    } catch (error) {
      // If fail, get from database
      const query = {
        text: "SELECT COUNT(*) FROM user_album_likes WHERE album_id = $1",
        values: [albumId],
      };
      const result = await this._pool.query(query);
      const likesCount = parseInt(result.rows[0].count, 10);

      // Simpan cache
      await this._cacheService.set(
        `likes:${albumId}`,
        JSON.stringify(likesCount)
      );

      return { count: likesCount, fromCache: false };
    }
  }
}

module.exports = AlbumsService;
