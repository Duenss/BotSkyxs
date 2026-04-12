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

    console.log(`[LOG ACTIVIDAD VOZ] Voice state update para ${(newState.member || oldState.member)?.user?.tag}`);

    const config = getData("logs", guild.id);
    console.log(`[LOG ACTIVIDAD VOZ] Config de logs: ${config ? "✅ Configurado" : "❌ No configurado"}`);
    if (!config || !config.logChannelId) return;

    const logChannel = guild.channels.cache.get(config.logChannelId);
    if (!logChannel) {
      console.log(`[LOG ACTIVIDAD VOZ] ❌ Canal de logs no encontrado con ID: ${config.logChannelId}`);
      return;
    }
    console.log(`[LOG ACTIVIDAD VOZ] ✅ Canal encontrado: ${logChannel.name}#${logChannel.id}`);

    const member = newState.member || oldState.member;
    if (!member) return;

    const changes = [];

    if (oldState.channelId !== newState.channelId) {
      if (!oldState.channelId && newState.channelId) {
        const canalNombre = newState.channel?.name || "Desconocido";
        console.log(`[LOG ACTIVIDAD VOZ] 🟢 ENTRADA: ${member.user.tag} entró a #${canalNombre} (${newState.channelId})`);
        changes.push(`**🔊 Unión a canal de voz:** <#${newState.channelId}> por <@${member.id}> (${member.user.tag})`);
      } else if (oldState.channelId && !newState.channelId) {
        const canalNombreAnterior = oldState.channel?.name || "Desconocido";
        console.log(`[LOG ACTIVIDAD VOZ] 🔴 SALIDA: ${member.user.tag} salió de #${canalNombreAnterior} (${oldState.channelId})`);
        changes.push(`**📴 Salida del canal de voz:** <#${oldState.channelId}> por <@${member.id}> (${member.user.tag})`);
      } else {
        const canalAnterior = oldState.channel?.name || "Desconocido";
        const canalNuevo = newState.channel?.name || "Desconocido";
        console.log(`[LOG ACTIVIDAD VOZ] 🔄 CAMBIO: ${member.user.tag} cambió de #${canalAnterior} a #${canalNuevo}`);
        changes.push(
          `**🔀 Cambio de canal de voz:**\n> **Usuario:** <@${member.id}> (${member.user.tag})\n> **Antes:** <#${oldState.channelId}>\n> **Después:** <#${newState.channelId}>`,
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

    if (changes.length === 0) {
      console.log(`[LOG ACTIVIDAD VOZ] ⊘ Sin cambios relevantes, ignorado`);
      return;
    }

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
      .then(() => console.log(`[LOG ACTIVIDAD VOZ] ✅ Evento de voz registrado en ${logChannel.name}`))
      .catch((err) => console.log(`[LOG ACTIVIDAD VOZ] ❌ Error al enviar log: ${err.message}`));
  },
};
