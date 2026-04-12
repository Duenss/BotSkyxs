const { AuditLogEvent, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const { getData } = require("../Client/dbManager");
const { handleSecurityAction } = require("../Client/securityManager");

module.exports = {
  name: "guildMemberRemove",
  on: true,
  /**
   * @param {import("discord.js").GuildMember} member
   * @param {import("discord.js").Client} client
   */
  async execute(member, client) {
    console.log(`[LOG] guildMemberRemove ejecutado - Usuario: ${member.user.tag}`);
    const config = getData("logs", member.guild.id);
    console.log(`[LOG] Config de logs: ${config ? "✅ Configurado" : "❌ No configurado"}`);
    if (!config || !config.logChannelId) return;

    const logChannel = member.guild.channels.cache.get(config.logChannelId);
    if (!logChannel) {
      console.log(`[LOG] ❌ Canal no encontrado con ID: ${config.logChannelId}`);
      return;
    }
    console.log(`[LOG] ✅ Canal encontrado: ${logChannel.name}#${logChannel.id}`);

    const fetchLogs = await member.guild
      .fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick })
      .catch(() => null);

    const logEntry = fetchLogs ? fetchLogs.entries.first() : null;
    const isKicked =
      logEntry && logEntry.target.id === member.id &&
      Date.now() - logEntry.createdTimestamp < 5000;

    if (isKicked && logEntry?.executor) {
      await handleSecurityAction(
        member.guild,
        logEntry.executor,
        "memberKick",
        `${member.user.tag} (${member.id})`,
      );
    }

    const container = new ContainerBuilder()
      .setAccentColor(isKicked ? 0xe74c3c : 0xe67e22)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          isKicked ? "## ❌ Miembro Expulsado" : "## ❌ Miembro Abandonó el Servidor",
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Se ha detectado la salida de un miembro del servidor.

` +
            `**👤 Usuario:** <@${member.id}> (${member.user.tag})
` +
            `**🆔 ID:** \`${member.id}\`

` +
            `**🕵️ Acción:** ${isKicked ? `Expulsado por <@${logEntry.executor.id}>` : "Se fue por su cuenta"}`,
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

    // Send leave embed if not kicked
    if (!isKicked) {
      const leaveConfig = getData("leave", member.guild.id);
      if (leaveConfig && leaveConfig.enabled && leaveConfig.channelId) {
        const leaveChannel = member.guild.channels.cache.get(leaveConfig.channelId);
        if (leaveChannel) {
          const embed = new EmbedBuilder()
            .setTitle(
              leaveConfig.title
                .replace("{user}", member.user.username)
                .replace("{guild}", member.guild.name)
            )
            .setDescription(
              leaveConfig.description
                .replace("{user}", `<@${member.id}>`)
                .replace("{guild}", member.guild.name)
            )
            .setColor(parseInt(leaveConfig.color.replace('#', ''), 16) || 0xff0000)
            .setTimestamp();

          if (leaveConfig.footer) {
            embed.setFooter({ text: leaveConfig.footer });
          }

          await leaveChannel
            .send({
              embeds: [embed],
              allowedMentions: { repliedUser: false },
            })
            .catch(() => null);
        }
      }
    }
  },
};
