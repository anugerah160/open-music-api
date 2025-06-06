const AlbumsHandler = require("./handler");
const routes = require("./routes");
const validator = require("../../validator/albums");

module.exports = {
  name: "albums",
  version: "1.0.0",
  register: async (server, { service }) => {
    const albumsHandler = new AlbumsHandler(service, validator);
    server.route(routes(albumsHandler));
  },
};
