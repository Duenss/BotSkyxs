const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-bot-image")
    .setDescription("Cambia el avatar o banner del bot con URL o archivo adjunto.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("avatar")
        .setDescription("Establece el avatar del bot.")
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("URL de la imagen/gif/mov para el avatar.")
            .setRequired(false),
        )
        .addAttachmentOption((option) =>
          option
            .setName("file")
            .setDescription("Archivo para usar como avatar.")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("banner")
        .setDescription("Establece el banner del bot.")
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("URL de la imagen/gif/mov para el banner.")
            .setRequired(false),
        )
        .addAttachmentOption((option) =>
          option
            .setName("file")
            .setDescription("Archivo para usar como banner.")
            .setRequired(false),
        ),
    )
    .setContexts(0)
    .setIntegrationTypes(0),

  async execute(interaction, client) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator,
      )
    ) {
      const container = new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "⚠️ Solo los administradores pueden usar este comando.",
          ),
        );

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const url = interaction.options.getString("url");
    const attachment = interaction.options.getAttachment("file");

    if (!url && !attachment) {
      const container = new ContainerBuilder()
        .setAccentColor(0xffa500)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "⚠️ Debes proporcionar una URL o un archivo adjunto.",
          ),
        );

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
      return;
    }

    const sourceUrl = attachment?.url ?? url;

    try {
      let imageBuffer;

      if (attachment) {
        const response = await fetch(sourceUrl);
        if (!response.ok) {
          throw new Error(`Error al descargar el archivo: ${response.status}`);
        }
        imageBuffer = await response.arrayBuffer();
      } else {
        const response = await fetch(sourceUrl);
        if (!response.ok) {
          throw new Error(`Error al descargar la URL: ${response.status}`);
        }
        imageBuffer = await response.arrayBuffer();
      }

      const imageData = Buffer.from(imageBuffer);
      const action = subcommand === "avatar" ? "setAvatar" : "setBanner";
      await client.user[action](imageData);

      const container = new ContainerBuilder()
        .setAccentColor(0x00ff00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `✅ ${
              subcommand === "avatar"
                ? "Avatar"
                : "Banner"
            } del bot actualizado correctamente.`,
          ),
        );

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    } catch (error) {
      console.error("❌ Error al actualizar imagen del bot:", error);
      const container = new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "❌ No se pudo actualizar la imagen del bot. Revisa la URL o el archivo y vuelve a intentarlo.",
          ),
        );

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }
  },
};
