const InvariantError = require("../../exceptions/InvariantError");

class PlaylistsHandler {
  // TAMBAHKAN songsService DI CONSTRUCTOR
  constructor(playlistsService, songsService, validator) {
    this._service = playlistsService;
    this._songsService = songsService; // Simpan songsService
    this._validator = validator;

    this.postPlaylistHandler = this.postPlaylistHandler.bind(this);
    this.getPlaylistsHandler = this.getPlaylistsHandler.bind(this);
    this.deletePlaylistByIdHandler = this.deletePlaylistByIdHandler.bind(this);
    this.postSongToPlaylistHandler = this.postSongToPlaylistHandler.bind(this);
    this.getSongsFromPlaylistHandler =
      this.getSongsFromPlaylistHandler.bind(this);
    this.deleteSongFromPlaylistHandler =
      this.deleteSongFromPlaylistHandler.bind(this);
    this.getPlaylistActivitiesHandler =
      this.getPlaylistActivitiesHandler.bind(this);
  }

  async postPlaylistHandler(request, h) {
    const { error } = this._validator.PlaylistPayloadSchema.validate(
      request.payload
    );
    if (error) {
      throw new InvariantError(error.message);
    }
    const { name } = request.payload;
    const { id: credentialId } = request.auth.credentials;
    const playlistId = await this._service.addPlaylist({
      name,
      owner: credentialId,
    });

    const response = h.response({
      status: "success",
      message: "Playlist berhasil ditambahkan",
      data: { playlistId },
    });
    response.code(201);
    return response;
  }

  async getPlaylistsHandler(request) {
    const { id: credentialId } = request.auth.credentials;
    const playlists = await this._service.getPlaylists(credentialId);
    return {
      status: "success",
      data: { playlists },
    };
  }

  async deletePlaylistByIdHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyPlaylistOwner(id, credentialId);
    await this._service.deletePlaylistById(id);

    return {
      status: "success",
      message: "Playlist berhasil dihapus",
    };
  }

  async postSongToPlaylistHandler(request, h) {
    const { error } = this._validator.PostSongToPlaylistPayloadSchema.validate(
      request.payload
    );
    if (error) {
      throw new InvariantError(error.message);
    }
    const { id: playlistId } = request.params;
    const { songId } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    // VERIFIKASI LAGU ADA DI SINI (DI HANDLER)
    await this._songsService.getSongById(songId);

    await this._service.verifyPlaylistAccess(playlistId, credentialId);
    await this._service.addSongToPlaylist(playlistId, songId);
    await this._service.addPlaylistActivity(
      playlistId,
      songId,
      credentialId,
      "add"
    );

    const response = h.response({
      status: "success",
      message: "Lagu berhasil ditambahkan ke playlist",
    });
    response.code(201);
    return response;
  }

  async getSongsFromPlaylistHandler(request) {
    const { id: playlistId } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyPlaylistAccess(playlistId, credentialId);

    const playlist = await this._service.getPlaylistDetails(playlistId);
    const songs = await this._service.getSongsFromPlaylist(playlistId);

    playlist.songs = songs;

    return {
      status: "success",
      data: { playlist },
    };
  }

  async deleteSongFromPlaylistHandler(request) {
    const { id: playlistId } = request.params;
    const { songId } = request.payload; // songId ada di payload sesuai spesifikasi
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyPlaylistAccess(playlistId, credentialId);
    await this._service.deleteSongFromPlaylist(playlistId, songId);
    // Fitur opsional: catat aktivitas
    await this._service.addPlaylistActivity(
      playlistId,
      songId,
      credentialId,
      "delete"
    );

    return {
      status: "success",
      message: "Lagu berhasil dihapus dari playlist",
    };
  }

  async getPlaylistActivitiesHandler(request) {
    const { id: playlistId } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyPlaylistAccess(playlistId, credentialId);
    const activities = await this._service.getPlaylistActivities(playlistId);

    return {
      status: "success",
      data: {
        playlistId,
        activities,
      },
    };
  }
}

module.exports = PlaylistsHandler;
