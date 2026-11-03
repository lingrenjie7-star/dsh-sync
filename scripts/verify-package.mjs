/**
 * 发布前的包结构校验。
 *
 * 为什么需要它：DSH 加载插件失败时**不会报错**，只是侧边栏里什么都不出现。
 * 最常见的三个原因是三处标识不一致，这个脚本把它们检查掉：
 *
 *   1. package.json 的 name
 *   2. cordis.patch.yml 里 - id: 的值
 *   3. lib/client.js 里 __ModuleLoader__.load({ id })
 *
 * 三者必须完全相同。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const problems = [];
const notes = [];

function read(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    problems.push(`缺少文件：${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

// ── 1. package.json
let pkg = {};
try {
  pkg = JSON.parse(read('package.json') || '{}');
} catch (error) {
  problems.push(`package.json 不是合法 JSON：${error.message}`);
}

if (!pkg.name) problems.push('package.json 缺少 name');
if (!pkg.version) problems.push('package.json 缺少 version');

// ── 2. 两半入口
if (!pkg.main) problems.push('package.json 缺少 main（宿主半边入口）');
else if (!fs.existsSync(path.join(ROOT, pkg.main))) problems.push(`main 指向的 ${pkg.main} 不存在`);

if (!pkg.exports?.['./client']) problems.push('package.json 缺少 exports["./client"]（浏览器半边）');
else if (!fs.existsSync(path.join(ROOT, pkg.exports['./client']))) {
  problems.push(`exports["./client"] 指向的 ${pkg.exports['./client']} 不存在`);
}

// ── 3. DSH 声明
if (!pkg.dsh?.bundle?.patch) {
  problems.push('缺少 dsh.bundle.patch —— DSH 不会把它当插件挂载');
} else {
  const patchPath = pkg.dsh.bundle.patch.replace(/^\.\//, '');
  if (!fs.existsSync(path.join(ROOT, patchPath))) problems.push(`dsh.bundle.patch 指向的 ${patchPath} 不存在`);
}

if (!pkg.dsh?.client) problems.push('缺少 dsh.client —— 浏览器半边不会被加载');
else if (pkg.dsh.client.platform !== 'web') {
  notes.push(`dsh.client.platform 是 "${pkg.dsh.client.platform}"，通常应为 "web"`);
}

// ── 4. 三处 id 必须一致（最容易出错的地方）
let patchId = '';
if (pkg.dsh?.bundle?.patch) {
  const patchPath = pkg.dsh.bundle.patch.replace(/^\.\//, '');
  const text = read(patchPath);
  // 只找真正生效的行（YAML 列表项），跳过注释
  const line = text.split('\n').find((l) => !l.trim().startsWith('#') && /^\s*-\s*id:\s*\S/.test(l));
  if (!line) problems.push(`${patchPath} 里找不到生效的 "- id:" 行`);
  else patchId = line.replace(/^\s*-\s*id:\s*/, '').trim();

  if (patchId && pkg.name && patchId !== pkg.name) {
    problems.push(`id 不一致：cordis.patch.yml 是 "${patchId}"，package.json 是 "${pkg.name}"`);
  }
  if (line && line.includes('#')) {
    problems.push(`${patchPath} 的 id 行带了行尾注释 —— 商城预检抓不到值，会判 SUBMISSION_ENTRY_MISSING`);
  }
}

let clientId = '';
if (pkg.exports?.['./client']) {
  const text = read(pkg.exports['./client'].replace(/^\.\//, ''));
  const match = /__ModuleLoader__\.load\(\s*\{[\s\S]*?id:\s*['"]([^'"]+)['"]/.exec(text);
  if (!match) problems.push('client 入口里找不到 __ModuleLoader__.load({ id })');
  else clientId = match[1];

  if (clientId && pkg.name && clientId !== pkg.name) {
    problems.push(`id 不一致：client.js 是 "${clientId}"，package.json 是 "${pkg.name}"`);
  }
}

// ── 5. 文件清单
for (const required of ['README.md', 'LICENSE']) {
  if (!fs.existsSync(path.join(ROOT, required))) problems.push(`缺少 ${required}`);
}

// ── 6. 不该进包的东西
if (Array.isArray(pkg.files)) {
  for (const bad of ['desktop', 'plugin-src']) {
    if (pkg.files.some((f) => f.startsWith(bad))) {
      problems.push(`files 里包含 ${bad}/ —— 它不该进 npm 包（体积大且与插件无关）`);
    }
  }
}

// ── 输出
const info = {
  包名: pkg.name,
  版本: pkg.version,
  patchId: patchId || '(未读到)',
  客户端id: clientId || '(未读到)',
  宿主入口: pkg.main,
  客户端入口: pkg.exports?.['./client'],
};

for (const [k, v] of Object.entries(info)) console.log(`  ${k.padEnd(10)} ${v}`);

if (notes.length > 0) {
  console.log('');
  for (const n of notes) console.log(`  提示：${n}`);
}

if (problems.length > 0) {
  console.error('');
  console.error('校验失败：');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log('');
console.log('校验通过：三处 id 一致，入口齐全。');
