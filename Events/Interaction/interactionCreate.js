const {
  Events,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");
const { getData } = require("../Client/dbManager");
require("colors");

module.exports = {
  name: Events.InteractionCreate,
  on: true,
  /**
   *
   * @param {import("discord.js").Interaction} interaction
   * @param {import("discord.js").Client} client
   */
  async execute(interaction, client) {
    if (interaction.isStringSelectMenu()) {
      const guild = interaction.guild;
      if (!guild) return;

      if (interaction.customId !== "open_ticket_select") return;

      const ticketConfig = getData("tickets", guild.id) || {};
      let category = guild.channels.cache.get(ticketConfig.categoryId);

      if (!category) {
        category = guild.channels.cache.find(
          (channel) =>
            channel.type === ChannelType.GuildCategory &&
            channel.name.toLowerCase().includes("tickets"),
        );
      }

      if (!category) {
        category = await guild.channels.create({
          name: "🎫 Tickets",
          type: ChannelType.GuildCategory,
          reason: "Crear categoría para tickets.",
        }).catch(() => null);
      }

      const selected = interaction.values[0];
      const ticketNames = {
        support: "Soporte",
        panel_completo: "Panel Completo",
        panel_basico: "Panel Básico",
        uid: "UID",
        bypass_uid: "Bypass UID",
      };
      const ticketLabel = ticketNames[selected] || "Soporte";
      const ticketName = `ticket-${selected}-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12)}-${interaction.user.discriminator}`;

      const existing = guild.channels.cache.find(
        (channel) =>
          channel.name === ticketName && channel.parentId === category?.id,
      );

      if (existing) {
        return interaction.reply({
          content: `Ya tienes un ticket abierto: ${existing}`,
          ephemeral: true,
        });
      }

      const ticketChannel = await guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        parent: category?.id || undefined,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
            ],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
            ],
          },
        ],
        reason: `Ticket de ${ticketLabel} abierto por el sistema de tickets.`,
      }).catch(() => null);

      if (!ticketChannel) {
        return interaction.reply({
          content: "No se pudo abrir el ticket. Revisa los permisos del bot.",
          ephemeral: true,
        });
      }

      const ticketEmbed = new EmbedBuilder()
        .setTitle("🎟️ Ticket creado")
        .setDescription(
          `Hola ${interaction.user}, tu ticket de **${ticketLabel}** ha sido creado. Nuestro equipo te atenderá aquí.`,
        )
        .setColor(0x5865f2)
        .setFooter({ text: "Presiona el botón de cerrar cuando termines." })
        .setTimestamp();

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("Cerrar ticket")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🔒"),
      );

      await ticketChannel.send({ embeds: [ticketEmbed], components: [closeRow] }).catch(() => null);

      return interaction.reply({
        content: `✅ Ticket creado en ${ticketChannel}`,
        ephemeral: true,
      });
    }

    if (interaction.isButton()) {
      const guild = interaction.guild;
      if (!guild) return;

      const ticketConfig = getData("tickets", guild.id) || {};
      let category = guild.channels.cache.get(ticketConfig.categoryId);

      if (!category) {
        category = guild.channels.cache.find(
          (channel) =>
            channel.type === ChannelType.GuildCategory &&
            channel.name.toLowerCase().includes("tickets"),
        );
      }

      if (interaction.customId === "open_ticket") {
        if (!category) {
          category = await guild.channels.create({
            name: "🎫 Tickets",
            type: ChannelType.GuildCategory,
            reason: "Crear categoría para tickets.",
          }).catch(() => null);
        }

        const ticketName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12)}-${interaction.user.discriminator}`;
        const existing = guild.channels.cache.find(
          (channel) =>
            channel.name === ticketName && channel.parentId === category?.id,
        );

        if (existing) {
          return interaction.reply({
            content: `Ya tienes un ticket abierto: ${existing}`,
            ephemeral: true,
          });
        }

        const ticketChannel = await guild.channels.create({
          name: ticketName,
          type: ChannelType.GuildText,
          parent: category?.id || undefined,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
              ],
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
              ],
            },
          ],
          reason: "Ticket abierto por el sistema de tickets.",
        }).catch(() => null);

        if (!ticketChannel) {
          return interaction.reply({
            content: "No se pudo abrir el ticket. Revisa los permisos del bot.",
            ephemeral: true,
          });
        }

        const ticketEmbed = new EmbedBuilder()
          .setTitle("🎟️ Ticket creado")
          .setDescription(
            `Hola ${interaction.user}, tu ticket ha sido creado. Nuestro equipo te atenderá aquí.`,
          )
          .setColor(0x5865f2)
          .setFooter({ text: "Presiona el botón de cerrar cuando termines." })
          .setTimestamp();

        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("Cerrar ticket")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("🔒"),
        );

        await ticketChannel.send({ embeds: [ticketEmbed], components: [closeRow] }).catch(() => null);

        return interaction.reply({
          content: `✅ Ticket creado en ${ticketChannel}`,
          ephemeral: true,
        });
      }

      if (interaction.customId === "close_ticket") {
        if (!interaction.channel || !interaction.channel.name.startsWith("ticket-")) {
          return interaction.reply({
            content: "Este botón solo se puede usar dentro de un ticket.",
            ephemeral: true,
          });
        }

        await interaction.reply({
          content: "Cerrando ticket...",
          ephemeral: true,
        });

        return interaction.channel.delete().catch(() => null);
      }

      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.slashCommands.get(interaction.commandName);

    if (!command) {
      const container = new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `El comando \`\`${interaction.commandName}\`\` no existe o ha sido eliminado...`,
          ),
        );

      return interaction.reply({
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(
        `❌ Error al ejecutar el comando \`\`${interaction.commandName}\`\`: ${error.message}`,
      );

      if (interaction.replied || interaction.deferred) {
        const container = new ContainerBuilder()
          .setAccentColor(0xff0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `Ocurrió un error al ejecutar el comando \`\`${interaction.commandName}\`\`. Por favor, inténtalo de nuevo más tarde.`,
            ),
          );

        await interaction.followUp({
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          components: [container],
          allowedMentions: { repliedUser: false },
        });
      } else {
        const container = new ContainerBuilder()
          .setAccentColor(0xff0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `Ocurrió un error al ejecutar el comando \`\`${interaction.commandName}\`\`. Por favor, inténtalo de nuevo más tarde.`,
            ),
          );

        await interaction.reply({
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          components: [container],
          allowedMentions: { repliedUser: false },
        });
      }
    }
  },
};
