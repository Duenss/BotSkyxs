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

    // Eliminar comandos globales para evitar duplicados con comandos por servidor
    await client.application.commands.set([]);

    // Registrar comandos en cada servidor donde el bot ya esté presente
    for (const guild of client.guilds.cache.values()) {
      await guild.commands.set(commands);
    }

    const commandNames = commands.map((cmd) => cmd.name).join(", ");
    console.info(
      `✅ ${commands.length} comandos slash cargados correctamente:`.green.bold,
    );
    console.info(`   ${commandNames}`);
  },
};
