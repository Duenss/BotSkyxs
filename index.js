const { Client, Collection } = require("discord.js");
require("dotenv").config({ quiet: true });
require("colors");

const client = new Client({ intents: 53608447 });

client.slashCommands = new Collection();

(async () => {
  await require("./Handlers/eventHandler").loadEvents(client);
})();

const token = process.env.TOKEN_DISCORD_BOT;
if (!token || token === "YOUR_BOT_TOKEN_HERE") {
  console.error("[ERROR] TOKEN_DISCORD_BOT no está configurado en las variables de entorno.");
  console.error("Define TOKEN_DISCORD_BOT en Railway o en tu archivo .env con el token real del bot.");
  process.exit(1);
}

client.login(token).catch((error) => {
  console.error("[ERROR] Error al iniciar sesión con Discord:", error);
  process.exit(1);
});
