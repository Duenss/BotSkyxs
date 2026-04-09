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
    .setName("anti-nuke")
    .setDescription("Configura la protección AntiNuke del servidor.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("enable")
        .setDescription("Activa la protección AntiNuke.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Canal donde se enviarán los avisos de seguridad.")
            .addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Desactiva la protección AntiNuke."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Muestra el estado actual de AntiNuke."),
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
    const config = getData("antinuke", interaction.guild.id) || {};

    if (subcommand === "enable") {
      const channel =
        interaction.options.getChannel("channel") || interaction.channel;
      setData("antinuke", interaction.guild.id, {
        enabled: true,
        logChannelId: channel.id,
        threshold: 3,
        window: 15000,
      });

      const container = new ContainerBuilder()
        .setAccentColor(0x2ecc71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `✅ Protección AntiNuke activada. Los avisos se enviarán en ${channel}.`,
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    if (subcommand === "disable") {
      setData("antinuke", interaction.guild.id, { enabled: false });

      const container = new ContainerBuilder()
        .setAccentColor(0xf1c40f)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "✅ Protección AntiNuke desactivada.",
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    const enabled = config.enabled ? "✅ Activada" : "❌ Desactivada";
    const channelMention = config.logChannelId
      ? `<#${config.logChannelId}>`
      : "No configurado";

    const container = new ContainerBuilder()
      .setAccentColor(config.enabled ? 0x2ecc71 : 0xe74c3c)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## 🔐 Estado AntiNuke"),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Estado:** ${enabled}
` +
            `**Canal de avisos:** ${channelMention}
` +
            `**Umbral de protección:** ${config.threshold || 3} acciones en ${
              config.window / 1000 || 15
            } segundos`,
        ),
      );

    return interaction.reply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [container],
      allowedMentions: { repliedUser: false },
    });
  },
};
