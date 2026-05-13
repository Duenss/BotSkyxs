const { ActivityType } = require("discord.js");
require("colors");

module.exports = {
  name: "clientReady",
  once: true,
  /**
   *
   * @param {import("discord.js").Client} client
   */
  async execute(client) {
    try {
      console.log("[DEBUG] Iniciando clientReady...");
      console.info(`Bot encendido como: ${client.user.tag}`.green.bold);

      console.log("[DEBUG] Cargando comandos slash...");
      await require("../../Handlers/slashHandler").loadSlash(client);
      console.log("[DEBUG] Comandos slash cargados exitosamente.");

      const estado = {
        name: "🗣 DiscoBot v1.0 | /help",
        type: ActivityType.Playing,
        status: "online",
      };

      console.log("[DEBUG] Configurando estado estático...");
      client.user.setPresence({
        activities: [
          {
            name: estado.name,
            type: estado.type,
            url: estado.url ?? null,
          },
        ],
        status: estado.status,
      });
      console.log("[DEBUG] Estado estático configurado.");
    } catch (error) {
      console.error("[DEBUG ERROR] Error en clientReady:", error);
    }
  },
};
