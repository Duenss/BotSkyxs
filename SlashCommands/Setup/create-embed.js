const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  MessageFlags,
  ChannelType,
  ContainerBuilder,
  TextDisplayBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("create-embed")
    .setDescription("Crea y publica un embed bonito adjuntando un archivo JSON.")
    .addAttachmentOption((option) =>
      option
        .setName("json_file")
        .setDescription("Archivo JSON con la configuración del embed.")
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Canal donde publicar el embed.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false),
    )
    .setContexts(0)
    .setIntegrationTypes(0),

  async execute(interaction) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.ManageMessages,
      )
    ) {
      const container = new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "⚠️ Necesitas el permiso de administrar mensajes para usar este comando.",
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    const attachment = interaction.options.getAttachment("json_file");
    const channel =
      interaction.options.getChannel("channel") || interaction.channel;

    if (!attachment || !attachment.contentType?.includes("application/json")) {
      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        content: "⚠️ Debes adjuntar un archivo JSON válido.",
        allowedMentions: { repliedUser: false },
      });
    }

    try {
      const response = await fetch(attachment.url);
      const jsonData = await response.json();

      // Validate required fields
      if (!jsonData.title || !jsonData.description) {
        return interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          content: "⚠️ El JSON debe contener al menos: title, description.",
          allowedMentions: { repliedUser: false },
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(jsonData.title)
        .setDescription(jsonData.description)
        .setColor(/^#?[0-9A-Fa-f]{6}$/.test(jsonData.color) ? jsonData.color : "#5865F2")
        .setTimestamp()
        .setFooter({ text: jsonData.footer || "Diseñado por el bot" });

      if (jsonData.thumbnail) embed.setThumbnail(jsonData.thumbnail);
      if (jsonData.image) embed.setImage(jsonData.image);

      await channel.send({ embeds: [embed] }).catch(() => null);

      const container = new ContainerBuilder()
        .setAccentColor(0x2ecc71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `✅ Embed enviado en ${channel}.`,
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    } catch (error) {
      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        content: "⚠️ Error al procesar el archivo JSON. Asegúrate de que sea válido.",
        allowedMentions: { repliedUser: false },
      });
    }
  },
};
