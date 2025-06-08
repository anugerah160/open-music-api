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
      text: "INSERT INTO albums(id, name, year) VALUES($1, $2, $3) RETURNING id",
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
      text: "SELECT id, name, year, cover_url FROM albums WHERE id = $1",
      values: [id],
    };
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }

    const album = result.rows[0];
    const songsQuery = {
      text: "SELECT id, title, performer FROM songs WHERE album_id = $1",
      values: [id],
    };
    const songsResult = await this._pool.query(songsQuery);

    return {
      id: album.id,
      name: album.name,
      year: album.year,
      coverUrl: album.cover_url,
      songs: songsResult.rows,
    };
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
      text: "UPDATE albums SET cover_url = $1 WHERE id = $2",
      values: [coverUrl, id],
    };
    await this._pool.query(query);
  }

  async addAlbumLike(albumId, userId) {
    const albumCheckQuery = {
      text: "SELECT id FROM albums WHERE id = $1",
      values: [albumId],
    };
    const albumCheckResult = await this._pool.query(albumCheckQuery);
    if (!albumCheckResult.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }

    const likeCheckQuery = {
      text: "SELECT id FROM user_album_likes WHERE user_id = $1 AND album_id = $2",
      values: [userId, albumId],
    };
    const likeCheckResult = await this._pool.query(likeCheckQuery);
    if (likeCheckResult.rows.length > 0) {
      throw new InvariantError("Anda sudah menyukai album ini");
    }

    const id = `like-${nanoid(16)}`;
    const query = {
      text: "INSERT INTO user_album_likes (id, user_id, album_id) VALUES ($1, $2, $3)",
      values: [id, userId, albumId],
    };
    await this._pool.query(query);

    await this._cacheService.delete(`album-likes:${albumId}`);
  }

  async deleteAlbumLike(albumId, userId) {
    const query = {
      text: "DELETE FROM user_album_likes WHERE album_id = $1 AND user_id = $2 RETURNING id",
      values: [albumId, userId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Gagal batal menyukai. Like tidak ditemukan.");
    }
    await this._cacheService.delete(`album-likes:${albumId}`);
  }

  async getAlbumLikesCount(albumId) {
    try {
      const likes = await this._cacheService.get(`album-likes:${albumId}`);
      return { count: JSON.parse(likes), source: "cache" };
    } catch (error) {
      // jika gagal dari cache, ambil dari DB
      const albumCheckQuery = {
        text: "SELECT id FROM albums WHERE id = $1",
        values: [albumId],
      };
      const albumCheckResult = await this._pool.query(albumCheckQuery);
      if (!albumCheckResult.rows.length) {
        throw new NotFoundError("Album tidak ditemukan");
      }

      const query = {
        text: 'SELECT COUNT(id) as "likesCount" FROM user_album_likes WHERE album_id = $1',
        values: [albumId],
      };
      const result = await this._pool.query(query);
      const likesCount = parseInt(result.rows[0].likesCount, 10);

      await this._cacheService.set(`album-likes:${albumId}`, likesCount);
      return { count: likesCount, source: "db" };
    }
  }
}

module.exports = AlbumsService;
