const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Muestra información detallada del servidor.")
    .setContexts(0)
    .setIntegrationTypes(0),

  async execute(interaction) {
    const guild = interaction.guild;

    const roles = guild.roles.cache.size;
    const channels = guild.channels.cache.size;
    const members = guild.members.cache.filter((member) => !member.user.bot).size;
    const bots = guild.members.cache.filter((member) => member.user.bot).size;
    const owner = await guild.fetchOwner();

    const embed = new EmbedBuilder()
      .setTitle(`📊 Información de ${guild.name}`)
      .setColor(0x3498db)
      .setThumbnail(guild.iconURL({ forceStatic: false, size: 1024 }))
      .addFields(
        { name: "👑 Propietario", value: `${owner.user.tag}`, inline: true },
        { name: "🆔 ID", value: `\`${guild.id}\``, inline: true },
        { name: "📅 Creado", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "👥 Miembros", value: `${members}`, inline: true },
        { name: "🤖 Bots", value: `${bots}`, inline: true },
        { name: "📁 Canales", value: `${channels}`, inline: true },
        { name: "🎭 Roles", value: `${roles}`, inline: true },
      )
      .setFooter({ text: "Información del servidor" })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  },
};
