const fs = require("fs");
const path = require("path");
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  PermissionsBitField,
} = require("discord.js");
const { getData } = require("./dbManager");

const storagePath = path.join(process.cwd(), "Database", "antinuke.json");

function readState() {
  if (!fs.existsSync(storagePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(storagePath, "utf8")) || {};
  } catch {
    return {};
  }
}

function writeState(state) {
  fs.writeFileSync(storagePath, JSON.stringify(state, null, 2));
}

function getConfig(guildId) {
  return getData("antinuke", guildId) || { enabled: false, threshold: 3 };
}

function getLogChannel(guild) {
  const config = getConfig(guild.id);
  const logChannelId = config.logChannelId;

  if (logChannelId) {
    return guild.channels.cache.get(logChannelId);
  }

  const fallback = getData("logs", guild.id);
  return fallback?.logChannelId ? guild.channels.cache.get(fallback.logChannelId) : null;
}

function sendProtectionReport(guild, title, description) {
  const logChannel = getLogChannel(guild);
  if (!logChannel) return;

  const container = new ContainerBuilder()
    .setAccentColor(0xe74c3c)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## 🚨 ${title}`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(description))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `⏱️ **Fecha:** <t:${Math.floor(Date.now() / 1000)}:F> (<t:${Math.floor(Date.now() / 1000)}:R>)`,
      ),
    );

  logChannel
    .send({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions: { repliedUser: false },
    })
    .catch(() => null);
}

async function punishExecutor(guild, executor, reason) {
  try {
    const me = guild.members.me;
    if (!me?.permissions.has(PermissionsBitField.Flags.BanMembers)) return false;

    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (member && !member.bannable) return false;

    await guild.members.ban(executor.id, { reason });
    return true;
  } catch {
    return false;
  }
}

function isTrustedExecutor(guild, executor) {
  if (!executor || executor.bot) return true;
  if (executor.id === guild.ownerId) return true;
  if (executor.id === guild.members.me?.id) return true;
  return false;
}

async function handleSecurityAction(guild, executor, action, target) {
  const config = getConfig(guild.id);
  if (!config.enabled) return;
  if (isTrustedExecutor(guild, executor)) return;

  const state = readState();
  const guildState = state[guild.id] || { actions: [] };
  const now = Date.now();
  guildState.actions = guildState.actions.filter(
    (entry) => now - entry.timestamp < (config.window || 15000),
  );
  guildState.actions.push({
    executorId: executor.id,
    action,
    target,
    timestamp: now,
  });

  state[guild.id] = guildState;
  writeState(state);

  const recentActions = guildState.actions.filter(
    (entry) => entry.executorId === executor.id,
  );

  if (recentActions.length >= (config.threshold || 3)) {
    const reason = `Protección AntiNuke activada después de ${recentActions.length} acciones destructivas.`;
    const punished = await punishExecutor(guild, executor, reason);

    const description =
      `Se ha detectado un posible ataque de seguridad.\n\n` +
      `**👤 Usuario sospechoso:** <@${executor.id}>\n` +
      `**ID:** \`${executor.id}\`\n` +
      `**Acción:** ${action}\n` +
      `**Objetivo:** ${target}\n` +
      `**Conteo de acciones:** ${recentActions.length}\n` +
      `**Resultado:** ${punished ? "Usuario sancionado automáticamente." : "No se pudo sancionar automáticamente."}`;

    sendProtectionReport(guild, "AntiNuke activado", description);

    guildState.actions = guildState.actions.filter(
      (entry) => entry.executorId !== executor.id,
    );
    writeState(state);
  }
}

module.exports = {
  handleSecurityAction,
  getConfig,
};
