const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField,
} = require("discord.js");
const { setData, getData } = require("../../Events/Client/dbManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-welcome")
    .setDescription("Configura el sistema de bienvenida del servidor.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set-json")
        .setDescription("Configura el sistema de bienvenida adjuntando un archivo JSON.")
        .addAttachmentOption((option) =>
          option
            .setName("json_file")
            .setDescription("Archivo JSON con la configuración del embed de bienvenida.")
            .setRequired(true),
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

    if (subcommand === "set-json") {
      const attachment = interaction.options.getAttachment("json_file");

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
        if (!jsonData.channelId || !jsonData.title || !jsonData.description) {
          return interaction.reply({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            content: "⚠️ El JSON debe contener al menos: channelId, title, description.",
            allowedMentions: { repliedUser: false },
          });
        }

        const channel = await interaction.guild.channels.fetch(jsonData.channelId).catch(() => null);

        if (!channel || channel.type !== 0) { // ChannelType.GuildText is 0
          return interaction.reply({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            content: "⚠️ El channelId no es válido o no es un canal de texto.",
            allowedMentions: { repliedUser: false },
          });
        }

        setData("welcome", interaction.guild.id, {
          enabled: true,
          ...jsonData,
        });

        const container = new ContainerBuilder()
          .setAccentColor(0x2ecc71)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `✅ Sistema de bienvenida configurado. Los mensajes se enviarán en <#${channel.id}>.`,
            ),
          );

        return interaction.reply({
          flags: MessageFlags.IsComponentsV2,
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