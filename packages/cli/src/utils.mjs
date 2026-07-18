import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 获取项目根目录
 * @returns {string} 项目根目录路径
 */
export function getProjectRoot() {
  return process.cwd() || __dirname;
}

/**
 * 猜测 Godot 项目目录
 * @param {string} rootDir - 根目录
 * @returns {string} Godot 项目目录路径
 */
export function guessGodotProjectDir(rootDir = getProjectRoot()) {
  const candidates = [
    rootDir,
    path.join(rootDir, 'project'),
    path.join(rootDir, 'game'),
    path.join(rootDir, 'godot')
  ];

  for (const dir of candidates) {
    const projectFile = path.join(dir, 'project.godot');
    const gameFile = path.join(dir, 'game.godot');
    if (fs.existsSync(projectFile) || fs.existsSync(gameFile)) {
      return dir;
    }
  }
  return rootDir;
}