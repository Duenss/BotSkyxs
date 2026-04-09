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
    .setDescription("Crea y publica un embed bonito en un canal.")
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("Título del embed.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Descripción del embed.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("color")
        .setDescription("Color en hexadecimal, por ejemplo #0099ff.")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("thumbnail")
        .setDescription("URL de la miniatura.")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("image")
        .setDescription("URL de la imagen principal.")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("footer")
        .setDescription("Texto del pie de página.")
        .setRequired(false),
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

    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");
    const color = interaction.options.getString("color") || "#5865F2";
    const thumbnail = interaction.options.getString("thumbnail");
    const image = interaction.options.getString("image");
    const footer = interaction.options.getString("footer");
    const channel =
      interaction.options.getChannel("channel") || interaction.channel;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(/^#?[0-9A-Fa-f]{6}$/.test(color) ? color : "#5865F2")
      .setTimestamp()
      .setFooter({ text: footer || "Diseñado por el bot" });

    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);

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
  },
};
