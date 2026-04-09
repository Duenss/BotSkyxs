const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("delete-channels")
    .setDescription("Elimina canales seleccionados o categorías completas.")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("¿Qué deseas eliminar?")
        .setRequired(true)
        .addChoices(
          { name: "Canales individuales", value: "channels" },
          { name: "Categoría completa", value: "category" }
        )
    )
    .setContexts(0)
    .setIntegrationTypes(0),

  async execute(interaction) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.ManageChannels
      )
    ) {
      const container = new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "⚠️ No tienes permiso para gestionar canales."
          )
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    const type = interaction.options.getString("type");

    if (type === "channels") {
      // Obtener todos los canales del servidor (excepto categorías)
      const channels = interaction.guild.channels.cache
        .filter((ch) => ch.type !== 4) // Tipo 4 es categoría
        .map((channel) => ({
          label: channel.name.substring(0, 100),
          value: channel.id,
          description: `#${channel.name} (${channel.type === 0 ? "Texto" : channel.type === 2 ? "Voz" : "Otro"})`.substring(0, 100),
        }))
        .slice(0, 25); // Discord permite máximo 25 opciones

      if (channels.length === 0) {
        const container = new ContainerBuilder()
          .setAccentColor(0xff9800)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "❌ No hay canales para eliminar."
            )
          );

        return interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container],
          allowedMentions: { repliedUser: false },
        });
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_channels_delete")
        .setPlaceholder("Selecciona los canales a eliminar...")
        .setMinValues(1)
        .setMaxValues(Math.min(5, channels.length)); // Máximo 5 canales al mismo tiempo

      channels.forEach((channel) => {
        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(channel.label)
            .setValue(channel.value)
            .setDescription(channel.description)
        );
      });

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const container = new ContainerBuilder()
        .setAccentColor(0x3498db)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "📋 Selecciona los canales que deseas eliminar (máximo 5):"
          )
        );

      const response = await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [row, container],
        ephemeral: true,
      });

      // Esperar la selección (60 segundos)
      const filter = (i) => i.customId === "select_channels_delete" && i.user.id === interaction.user.id;
      const collected = await response.awaitMessageComponent({ filter, time: 60000 }).catch(() => null);

      if (!collected) {
        return interaction.editReply({
          content: "⏱️ Se agotó el tiempo de espera.",
          components: [],
        });
      }

      const selectedChannelIds = collected.values;

      // Crear botones de confirmación
      const confirmButton = new ButtonBuilder()
        .setCustomId("confirm_delete_channels")
        .setLabel("Confirmar eliminación")
        .setStyle(ButtonStyle.Danger);

      const cancelButton = new ButtonBuilder()
        .setCustomId("cancel_delete_channels")
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Secondary);

      const confirmRow = new ActionRowBuilder().addComponents(
        confirmButton,
        cancelButton
      );

      const channelNames = selectedChannelIds
        .map((id) => `#${interaction.guild.channels.cache.get(id)?.name}`)
        .join(", ");

      const container2 = new ContainerBuilder()
        .setAccentColor(0xff6b6b)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `⚠️ ¿Estás seguro de que deseas eliminar estos canales?\n\n${channelNames}`
          )
        );

      await collected.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [confirmRow, container2],
      });

      const filterConfirm = (i) =>
        (i.customId === "confirm_delete_channels" ||
          i.customId === "cancel_delete_channels") &&
        i.user.id === interaction.user.id;

      const confirmCollected = await response
        .awaitMessageComponent({ filter: filterConfirm, time: 30000 })
        .catch(() => null);

      if (!confirmCollected) {
        return collected.editReply({
          content: "⏱️ Se agotó el tiempo de espera.",
          components: [],
        });
      }

      if (confirmCollected.customId === "cancel_delete_channels") {
        const container3 = new ContainerBuilder()
          .setAccentColor(0xff9800)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("❌ Eliminación cancelada.")
          );

        return confirmCollected.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container3],
        });
      }

      // Eliminar los canales
      let deletedCount = 0;
      let failedCount = 0;

      for (const channelId of selectedChannelIds) {
        try {
          const channel = interaction.guild.channels.cache.get(channelId);
          if (channel) {
            await channel.delete();
            deletedCount++;
          }
        } catch (error) {
          failedCount++;
          console.error(`Error al eliminar canal ${channelId}:`, error);
        }
      }

      const container4 = new ContainerBuilder()
        .setAccentColor(0x2ecc71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `✅ Canales eliminados: ${deletedCount}\n${failedCount > 0 ? `⚠️ Errores: ${failedCount}` : ""}`
          )
        );

      confirmCollected.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container4],
      });
    } else if (type === "category") {
      // Obtener todas las categorías del servidor
      const categories = interaction.guild.channels.cache
        .filter((ch) => ch.type === 4) // Tipo 4 es categoría
        .map((category) => ({
          label: category.name.substring(0, 100),
          value: category.id,
          description: `${category.children.cache.size} canales`,
        }))
        .slice(0, 25);

      if (categories.length === 0) {
        const container = new ContainerBuilder()
          .setAccentColor(0xff9800)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "❌ No hay categorías para eliminar."
            )
          );

        return interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container],
          allowedMentions: { repliedUser: false },
        });
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_category_delete")
        .setPlaceholder("Selecciona la categoría a eliminar...")
        .setMinValues(1)
        .setMaxValues(1);

      categories.forEach((category) => {
        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(category.label)
            .setValue(category.value)
            .setDescription(category.description)
        );
      });

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const container = new ContainerBuilder()
        .setAccentColor(0x3498db)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "📋 Selecciona la categoría que deseas eliminar:"
          )
        );

      const response = await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [row, container],
        ephemeral: true,
      });

      // Esperar la selección (60 segundos)
      const filter = (i) => i.customId === "select_category_delete" && i.user.id === interaction.user.id;
      const collected = await response.awaitMessageComponent({ filter, time: 60000 }).catch(() => null);

      if (!collected) {
        return interaction.editReply({
          content: "⏱️ Se agotó el tiempo de espera.",
          components: [],
        });
      }

      const selectedCategoryId = collected.values[0];
      const selectedCategory = interaction.guild.channels.cache.get(
        selectedCategoryId
      );

      const channelCount = selectedCategory.children.cache.size;

      // Crear botones de confirmación
      const confirmButton = new ButtonBuilder()
        .setCustomId("confirm_delete_category")
        .setLabel("Confirmar eliminación")
        .setStyle(ButtonStyle.Danger);

      const cancelButton = new ButtonBuilder()
        .setCustomId("cancel_delete_category")
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Secondary);

      const confirmRow = new ActionRowBuilder().addComponents(
        confirmButton,
        cancelButton
      );

      const container2 = new ContainerBuilder()
        .setAccentColor(0xff6b6b)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `⚠️ ¿Estás seguro de que deseas eliminar esta categoría?\n\n📁 ${selectedCategory.name}\n📊 Contiene ${channelCount} canal(es)`
          )
        );

      await collected.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [confirmRow, container2],
      });

      const filterConfirm = (i) =>
        (i.customId === "confirm_delete_category" ||
          i.customId === "cancel_delete_category") &&
        i.user.id === interaction.user.id;

      const confirmCollected = await response
        .awaitMessageComponent({ filter: filterConfirm, time: 30000 })
        .catch(() => null);

      if (!confirmCollected) {
        return collected.editReply({
          content: "⏱️ Se agotó el tiempo de espera.",
          components: [],
        });
      }

      if (confirmCollected.customId === "cancel_delete_category") {
        const container3 = new ContainerBuilder()
          .setAccentColor(0xff9800)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("❌ Eliminación cancelada.")
          );

        return confirmCollected.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container3],
        });
      }

      // Eliminar la categoría
      try {
        await selectedCategory.delete();

        const container4 = new ContainerBuilder()
          .setAccentColor(0x2ecc71)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `✅ Categoría "${selectedCategory.name}" eliminada correctamente.`
            )
          );

        confirmCollected.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container4],
        });
      } catch (error) {
        console.error("Error al eliminar categoría:", error);

        const container4 = new ContainerBuilder()
          .setAccentColor(0xff0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `❌ Error al eliminar la categoría. Intenta nuevamente.`
            )
          );

        confirmCollected.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container4],
        });
      }
    }
  },
};
