const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const { getData } = require("../Client/dbManager");
const { handleBotAddition } = require("../Client/securityManager");

function renderTemplate(value, member) {
  if (value == null) return value;
  return String(value)
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{username}", member.user.username)
    .replaceAll("{tag}", member.user.tag)
    .replaceAll("{server}", member.guild.name)
    .replaceAll("{guild}", member.guild.name)
    .replaceAll("{memberCount}", String(member.guild.memberCount))
    .replaceAll("{membercount}", String(member.guild.memberCount));
}

function normalizeColor(color) {
  if (color == null) return undefined;
  if (typeof color === "number") return `#${color.toString(16).padStart(6, "0")}`;
  return color;
}

function buildEmbed(rawEmbed, member) {
  const embed = new EmbedBuilder();
  if (rawEmbed.title) embed.setTitle(renderTemplate(rawEmbed.title, member).slice(0, 256));
  if (rawEmbed.url) embed.setURL(renderTemplate(rawEmbed.url, member));
  if (rawEmbed.description) embed.setDescription(renderTemplate(rawEmbed.description, member).slice(0, 4096));
  if (rawEmbed.color != null) embed.setColor(normalizeColor(rawEmbed.color));
  if (rawEmbed.author?.name) {
    embed.setAuthor({
      name: renderTemplate(rawEmbed.author.name, member).slice(0, 256),
      iconURL: rawEmbed.author.icon_url,
      url: rawEmbed.author.url,
    });
  }
  if (rawEmbed.footer?.text) {
    embed.setFooter({
      text: renderTemplate(rawEmbed.footer.text, member).slice(0, 2048),
      iconURL: rawEmbed.footer.icon_url,
    });
  }
  if (rawEmbed.thumbnail?.url) embed.setThumbnail(renderTemplate(rawEmbed.thumbnail.url, member));
  if (rawEmbed.image?.url) embed.setImage(renderTemplate(rawEmbed.image.url, member));
  if (rawEmbed.timestamp) embed.setTimestamp();
  if (Array.isArray(rawEmbed.fields) && rawEmbed.fields.length > 0) {
    embed.addFields(rawEmbed.fields.slice(0, 25).map(field => ({
      name: renderTemplate(field.name || "\u200b", member).slice(0, 256),
      value: renderTemplate(field.value || "\u200b", member).slice(0, 1024),
      inline: Boolean(field.inline),
    })));
  }
  return embed;
}

function buildWelcomeSendOptions(welcomeConfig, member) {
  const payload = welcomeConfig.payload || {
    embeds: [{
      title: welcomeConfig.title,
      description: welcomeConfig.description,
      color: welcomeConfig.color,
      footer: welcomeConfig.footer ? { text: welcomeConfig.footer } : undefined,
      thumbnail: welcomeConfig.thumbnail ? { url: welcomeConfig.thumbnail } : undefined,
      image: welcomeConfig.image ? { url: welcomeConfig.image } : undefined,
      timestamp: true,
    }],
  };

  const options = {
    allowedMentions: { parse: ["users"], repliedUser: false },
  };

  if (payload.content) options.content = renderTemplate(payload.content, member).slice(0, 2000);
  if (Array.isArray(payload.embeds) && payload.embeds.length > 0) {
    options.embeds = payload.embeds
      .filter(rawEmbed => rawEmbed && Object.keys(rawEmbed).length > 0)
      .slice(0, 10)
      .map(rawEmbed => buildEmbed(rawEmbed, member));
  }

  return options;
}

