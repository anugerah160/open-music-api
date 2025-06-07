require("dotenv").config();

const amqp = require("amqplib");
const PlaylistsService = require("./PlaylistsService");
const MailSender = require("./MailSender");

const init = async () => {
  try {
    const playlistsService = new PlaylistsService();
    const mailSender = new MailSender();

    const connection = await amqp.connect(process.env.RABBITMQ_SERVER);
    const channel = await connection.createChannel();

    const queue = "export:playlists";
    await channel.assertQueue(queue, {
      durable: true,
    });

    console.log(
      "[*] Menunggu pesan di antrian: %s. Untuk keluar tekan CTRL+C",
      queue
    );

    channel.consume(
      queue,
      async (message) => {
        try {
          const { playlistId, targetEmail } = JSON.parse(
            message.content.toString()
          );
          console.log(
            `[x] Menerima permintaan ekspor playlist ${playlistId} untuk ${targetEmail}`
          );

          const playlist = await playlistsService.getPlaylistDetails(
            playlistId
          );
          const songs = await playlistsService.getSongsFromPlaylist(playlistId);
          playlist.songs = songs;

          const result = { playlist };

          await mailSender.sendEmail(targetEmail, JSON.stringify(result));
          console.log(`[v] Email berhasil dikirim ke ${targetEmail}`);
        } catch (error) {
          console.error(`[!] Gagal memproses pesan: ${error.message}`);
        }
      },
      { noAck: true }
    );
  } catch (error) {
    console.error(`Gagal menjalankan consumer: ${error.message}`);
  }
};

init();
