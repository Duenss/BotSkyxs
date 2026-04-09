const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const { getData } = require("../Client/dbManager");

module.exports = {
  name: "guildMemberAdd",
  on: true,
  /**
   * @param {import("discord.js").GuildMember} member
   * @param {import("discord.js").Client} client
   */
  async execute(member, client) {
    const config = getData("logs", member.guild.id);
    if (!config || !config.logChannelId) return;

    const logChannel = member.guild.channels.cache.get(config.logChannelId);
    if (!logChannel) return;

    const container = new ContainerBuilder()
      .setAccentColor(0x2ecc71)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## ✅ Miembro Unido al Servidor"),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Se ha unido un nuevo miembro al servidor.

` +
            `**👤 Usuario:** <@${member.id}> (${member.user.tag})
` +
            `**🆔 ID:** \`${member.id}\`
` +
            `**🕒 Cuenta creada:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:F> (<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>)
` +
            `**📌 Miembro número:** \`#${member.guild.memberCount}\`
`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `⏱️ **Fecha de ingreso:** <t:${Math.floor(Date.now() / 1000)}:F> (<t:${Math.floor(Date.now() / 1000)}:R>)`,
        ),
      );

    await logChannel
      .send({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      })
      .catch(() => null);

    // Send welcome embed
    const welcomeConfig = getData("welcome", member.guild.id);
    if (welcomeConfig && welcomeConfig.enabled && welcomeConfig.channelId) {
      const welcomeChannel = member.guild.channels.cache.get(welcomeConfig.channelId);
      if (welcomeChannel) {
        const embed = new EmbedBuilder()
          .setTitle(
            welcomeConfig.title
              .replace("{user}", member.user.username)
              .replace("{guild}", member.guild.name)
          )
          .setDescription(
            welcomeConfig.description
              .replace("{user}", `<@${member.id}>`)
              .replace("{guild}", member.guild.name)
              .replace("{membercount}", member.guild.memberCount)
          )
          .setColor(parseInt(welcomeConfig.color.replace('#', ''), 16) || 0x00ff00)
          .setTimestamp();

        if (welcomeConfig.footer) {
          embed.setFooter({ text: welcomeConfig.footer });
        }

        await welcomeChannel
          .send({
            embeds: [embed],
            allowedMentions: { repliedUser: false },
          })
          .catch(() => null);
      }
    }
  },
};
