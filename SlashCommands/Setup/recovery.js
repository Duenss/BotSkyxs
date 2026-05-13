const {
  SlashCommandBuilder,
  ChannelType,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  PermissionsBitField,
} = require("discord.js");
const { getData, setData } = require("../../Events/Client/dbManager");

function serializeRole(role) {
  return {
    name: role.name,
    color: role.hexColor,
    hoist: role.hoist,
    mentionable: role.mentionable,
    permissions: role.permissions.bitfield.toString(),
  };
}

function serializeChannel(channel) {
  return {
    name: channel.name,
    type: channel.type,
    topic: channel.topic || null,
    parentName: channel.parent?.name || null,
    nsfw: channel.nsfw || false,
    bitrate: channel.bitrate || null,
    userLimit: channel.userLimit || null,
    permissionOverwrites: channel.permissionOverwrites.cache.map((overwrite) => ({
      id: overwrite.id,
      type: overwrite.type,
      allow: overwrite.allow.bitfield.toString(),
      deny: overwrite.deny.bitfield.toString(),
    })),
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("recovery")
    .setDescription("Guarda y restaura un respaldo del servidor.")
    .addSubcommand((subcommand) =>
      subcommand.setName("snapshot").setDescription("Guarda un respaldo del servidor."),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("restore").setDescription("Restaura el último respaldo guardado."),
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

    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (subcommand === "snapshot") {
      const roles = guild.roles.cache
        .filter((role) => !role.managed && role.id !== guild.id)
        .map(serializeRole);

      const channels = guild.channels.cache
        .sort((a, b) => a.position - b.position)
        .map(serializeChannel);

      const numRoles = roles.length;
      const numCategories = channels.filter(c => c.type === ChannelType.GuildCategory).length;
      const numChannels = channels.length - numCategories;

      setData("recovery", guild.id, {
        snapshot: {
          createdAt: Date.now(),
          roles,
          channels,
        },
      });

      const container = new ContainerBuilder()
        .setAccentColor(0x2ecc71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `✅ Respaldo guardado correctamente.\n\n📊 **Datos guardados:**\n> 🏷️ **Roles:** ${numRoles}\n> 📁 **Categorías:** ${numCategories}\n> 💬 **Canales:** ${numChannels}\n\nAhora puedes restaurar el servidor si ocurre un raid.`,
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    const snapshotData = getData("recovery", guild.id)?.snapshot;

    if (!snapshotData) {
      const container = new ContainerBuilder()
        .setAccentColor(0xe74c3c)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "❌ No se encontró ningún respaldo previo. Usa /recovery snapshot primero.",
          ),
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    const existingRoles = new Set(guild.roles.cache.map((role) => role.name));
    const createdRoles = [];

    for (const roleData of snapshotData.roles) {
      if (existingRoles.has(roleData.name)) continue;
      try {
        await guild.roles.create({
          name: roleData.name,
          color: roleData.color,
          hoist: roleData.hoist,
          mentionable: roleData.mentionable,
          permissions: BigInt(roleData.permissions),
          reason: "Restauración de respaldo del servidor",
        });
        createdRoles.push(roleData.name);
      } catch {
        continue;
      }
    }

    const categoryMap = new Map();
    const categories = snapshotData.channels.filter(
      (channel) => channel.type === ChannelType.GuildCategory,
    );

    for (const categoryData of categories) {
      const existing = guild.channels.cache.find(
        (channel) =>
          channel.type === ChannelType.GuildCategory && channel.name === categoryData.name,
      );

      if (existing) {
        categoryMap.set(categoryData.name, existing.id);
        continue;
      }

      try {
        const created = await guild.channels.create({
          name: categoryData.name,
          type: ChannelType.GuildCategory,
          reason: "Restauración de categoría de respaldo",
        });
        categoryMap.set(categoryData.name, created.id);
      } catch {
        continue;
      }
    }

    let createdChannels = 0;
    const channels = snapshotData.channels.filter(
      (channel) => channel.type !== ChannelType.GuildCategory,
    );

    for (const channelData of channels) {
      const existing = guild.channels.cache.find(
        (channel) => channel.name === channelData.name && channel.type === channelData.type,
      );
      if (existing) continue;

      const parentId = channelData.parentName
        ? categoryMap.get(channelData.parentName)
        : null;

      try {
        const createdChannel = await guild.channels.create({
          name: channelData.name,
          type: channelData.type,
          topic: channelData.topic || undefined,
          parent: parentId || undefined,
          nsfw: channelData.nsfw,
          bitrate: channelData.bitrate || undefined,
          userLimit: channelData.userLimit || undefined,
          reason: "Restauración de canal de respaldo",
        });

        // Apply permission overwrites
        for (const overwrite of channelData.permissionOverwrites) {
          try {
            await createdChannel.permissionOverwrites.create(overwrite.id, {
              allow: BigInt(overwrite.allow),
              deny: BigInt(overwrite.deny),
            });
          } catch {
            // Skip if overwrite fails
          }
        }

        createdChannels += 1;
      } catch {
        continue;
      }
    }

    const container = new ContainerBuilder()
      .setAccentColor(0x3498db)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `✅ Restauración completa. Se recrearon ${createdRoles.length} roles nuevos y ${createdChannels} canales nuevos.`,
        ),
      );

    return interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions: { repliedUser: false },
    });
  },
};
