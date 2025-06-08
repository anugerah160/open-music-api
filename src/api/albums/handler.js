const InvariantError = require("../../exceptions/InvariantError");

class AlbumsHandler {
  constructor(service, storageService, validator) {
    this._service = service;
    this._storageService = storageService;
    this._validator = validator;

    this.postAlbumHandler = this.postAlbumHandler.bind(this);
    this.getAlbumByIdHandler = this.getAlbumByIdHandler.bind(this);
    this.putAlbumByIdHandler = this.putAlbumByIdHandler.bind(this);
    this.deleteAlbumByIdHandler = this.deleteAlbumByIdHandler.bind(this);
    this.postAlbumCoverHandler = this.postAlbumCoverHandler.bind(this);
    this.postAlbumLikeHandler = this.postAlbumLikeHandler.bind(this);
    this.getAlbumLikesHandler = this.getAlbumLikesHandler.bind(this);
    this.deleteAlbumLikeHandler = this.deleteAlbumLikeHandler.bind(this);
  }

  async postAlbumHandler(request, h) {
    const { error } = this._validator.AlbumPayloadSchema.validate(
      request.payload
    );
    if (error) throw new InvariantError(error.message);
    const albumId = await this._service.addAlbum(request.payload);
    const response = h.response({ status: "success", data: { albumId } });
    response.code(201);
    return response;
  }

  async getAlbumByIdHandler(request) {
    const { id } = request.params;
    const album = await this._service.getAlbumById(id);
    return { status: "success", data: { album } };
  }

  async putAlbumByIdHandler(request) {
    const { error } = this._validator.AlbumPayloadSchema.validate(
      request.payload
    );
    if (error) throw new InvariantError(error.message);
    const { id } = request.params;
    await this._service.editAlbumById(id, request.payload);
    return { status: "success", message: "Album berhasil diperbarui" };
  }

  async deleteAlbumByIdHandler(request) {
    const { id } = request.params;
    await this._service.deleteAlbumById(id);
    return { status: "success", message: "Album berhasil dihapus" };
  }

  async postAlbumCoverHandler(request, h) {
    const { cover } = request.payload;
    const { id } = request.params;

    const { error } = this._validator.ImageHeadersSchema.validate(
      cover.hapi.headers
    );
    if (error) {
      throw new InvariantError(error.message);
    }

    const filename = await this._storageService.writeFile(cover, cover.hapi);
    const fileUrl = `http://${process.env.HOST}:${process.env.PORT}/uploads/images/${filename}`;

    await this._service.addAlbumCover(id, fileUrl);

    const response = h.response({
      status: "success",
      message: "Sampul berhasil diunggah",
    });
    response.code(201);
    return response;
  }

  async postAlbumLikeHandler(request, h) {
    const { id: albumId } = request.params;
    const { id: userId } = request.auth.credentials;

    await this._service.addAlbumLike(albumId, userId);

    const response = h.response({
      status: "success",
      message: "Album berhasil disukai",
    });
    response.code(201);
    return response;
  }

  async deleteAlbumLikeHandler(request) {
    const { id: albumId } = request.params;
    const { id: userId } = request.auth.credentials;

    await this._service.deleteAlbumLike(albumId, userId);
    return { status: "success", message: "Batal menyukai album" };
  }

  async getAlbumLikesHandler(request, h) {
    const { id: albumId } = request.params;
    const { count, source } = await this._service.getAlbumLikesCount(albumId);

    const response = h.response({
      status: "success",
      data: { likes: count },
    });
    if (source === "cache") {
      response.header("X-Data-Source", "cache");
    }
    return response;
  }
}

module.exports = AlbumsHandler;
