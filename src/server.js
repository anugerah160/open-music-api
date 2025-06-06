require("dotenv").config();

const Hapi = require("@hapi/hapi");
const Jwt = require("@hapi/jwt");

// Exceptions
const ClientError = require("./exceptions/ClientError");

// Albums
const albums = require("./api/albums");
const AlbumsService = require("./services/postgres/AlbumsService");
const albumsValidator = require("./validator/albums");

// Songs
const songs = require("./api/songs");
const SongsService = require("./services/postgres/SongsService");
const songsValidator = require("./validator/songs");

// Users
const users = require("./api/users");
const UsersService = require("./services/postgres/UsersService");
const usersValidator = require("./validator/users");

// Authentications
const authentications = require("./api/authentications");
const AuthenticationsService = require("./services/postgres/AuthenticationsService");
const TokenManager = require("./tokenize/TokenManager");
const authenticationsValidator = require("./validator/authentications");

// Collaborations
const collaborations = require("./api/collaborations");
const CollaborationsService = require("./services/postgres/CollaborationsService");
const collaborationsValidator = require("./validator/collaborations");

// Playlists
const playlists = require("./api/playlists");
const PlaylistsService = require("./services/postgres/PlaylistsService");
const playlistsValidator = require("./validator/playlists");

const init = async () => {
  // Inisialisasi service dengan urutan yang benar
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();
  const collaborationsService = new CollaborationsService();
  const songsService = new SongsService();
  const albumsService = new AlbumsService();
  // PlaylistsService membutuhkan collaborationsService untuk verifikasi akses
  const playlistsService = new PlaylistsService(collaborationsService);

  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ["*"],
      },
    },
  });

  await server.register([{ plugin: Jwt }]);

  server.auth.strategy("openmusic_jwt", "jwt", {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: { aud: false, iss: false, sub: false, maxAgeSec: 1800 },
    validate: (artifacts) => ({
      isValid: true,
      credentials: { id: artifacts.decoded.payload.id },
    }),
  });

  await server.register([
    {
      plugin: albums,
      options: { service: albumsService, validator: albumsValidator },
    },
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
        usersService, // PASTIKAN usersService di-pass ke plugin kolaborasi
        validator: collaborationsValidator,
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
