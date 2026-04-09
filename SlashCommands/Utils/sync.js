const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField,
  EmbedBuilder,
} = require("discord.js");
const fs = require("fs");
const { execSync } = require("child_process");

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

    // Obtener información del último commit
    let lastCommitInfo = "ℹ️ Sin información de commits";
    try {
      const commitDate = execSync("git log -1 --format=%ai", { 
        encoding: "utf-8",
        cwd: process.cwd()
      }).trim();
      const commitMessage = execSync("git log -1 --format=%s", { 
        encoding: "utf-8",
        cwd: process.cwd()
      }).trim();
      
      if (commitDate && commitMessage) {
        const date = new Date(commitDate);
        const formattedDate = date.toLocaleString("es-ES", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "UTC",
        });
        lastCommitInfo = `📅 ${formattedDate}\n📝 ${commitMessage}`;
      }
    } catch (error) {
      console.error("Error al obtener información del commit:", error.message);
      // Continuar sin la información del commit si hay error
    }

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
        const categoryPath = `./SlashCommands/${category}`;
        
        if (!fs.statSync(categoryPath).isDirectory()) continue;
        
        const files = fs
          .readdirSync(categoryPath)
          .filter((file) => file.endsWith(".js"));

        for (const file of files) {
          try {
            const commandPath = `../${category}/${file}`;
            const command = require(commandPath);
            
            if (command && command.data) {
              commands.push(command.data.toJSON());
            }
          } catch (loadError) {
            console.error(`⚠️ Error al cargar ${category}/${file}:`, loadError.message);
          }
        }
      }

      if (commands.length === 0) {
        throw new Error("No se pudieron cargar comandos");
      }

      let synced = 0;
      let failed = 0;

      if (scope === "guild") {
        // Sincronizar solo en este servidor
        try {
          await interaction.guild.commands.set(commands);
          synced = commands.length;
        } catch (error) {
          console.error("Error al sincronizar en este servidor:", error.message);
          failed++;
        }
      } else if (scope === "all") {
        // Sincronizar globalmente
        try {
          await interaction.client.application.commands.set(commands);
          synced = commands.length;
        } catch (error) {
          console.error("Error al sincronizar globalmente:", error.message);
          failed++;
        }
      }

      const successContainer = new ContainerBuilder()
        .setAccentColor(0x2ecc71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `✅ Sincronización completada\n📊 Comandos: ${commands.length}\n🎯 Alcance: ${scope === "guild" ? "Este servidor" : "Todos los servidores"}\n${failed > 0 ? `⚠️ Errores: ${failed}` : ""}`
          )
        );

      // Crear embed para el último commit
      const commitEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("📋 Última Actualización")
        .setDescription(lastCommitInfo)
        .setFooter({ text: "Synchronized" });

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [successContainer],
        embeds: [commitEmbed],
      });
    } catch (error) {
      console.error("❌ Error en sincronización:", error.message || error);

      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `❌ Error durante la sincronización:\n${error.message || "Error desconocido"}`
          )
        );

      try {
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [errorContainer],
        });
      } catch (replyError) {
        console.error("Error al enviar respuesta de error:", replyError.message);
      }
    }
  },
};
