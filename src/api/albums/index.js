const AlbumsHandler = require("./handler");
const routes = require("./routes");
const validator = require("../../validator/albums");

module.exports = {
  name: "albums",
  version: "3.0.0",
  register: async (server, { service, storageService }) => {
    const albumsHandler = new AlbumsHandler(service, storageService, validator);
    server.route(routes(albumsHandler));
  },
};