module.exports = {
  name: "guildMemberAdd",
  on: true,
  /**
   * @param {import("discord.js").GuildMember} member
   * @param {import("discord.js").Client} client
   */
  async execute(member, client) {
    console.log(`[guildMemberAdd] Nuevo miembro: ${member.user.tag} en ${member.guild.name}`);

    await handleBotAddition(member.guild, member);

    const logsConfig = getData("logs", member.guild.id);
    if (logsConfig && logsConfig.logChannelId) {
      const logChannel = member.guild.channels.cache.get(logsConfig.logChannelId);
      if (logChannel) {
        const container = new ContainerBuilder()
          .setAccentColor(0x2ecc71)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Miembro unido al servidor"),
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `Se ha unido un nuevo miembro al servidor.\n\n` +
              `**Usuario:** <@${member.id}> (${member.user.tag})\n` +
              `**ID:** \`${member.id}\`\n` +
              `**Cuenta creada:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:F> (<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>)\n` +
              `**Miembro numero:** \`#${member.guild.memberCount}\`\n`,
            ),
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Fecha de ingreso:** <t:${Math.floor(Date.now() / 1000)}:F> (<t:${Math.floor(Date.now() / 1000)}:R>)`,
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

    const welcomeConfig = getData("welcome", member.guild.id);
    if (!welcomeConfig?.enabled || !welcomeConfig.channelId) {
      console.log(`[guildMemberAdd WELCOME] Bienvenida no configurada para ${member.guild.id}`);
      return;
    }

    // ── Asignar rol automático según si es humano o bot ──────────
    const isBot = member.user.bot;
    const roleId = isBot ? welcomeConfig.botRoleId : welcomeConfig.humanRoleId;
    if (roleId) {
      try {
        const role = member.guild.roles.cache.get(roleId)
          || await member.guild.roles.fetch(roleId).catch(() => null);
        if (role) {
          await member.roles.add(role, `Rol automático ${isBot ? 'bot' : 'humano'} — DashDash`);
          console.log(`[guildMemberAdd WELCOME] Rol "${role.name}" asignado a ${member.user.tag} (${isBot ? 'bot' : 'humano'})`);
        }
      } catch (err) {
        console.log(`[guildMemberAdd WELCOME] Error asignando rol: ${err.message}`);
      }
    }

    // Si es bot y welcomeBots está desactivado, no enviar mensaje
    if (isBot && welcomeConfig.welcomeBots === false) {
      console.log(`[guildMemberAdd WELCOME] Bot detectado y welcomeBots=false, no se envía mensaje.`);
      return;
    }

    const welcomeChannel = member.guild.channels.cache.get(welcomeConfig.channelId)
      || await client.channels.fetch(welcomeConfig.channelId).catch(() => null);

    if (!welcomeChannel) {
      console.log(`[guildMemberAdd WELCOME] Canal no encontrado: ${welcomeConfig.channelId}`);
      return;
    }

    const options = buildWelcomeSendOptions(welcomeConfig, member);
    if (!options.content && (!options.embeds || options.embeds.length === 0)) {
      console.log("[guildMemberAdd WELCOME] Payload vacio, no se envia mensaje.");
      return;
    }

    await welcomeChannel
      .send(options)
      .then(() => console.log("[guildMemberAdd WELCOME] Mensaje de bienvenida enviado"))
      .catch((error) => console.log(`[guildMemberAdd WELCOME] Error al enviar: ${error.message}`));

    // ── Contador de invitaciones ────────────────────────────────
    // Solo para humanos
    if (!isBot) {
      try {
        const counterConfig = getData("counter", member.guild.id);
        if (counterConfig?.enabled && counterConfig.channelId) {
          const counterChannel = member.guild.channels.cache.get(counterConfig.channelId)
            || await client.channels.fetch(counterConfig.channelId).catch(() => null);

          if (counterChannel) {
            // Buscar la invitación usada comparando con las existentes
            let inviterTag   = "Desconocido";
            let inviteCode   = "N/A";
            let inviteCount  = 0;
            let inviterUser  = null;

            try {
              const newInvites  = await member.guild.invites.fetch();
              const cachedInvites = client._inviteCache?.[member.guild.id] || new Map();

              // Encontrar cuál invite aumentó su uses
              for (const [code, invite] of newInvites) {
                const cached = cachedInvites.get(code);
                if (cached && invite.uses > cached.uses) {
                  inviteCode  = code;
                  inviteCount = invite.uses;
                  inviterUser = invite.inviter;
                  inviterTag  = invite.inviter?.tag || invite.inviter?.username || "Desconocido";
                  break;
                }
              }

              // Actualizar caché
              client._inviteCache = client._inviteCache || {};
              client._inviteCache[member.guild.id] = new Map(newInvites.map(inv => [inv.code, { uses: inv.uses }]));
            } catch {}

            // Obtener avatar del usuario (gif si animado, webp si estático)
            const avatarUrl = member.user.displayAvatarURL({ size: 128, forceStatic: false, extension: "webp" });
            const isAnimatedAvatar = member.user.avatar?.startsWith("a_");
            const finalAvatarUrl = isAnimatedAvatar
              ? member.user.displayAvatarURL({ size: 128, forceStatic: false, extension: "gif" })
              : avatarUrl;

            // Reemplazar variables
            const replaceCounterVars = (text) => String(text || "")
              .replace(/\{user\}/gi, `<@${member.user.id}>`)
              .replace(/\{username\}/gi, member.user.username)
              .replace(/\{inviter\}/gi, inviterTag)
              .replace(/\{inviteCount\}/gi, String(inviteCount))
              .replace(/\{inviteCode\}/gi, inviteCode);

            const colorHex = counterConfig.color || "#57f287";
            const colorInt = parseInt(colorHex.replace("#", ""), 16) || 0x57f287;

            const embed = new EmbedBuilder()
              .setTitle(replaceCounterVars(counterConfig.title))
              .setDescription(replaceCounterVars(counterConfig.description))
              .setColor(colorInt)
              .setTimestamp();

            if (counterConfig.footer) embed.setFooter({ text: counterConfig.footer });
            if (counterConfig.showAvatar !== false) embed.setThumbnail(finalAvatarUrl);

            await counterChannel.send({
              embeds: [embed],
              allowedMentions: { parse: ["users"], repliedUser: false },
            });

            console.log(`[COUNTER] Registro de invitación: ${member.user.tag} invitado por ${inviterTag} con código ${inviteCode}`);

            // Guardar en DB para historial
            const history = getData("counter_history", member.guild.id) || [];
            history.unshift({
              id:          `${Date.now()}_${member.id}`,
              userId:      member.user.id,
              userTag:     member.user.tag,
              avatarUrl:   finalAvatarUrl,
              inviterTag,
              inviteCode,
              inviteCount,
              joinedAt:    new Date().toISOString(),
            });
            const { setData } = require("../Client/dbManager");
            setData("counter_history", member.guild.id, history.slice(0, 500));
          }
        }
      } catch (err) {
        console.error(`[COUNTER] Error al registrar invitación: ${err.message}`);
      }
    }
  },
};
