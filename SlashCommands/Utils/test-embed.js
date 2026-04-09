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
    .setDescription("Envía un embed de prueba para visualizar los sistemas configurados.")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Tipo de embed a probar.")
        .setRequired(true)
        .addChoices(
          { name: "Bienvenida", value: "welcome" },
          { name: "Boost", value: "boost" },
          { name: "Tickets", value: "ticket" },
          { name: "Personalizado", value: "custom" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("Título del embed (solo para personalizado).")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Descripción del embed (solo para personalizado).")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("color")
        .setDescription("Color en hex (solo para personalizado, ej: #0099ff).")
        .setRequired(false),
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

    try {
      if (type === "welcome") {
        const config = getData("welcome", interaction.guild.id) || {};

        embed = new EmbedBuilder()
          .setTitle(
            (config.title || "Bienvenido {user}")
              .replace("{user}", interaction.user.username)
              .replace("{guild}", interaction.guild.name),
          )
          .setDescription(
            (config.description || "Te damos la bienvenida a {guild}")
              .replace("{user}", `<@${interaction.user.id}>`)
              .replace("{guild}", interaction.guild.name)
              .replace("{membercount}", interaction.guild.memberCount),
          )
          .setColor(config.color ? parseInt(config.color.replace("#", ""), 16) : 0x00ff00)
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
        const config = getData("boost", interaction.guild.id) || {};

        embed = new EmbedBuilder()
          .setTitle(
            (config.title || "🚀 ¡Gracias por el boost!")
              .replace("{user}", interaction.user.username)
              .replace("{guild}", interaction.guild.name),
          )
          .setDescription(
            (config.description || "Alguien ha hecho boost a {guild} 🎉")
              .replace("{user}", `<@${interaction.user.id}>`)
              .replace("{guild}", interaction.guild.name)
              .replace("{boostcount}", interaction.guild.premiumSubscriptionCount || 0),
          )
          .setColor(config.color ? parseInt(config.color.replace("#", ""), 16) : 0xff73fa)
          .setTimestamp();

        if (config.footer) {
          embed.setFooter({ text: config.footer });
        }
      } else if (type === "ticket") {
        embed = new EmbedBuilder()
          .setTitle("🎟️ Sistema de tickets activo")
          .setDescription(
            "Presiona el botón para abrir un canal privado con el equipo de soporte. Nuestro staff atenderá tu solicitud lo antes posible.",
          )
          .setColor(0x5865f2)
          .setFooter({ text: "Ticket creado por el sistema de soporte" })
          .setTimestamp();
      } else if (type === "custom") {
        const title = interaction.options.getString("title") || "Embed de Prueba";
        const description = interaction.options.getString("description") || "Este es un embed de prueba personalizado.";
        const color = interaction.options.getString("color") || "#5865F2";

        embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor(/^#?[0-9A-Fa-f]{6}$/.test(color) ? color : 0x5865f2)
          .setTimestamp()
          .setFooter({ text: "Embed personalizado de prueba" });
      }

      await interaction.reply({
        embeds: [embed],
        ...(type === "ticket" && {
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("open_ticket_demo")
                .setLabel("Abrir ticket (demo)")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("🎫")
                .setDisabled(true),
            ),
          ],
        }),
      });

      const container = new ContainerBuilder()
        .setAccentColor(0x2ecc71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("✅ Embed de prueba enviado."),
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
