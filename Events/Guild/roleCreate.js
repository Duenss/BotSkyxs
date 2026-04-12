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
  name: "roleCreate",
  on: true,
  /**
   *
   * @param {import("discord.js").Role} role
   * @param {import("discord.js").Client} client
   */
  async execute(role, client) {
    console.log(`[LOG] roleCreate ejecutado - Rol: ${role.name}`);
    if (!role.guild) return;

    const config = getData("logs", role.guild.id);
    console.log(`[LOG] Config de logs: ${config ? "✅ Configurado" : "❌ No configurado"}`);
    if (!config || !config.logChannelId) return;

    const logChannel = role.guild.channels.cache.get(config.logChannelId);

    if (!logChannel) {
      console.log(`[LOG] ❌ Canal no encontrado con ID: ${config.logChannelId}`);
      return;
    }
    console.log(`[LOG] ✅ Canal encontrado: ${logChannel.name}#${logChannel.id}`);

    const logEntry = fetchLogs ? fetchLogs.entries.first() : null;
    const executor = logEntry ? logEntry.executor : "Desconocido";
    const executorName = logEntry ? logEntry.executor.tag : "Desconocido";

    console.log(`[LOG] ✅ Rol creado: ${role.name} por ${executorName}`);

    if (logEntry?.executor) {
      await handleSecurityAction(
        role.guild,
        logEntry.executor,
        "roleCreate",
        `${role.name} (${role.id})`,
      );
    }

    const container = new ContainerBuilder()
      .setAccentColor(role.color || 0x2ecc71)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## ✅ Nuevo Rol Creado"),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Se ha detectado la creación de un nuevo rol en el servidor. Aquí tienes los detalles:\n\n` +
            `**📄 Información General:**\n` +
            `> 🏷️ **Nombre:** ${role.name}\n` +
            `> 📢 **Mención:** <@&${role.id}>\n` +
            `> 🆔 **ID:** \`${role.id}\`\n\n` +
            `**🛠️ Ajustes y Propiedades:**\n\n` +
            `> 🧑‍💻 **Creado por:** ${executor}\n` +
            `> 🎨 **Color (Hex):** \`${role.hexColor}\`\n` +
            `> 📊 **Posición:** \`${role.position}\`\n` +
            `> 🗂️ **Separado (Hoist):** ${role.hoist ? "Sí ✅" : "No ❌"}\n` +
            `> 📣 **Mencionable:** ${role.mentionable ? "Sí ✅" : "No ❌"}`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `⏱️ **Fecha:** <t:${Math.floor(role.createdTimestamp / 1000)}:F> (<t:${Math.floor(role.createdTimestamp / 1000)}:R>)`,
        ),
      );

    await logChannel
      .send({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      })
      .then(() => console.log(`[LOG] ✅ Mensaje de log enviado a ${logChannel.name}`))
      .catch((err) => console.log(`[LOG] ❌ Error al enviar log: ${err.message}`));
  },
};
