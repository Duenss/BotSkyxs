const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require("discord.js");
const { getData } = require("../Client/dbManager");

module.exports = {
  name: "messageReactionAdd",
  on: true,
  /**
   * @param {import("discord.js").MessageReaction} reaction
   * @param {import("discord.js").User} user
   * @param {import("discord.js").Client} client
   */
  async execute(reaction, user, client) {
    console.log(`[LOG ACTIVIDAD REACCION] Reacción añadida por ${user.tag}`);

    // Ignorar bots
    if (user.bot) {
      console.log(`[LOG ACTIVIDAD REACCION] ⊘ Ignorado (Bot)`);
      return;
    }

    if (!reaction.message.guild) {
      console.log(`[LOG ACTIVIDAD REACCION] ⊘ Ignorado (No es en un servidor)`);
      return;
    }

    const config = getData("logs", reaction.message.guild.id);
    console.log(`[LOG ACTIVIDAD REACCION] Config de logs: ${config ? "✅ Configurado" : "❌ No configurado"}`);
    if (!config || !config.logChannelId) return;

    const logChannel = reaction.message.guild.channels.cache.get(config.logChannelId);
    if (!logChannel) {
      console.log(`[LOG ACTIVIDAD REACCION] ❌ Canal de logs no encontrado con ID: ${config.logChannelId}`);
      return;
    }
    console.log(`[LOG ACTIVIDAD REACCION] ✅ Canal encontrado: ${logChannel.name}#${logChannel.id}`);

    const emoji = reaction.emoji.name || reaction.emoji.id || "?";

    const detalles =
      `Se ha añadido una reacción a un mensaje.\n\n` +
      `**📄 Detalles:**\n` +
      `> 👤 **Usuario:** <@${user.id}> (${user.tag})\n` +
      `> 😀 **Reacción:** ${reaction.emoji}\n` +
      `> 💬 **Canal:** <#${reaction.message.channel.id}>\n` +
      `> 🔗 **Mensaje:** [Ir al mensaje](${reaction.message.url})\n`;

    const container = new ContainerBuilder()
      .setAccentColor(0xf39c12)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## 😀 Reacción Añadida"),
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
      .then(() => console.log(`[LOG ACTIVIDAD REACCION] ✅ Reacción registrada en ${logChannel.name}`))
      .catch((err) => console.log(`[LOG ACTIVIDAD REACCION] ❌ Error al enviar log: ${err.message}`));
  },
};
