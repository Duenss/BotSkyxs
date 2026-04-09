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
} = require("discord.js");
const { setData, getData } = require("../../Events/Client/dbManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-ticket")
    .setDescription("Crea un sistema de tickets bonito con botón interactivo.")
    .addStringOption((option) =>
      option
        .setName("channel_id")
        .setDescription("ID del canal donde se publicará el panel de tickets.")
        .setRequired(true),
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
            "⚠️ Sólo los administradores pueden configurar el sistema de tickets.",
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    const guild = interaction.guild;
    const channelId = interaction.options.getString("channel_id");
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
      .setTitle("🎟️ Sistema de tickets activo")
      .setDescription(
        "Presiona el botón para abrir un canal privado con el equipo de soporte. Nuestro staff atenderá tu solicitud lo antes posible.",
      )
      .setColor(0x5865f2)
      .setFooter({ text: "Ticket creado por el sistema de soporte" })
      .setTimestamp();

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("Abrir ticket")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎫"),
    );

    const message = await targetChannel.send({
      embeds: [embed],
      components: [buttonRow],
    });

    setData("tickets", guild.id, {
      categoryId: category.id,
      panelChannelId: targetChannel.id,
      panelMessageId: message.id,
    });

    const container = new ContainerBuilder()
      .setAccentColor(0x2ecc71)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `✅ Sistema de tickets configurado en ${targetChannel}.`,
        ),
      );

    return interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions: { repliedUser: false },
    });
  },
};
