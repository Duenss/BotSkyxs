const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField,
} = require("discord.js");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sync")
    .setDescription("Sincroniza los comandos slash del bot.")
    .addStringOption((option) =>
      option
        .setName("scope")
        .setDescription("Alcance de la sincronización")
        .setRequired(false)
        .addChoices(
          { name: "Este servidor", value: "guild" },
          { name: "Todos los servidores", value: "all" }
        )
    )
    .setContexts(0)
    .setIntegrationTypes(0),

  async execute(interaction) {
    // Verificar si es administrador del servidor o dueño del bot
    const isDev = interaction.user.id === "1065387598649733160"; // Tu ID
    const isAdmin = interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    );

    if (!isDev && !isAdmin) {
      const container = new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "⚠️ Solo administradores pueden usar este comando."
          )
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        allowedMentions: { repliedUser: false },
      });
    }

    const scope = interaction.options.getString("scope") || "guild";

    // Mostrar que está procesando
    const processingContainer = new ContainerBuilder()
      .setAccentColor(0x3498db)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "⏳ Sincronizando comandos..."
        )
      );

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [processingContainer],
      allowedMentions: { repliedUser: false },
    });

    try {
      const commands = [];

      // Cargar todos los comandos
      for (const category of fs.readdirSync("./SlashCommands")) {
        const files = fs
          .readdirSync(`./SlashCommands/${category}`)
          .filter((file) => file.endsWith(".js"));

        for (const file of files) {
          const command = require(`../SlashCommands/${category}/${file}`);
          commands.push(command.data.toJSON());
        }
      }

      let synced = 0;
      let failed = 0;

      if (scope === "guild") {
        // Sincronizar solo en este servidor
        try {
          await interaction.guild.commands.set(commands);
          synced = commands.length;
        } catch (error) {
          console.error("Error al sincronizar en este servidor:", error);
          failed++;
        }
      } else if (scope === "all") {
        // Sincronizar en todos los servidores + globalmente
        // Globalmente
        try {
          await interaction.client.application.commands.set(commands);
          synced += commands.length;
        } catch (error) {
          console.error("Error al sincronizar globalmente:", error);
          failed++;
        }

        // En cada servidor
        for (const guild of interaction.client.guilds.cache.values()) {
          try {
            await guild.commands.set(commands);
            synced += commands.length;
          } catch (error) {
            console.error(`Error en ${guild.name}:`, error);
            failed++;
          }
        }
      }

      const successContainer = new ContainerBuilder()
        .setAccentColor(0x2ecc71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `✅ Sincronización completada\n📊 Comandos: ${commands.length}\n🎯 Alcance: ${scope === "guild" ? "Este servidor" : "Todos los servidores"}\n${failed > 0 ? `⚠️ Errores: ${failed}` : ""}`
          )
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [successContainer],
      });
    } catch (error) {
      console.error("Error en sincronización:", error);

      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "❌ Error durante la sincronización. Revisa la consola."
          )
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer],
      });
    }
  },
};
