const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require("discord.js");
const { getData } = require("../Client/dbManager");

module.exports = {
  name: "messageUpdate",
  on: true,
  /**
   *
   * @param {import("discord.js").Message} oldMessage
   * @param {import("discord.js").Message} newMessage
   * @param {import("discord.js").Client} client
   */
  async execute(oldMessage, newMessage, client) {
    console.log(`[LOG] ✏️ Mensaje editado por ${newMessage.author.tag} en #${newMessage.channel.name}`);
    if (!newMessage.guild) return;

    if (oldMessage.partial) await oldMessage.fetch().catch(() => null);
    if (newMessage.partial) await newMessage.fetch().catch(() => null);

    if (newMessage.author?.bot) return;

    if (oldMessage.content === newMessage.content) return;

    const config = getData("logs", newMessage.guild.id);
    console.log(`[LOG] Config de logs: ${config ? "✅ Configurado" : "❌ No configurado"}`);
    if (!config || !config.logChannelId) return;

    const logChannel = newMessage.guild.channels.cache.get(config.logChannelId);
    if (!logChannel) {
      console.log(`[LOG] ❌ Canal no encontrado con ID: ${config.logChannelId}`);
      return;
    }
    console.log(`[LOG] ✅ Canal encontrado: ${logChannel.name}#${logChannel.id}`);

    const oldContent =
      oldMessage.content || "*[Mensaje sin texto / Solo archivo]*";
    const newContent =
      newMessage.content || "*[Mensaje sin texto / Solo archivo]*";

    const container = new ContainerBuilder()
      .setAccentColor(0xf1c40f)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## ✏️ Mensaje Editado"),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Se ha detectado la edición de un mensaje en el servidor.\n\n` +
            `**📄 Detalles del Mensaje:**\n` +
            `> 👤 **Autor:** <@${newMessage.author?.id || "Desconocido"}>\n` +
            `> 💬 **Canal:** <#${newMessage.channel.id}>\n` +
            `> 🔗 **Enlace:** [Ir al mensaje original](${newMessage.url})\n\n` +
            `**🔴 Antes:**\n` +
            `> ${oldContent}\n\n` +
            `**🟢 Después:**\n` +
            `> ${newContent}`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `⏱️ **Fecha de edición:** <t:${Math.floor(Date.now() / 1000)}:F> (<t:${Math.floor(Date.now() / 1000)}:R>)`,
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
