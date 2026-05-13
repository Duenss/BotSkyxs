const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const { setData, getData } = require("../../Events/Client/dbManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-ticket")
    .setDescription("Configura el sistema de tickets del servidor.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set-json")
        .setDescription("Configura el sistema de tickets adjuntando un archivo JSON.")
        .addAttachmentOption((option) =>
          option
            .setName("json_file")
            .setDescription("Archivo JSON con la configuración del panel de tickets.")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Desactiva el sistema de tickets."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Muestra el estado del sistema de tickets."),
    )
    .setContexts(0)
    .setIntegrationTypes(0),

  async execute(interaction) {
    const buildSelectMenu = (optionsString) => {
      const defaultOptions = [
        { label: "Soporte", value: "support", description: "Abrir un ticket de soporte general." },
        { label: "Panel Completo", value: "panel_completo", description: "Solicitar un panel completo." },
        { label: "Panel Básico", value: "panel_basico", description: "Solicitar un panel básico." },
        { label: "UID", value: "uid", description: "Solicitar un UID." },
        { label: "Bypass UID", value: "bypass_uid", description: "Solicitar un bypass UID." },
      ];

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("open_ticket_select")
        .setPlaceholder("Selecciona el producto o soporte")
        .setMinValues(1)
        .setMaxValues(1);

      const sourceOptions = [];

      if (optionsString) {
        optionsString.split(";").forEach((raw) => {
          const parts = raw.split("|").map((part) => part.trim());
          if (parts.length >= 2 && parts[0] && parts[1]) {
            sourceOptions.push({
              label: parts[0].slice(0, 100),
              value: parts[1].slice(0, 100),
              description: parts[2] ? parts[2].slice(0, 100) : undefined,
            });
          }
        });
      }

      (sourceOptions.length ? sourceOptions : defaultOptions).forEach((option) => {
        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(option.label)
            .setValue(option.value)
            .setDescription(option.description || ""),
        );
      });

      return selectMenu;
    };

    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator,
      )
    ) {
      const container = new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "⚠️ Sólo los administradores pueden configurar el sistema de tickets.",
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const ticketConfig = getData("tickets", guild.id) || {};

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
        if (!jsonData.panelChannelId || !jsonData.title || !jsonData.description) {
          return interaction.reply({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            content: "⚠️ El JSON debe contener al menos: panelChannelId, title, description.",
            allowedMentions: { repliedUser: false },
          });
        }

        const targetChannel = await guild.channels.fetch(jsonData.panelChannelId).catch(() => null);

        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
          const container = new ContainerBuilder()
            .setAccentColor(0xff0000)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "⚠️ El panelChannelId no es válido o no es un canal de texto.",
              ),
            );

          return interaction.reply({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            components: [container],
            allowedMentions: { repliedUser: false },
          });
        }

        let category = guild.channels.cache.find(
          (channel) =>
            channel.type === ChannelType.GuildCategory &&
            channel.name.toLowerCase().includes("tickets"),
        );

        if (!category) {
          category = await guild.channels.create({
            name: "🎫 Tickets",
            type: ChannelType.GuildCategory,
            reason: "Configuración de sistema de tickets.",
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(jsonData.title)
          .setDescription(jsonData.description)
          .setColor(parseInt(jsonData.color?.replace("#", ""), 16) || 0x5865f2)
          .setFooter({ text: jsonData.footer || "Ticket creado por el sistema de soporte" })
          .setTimestamp();

        if (jsonData.thumbnail) {
          embed.setThumbnail(jsonData.thumbnail);
        }

        if (jsonData.image) {
          embed.setImage(jsonData.image);
        }

        const selectMenu = buildSelectMenu(jsonData.options);
        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        let panelMessage = null;

        if (
          ticketConfig.panelChannelId &&
          ticketConfig.panelMessageId &&
          ticketConfig.panelChannelId === targetChannel.id
        ) {
          const oldChannel = await guild.channels.fetch(ticketConfig.panelChannelId).catch(() => null);

          if (oldChannel && oldChannel.type === ChannelType.GuildText) {
            const oldMessage = await oldChannel.messages
              .fetch(ticketConfig.panelMessageId)
              .catch(() => null);

            if (oldMessage) {
              panelMessage = await oldMessage
                .edit({ embeds: [embed], components: [selectRow] })
                .catch(() => null);
            }
          }
        }

        if (!panelMessage) {
          panelMessage = await targetChannel.send({ embeds: [embed], components: [selectRow] });
        }

        setData("tickets", guild.id, {
          enabled: true,
          channelId: jsonData.channelId || targetChannel.id,
          categoryId: category.id,
          panelChannelId: targetChannel.id,
          panelMessageId: panelMessage.id,
          ...jsonData,
        });

        const container = new ContainerBuilder()
          .setAccentColor(0x2ecc71)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `✅ Sistema de tickets configurado en <#${targetChannel.id}>.`,
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
      setData("tickets", guild.id, { enabled: false });

      const container = new ContainerBuilder()
        .setAccentColor(0xf1c40f)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "✅ Sistema de tickets desactivado.",
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    if (subcommand === "status") {
      const status = ticketConfig.enabled ? "Activado" : "Desactivado";
      const channel = ticketConfig.channelId ? `<#${ticketConfig.channelId}>` : "No configurado";
      const title = ticketConfig.title || "No configurado";
      const description = ticketConfig.description || "No configurado";
      const color = ticketConfig.color || "No configurado";
      const footer = ticketConfig.footer || "No configurado";
      const thumbnail = ticketConfig.thumbnail || "No configurado";
      const image = ticketConfig.image || "No configurado";
      const options = ticketConfig.options || "No configuradas";

      const container = new ContainerBuilder()
        .setAccentColor(0x3498db)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## 📊 Estado del sistema de tickets\n\n**Estado:** ${status}\n**Canal:** ${channel}\n**Título:** ${title}\n**Descripción:** ${description}\n**Color:** ${color}\n**Footer:** ${footer}\n**Thumbnail:** ${thumbnail}\n**Imagen:** ${image}\n**Opciones:** ${options}`,
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
