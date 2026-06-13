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

// Guarda un evento de seguridad en security_logs.json para el dashboard
function logSecurityEvent(guildId, type, detail) {
  try {
    const logsPath = path.join(process.cwd(), "Database", "security_logs.json");
    let all = {};
    if (fs.existsSync(logsPath)) {
      all = JSON.parse(fs.readFileSync(logsPath, "utf8"));
    }
    const guildLogs = all[guildId] || [];
    guildLogs.push({ ts: new Date().toISOString(), type, detail });
    all[guildId] = guildLogs.slice(-500);
    fs.writeFileSync(logsPath, JSON.stringify(all, null, 2));
  } catch {}
}

function getConfig(guildId) {
  const config = getData("antinuke", guildId) || {};
  return {
    enabled: config.enabled || false,
    logChannelId: config.logChannelId,
    threshold: config.threshold || 3,
    window: config.window || 15000,
    spamWindow: config.spamWindow || 10000,
    maxMessages: config.maxMessages || 5,
    maxLinks: config.maxLinks || 3,
    whitelists: config.whitelists || { users: [], roles: [] },
    modules: config.modules || {
      antiBan: true,
      antiKick: true,
      antiChannel: true,
      antiRole: true,
      antiEmoji: true,
      antiWebhook: true,
      antiVanity: true,
      antiBot: true,
      antiSpam: true,
    },
    thresholds: config.thresholds || {
      ban: 3,
      kick: 5,
      channelCreate: 3,
      channelDelete: 3,
      roleCreate: 3,
      roleDelete: 3,
      emojiDelete: 5,
      webhookCreate: 3,
    },
    punishment: config.punishment || { type: "ban", duration: null },
  };
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
    const config = getConfig(guild.id);
    const me = guild.members.me;
    if (!me?.permissions.has(PermissionsBitField.Flags.BanMembers)) return false;

    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (member && !member.bannable) return false;

    if (config.punishment.type === "ban") {
      await guild.members.ban(executor.id, { reason, deleteMessageSeconds: config.punishment.duration });
    } else if (config.punishment.type === "kick") {
      await member.kick(reason);
    }
    return true;
  } catch {
    return false;
  }
}

function isWhitelisted(guild, executor) {
  const config = getConfig(guild.id);
  if (config.whitelists.users.includes(executor.id)) return true;
  if (executor.roles?.cache.some(role => config.whitelists.roles.includes(role.id))) return true;
  return false;
}

function isTrustedExecutor(guild, executor) {
  if (!executor || executor.bot) return true;
  if (executor.id === guild.ownerId) return true;
  if (executor.id === guild.members.me?.id) return true;
  if (isWhitelisted(guild, executor)) return true;
  return false;
}

async function handleSecurityAction(guild, executor, action, target) {
  const config = getConfig(guild.id);
  if (!config.enabled) return;
  if (!config.modules[`anti${action.charAt(0).toUpperCase() + action.slice(1)}`]) return;
  if (isTrustedExecutor(guild, executor)) return;

  const state = readState();
  const guildState = state[guild.id] || { actions: [] };
  const now = Date.now();
  guildState.actions = guildState.actions.filter(
    (entry) => now - entry.timestamp < config.window,
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
    (entry) => entry.executorId === executor.id && entry.action === action,
  );

  const threshold = config.thresholds[action] || config.threshold;
  if (recentActions.length >= threshold) {
    const reason = `Protección AntiNuke activada: ${recentActions.length} acciones de ${action} en ${config.window / 1000}s.`;
    const punished = await punishExecutor(guild, executor, reason);

    const description =
      `Se ha detectado un posible ataque de seguridad.\n\n` +
      `**👤 Usuario sospechoso:** <@${executor.id}>\n` +
      `**ID:** \`${executor.id}\`\n` +
      `**Acción:** ${action}\n` +
      `**Objetivo:** ${target}\n` +
      `**Conteo de acciones:** ${recentActions.length}\n` +
      `**Umbral:** ${threshold}\n` +
      `**Resultado:** ${punished ? "Usuario sancionado automáticamente." : "No se pudo sancionar automáticamente."}`;

    sendProtectionReport(guild, "AntiNuke activado", description);
    logSecurityEvent(guild.id, "antinuke", `${action} por ${executor.id} (${executor.tag || executor.id}) — objetivo: ${target} — sancionado: ${punished}`);

    guildState.actions = guildState.actions.filter(
      (entry) => entry.executorId !== executor.id,
    );
    writeState(state);
  }
}

