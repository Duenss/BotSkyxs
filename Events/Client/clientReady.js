const { ActivityType } = require("discord.js");
const { getData, setData } = require("../Client/dbManager");
require("colors");

const DEBUG_LOGS = process.env.DEBUG_LOGS === "true";

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    try {
      if (DEBUG_LOGS) console.log("[DEBUG] Iniciando clientReady...");
      console.info(`Bot encendido como: ${client.user.tag}`.green.bold);

      if (DEBUG_LOGS) console.log("[DEBUG] Cargando comandos slash...");
      await require("../../Handlers/slashHandler").loadSlash(client);
      if (DEBUG_LOGS) console.log("[DEBUG] Comandos slash cargados exitosamente.");

      // Cargar actividad guardada o usar la por defecto
      const savedActivity = getData("bot_config", "global") || {};
      const estado = {
        name: savedActivity.activityName || "🗣 DiscoBot v1.0 | /help",
        type: ActivityType[savedActivity.activityType] ?? ActivityType.Playing,
        status: savedActivity.status || "online",
      };

      client.user.setPresence({
        activities: [{ name: estado.name, type: estado.type }],
        status: estado.status,
      });
      if (DEBUG_LOGS) console.log(`[DEBUG] Actividad cargada: ${estado.name}`.green);
      console.info(`[INFO] Conectado a ${client.guilds.cache.size} servidor(es)`);

      // Recargar embeds programados al arrancar
      const schedules = getData("schedules", "global") || {};
      let count = 0;
      for (const [id, s] of Object.entries(schedules)) {
        if (!s.active) continue;
        const ms = s.intervalMs;
        if (!ms || ms < 60000) continue;
        const timer = setInterval(async () => {
          try {
            const ch = await client.channels.fetch(s.channelId).catch(() => null);
            if (!ch) return;
            const { EmbedBuilder } = require("discord.js");
            const eb = new EmbedBuilder();
            if (s.embed.title)       eb.setTitle(s.embed.title);
            if (s.embed.description) eb.setDescription(s.embed.description);
            if (s.embed.color)       eb.setColor(s.embed.color);
            if (s.embed.author)      eb.setAuthor({ name: s.embed.author });
            if (s.embed.footer)      eb.setFooter({ text: s.embed.footer });
            if (s.embed.thumbnail)   eb.setThumbnail(s.embed.thumbnail);
            if (s.embed.image)       eb.setImage(s.embed.image);
            await ch.send({ embeds: [eb] });
          } catch {}
        }, ms);
        client._schedules = client._schedules || {};
        client._schedules[id] = timer;
        count++;
      }
      if (count > 0) console.log(`[SCHEDULES] ${count} embed(s) programado(s) recargados`.cyan);

      // ── Cachear invitaciones de todos los servidores al arrancar ──
      // Necesario para detectar qué invitación usó cada nuevo miembro
      try {
        client._inviteCache = {};
        for (const [guildId, guild] of client.guilds.cache) {
          try {
            const invites = await guild.invites.fetch();
            client._inviteCache[guildId] = new Map(invites.map(inv => [inv.code, { uses: inv.uses }]));
          } catch {
            // El bot puede no tener permiso de ver invitaciones en algún servidor
          }
        }
        console.log(`[INVITES] Caché de invitaciones cargado para ${Object.keys(client._inviteCache).length} servidor(es)`.cyan);
      } catch (err) {
        console.error(`[INVITES] Error al cargar caché: ${err.message}`);
      }

    } catch (error) {
      console.error("[DEBUG ERROR] Error en clientReady:", error);
    }
  },
};
