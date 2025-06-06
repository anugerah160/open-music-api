const SongsHandler = require("./handler");
const routes = require("./routes");
const validator = require("../../validator/songs");

module.exports = {
  name: "songs",
  version: "1.0.0",
  register: async (server, { service }) => {
    const songsHandler = new SongsHandler(service, validator);
    server.route(routes(songsHandler));
  },
};
