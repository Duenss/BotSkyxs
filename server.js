// server.js — Servidor HTTP para recibir instrucciones del dashboard
const express = require("express");
const { setData } = require("./Events/Client/dbManager");

module.exports = function startServer(client) {
  const app = express();
  app.use(express.json());

  // CORS
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // GET /health
  app.get("/health", (req, res) => {
    res.json({ ok: true, status: "online", bot: client.user?.tag || "conectando..." });
  });

  // POST /send-panel
  app.post("/send-panel", async (req, res) => {
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
        return res.status(404).json({ error: `Canal ${channelId} no encontrado.` });
      }

      const discordEmbed = new EmbedBuilder();
      if (embed.title)       discordEmbed.setTitle(String(embed.title).slice(0, 256));
      if (embed.description) discordEmbed.setDescription(String(embed.description).slice(0, 4096));
      if (embed.color)       discordEmbed.setColor(embed.color);
      if (embed.author)      discordEmbed.setAuthor({ name: String(embed.author).slice(0, 256) });
      if (embed.footer)      discordEmbed.setFooter({ text: String(embed.footer).slice(0, 2048) });
      if (embed.thumbnail)   discordEmbed.setThumbnail(embed.thumbnail);
      if (embed.image)       discordEmbed.setImage(embed.image);

      const components = [];

      if (buttons.length > 0) {
        const styleMap = {
          primary: ButtonStyle.Primary,
          success: ButtonStyle.Success,
          danger: ButtonStyle.Danger,
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
          if (btn.emoji) {
            const emojiId = String(btn.emoji).match(/\d{10,}/)?.[0];
            if (emojiId) b.setEmoji(emojiId);
          }
          row.addComponents(b);
        });
        components.push(row);
      }

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
      console.log(`[API] Panel enviado al canal ${channelId}`);
      res.json({ ok: true, message: "Panel publicado correctamente en Discord" });

    } catch (err) {
      console.error("[API /send-panel] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /send-embed — envía un embed puro al canal (sin botones)
  app.post("/send-embed", async (req, res) => {
    const { channelId, payload } = req.body;
    if (!channelId) return res.status(400).json({ error: "Falta channelId" });
    if (!payload) return res.status(400).json({ error: "Falta payload" });
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return res.status(404).json({ error: `Canal ${channelId} no encontrado` });

      const sendOptions = {};
      if (payload.content) sendOptions.content = payload.content;
      if (Array.isArray(payload.embeds) && payload.embeds.length > 0) {
        const { EmbedBuilder } = require("discord.js");
        sendOptions.embeds = payload.embeds.map(e => {
          const eb = new EmbedBuilder();
          if (e.title)       eb.setTitle(e.title);
          if (e.url)         eb.setURL(e.url);
          if (e.description) eb.setDescription(e.description);
          if (e.color != null) eb.setColor(typeof e.color === 'string' ? e.color : `#${Number(e.color).toString(16).padStart(6,'0')}`);
          if (e.author?.name) eb.setAuthor({ name: e.author.name, iconURL: e.author.icon_url, url: e.author.url });
          if (e.footer?.text) eb.setFooter({ text: e.footer.text, iconURL: e.footer.icon_url });
          if (e.thumbnail?.url) eb.setThumbnail(e.thumbnail.url);
          if (e.image?.url)     eb.setImage(e.image.url);
          if (e.timestamp)      eb.setTimestamp();
          if (Array.isArray(e.fields)) eb.addFields(e.fields.map(f => ({ name: f.name||'\u200b', value: f.value||'\u200b', inline: !!f.inline })));
          return eb;
        });
      }
      if (payload.username || payload.avatar_url) {
        // webhookClient no disponible aquí, usamos el bot directamente
      }
      await channel.send(sendOptions);
      console.log(`[API] Embed enviado al canal ${channelId}`);
      res.json({ ok: true, message: "Embed enviado correctamente" });
    } catch (err) {
      console.error("[API /send-embed] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /welcome-config — guarda el mensaje automatico de bienvenida.
  app.post("/welcome-config", async (req, res) => {
    const { enabled = true, channelId, payload } = req.body;
    if (!channelId) return res.status(400).json({ error: "Falta channelId" });
    if (enabled && !payload) return res.status(400).json({ error: "Falta payload" });

    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return res.status(404).json({ error: `Canal ${channelId} no encontrado` });
      if (!channel.guild?.id) return res.status(400).json({ error: "El canal no pertenece a un servidor" });

      const config = {
        enabled: Boolean(enabled),
        channelId,
        payload: payload || { embeds: [] },
        updatedAt: new Date().toISOString(),
      };

      setData("welcome", channel.guild.id, config);
      console.log(`[API] Bienvenida guardada para ${channel.guild.name} (${channel.guild.id})`);
      res.json({ ok: true, guildId: channel.guild.id, guildName: channel.guild.name, config });
    } catch (err) {
      console.error("[API /welcome-config] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /close-ticket
  app.post("/close-ticket", async (req, res) => {
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
