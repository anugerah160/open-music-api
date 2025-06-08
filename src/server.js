require("dotenv").config();
const path = require("path");
const Hapi = require("@hapi/hapi");
const Jwt = require("@hapi/jwt");
const Inert = require("@hapi/inert"); // Pastikan Inert diimpor

const ClientError = require("./exceptions/ClientError");

// Albums
const albums = require("./api/albums");
const AlbumsService = require("./services/postgres/AlbumsService");
const albumsValidator = require("./validator/albums");
const StorageService = require("./services/storage/StorageService"); // Import StorageService

// ... (semua import lain dari V2)
const songs = require("./api/songs");
const SongsService = require("./services/postgres/SongsService");
const songsValidator = require("./validator/songs");
const users = require("./api/users");
const UsersService = require("./services/postgres/UsersService");
const usersValidator = require("./validator/users");
const authentications = require("./api/authentications");
const AuthenticationsService = require("./services/postgres/AuthenticationsService");
const TokenManager = require("./tokenize/TokenManager");
const authenticationsValidator = require("./validator/authentications");
const playlists = require("./api/playlists");
const PlaylistsService = require("./services/postgres/PlaylistsService");
const playlistsValidator = require("./validator/playlists");
const collaborations = require("./api/collaborations");
const CollaborationsService = require("./services/postgres/CollaborationsService");
const collaborationsValidator = require("./validator/collaborations");

// Exports
const _exports = require("./api/exports");
const ProducerService = require("./services/rabbitmq/ProducerService");
const exportsValidator = require("./validator/exports");

// Cache
const CacheService = require("./services/redis/CacheService");

const init = async () => {
  const cacheService = new CacheService();
  const storageService = new StorageService();
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();
  const collaborationsService = new CollaborationsService();
  const songsService = new SongsService();
  const albumsService = new AlbumsService(cacheService); // AlbumsService butuh cache
  const playlistsService = new PlaylistsService(collaborationsService);

  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: { cors: { origin: ["*"] } },
  });

  await server.register([{ plugin: Jwt }, { plugin: Inert }]);

  server.auth.strategy("openmusic_jwt", "jwt", {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: { aud: false, iss: false, sub: false, maxAgeSec: 1800 },
    validate: (artifacts) => ({
      isValid: true,
      credentials: { id: artifacts.decoded.payload.id },
    }),
  });

  // Rute untuk menyajikan gambar dari direktori uploads
  server.route({
    method: "GET",
    path: "/uploads/{param*}",
    handler: {
      directory: {
        path: path.resolve(__dirname, "storage/app/uploads"),
      },
    },
  });

  await server.register([
    {
      plugin: albums,
      options: {
        service: albumsService,
        storageService, // Pass storageService ke plugin albums
        validator: albumsValidator,
      },
    },
    // ... (registrasi plugin lain dari V2)
    {
      plugin: songs,
      options: { service: songsService, validator: songsValidator },
    },
    {
      plugin: users,
      options: { service: usersService, validator: usersValidator },
    },
    {
      plugin: authentications,
      options: {
        authenticationsService,
        usersService,
        tokenManager: TokenManager,
        validator: authenticationsValidator,
      },
    },
    {
      plugin: playlists,
      options: {
        playlistsService,
        songsService,
        validator: playlistsValidator,
      },
    },
    {
      plugin: collaborations,
      options: {
        collaborationsService,
        playlistsService,
        usersService,
        validator: collaborationsValidator,
      },
    },
    {
      plugin: _exports,
      options: {
        producerService: ProducerService,
        playlistsService,
        validator: exportsValidator,
      },
    },
  ]);

  server.ext("onPreResponse", (request, h) => {
    const { response } = request;
    if (response instanceof Error) {
      if (response instanceof ClientError) {
        const newResponse = h.response({
          status: "fail",
          message: response.message,
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }
      if (response.isBoom) {
        const newResponse = h.response({
          status: "fail",
          message: response.message,
        });
        newResponse.code(response.output.statusCode);
        return newResponse;
      }
      console.error(response);
      const newResponse = h.response({
        status: "error",
        message: "terjadi kegagalan pada server kami",
      });
      newResponse.code(500);
      return newResponse;
    }
    return h.continue;
  });

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

init();
