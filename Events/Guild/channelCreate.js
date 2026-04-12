const {
  AuditLogEvent,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require("discord.js");
const { getData } = require("../Client/dbManager");
const { handleSecurityAction } = require("../Client/securityManager");

module.exports = {
  name: "channelCreate",
  on: true,
  /**
   *
   * @param {import("discord.js").Channel} channel
   * @param {import("discord.js").Client} client
   */
  async execute(channel, client) {
    console.log(`[LOG] channelCreate ejecutado - Canal: ${channel.name}`);
    if (!channel.guild) return;

    const config = getData("logs", channel.guild.id);
    console.log(`[LOG] Config de logs: ${config ? "✅ Configurado" : "❌ No configurado"}`);
    if (!config || !config.logChannelId) return;

    const logChannel = channel.guild.channels.cache.get(config.logChannelId);

    if (!logChannel) {
      console.log(`[LOG] ❌ Canal no encontrado con ID: ${config.logChannelId}`);
      return;
    }
    console.log(`[LOG] ✅ Canal encontrado: ${logChannel.name}#${logChannel.id}`);

    const fetchLogs = await channel.guild
      .fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate })
      .catch(() => null);

    const logEntry = fetchLogs ? fetchLogs.entries.first() : null;
    const executor = logEntry ? logEntry.executor : "Desconocido";

    if (logEntry?.executor) {
      await handleSecurityAction(
        channel.guild,
        logEntry.executor,
        "channelCreate",
        `${channel.name} (${channel.id})`,
      );
    }

    const container = new ContainerBuilder()
      .setAccentColor(0x2ecc71)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## ✅ Nuevo Canal Creado"),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Se ha detectado la creación de un nuevo canal en el servidor. Aquí tienes los detalles:\n\n` +
            `**📄 Información del Canal:**\n` +
            `> 🏷️ **Nombre:** ${channel.name}\n` +
            `> 📢 **Mención:** <#${channel.id}>\n` +
            `> 🆔 **ID:** \`${channel.id}\`\n\n` +
            `**🛠️ Detalles de la Acción:**\n\n` +
            `> 🧑‍💻 **Creado por:** ${executor}\n` +
            `> 📁 **Categoría:** ${channel.parentId ? `<#${channel.parentId}>` : "Ninguna (Raíz del servidor)"}`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `⏱️ **Fecha:** <t:${Math.floor(channel.createdTimestamp / 1000)}:F> (<t:${Math.floor(channel.createdTimestamp / 1000)}:R>)`,
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
