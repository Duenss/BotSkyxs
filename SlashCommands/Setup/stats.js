const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Muestra estadísticas del servidor")
    .setContexts(0)
    .setIntegrationTypes(0),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;

    try {
      const fetching = new ContainerBuilder()
        .setAccentColor(0x3498db)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("⏳ Cargando estadísticas..."),
        );

      await interaction.editReply({
        components: [fetching],
        allowedMentions: { repliedUser: false },
      });

      const members = await guild.members.fetch();
      const users = members.filter((m) => !m.user.bot);
      const bots = members.filter((m) => m.user.bot);
      const roles = guild.roles.cache;
      const channels = guild.channels.cache;
      const textChannels = channels.filter((c) => c.isTextBased()).size;
      const voiceChannels = channels.filter(
        (c) => c.isVoiceBased && c.isVoiceBased(),
      ).size;

      const owner = await guild.fetchOwner();

      const serverCreated = Math.floor(guild.createdTimestamp / 1000);
      const verificationLevel = guild.verificationLevel;
      const contentFilter = guild.explicitContentFilter;
      const boostLevel = guild.premiumTier;
      const boostCount = guild.premiumSubscriptionCount || 0;

      const container = new ContainerBuilder()
        .setAccentColor(0x7289da)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## 📊 Estadísticas de ${guild.name}`,
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**👥 Miembros:**\n` +
            `> 👤 **Usuarios:** \`${users.size}\`\n` +
            `> 🤖 **Bots:** \`${bots.size}\`\n` +
            `> 📋 **Total:** \`${members.size}\`\n\n` +
            `**📑 Estructura:**\n` +
            `> 🏷️ **Roles:** \`${roles.size}\`\n` +
            `> 💬 **Canales de texto:** \`${textChannels}\`\n` +
            `> 🔊 **Canales de voz:** \`${voiceChannels}\`\n` +
            `> 📺 **Total de canales:** \`${channels.size}\``,
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**⚙️ Configuración del servidor:**\n` +
            `> 👑 **Propietario:** ${owner.user.tag}\n` +
            `> 🆔 **ID del servidor:** \`${guild.id}\`\n` +
            `> 📅 **Creado:** <t:${serverCreated}:F> (<t:${serverCreated}:R>)\n` +
            `> 🔒 **Nivel de verificación:** \`${verificationLevel}\`\n` +
            `> 🚨 **Filtro de contenido:** \`${contentFilter}\``,
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**⭐ Nitro del servidor:**\n` +
            `> 📈 **Nivel de impulso:** \`${boostLevel}/3\`\n` +
            `> 🎁 **Impulsos:** \`${boostCount}\``,
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `⏱️ **Consultado:** <t:${Math.floor(Date.now() / 1000)}:F>`,
          ),
        );

      return interaction.editReply({
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    } catch (error) {
      console.error("❌ Error al obtener estadísticas:", error);

      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xe74c3c)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "❌ Ocurrió un error al obtener las estadísticas del servidor.",
          ),
        );

      return interaction.editReply({
        components: [errorContainer],
        allowedMentions: { repliedUser: false },
      });
    }
  },
};
