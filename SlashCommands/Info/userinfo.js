const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Muestra información de un usuario.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Usuario a consultar").setRequired(false),
    )
    .setContexts(0)
    .setIntegrationTypes(0),

  async execute(interaction) {
    const user = interaction.options.getUser("user") || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);

    const embed = new EmbedBuilder()
      .setTitle(`👤 Información de ${user.tag}`)
      .setColor(0x9b59b6)
      .setThumbnail(user.displayAvatarURL({ forceStatic: false, size: 1024 }))
      .addFields(
        { name: "Nombre", value: `${user.tag}`, inline: true },
        { name: "ID", value: `\`${user.id}\``, inline: true },
        { name: "Servidor", value: `${member ? member.roles.cache.size - 1 : 0} roles`, inline: true },
        { name: "Cuenta creada", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "¿Bot?", value: `${user.bot ? "Sí" : "No"}`, inline: true },
      )
      .setFooter({ text: "Usuario consultado" })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  },
};
