const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Banea a un usuario del servidor.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Usuario a banear").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Razón del baneo").setRequired(false),
    )
    .setContexts(0)
    .setIntegrationTypes(0),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      const container = new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "⚠️ No tienes permiso para banear usuarios.",
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No especificada";
    const member = interaction.guild.members.cache.get(user.id);

    if (!member || !member.bannable) {
      const container = new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "❌ No puedo banear a este usuario.",
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    await member.ban({ reason }).catch(() => null);

    const container = new ContainerBuilder()
      .setAccentColor(0x2ecc71)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `✅ Usuario ${user.tag} baneado. Razón: ${reason}`,
        ),
      );

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions: { repliedUser: false },
    });
  },
};
