const { AuditLogEvent, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require("discord.js");
const { getData } = require("../Client/dbManager");

module.exports = {
  name: "guildBanRemove",
  on: true,
  /**
   * @param {import("discord.js").GuildBan} ban
   * @param {import("discord.js").Client} client
   */
  async execute(ban, client) {
    const config = getData("logs", ban.guild.id);
    if (!config || !config.logChannelId) return;

    const logChannel = ban.guild.channels.cache.get(config.logChannelId);
    if (!logChannel) return;

    const fetchLogs = await ban.guild
      .fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanRemove })
      .catch(() => null);

    const logEntry = fetchLogs ? fetchLogs.entries.first() : null;
    const executor = logEntry ? `<@${logEntry.executor.id}>` : "Desconocido";

    const container = new ContainerBuilder()
      .setAccentColor(0xf1c40f)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## ⚠️ Baneo Removido"),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Se ha removido un baneo en el servidor.

` +
            `**👤 Usuario:** <@${ban.user.id}> (${ban.user.tag})
` +
            `**🆔 ID:** \`${ban.user.id}\`

` +
            `**🧑‍⚖️ Acción realizada por:** ${executor}`,
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
      .catch(() => null);
  },
};
