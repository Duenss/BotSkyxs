const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const dbDir = path.join(process.cwd(), "Database");

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

function autoCommitDbFile(filePath, fileName, guildId) {
  const autoSave = process.env.AUTO_SAVE_DB === "true" || process.env.AUTO_COMMIT_DB === "true";
  const token = process.env.GITHUB_TOKEN || process.env.GIT_TOKEN;
  if (!autoSave || !token) return;
  if (!fs.existsSync(path.join(process.cwd(), ".git"))) return;

  try {
    const status = execSync(`git status --porcelain -- "${filePath}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    if (!status) return;

    execSync('git config user.email "bot@localhost"', { stdio: "ignore" });
    execSync('git config user.name "Bot Auto Save"', { stdio: "ignore" });
    execSync(`git add "${filePath}"`, { stdio: "ignore" });
    execSync(
      `git commit -m "Auto-save ${fileName} config for guild ${guildId}" -- "${filePath}"`,
      { stdio: "ignore" },
    );

    const remote = execSync("git config --get remote.origin.url", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    if (!remote.startsWith("https://")) return;

    const authRemote = remote.replace(/^https:\/\//, `https://${token}@`);
    execSync(`git push "${authRemote}" HEAD`, { stdio: "ignore" });
  } catch (error) {
    if (process.env.AUTO_SAVE_DB_DEBUG === "true") {
      console.error("[AUTO SAVE] No se pudo guardar la configuración en git:", error.message);
    }
  }
}

module.exports = {
  getData: (fileName, guildId) => {
    const filePath = path.join(dbDir, `${fileName}.json`);

    if (!fs.existsSync(filePath)) return null;

    const db = JSON.parse(fs.readFileSync(filePath, "utf8"));

    return db[guildId] || null;
  },

  setData: (fileName, guildId, data) => {
    const filePath = path.join(dbDir, `${fileName}.json`);

    let db = {};

    if (fs.existsSync(filePath)) {
      db = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    db[guildId] = { ...db[guildId], ...data };

    fs.writeFileSync(filePath, JSON.stringify(db, null, 2));
    autoCommitDbFile(filePath, fileName, guildId);
  },
};
