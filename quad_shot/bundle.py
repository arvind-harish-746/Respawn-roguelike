import os
import re

SRC_DIR = '/home/ashoka/Documents/Respawn/quad_shot/src'
OUT_BUNDLE = '/home/ashoka/Documents/Respawn/quad_shot/bundle.js'

files = [
    'math.js',
    'audio.js',
    'grid.js',
    'sprite_manager.js',
    'weapons.js',
    'stickman.js',
    'enemies.js',
    'bosses.js',
    'economy_meta.js',
    'game.js'
]

combined = []
combined.append("// Quad Shot Unified Production Bundle\n")

for f in files:
    path = os.path.join(SRC_DIR, f)
    with open(path, 'r', encoding='utf-8') as src:
        code = src.read()
    # Strip imports and exports
    code = re.sub(r'import\s+.*?from\s+[\'"].*?[\'"];?\n?', '', code)
    code = re.sub(r'export\s+(default\s+)?(class|function|const|let|var)\s+', r'\2 ', code)
    code = re.sub(r'export\s+\{.*?\};?\n?', '', code)
    combined.append(f"// --- MODULE: {f} ---\n" + code + "\n")

with open(OUT_BUNDLE, 'w', encoding='utf-8') as out:
    out.write('\n'.join(combined))

print("Successfully generated bundle.js at:", OUT_BUNDLE)
