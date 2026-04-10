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
        .setName("set-panel")
        .setDescription("Establece el canal y el embed del panel de tickets.")
        .addStringOption((option) =>
          option
            .setName("channel_id")
            .setDescription("ID del canal donde se publicará el panel de tickets.")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("title")
            .setDescription("Título del embed del panel.")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("Descripción del embed del panel.")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("color")
            .setDescription("Color del embed en formato hex (ej: #5865f2)."),
        )
        .addStringOption((option) =>
          option
            .setName("footer")
            .setDescription("Texto del footer del embed."),
        )
        .addStringOption((option) =>
          option
            .setName("thumbnail")
            .setDescription("URL de la miniatura del embed."),
        )
        .addStringOption((option) =>
          option
            .setName("image")
            .setDescription("URL de la imagen principal del embed."),
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

    if (subcommand === "set-panel") {
      const channelId = interaction.options.getString("channel_id");
      const title = interaction.options.getString("title") || ticketConfig.title;
      const description = interaction.options.getString("description") || ticketConfig.description;
      const color = interaction.options.getString("color") || ticketConfig.color || "#5865f2";
      const footer = interaction.options.getString("footer") || ticketConfig.footer || "Ticket creado por el sistema de soporte";
      const thumbnail = interaction.options.getString("thumbnail") || ticketConfig.thumbnail || null;
      const image = interaction.options.getString("image") || ticketConfig.image || null;

      if (!title || !description) {
        const container = new ContainerBuilder()
          .setAccentColor(0xff9900)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "⚠️ El título y la descripción son necesarios si aún no existe un panel configurado.",
            ),
          );

        return interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container],
          allowedMentions: { repliedUser: false },
        });
      }

      const targetChannel = await guild.channels.fetch(channelId).catch(() => null);

      if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
        const container = new ContainerBuilder()
          .setAccentColor(0xff0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "⚠️ El ID de canal de tickets no es válido o no es un canal de texto.",
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
        .setTitle(title)
        .setDescription(description)
        .setColor(parseInt(color.replace("#", ""), 16) || 0x5865f2)
        .setFooter({ text: footer })
        .setTimestamp();

      if (thumbnail) {
        embed.setThumbnail(thumbnail);
      }

      if (image) {
        embed.setImage(image);
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("open_ticket_select")
        .setPlaceholder("Selecciona el producto o soporte")
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel("Soporte")
            .setValue("support")
            .setDescription("Abrir un ticket de soporte general."),
          new StringSelectMenuOptionBuilder()
            .setLabel("Panel Completo")
            .setValue("panel_completo")
            .setDescription("Solicitar un panel completo."),
          new StringSelectMenuOptionBuilder()
            .setLabel("Panel Básico")
            .setValue("panel_basico")
            .setDescription("Solicitar un panel básico."),
          new StringSelectMenuOptionBuilder()
            .setLabel("UID")
            .setValue("uid")
            .setDescription("Solicitar un UID."),
          new StringSelectMenuOptionBuilder()
            .setLabel("Bypass UID")
            .setValue("bypass_uid")
            .setDescription("Solicitar un bypass UID."),
        );

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
        channelId: targetChannel.id,
        categoryId: category.id,
        panelChannelId: targetChannel.id,
        panelMessageId: panelMessage.id,
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
            `✅ Sistema de tickets configurado en <#${targetChannel.id}>.`,
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
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

      const container = new ContainerBuilder()
        .setAccentColor(0x3498db)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## 📊 Estado del sistema de tickets\n\n**Estado:** ${status}\n**Canal:** ${channel}\n**Título:** ${title}\n**Descripción:** ${description}\n**Color:** ${color}\n**Footer:** ${footer}\n**Thumbnail:** ${thumbnail}\n**Imagen:** ${image}`,
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
