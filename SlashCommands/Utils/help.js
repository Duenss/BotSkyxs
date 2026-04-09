const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Muestra una lista de comandos disponibles.")
    .setContexts(0)
    .setIntegrationTypes(0),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("📌 Ayuda - Comandos del bot")
      .setDescription(
        "Aquí tienes los comandos principales disponibles. Usa `/help` para ver este mensaje nuevamente.",
      )
      .setColor(0x5865f2)
      .addFields(
        { name: "🔧 Utilidad", value: "`/ping`, `/help`, `/create-embed`, `/set-bot-image`", inline: false },
        { name: "🛠️ Moderación", value: "`/ban`, `/kick`, `/clear`", inline: false },
        { name: "ℹ️ Información", value: "`/userinfo`, `/serverinfo`, `/stats`", inline: false },
        { name: "⚙️ Configuración", value: "`/set-logs`, `/setup-log`, `/anti-nuke`, `/recovery`, `/setup-ticket`", inline: false },
      )
      .setFooter({ text: "Bot completo sin música" })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
      allowedMentions: { repliedUser: false },
    });
  },
};
