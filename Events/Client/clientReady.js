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

      const estados = [
        {
          name: "🗣 DiscoBot v1.0 | /help",
          type: ActivityType.Playing,
          status: "online",
        },
      ];

      let i = 0;

      console.log("[DEBUG] Configurando intervalo de estados...");
      setInterval(async () => {
        try {
          const actual = estados[i];
          console.log(`[DEBUG] Cambiando estado a: ${actual.name}`);

          client.user.setPresence({
            activities: [
              {
                name: actual.name,
                type: actual.type,
                url: actual.url ?? null,
              },
            ],

            status: actual.status,
          });
          i = (i + 1) % estados.length;
        } catch (error) {
          console.error("[DEBUG ERROR] Error al cambiar estado:", error);
        }
      }, 5000);
      console.log("[DEBUG] Intervalo de estados configurado.");
    } catch (error) {
      console.error("[DEBUG ERROR] Error en clientReady:", error);
    }
  },
};
