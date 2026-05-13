require("colors");

module.exports = {
  name: "guildCreate",
  async execute(guild, client) {
    const commands = client.slashCommands.map((cmd) => cmd.data.toJSON());

    await guild.commands.set(commands);

    console.info(
      `✅ Comandos slash sincronizados en el servidor: ${guild.name} (${guild.id})`.green,
    );
  },
};
