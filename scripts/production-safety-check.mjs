import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const forbiddenRootNames = [
  "work_stabilize",
  "work_mobile_search",
  "work_v19",
  "work_v20",
  "work_v22",
  "work_v23",
  "work_v24",
  "riku_v13",
  "riku_v15",
  "riku_v16",
];

for (const name of forbiddenRootNames) {
  if (fs.existsSync(path.join(root, name))) {
    failures.push(`Folder project duplikat terdeteksi: ${name}`);
  }
}

if (fs.existsSync(path.join(root, "src", "app", "bandingkan"))) {
  failures.push("Route /bandingkan muncul kembali, padahal fitur ini sudah dihapus.");
}

const telegramImportPage = path.join(root, "src", "app", "admin", "tools", "telegram-import", "page.tsx");
if (fs.existsSync(telegramImportPage)) {
  const text = fs.readFileSync(telegramImportPage, "utf8");
  if (!text.includes("if (!internalToolsEnabled()) notFound()")) {
    failures.push("Tool Telegram belum memiliki notFound guard untuk production.");
  }
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full;
  });
}

const srcDir = path.join(root, "src");
if (fs.existsSync(srcDir)) {
  for (const file of walk(srcDir).filter((file) => /\.(tsx|jsx)$/.test(file))) {
    const text = fs.readFileSync(file, "utf8");
    const formBlocks = text.match(/<form[\s\S]*?>/g) ?? [];
    for (const block of formBlocks) {
      const usesFunctionAction = /action=\{/.test(block);
      const setsManualMethod = /\bmethod=/.test(block);
      const setsManualEncoding = /\bencType=/.test(block);
      if (usesFunctionAction && (setsManualMethod || setsManualEncoding)) {
        failures.push(
          `${path.relative(root, file)} memakai Server Action sekaligus method/encType manual.`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error("\nProduction safety check gagal:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Production safety check berhasil.");