async function handleSpamDetection(guild, message) {
  const config = getConfig(guild.id);
  if (!config.enabled || !config.modules.antiSpam) return;
  if (isTrustedExecutor(guild, message.author)) return;

  const state = readState();
  const guildState = state[guild.id] || { spam: {} };
  const userSpam = guildState.spam[message.author.id] || { messages: [], links: {} };
  const now = Date.now();

  // Clean old messages
  userSpam.messages = userSpam.messages.filter(
    (entry) => now - entry.timestamp < config.spamWindow,
  );

  // Add current message
  userSpam.messages.push({
    content: message.content,
    timestamp: now,
  });

  // Check for repetitive links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const links = message.content.match(urlRegex) || [];
  links.forEach((link) => {
    userSpam.links[link] = (userSpam.links[link] || 0) + 1;
  });

  const repeatedLinks = Object.values(userSpam.links).filter((count) => count >= config.maxLinks);

  if (userSpam.messages.length >= config.maxMessages || repeatedLinks.length > 0) {
    // Spam detected
    const reason = `Spam detectado: ${userSpam.messages.length} mensajes en ${config.spamWindow / 1000}s o enlaces repetitivos.`;
    const punished = await punishExecutor(guild, message.author, reason);

    const description =
      `Se ha detectado spam.\n\n` +
      `**👤 Usuario sospechoso:** <@${message.author.id}>\n` +
      `**ID:** \`${message.author.id}\`\n` +
      `**Canal:** <#${message.channel.id}>\n` +
      `**Mensajes recientes:** ${userSpam.messages.length}\n` +
      `**Enlaces repetitivos:** ${repeatedLinks.length > 0 ? "Sí" : "No"}\n` +
      `**Resultado:** ${punished ? "Usuario sancionado automáticamente." : "No se pudo sancionar automáticamente."}`;

    sendProtectionReport(guild, "Spam detectado", description);
    logSecurityEvent(guild.id, "spam", `Spam de ${message.author.id} (${message.author.tag}) en #${message.channel.name} — sancionado: ${punished}`);

    // Delete the spam message
    try {
      await message.delete();
    } catch {}

    // Reset user spam
    delete guildState.spam[message.author.id];
  } else {
    guildState.spam[message.author.id] = userSpam;
  }

  state[guild.id] = guildState;
  writeState(state);
}

async function handleBotAddition(guild, member) {
  const config = getConfig(guild.id);
  if (!config.enabled || !config.modules.antiBot || !member.user.bot) return;

  // Check if bot is whitelisted or added by trusted user
  // For simplicity, assume if not whitelisted, ban
  if (!isWhitelisted(guild, member)) {
    const reason = "Bot no autorizado agregado al servidor.";
    const punished = await punishExecutor(guild, member, reason);

    const description =
      `Bot sospechoso agregado.\n\n` +
      `**🤖 Bot:** <@${member.id}>\n` +
      `**ID:** \`${member.id}\`\n` +
      `**Resultado:** ${punished ? "Bot baneado." : "No se pudo banear."}`;

    sendProtectionReport(guild, "Bot sospechoso", description);
    logSecurityEvent(guild.id, "antibot", `Bot no autorizado: ${member.id} (${member.user?.tag || member.id})`);
  }
}

async function handleVanityChange(guild, oldGuild, newGuild) {
  const config = getConfig(guild.id);
  if (!config.enabled || !config.modules.antiVanity) return;
  if (oldGuild.vanityURLCode === newGuild.vanityURLCode) return;

  // Find who changed it - this might require audit logs
  // For simplicity, assume we can't track executor easily, so just revert
  try {
    await guild.edit({ vanityURLCode: oldGuild.vanityURLCode });
    sendProtectionReport(guild, "Cambio de Vanity bloqueado", "Se intentó cambiar la URL personalizada del servidor. Acción revertida.");
    logSecurityEvent(guild.id, "antivanity", `Cambio de vanity bloqueado y revertido a: ${oldGuild.vanityURLCode}`);
  } catch {}
}

module.exports = {
  handleSecurityAction,
  handleSpamDetection,
  handleBotAddition,
  handleVanityChange,
  getConfig,
  isWhitelisted,
  logSecurityEvent,
};
