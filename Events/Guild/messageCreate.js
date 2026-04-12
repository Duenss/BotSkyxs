const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require("discord.js");
const { getData } = require("../Client/dbManager");

module.exports = {
  name: "messageCreate",
  on: true,
  /**
   * @param {import("discord.js").Message} message
   * @param {import("discord.js").Client} client
   */
  async execute(message, client) {
    console.log(`[LOG ACTIVIDAD TEXTO] Mensaje enviado por ${message.author.tag} en #${message.channel.name} (${message.channel.id})`);
    
    // Ignorar bots y DMs
    if (message.author.bot || !message.guild) {
      console.log(`[LOG ACTIVIDAD] ⊘ Ignorado (Bot o DM)`);
      return;
    }

    const config = getData("logs", message.guild.id);
    console.log(`[LOG ACTIVIDAD TEXTO] Config de logs: ${config ? "✅ Configurado" : "❌ No configurado"}`);
    if (!config || !config.logChannelId) return;

    const logChannel = message.guild.channels.cache.get(config.logChannelId);
    if (!logChannel) {
      console.log(`[LOG ACTIVIDAD TEXTO] ❌ Canal de logs no encontrado con ID: ${config.logChannelId}`);
      return;
    }
    console.log(`[LOG ACTIVIDAD TEXTO] ✅ Canal de logs encontrado: ${logChannel.name}`);

    const hasText = message.content && message.content.trim().length > 0;
    const hasAttachments = message.attachments.size > 0;
    const hasEmbeds = message.embeds.length > 0;

    if (!hasText && !hasAttachments && !hasEmbeds) {
      console.log(`[LOG ACTIVIDAD TEXTO] ⊘ Mensaje vacío, ignorado`);
      return;
    }

    const contentPreview = message.content?.substring(0, 50) || "[sin contenido]";
    console.log(`[LOG ACTIVIDAD TEXTO] 📝 Contenido: "${contentPreview}${message.content?.length > 50 ? "..." : ""}"`);

    let detallesMensaje =
      `Se ha enviado un mensaje en el servidor.\n\n` +
      `**📄 Detalles del Mensaje:**\n` +
      `> 👤 **Autor:** <@${message.author.id}> (${message.author.tag})\n` +
      `> 💬 **Canal:** <#${message.channel.id}>\n` +
      `> 🔗 **Enlace:** [Ir al mensaje](${message.url})\n`;

    if (hasText) {
      const contenido = message.content.length > 1024 
        ? message.content.substring(0, 1021) + "..." 
        : message.content;
      detallesMensaje += `\n**📝 Contenido:**\n> ${contenido}\n`;
    }

    if (hasAttachments) {
      const attachmentsText = message.attachments
        .map((a) => `[${a.name || 'Archivo'}](${a.url})`)
        .join("\n> 📎 ");

      detallesMensaje += `\n**📎 Archivos / Enlaces:**\n> 📎 ${attachmentsText}\n`;
    }

    if (hasEmbeds) {
      detallesMensaje += `\n**🎨 Embeds:** ${hasEmbeds ? "Sí ✅" : "No ❌"}\n`;
    }

    const container = new ContainerBuilder()
      .setAccentColor(0x3498db)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## 💬 Mensaje Enviado"),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(detallesMensaje.trim()),
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
      .then(() => console.log(`[LOG ACTIVIDAD TEXTO] ✅ Mensaje de log enviado a ${logChannel.name}`))
      .catch((err) => console.log(`[LOG ACTIVIDAD TEXTO] ❌ Error al enviar log: ${err.message}`));
  },
};
