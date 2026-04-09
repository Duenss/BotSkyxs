const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");
const { setData, getData } = require("../../Events/Client/dbManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-welcome")
    .setDescription("Configura el sistema de bienvenida del servidor.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set-channel")
        .setDescription("Establece el canal y configura el embed de bienvenida.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Canal donde se enviarán los mensajes de bienvenida.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("title")
            .setDescription("Título del embed. Usa {user} para mencionar al usuario, {guild} para el nombre del servidor.")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("Descripción del embed. Usa {user}, {guild}, {membercount}.")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("thumbnail")
            .setDescription("URL de la miniatura del embed (thumbnail).")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("image")
            .setDescription("URL de la imagen principal del embed (imagen/gif/mp4).")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("color")
            .setDescription("Color del embed en formato hex (ej: #00ff00).")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("footer")
            .setDescription("Texto del footer del embed.")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Desactiva el sistema de bienvenida."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Muestra el estado del sistema de bienvenida."),
    )
    .setContexts(0)
    .setIntegrationTypes(0),

  async execute(interaction) {
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

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const config = getData("welcome", interaction.guild.id) || {};

    if (subcommand === "set-channel") {
      const channel = interaction.options.getChannel("channel");
      const title = interaction.options.getString("title");
      const description = interaction.options.getString("description");
      const color = interaction.options.getString("color") || "#00ff00";
      const thumbnail = interaction.options.getString("thumbnail") || null;
      const image = interaction.options.getString("image") || null;
      const footer = interaction.options.getString("footer") || null;

      setData("welcome", interaction.guild.id, {
        enabled: true,
        channelId: channel.id,
        title,
        description,
        color,
        footer,
        thumbnail,
        image,
      });

      const container = new ContainerBuilder()
        .setAccentColor(0x2ecc71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `✅ Sistema de bienvenida configurado. Los mensajes se enviarán en ${channel}.`,
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    if (subcommand === "disable") {
      setData("welcome", interaction.guild.id, { enabled: false });

      const container = new ContainerBuilder()
        .setAccentColor(0xf1c40f)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "✅ Sistema de bienvenida desactivado.",
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    if (subcommand === "status") {
      const status = config.enabled ? "Activado" : "Desactivado";
      const channel = config.channelId
        ? `<#${config.channelId}>`
        : "No configurado";
      const title = config.title || "No configurado";
      const description = config.description || "No configurado";
      const color = config.color || "No configurado";
      const footer = config.footer || "No configurado";
      const thumbnail = config.thumbnail || "No configurado";
      const image = config.image || "No configurado";

      const container = new ContainerBuilder()
        .setAccentColor(0x3498db)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## 📊 Estado del Sistema de Bienvenida\n\n**Estado:** ${status}\n**Canal:** ${channel}\n**Título:** ${title}\n**Descripción:** ${description}\n**Color:** ${color}\n**Footer:** ${footer}\n**Thumbnail:** ${thumbnail}\n**Imagen:** ${image}`,
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }
  },
};