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
    .setName("setup-leave")
    .setDescription("Configura el sistema de despedida del servidor.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set-channel")
        .setDescription("Establece el canal y configura el embed de despedida.")
        .addStringOption((option) =>
          option
            .setName("channel_id")
            .setDescription("ID del canal donde se enviarán los mensajes de despedida.")
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
            .setDescription("Descripción del embed. Usa {user}, {guild}.")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("color")
            .setDescription("Color del embed en formato hex (ej: #ff0000).")
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
        .setDescription("Desactiva el sistema de despedida."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Muestra el estado del sistema de despedida."),
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
    const config = getData("leave", interaction.guild.id) || {};

    if (subcommand === "set-channel") {
      const channelId = interaction.options.getString("channel_id");
      const title = interaction.options.getString("title");
      const description = interaction.options.getString("description");
      const color = interaction.options.getString("color") || "#ff0000";
      const footer = interaction.options.getString("footer") || null;
      const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);

      if (!channel || channel.type !== ChannelType.GuildText) {
        return interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          content: "⚠️ El ID de canal de despedida no es válido o no es un canal de texto.",
          allowedMentions: { repliedUser: false },
        });
      }

      setData("leave", interaction.guild.id, {
        enabled: true,
        channelId: channel.id,
        title,
        description,
        color,
        footer,
      });

      const container = new ContainerBuilder()
        .setAccentColor(0x2ecc71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `✅ Sistema de despedida configurado. Los mensajes se enviarán en <#${channel.id}>.`,
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    if (subcommand === "disable") {
      setData("leave", interaction.guild.id, { enabled: false });

      const container = new ContainerBuilder()
        .setAccentColor(0xf1c40f)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "✅ Sistema de despedida desactivado.",
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

      const container = new ContainerBuilder()
        .setAccentColor(0x3498db)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## 📊 Estado del Sistema de Despedida\n\n**Estado:** ${status}\n**Canal:** ${channel}\n**Título:** ${title}\n**Descripción:** ${description}\n**Color:** ${color}\n**Footer:** ${footer}`,
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