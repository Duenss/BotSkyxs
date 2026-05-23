// server.js — Servidor HTTP para recibir instrucciones del dashboard
// Recibe el client de Discord como argumento desde index.js

const express = require("express");

module.exports = function startServer(client) {
  const app = express();
  app.use(express.json());

  // CORS — permite llamadas desde el dashboard en Netlify
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // Autenticacion con la KEY de Railway
  function auth(req, res, next) {
    const key = req.headers["authorization"]?.replace("Bearer ", "");
    if (!key || key !== process.env.KEY) {
      return res.status(401).json({ error: "No autorizado" });
    }
    next();
  }

  /**
   * GET /health
   * Verifica que el servidor esta vivo
   */
  app.get("/health", (req, res) => {
    res.json({ ok: true, status: "online", bot: client.user?.tag || "conectando..." });
  });

  /**
   * POST /send-panel
   * Publica un panel de tickets en un canal de Discord
   *
   * Body: {
   *   channelId: string,
   *   embed: { title, description, color, author, footer, thumbnail, image },
   *   buttons: [{ label, style, color, emoji, type, url, category }],
   *   selectMenus: [{ label, options: [{ label, description, emoji }] }]
   * }
   */
  app.post("/send-panel", auth, async (req, res) => {
    const { channelId, embed = {}, buttons = [], selectMenus = [] } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: "Falta channelId" });
    }

    try {
      const {
        EmbedBuilder,
        ActionRowBuilder,
        ButtonBuilder,
        ButtonStyle,
        StringSelectMenuBuilder,
        StringSelectMenuOptionBuilder,
      } = require("discord.js");

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        return res.status(404).json({ error: `Canal ${channelId} no encontrado. Verifica que el bot tenga acceso a ese canal.` });
      }

      // Construir embed
      const discordEmbed = new EmbedBuilder();
      if (embed.title)       discordEmbed.setTitle(String(embed.title).slice(0, 256));
      if (embed.description) discordEmbed.setDescription(String(embed.description).slice(0, 4096));
      if (embed.color)       discordEmbed.setColor(embed.color);
      if (embed.author)      discordEmbed.setAuthor({ name: String(embed.author).slice(0, 256) });
      if (embed.footer)      discordEmbed.setFooter({ text: String(embed.footer).slice(0, 2048) });
      if (embed.thumbnail)   discordEmbed.setThumbnail(embed.thumbnail);
      if (embed.image)       discordEmbed.setImage(embed.image);

      const components = [];

      // Fila de botones (max 5 por fila)
      if (buttons.length > 0) {
        const styleMap = {
          primary:   ButtonStyle.Primary,
          success:   ButtonStyle.Success,
          danger:    ButtonStyle.Danger,
          secondary: ButtonStyle.Secondary,
        };

        const row = new ActionRowBuilder();
        buttons.slice(0, 5).forEach((btn, i) => {
          const b = new ButtonBuilder().setLabel(String(btn.label || "Ticket").slice(0, 80));

          if (btn.type === "link" && btn.url) {
            b.setStyle(ButtonStyle.Link).setURL(btn.url);
          } else {
            const category = String(btn.category || "Soporte").replace(/\s+/g, "_").slice(0, 50);
            b.setStyle(styleMap[btn.style] ?? ButtonStyle.Primary)
             .setCustomId(`open_ticket_${category}_${i}`);
          }

          // Emoji personalizado
          if (btn.emoji) {
            const emojiId = String(btn.emoji).match(/\d{10,}/)?.[0];
            if (emojiId) b.setEmoji(emojiId);
          }

          row.addComponents(b);
        });
        components.push(row);
      }

      // Menus desplegables (max 4 menus adicionales)
      selectMenus.slice(0, 4).forEach((menu, mi) => {
        if (!Array.isArray(menu.options) || menu.options.length === 0) return;

        const select = new StringSelectMenuBuilder()
          .setCustomId(`open_ticket_select_${mi}`)
          .setPlaceholder(String(menu.label || "Selecciona una opcion").slice(0, 150));

        menu.options.slice(0, 25).forEach((opt) => {
          const option = new StringSelectMenuOptionBuilder()
            .setLabel(String(opt.label || "Opcion").slice(0, 100))
            .setValue(String(opt.label || `opcion_${mi}`).toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 100) || `opcion_${mi}`);

          if (opt.description) option.setDescription(String(opt.description).slice(0, 100));

          if (opt.emoji) {
            const emojiId = String(opt.emoji).match(/\d{10,}/)?.[0];
            if (emojiId) option.setEmoji(emojiId);
          }

          select.addOptions(option);
        });

        components.push(new ActionRowBuilder().addComponents(select));
      });

      await channel.send({ embeds: [discordEmbed], components });

      console.log(`[API] Panel enviado al canal ${channelId} por el dashboard`);
      res.json({ ok: true, message: "Panel publicado correctamente en Discord" });

    } catch (err) {
      console.error("[API /send-panel] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /close-ticket
   * Cierra (elimina) un canal de ticket por ID
   */
  app.post("/close-ticket", auth, async (req, res) => {
    const { channelId } = req.body;
    if (!channelId) return res.status(400).json({ error: "Falta channelId" });

    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return res.status(404).json({ error: "Canal no encontrado" });
      if (!channel.name.startsWith("ticket-")) {
        return res.status(400).json({ error: "El canal no es un ticket" });
      }

      await channel.delete("Cerrado desde el dashboard");
      res.json({ ok: true, message: "Ticket cerrado" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[API] Servidor HTTP escuchando en puerto ${PORT}`.green);
  });
};
