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
    console.log(`[guildMemberAdd] Nuevo miembro: ${member.user.tag} en ${member.guild.name}`);
    
    // PARTE 1: Enviar log si está configurado (OPCIONAL)
    const logsConfig = getData("logs", member.guild.id);
    if (logsConfig && logsConfig.logChannelId) {
      const logChannel = member.guild.channels.cache.get(logsConfig.logChannelId);
      if (logChannel) {
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
            allowedMentions: { parse: ["users"], repliedUser: false },
          })
          .catch(() => null);
      }
    }

    // PARTE 2: Enviar mensaje de bienvenida si está configurado (INDEPENDIENTE)
    const welcomeConfig = getData("welcome", member.guild.id);
    console.log(`[guildMemberAdd WELCOME] Config obtenida:`, welcomeConfig);
    
    if (welcomeConfig && welcomeConfig.enabled && welcomeConfig.channelId) {
      console.log(`[guildMemberAdd WELCOME] Bienvenida habilitada, intentando enviar...`);
      const welcomeChannel = member.guild.channels.cache.get(welcomeConfig.channelId);
      
      if (!welcomeChannel) {
        console.log(`[guildMemberAdd WELCOME] ❌ Canal no encontrado con ID: ${welcomeConfig.channelId}`);
        return;
      }
      
      console.log(`[guildMemberAdd WELCOME] ✅ Canal encontrado: ${welcomeChannel.name}`);
      
      const userDisplay = member.user.username;
      const embed = new EmbedBuilder()
        .setTitle(
          welcomeConfig.title
            .replace("{user}", userDisplay)
            .replace("{guild}", member.guild.name)
        )
        .setDescription(
          welcomeConfig.description
            .replace("{user}", userDisplay)
            .replace("{guild}", member.guild.name)
            .replace("{membercount}", member.guild.memberCount)
        )
        .setColor(parseInt(welcomeConfig.color.replace('#', ''), 16) || 0x00ff00)
        .setTimestamp();

      if (welcomeConfig.footer) {
        embed.setFooter({ text: welcomeConfig.footer });
      }

      if (welcomeConfig.thumbnail) {
        embed.setThumbnail(welcomeConfig.thumbnail);
      }

      if (welcomeConfig.image) {
        embed.setImage(welcomeConfig.image);
      }

      await welcomeChannel
        .send({
          embeds: [embed],
          allowedMentions: { parse: ["users"], repliedUser: false },
        })
        .then(() => console.log(`[guildMemberAdd WELCOME] ✅ Mensaje de bienvenida enviado`))
        .catch((error) => console.log(`[guildMemberAdd WELCOME] ❌ Error al enviar: ${error.message}`));
    } else {
      console.log(`[guildMemberAdd WELCOME] ❌ Bienvenida no configurada. enabled:${welcomeConfig?.enabled} channelId:${welcomeConfig?.channelId}`);
    }
  },
};
