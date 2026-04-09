const fs = require("fs");
require("colors");

module.exports = {
  async loadSlash(client) {
    const commands = [];

    for (const category of fs.readdirSync("./SlashCommands")) {
      const files = fs
        .readdirSync(`./SlashCommands/${category}`)
        .filter((file) => file.endsWith(".js"));

      for (const file of files) {
        const command = require(`../SlashCommands/${category}/${file}`);

        client.slashCommands.set(command.data.name, command);

        commands.push(command.data.toJSON());
      }
    }

    // Sincronizar comandos globales
    await client.application.commands.set(commands);

    // Sincronizar en todos los servidores donde el bot está presente
    // Esto permite actualización inmediata sin necesidad de reinvitar
    for (const guild of client.guilds.cache.values()) {
      try {
        await guild.commands.set(commands);
      } catch (error) {
        console.error(`Error al sincronizar comandos en ${guild.name}:`.red, error);
      }
    }

    const commandNames = commands.map((cmd) => cmd.name).join(", ");
    console.info(
      `✅ ${commands.length} comandos slash cargados correctamente:`.green.bold,
    );
    console.info(`   ${commandNames}`);
  },
};
