const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require("discord.js");
const { getData } = require("../Client/dbManager");

module.exports = {
  name: "inviteDelete",
  on: true,
  /**
   * @param {import("discord.js").Invite} invite
   * @param {import("discord.js").Client} client
   */
  async execute(invite, client) {
    console.log(`[LOG ACTIVIDAD INVITACION] 🗑️ Invitación eliminada: ${invite.code} (creada por ${invite.inviter?.tag || "Desconocido"})`);

    const config = getData("logs", invite.guild.id);
    console.log(`[LOG ACTIVIDAD INVITACION] Config de logs: ${config ? "✅ Configurado" : "❌ No configurado"}`);
    if (!config || !config.logChannelId) return;

    const logChannel = invite.guild.channels.cache.get(config.logChannelId);
    if (!logChannel) {
      console.log(`[LOG ACTIVIDAD INVITACION] ❌ Canal de logs no encontrado con ID: ${config.logChannelId}`);
      return;
    }
    console.log(`[LOG ACTIVIDAD INVITACION] ✅ Canal encontrado: ${logChannel.name}#${logChannel.id}`);

    const inviter = invite.inviter;
    const channel = invite.channel;
    const uses = invite.uses || 0;

    let detalles =
      `Se ha eliminado una invitación del servidor.\n\n` +
      `**📄 Detalles de la Invitación:**\n` +
      `> 🔗 **Código:** \`${invite.code}\`\n` +
      `> 👤 **Creada por:** ${inviter ? `<@${inviter.id}> (${inviter.tag})` : "Desconocido"}\n` +
      `> 💬 **Canal:** <#${channel.id}>\n` +
      `> 📊 **Usos registrados:** ${uses}\n`;

    const container = new ContainerBuilder()
      .setAccentColor(0xe74c3c)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## 🔗 Invitación Eliminada"),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(detalles.trim()),
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
      .then(() => console.log(`[LOG ACTIVIDAD INVITACION] ✅ Invitación eliminada registrada en ${logChannel.name}`))
      .catch((err) => console.log(`[LOG ACTIVIDAD INVITACION] ❌ Error al enviar log: ${err.message}`));
  },
};
