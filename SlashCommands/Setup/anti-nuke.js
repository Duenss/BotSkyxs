const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");
const { setData, getData } = require("../../Events/Client/dbManager");
const { isWhitelisted } = require("../../Events/Client/securityManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("anti-nuke")
    .setDescription("Configura la protección AntiNuke del servidor.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set-json")
        .setDescription("Configura AntiNuke adjuntando un archivo JSON.")
        .addAttachmentOption((option) =>
          option
            .setName("json_file")
            .setDescription("Archivo JSON con la configuración de AntiNuke.")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("enable")
        .setDescription("Activa la protección AntiNuke.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Canal donde se enviarán los avisos de seguridad.")
            .addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Desactiva la protección AntiNuke."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Muestra el estado actual de AntiNuke."),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("whitelist")
        .setDescription("Gestiona la lista blanca de AntiNuke.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("add")
            .setDescription("Agrega un usuario o rol a la whitelist.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("Usuario a agregar a la whitelist.")
                .setRequired(false),
            )
            .addRoleOption((option) =>
              option
                .setName("role")
                .setDescription("Rol a agregar a la whitelist.")
                .setRequired(false),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("remove")
            .setDescription("Remueve un usuario o rol de la whitelist.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("Usuario a remover de la whitelist.")
                .setRequired(false),
            )
            .addRoleOption((option) =>
              option
                .setName("role")
                .setDescription("Rol a remover de la whitelist.")
                .setRequired(false),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("list")
            .setDescription("Muestra la lista blanca actual."),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("module")
        .setDescription("Gestiona los módulos de AntiNuke.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("enable")
            .setDescription("Activa un módulo específico.")
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("Nombre del módulo.")
                .setRequired(true)
                .addChoices(
                  { name: "Anti-Ban", value: "antiBan" },
                  { name: "Anti-Kick", value: "antiKick" },
                  { name: "Anti-Channel", value: "antiChannel" },
                  { name: "Anti-Role", value: "antiRole" },
                  { name: "Anti-Emoji", value: "antiEmoji" },
                  { name: "Anti-Webhook", value: "antiWebhook" },
                  { name: "Anti-Vanity", value: "antiVanity" },
                  { name: "Anti-Bot", value: "antiBot" },
                  { name: "Anti-Spam", value: "antiSpam" },
                ),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("disable")
            .setDescription("Desactiva un módulo específico.")
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("Nombre del módulo.")
                .setRequired(true)
                .addChoices(
                  { name: "Anti-Ban", value: "antiBan" },
                  { name: "Anti-Kick", value: "antiKick" },
                  { name: "Anti-Channel", value: "antiChannel" },
                  { name: "Anti-Role", value: "antiRole" },
                  { name: "Anti-Emoji", value: "antiEmoji" },
                  { name: "Anti-Webhook", value: "antiWebhook" },
                  { name: "Anti-Vanity", value: "antiVanity" },
                  { name: "Anti-Bot", value: "antiBot" },
                  { name: "Anti-Spam", value: "antiSpam" },
                ),
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("threshold")
        .setDescription("Establece el umbral para una acción específica.")
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Acción a configurar.")
            .setRequired(true)
            .addChoices(
              { name: "Ban", value: "ban" },
              { name: "Kick", value: "kick" },
              { name: "Crear Canal", value: "channelCreate" },
              { name: "Eliminar Canal", value: "channelDelete" },
              { name: "Crear Rol", value: "roleCreate" },
              { name: "Eliminar Rol", value: "roleDelete" },
              { name: "Eliminar Emoji", value: "emojiDelete" },
              { name: "Crear Webhook", value: "webhookCreate" },
            ),
        )
        .addIntegerOption((option) =>
          option
            .setName("value")
            .setDescription("Nuevo umbral.")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(20),
        ),
    )
    .setContexts(0)
    .setIntegrationTypes(0),

  async execute(interaction) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator,
      )
    ) {
      const container = new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "⚠️ Solo los administradores pueden usar este comando.",
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    const subcommandGroup = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();
    const config = getData("antinuke", interaction.guild.id) || {};

    if (subcommand === "set-json") {
      const attachment = interaction.options.getAttachment("json_file");

      if (!attachment || !attachment.contentType?.includes("application/json")) {
        return interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          content: "⚠️ Debes adjuntar un archivo JSON válido.",
          allowedMentions: { repliedUser: false },
        });
      }

      try {
        const response = await fetch(attachment.url);
        const jsonData = await response.json();

        // Validate and set defaults
        const newConfig = {
          enabled: jsonData.enabled !== undefined ? jsonData.enabled : true,
          logChannelId: jsonData.logChannelId,
          threshold: jsonData.threshold || 3,
          window: jsonData.window || 15000,
          spamWindow: jsonData.spamWindow || 10000,
          maxMessages: jsonData.maxMessages || 5,
          maxLinks: jsonData.maxLinks || 3,
          whitelists: jsonData.whitelists || { users: [], roles: [] },
          modules: jsonData.modules || {
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
          thresholds: jsonData.thresholds || {
            ban: 3,
            kick: 5,
            channelCreate: 3,
            channelDelete: 3,
            roleCreate: 3,
            roleDelete: 3,
            emojiDelete: 5,
            webhookCreate: 3,
          },
          punishment: jsonData.punishment || { type: "ban", duration: null },
        };

        setData("antinuke", interaction.guild.id, newConfig);

        const container = new ContainerBuilder()
          .setAccentColor(0x2ecc71)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `✅ Configuración AntiNuke actualizada.`,
            ),
          );

        return interaction.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [container],
          allowedMentions: { repliedUser: false },
        });
      } catch (error) {
        return interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          content: "⚠️ Error al procesar el archivo JSON. Asegúrate de que sea válido.",
          allowedMentions: { repliedUser: false },
        });
      }
    }

    if (subcommand === "enable") {
      const channel =
        interaction.options.getChannel("channel") || interaction.channel;
      const newConfig = {
        ...config,
        enabled: true,
        logChannelId: channel.id,
      };
      setData("antinuke", interaction.guild.id, newConfig);

      const container = new ContainerBuilder()
        .setAccentColor(0x2ecc71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `✅ Protección AntiNuke activada. Los avisos se enviarán en ${channel}.`,
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    if (subcommand === "disable") {
      setData("antinuke", interaction.guild.id, { ...config, enabled: false });

      const container = new ContainerBuilder()
        .setAccentColor(0xf1c40f)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "✅ Protección AntiNuke desactivada.",
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    if (subcommandGroup === "whitelist") {
      if (subcommand === "add") {
        const user = interaction.options.getUser("user");
        const role = interaction.options.getRole("role");

        if (!user && !role) {
          return interaction.reply({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            content: "⚠️ Debes especificar un usuario o rol.",
            allowedMentions: { repliedUser: false },
          });
        }

        const whitelists = config.whitelists || { users: [], roles: [] };
        if (user && !whitelists.users.includes(user.id)) {
          whitelists.users.push(user.id);
        }
        if (role && !whitelists.roles.includes(role.id)) {
          whitelists.roles.push(role.id);
        }

        setData("antinuke", interaction.guild.id, { ...config, whitelists });

        const container = new ContainerBuilder()
          .setAccentColor(0x2ecc71)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `✅ ${user ? `Usuario ${user.tag}` : `Rol ${role.name}`} agregado a la whitelist.`,
            ),
          );

        return interaction.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [container],
          allowedMentions: { repliedUser: false },
        });
      }

      if (subcommand === "remove") {
        const user = interaction.options.getUser("user");
        const role = interaction.options.getRole("role");

        if (!user && !role) {
          return interaction.reply({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            content: "⚠️ Debes especificar un usuario o rol.",
            allowedMentions: { repliedUser: false },
          });
        }

        const whitelists = config.whitelists || { users: [], roles: [] };
        if (user) {
          whitelists.users = whitelists.users.filter(id => id !== user.id);
        }
        if (role) {
          whitelists.roles = whitelists.roles.filter(id => id !== role.id);
        }

        setData("antinuke", interaction.guild.id, { ...config, whitelists });

        const container = new ContainerBuilder()
          .setAccentColor(0x2ecc71)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `✅ ${user ? `Usuario ${user.tag}` : `Rol ${role.name}`} removido de la whitelist.`,
            ),
          );

        return interaction.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [container],
          allowedMentions: { repliedUser: false },
        });
      }

      if (subcommand === "list") {
        const whitelists = config.whitelists || { users: [], roles: [] };
        const users = whitelists.users.map(id => `<@${id}>`).join(", ") || "Ninguno";
        const roles = whitelists.roles.map(id => `<@&${id}>`).join(", ") || "Ninguno";

        const container = new ContainerBuilder()
          .setAccentColor(0x3498db)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## 📋 Lista Blanca AntiNuke"),
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Usuarios:** ${users}\n**Roles:** ${roles}`,
            ),
          );

        return interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container],
          allowedMentions: { repliedUser: false },
        });
      }
    }

    if (subcommandGroup === "module") {
      const moduleName = interaction.options.getString("name");
      const modules = config.modules || {
        antiBan: true,
        antiKick: true,
        antiChannel: true,
        antiRole: true,
        antiEmoji: true,
        antiWebhook: true,
        antiVanity: true,
        antiBot: true,
        antiSpam: true,
      };

      if (subcommand === "enable") {
        modules[moduleName] = true;
      } else {
        modules[moduleName] = false;
      }

      setData("antinuke", interaction.guild.id, { ...config, modules });

      const container = new ContainerBuilder()
        .setAccentColor(0x2ecc71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `✅ Módulo ${moduleName} ${subcommand === "enable" ? "activado" : "desactivado"}.`,
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    if (subcommand === "threshold") {
      const action = interaction.options.getString("action");
      const value = interaction.options.getInteger("value");

      const thresholds = config.thresholds || {
        ban: 3,
        kick: 5,
        channelCreate: 3,
        channelDelete: 3,
        roleCreate: 3,
        roleDelete: 3,
        emojiDelete: 5,
        webhookCreate: 3,
      };

      thresholds[action] = value;

      setData("antinuke", interaction.guild.id, { ...config, thresholds });

      const container = new ContainerBuilder()
        .setAccentColor(0x2ecc71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `✅ Umbral para ${action} establecido en ${value}.`,
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    if (subcommand === "status") {
      const enabled = config.enabled ? "✅ Activada" : "❌ Desactivada";
      const channelMention = config.logChannelId
        ? `<#${config.logChannelId}>`
        : "No configurado";

      const whitelists = config.whitelists || { users: [], roles: [] };
      const usersCount = whitelists.users.length;
      const rolesCount = whitelists.roles.length;

      const modules = config.modules || {
        antiBan: true,
        antiKick: true,
        antiChannel: true,
        antiRole: true,
        antiEmoji: true,
        antiWebhook: true,
        antiVanity: true,
        antiBot: true,
        antiSpam: true,
      };

      const activeModules = Object.entries(modules).filter(([k, v]) => v).map(([k]) => k).join(", ");

      const thresholds = config.thresholds || {
        ban: 3,
        kick: 5,
        channelCreate: 3,
        channelDelete: 3,
        roleCreate: 3,
        roleDelete: 3,
        emojiDelete: 5,
        webhookCreate: 3,
      };

      const thresholdsText = Object.entries(thresholds).map(([k, v]) => `${k}: ${v}`).join(", ");

      const container = new ContainerBuilder()
        .setAccentColor(config.enabled ? 0x2ecc71 : 0xe74c3c)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("## 🔐 Estado AntiNuke"),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Estado:** ${enabled}\n` +
            `**Canal de avisos:** ${channelMention}\n` +
            `**Whitelist:** ${usersCount} usuarios, ${rolesCount} roles\n` +
            `**Módulos activos:** ${activeModules}\n` +
            `**Umbrales:** ${thresholdsText}\n` +
            `**Ventana de spam:** ${config.spamWindow / 1000 || 10} segundos\n` +
            `**Máx mensajes:** ${config.maxMessages || 5}\n` +
            `**Máx enlaces repetitivos:** ${config.maxLinks || 3}`,
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }
  },
};
