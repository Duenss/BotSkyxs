const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} = require("discord.js");
const { getData } = require("../../Events/Client/dbManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("test-embed")
    .setDescription("Envía un embed de prueba con la configuración guardada en el sistema.")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Tipo de embed a probar.")
        .setRequired(true)
        .addChoices(
          { name: "Bienvenida", value: "welcome" },
          { name: "Boost", value: "boost" },
          { name: "Tickets", value: "ticket" },
        ),
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

    const type = interaction.options.getString("type");
    let embed;
    let config;

    try {
      if (type === "welcome") {
        config = getData("welcome", interaction.guild.id);

        if (!config || !config.enabled) {
          const container = new ContainerBuilder()
            .setAccentColor(0xff9900)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "⚠️ El sistema de **bienvenida** no está configurado. Usa `/setup-welcome set-channel` para configurarlo.",
              ),
            );

          return interaction.reply({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            components: [container],
            allowedMentions: { repliedUser: false },
          });
        }

        embed = new EmbedBuilder()
          .setTitle(
            config.title
              .replace("{user}", interaction.user.username)
              .replace("{guild}", interaction.guild.name),
          )
          .setDescription(
            config.description
              .replace("{user}", `<@${interaction.user.id}>`)
              .replace("{guild}", interaction.guild.name)
              .replace("{membercount}", interaction.guild.memberCount),
          )
          .setColor(parseInt(config.color.replace("#", ""), 16) || 0x00ff00)
          .setTimestamp();

        if (config.footer) {
          embed.setFooter({ text: config.footer });
        }

        if (config.thumbnail) {
          embed.setThumbnail(config.thumbnail);
        }

        if (config.image) {
          embed.setImage(config.image);
        }
      } else if (type === "boost") {
        config = getData("boost", interaction.guild.id);

        if (!config || !config.enabled) {
          const container = new ContainerBuilder()
            .setAccentColor(0xff9900)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "⚠️ El sistema de **boost** no está configurado. Usa `/setup-boost set-channel` para configurarlo.",
              ),
            );

          return interaction.reply({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            components: [container],
            allowedMentions: { repliedUser: false },
          });
        }

        embed = new EmbedBuilder()
          .setTitle(
            config.title
              .replace("{user}", interaction.user.username)
              .replace("{guild}", interaction.guild.name),
          )
          .setDescription(
            config.description
              .replace("{user}", `<@${interaction.user.id}>`)
              .replace("{guild}", interaction.guild.name)
              .replace("{boostcount}", interaction.guild.premiumSubscriptionCount || 0),
          )
          .setColor(parseInt(config.color.replace("#", ""), 16) || 0xff73fa)
          .setTimestamp();

        if (config.footer) {
          embed.setFooter({ text: config.footer });
        }
      } else if (type === "ticket") {
        config = getData("tickets", interaction.guild.id);

        if (!config || !config.categoryId) {
          const container = new ContainerBuilder()
            .setAccentColor(0xff9900)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "⚠️ El sistema de **tickets** no está configurado. Usa `/setup-ticket` para configurarlo.",
              ),
            );

          return interaction.reply({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            components: [container],
            allowedMentions: { repliedUser: false },
          });
        }

        embed = new EmbedBuilder()
          .setTitle("🎟️ Sistema de tickets activo")
          .setDescription(
            "Presiona el botón para abrir un canal privado con el equipo de soporte. Nuestro staff atenderá tu solicitud lo antes posible.",
          )
          .setColor(0x5865f2)
          .setFooter({ text: "Ticket creado por el sistema de soporte" })
          .setTimestamp();
      }

      const components = type === "ticket" ? [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("open_ticket_demo")
            .setLabel("Abrir ticket (demo)")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🎫")
            .setDisabled(true),
        ),
      ] : [];

      await interaction.reply({
        embeds: [embed],
        ...(components.length > 0 && { components }),
      });

      const container = new ContainerBuilder()
        .setAccentColor(0x2ecc71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("✅ Embed de prueba enviado. Así se verá en el servidor."),
        );

      return interaction.followUp({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    } catch (error) {
      console.error("Error en test-embed:", error);

      const container = new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `❌ Error al crear el embed: ${error.message}`,
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }
  },
};
