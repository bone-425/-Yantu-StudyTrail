// 合并 data/quotes-*.json -> quotes.json
// 按句子去重，再用固定种子洗牌
// 用法：node scripts/build-quotes.mjs
import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const DATA_DIR = new URL("../data/", import.meta.url);
const OUTPUT = fileURLToPath(new URL("../quotes.json", import.meta.url));
const SHUFFLE_SEED = 20261021;

function mulberry32(seed) {
  let value = seed >>> 0;
  return function next() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

async function main() {
  const files = (await readdir(DATA_DIR))
    .filter((name) => /^quotes-\d+\.json$/.test(name))
    .sort();

  if (files.length === 0) {
    throw new Error("data/ 里没有找到 quotes-*.json");
  }

  const seen = new Set();
  const merged = [];

  for (const file of files) {
    const list = JSON.parse(await readFile(new URL(file, DATA_DIR), "utf8"));
    if (!Array.isArray(list)) {
      throw new Error(`${file} 不是数组`);
    }
    let added = 0;
    for (const item of list) {
      const text = String(item?.t ?? "").trim();
      const author = String(item?.a ?? "").trim();
      if (!text || !author || seen.has(text)) continue;
      seen.add(text);
      merged.push({ text, author });
      added += 1;
    }
    console.log(`${file}: 读入 ${added} 条`);
  }

  const shuffled = shuffle(merged, mulberry32(SHUFFLE_SEED));
  const output = {
    version: 3,
    updatedAt: new Date().toISOString().slice(0, 10),
    total: shuffled.length,
    quotes: shuffled,
  };

  await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`合并完成：${shuffled.length} 条 -> quotes.json（约 ${Math.floor(shuffled.length / 3)} 天）`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
