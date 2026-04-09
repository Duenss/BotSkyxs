const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require("discord.js");
const { getData } = require("../Client/dbManager");

module.exports = {
  name: "voiceStateUpdate",
  on: true,
  /**
   * @param {import("discord.js").VoiceState} oldState
   * @param {import("discord.js").VoiceState} newState
   * @param {import("discord.js").Client} client
   */
  async execute(oldState, newState, client) {
    const guild = newState.guild || oldState.guild;
    if (!guild) return;

    const config = getData("logs", guild.id);
    if (!config || !config.logChannelId) return;

    const logChannel = guild.channels.cache.get(config.logChannelId);
    if (!logChannel) return;

    const member = newState.member || oldState.member;
    if (!member) return;

    const changes = [];

    if (oldState.channelId !== newState.channelId) {
      if (!oldState.channelId && newState.channelId) {
        changes.push(`**🔊 Unión a canal de voz:** <#${newState.channelId}>`);
      } else if (oldState.channelId && !newState.channelId) {
        changes.push(`**📴 Salida del canal de voz:** <#${oldState.channelId}>`);
      } else {
        changes.push(
          `**🔀 Cambio de canal de voz:**\n> **Antes:** <#${oldState.channelId}>\n> **Después:** <#${newState.channelId}>`,
        );
      }
    }

    const voiceChanges = [];

    if (oldState.selfMute !== newState.selfMute) {
      voiceChanges.push(
        `> ${newState.selfMute ? "Se silenció a sí mismo" : "Se dejó de silenciar a sí mismo"}`,
      );
    }

    if (oldState.serverMute !== newState.serverMute) {
      voiceChanges.push(
        `> ${newState.serverMute ? "Fue silenciado por el servidor" : "Se le quitó el silencio del servidor"}`,
      );
    }

    if (oldState.selfDeaf !== newState.selfDeaf) {
      voiceChanges.push(
        `> ${newState.selfDeaf ? "Se ensordeció a sí mismo" : "Se dejó de ensordecer a sí mismo"}`,
      );
    }

    if (oldState.serverDeaf !== newState.serverDeaf) {
      voiceChanges.push(
        `> ${newState.serverDeaf ? "Fue ensordecido por el servidor" : "Se le quitó la sordera del servidor"}`,
      );
    }

    if (voiceChanges.length > 0) {
      changes.push(`**🔇 Cambios de silencio/ensordecimiento:**\n${voiceChanges.join("\n")}`);
    }

    if (changes.length === 0) return;

    const container = new ContainerBuilder()
      .setAccentColor(0x3498db)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## 🎙️ Estado de voz actualizado"),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Se ha registrado un cambio de voz para <@${member.id}> (${member.user.tag}).`,
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
