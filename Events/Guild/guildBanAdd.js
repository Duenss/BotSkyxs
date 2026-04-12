const { AuditLogEvent, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require("discord.js");
const { getData } = require("../Client/dbManager");
const { handleSecurityAction } = require("../Client/securityManager");

module.exports = {
  name: "guildBanAdd",
  on: true,
  /**
   * @param {import("discord.js").GuildBan} ban
   * @param {import("discord.js").Client} client
   */
  async execute(ban, client) {
    console.log(`[LOG] guildBanAdd ejecutado - Usuario: ${ban.user.tag}`);
    const config = getData("logs", ban.guild.id);
    console.log(`[LOG] Config de logs: ${config ? "✅ Configurado" : "❌ No configurado"}`);
    if (!config || !config.logChannelId) return;

    const logChannel = ban.guild.channels.cache.get(config.logChannelId);
    if (!logChannel) {
      console.log(`[LOG] ❌ Canal no encontrado con ID: ${config.logChannelId}`);
      return;
    }
    console.log(`[LOG] ✅ Canal encontrado: ${logChannel.name}#${logChannel.id}`);

    const fetchLogs = await ban.guild
      .fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd })
      .catch(() => null);

    const logEntry = fetchLogs ? fetchLogs.entries.first() : null;
    const executor = logEntry ? `<@${logEntry.executor.id}>` : "Desconocido";
    const executorName = logEntry ? logEntry.executor.tag : "Desconocido";

    console.log(`[LOG] 🚫 Usuario baneado: ${ban.user.tag} por ${executorName}`);

    if (logEntry?.executor) {
      await handleSecurityAction(
        ban.guild,
        logEntry.executor,
        "memberBan",
        `<@${ban.user.id}> (${ban.user.tag})`,
      );
    }

    const container = new ContainerBuilder()
      .setAccentColor(0xe74c3c)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## 🚫 Usuario Baneado"),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Se ha aplicado un baneo en el servidor.

` +
            `**👤 Usuario baneado:** <@${ban.user.id}> (${ban.user.tag})
` +
            `**🆔 ID:** \`${ban.user.id}\`

` +
            `**🧑‍⚖️ Baneado por:** ${executor}
` +
            `**📌 Razón:** ${ban.reason || "No especificada"}`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `⏱️ **Fecha:** <t:${Math.floor(Date.now() / 1000)}:F> (<t:${Math.floor(Date.now() / 1000)}:R>)`,
        ),
      );

    await logChannel
      .send({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      })
      .then(() => console.log(`[LOG] ✅ Mensaje de log enviado a ${logChannel.name}`))
      .catch((err) => console.log(`[LOG] ❌ Error al enviar log: ${err.message}`));
  },
};
