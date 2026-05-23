const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Comandos para gestionar tickets")
    .addSubcommand((sub) =>
      sub
        .setName("cerrar")
        .setDescription("Cierra el ticket actual y elimina el canal")
    )
    .addSubcommand((sub) =>
      sub
        .setName("agregar")
        .setDescription("Agrega un usuario al ticket actual")
        .addUserOption((opt) =>
          opt
            .setName("usuario")
            .setDescription("Usuario a agregar")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("quitar")
        .setDescription("Quita un usuario del ticket actual")
        .addUserOption((opt) =>
          opt
            .setName("usuario")
            .setDescription("Usuario a quitar")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("reclamar")
        .setDescription("Reclama este ticket como tuyo (staff)")
    )
    .setContexts(0)
    .setIntegrationTypes(0),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const channel = interaction.channel;

    // Todos los subcomandos requieren estar dentro de un ticket
    if (!channel.name.startsWith("ticket-")) {
      return interaction.reply({
        content: "❌ Este comando solo funciona dentro de un canal de ticket.",
        ephemeral: true,
      });
    }

    // ── /ticket cerrar ──────────────────────────────────────────────────────
    if (sub === "cerrar") {
      const embed = new EmbedBuilder()
        .setColor("#ef4444")
        .setTitle("🔒 Cerrando ticket")
        .setDescription(
          `Ticket cerrado por ${interaction.user}.\nEste canal se eliminará en **5 segundos**.`
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      setTimeout(() => {
        channel.delete(`Ticket cerrado por ${interaction.user.tag}`).catch(() => null);
      }, 5000);
    }

    // ── /ticket agregar ─────────────────────────────────────────────────────
    if (sub === "agregar") {
      const usuario = interaction.options.getUser("usuario");

      await channel.permissionOverwrites.edit(usuario.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      return interaction.reply({
        content: `✅ ${usuario} fue agregado al ticket.`,
        ephemeral: true,
      });
    }

    // ── /ticket quitar ──────────────────────────────────────────────────────
    if (sub === "quitar") {
      const usuario = interaction.options.getUser("usuario");

      await channel.permissionOverwrites.edit(usuario.id, {
        ViewChannel: false,
        SendMessages: false,
      });

      return interaction.reply({
        content: `✅ ${usuario} fue quitado del ticket.`,
        ephemeral: true,
      });
    }

    // ── /ticket reclamar ────────────────────────────────────────────────────
    if (sub === "reclamar") {
      const embed = new EmbedBuilder()
        .setColor("#facc15")
        .setDescription(`🙋 ${interaction.user} ha reclamado este ticket.`)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  },
};
