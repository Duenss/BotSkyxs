const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const { getData } = require("../Client/dbManager");

module.exports = {
  name: "guildMemberUpdate",
  on: true,
  /**
   * @param {import("discord.js").GuildMember} oldMember
   * @param {import("discord.js").GuildMember} newMember
   * @param {import("discord.js").Client} client
   */
  async execute(oldMember, newMember, client) {
    // Check for boost
    if (!oldMember.premiumSince && newMember.premiumSince) {
      const boostConfig = getData("boost", newMember.guild.id);
      if (boostConfig && boostConfig.enabled && boostConfig.channelId) {
        const boostChannel = newMember.guild.channels.cache.get(boostConfig.channelId);
        if (boostChannel) {
          const embed = new EmbedBuilder()
            .setTitle(
              boostConfig.title
                .replace("{user}", newMember.user.username)
                .replace("{guild}", newMember.guild.name)
            )
            .setDescription(
              boostConfig.description
                .replace("{user}", `<@${newMember.id}>`)
                .replace("{guild}", newMember.guild.name)
                .replace("{boostcount}", newMember.guild.premiumSubscriptionCount)
            )
            .setColor(parseInt(boostConfig.color.replace('#', ''), 16) || 0xff73fa)
            .setTimestamp();

          if (boostConfig.footer) {
            embed.setFooter({ text: boostConfig.footer });
          }

          await boostChannel
            .send({
              embeds: [embed],
              allowedMentions: { repliedUser: false },
            })
            .catch(() => null);
        }
      }
    }

    const config = getData("logs", newMember.guild.id);
    if (!config || !config.logChannelId) return;

    const logChannel = newMember.guild.channels.cache.get(config.logChannelId);
    if (!logChannel) return;

    const changes = [];

    if (oldMember.nickname !== newMember.nickname) {
      changes.push(
        `**🏷️ Apodo:**\n> 🔴 **Antes:** ${oldMember.nickname || "*[Sin apodo]*"}\n> 🟢 **Después:** ${newMember.nickname || "*[Sin apodo]*"}`,
      );
    }

    if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
      const oldTimeout = oldMember.communicationDisabledUntil
        ? `<t:${Math.floor(oldMember.communicationDisabledUntil.getTime() / 1000)}:F>`
        : "No estaba silenciado";
      const newTimeout = newMember.communicationDisabledUntil
        ? `<t:${Math.floor(newMember.communicationDisabledUntil.getTime() / 1000)}:F>`
        : "Se quitó el silencio";

      changes.push(
        `**🔇 Silencio temporal:**\n> 🔴 **Antes:** ${oldTimeout}\n> 🟢 **Después:** ${newTimeout}`,
      );
    }

    const oldRoles = oldMember.roles.cache.filter((r) => r.id !== oldMember.guild.id).map((r) => r.id);
    const newRoles = newMember.roles.cache.filter((r) => r.id !== newMember.guild.id).map((r) => r.id);

    const addedRoles = newRoles.filter((roleId) => !oldRoles.includes(roleId));
    const removedRoles = oldRoles.filter((roleId) => !newRoles.includes(roleId));

    if (addedRoles.length > 0) {
      changes.push(
        `**➕ Roles añadidos:**\n${addedRoles
          .map((roleId) => `> <@&${roleId}>`)
          .join("\n")}`,
      );
    }

    if (removedRoles.length > 0) {
      changes.push(
        `**➖ Roles eliminados:**\n${removedRoles
          .map((roleId) => `> <@&${roleId}>`)
          .join("\n")}`,
      );
    }

    if (changes.length === 0) return;

    const container = new ContainerBuilder()
      .setAccentColor(0xf1c40f)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## ✏️ Miembro Actualizado"),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Se ha detectado un cambio en el miembro <@${newMember.id}> (${newMember.user.tag}).`,
        ),
      );

    changes.forEach((change) => {
      container
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(change));
    });

    container
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `⏱️ **Fecha:** <t:${Math.floor(Date.now() / 1000)}:F> (<t:${Math.floor(Date.now() / 1000)}:R>)`,
        ),
      );

    await logChannel
      .send({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      })
      .catch(() => null);
  },
};
