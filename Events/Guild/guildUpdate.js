const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require("discord.js");
const { getData } = require("../Client/dbManager");
const { handleVanityChange } = require("../Client/securityManager");

module.exports = {
  name: "guildUpdate",
  on: true,
  /**
   * @param {import("discord.js").Guild} oldGuild
   * @param {import("discord.js").Guild} newGuild
   * @param {import("discord.js").Client} client
   */
  async execute(oldGuild, newGuild, client) {
    console.log(`[LOG] guildUpdate ejecutado - Servidor: ${newGuild.name}`);

    // Handle vanity change for anti-nuke
    await handleVanityChange(newGuild, oldGuild, newGuild);

    const config = getData("logs", newGuild.id);
    if (!config || !config.logChannelId) return;

    const logChannel = newGuild.channels.cache.get(config.logChannelId);
    if (!logChannel) return;

    let changes = [];

    if (oldGuild.name !== newGuild.name) {
      changes.push(`**Nombre:** ${oldGuild.name} → ${newGuild.name}`);
    }

    if (oldGuild.icon !== newGuild.icon) {
      changes.push(`**Icono:** ${oldGuild.icon ? `[Antiguo](${oldGuild.iconURL()})` : "Ninguno"} → ${newGuild.icon ? `[Nuevo](${newGuild.iconURL()})` : "Ninguno"}`);
    }

    if (oldGuild.banner !== newGuild.banner) {
      changes.push(`**Banner:** ${oldGuild.banner ? `[Antiguo](${oldGuild.bannerURL()})` : "Ninguno"} → ${newGuild.banner ? `[Nuevo](${newGuild.bannerURL()})` : "Ninguno"}`);
    }

    if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
      changes.push(`**Vanity URL:** ${oldGuild.vanityURLCode || "Ninguna"} → ${newGuild.vanityURLCode || "Ninguna"}`);
    }

    if (changes.length === 0) return;

    const container = new ContainerBuilder()
      .setAccentColor(0x3498db)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## 🔄 Servidor Actualizado"),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Se han realizado cambios en la configuración del servidor.\n\n${changes.join("\n")}`,
        ),
      )
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
      .catch((err) => console.log(`[LOG] ❌ Error al enviar log: ${err.message}`));
  },
};