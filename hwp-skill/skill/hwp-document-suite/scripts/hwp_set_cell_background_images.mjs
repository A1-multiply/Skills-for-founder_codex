#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const args = process.argv.slice(2);

function usage() {
  console.log(`Usage:
  node hwp_set_cell_background_images.mjs <input.hwp> <output.hwp> --images <images.json>

images.json:
{
  "items": [
    { "marker": "IMG_1", "path": "./images/a.png" }
  ]
}

Each marker must be the only text in the target image cell. The script removes
the marker and sets that cell's border/fill background to the image.
Requires pyhwpx: pip install pyhwpx
`);
}

function readFlag(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  const value = args[idx + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

const input = args[0];
const output = args[1];
const imagesJson = readFlag("--images");

if (!input || !output || !imagesJson || args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(input || output || imagesJson ? 0 : 1);
}

const items = JSON.parse(await readFile(imagesJson, "utf8")).items ?? [];
if (!items.length) throw new Error("images.json requires items");
if (process.platform !== "win32") throw new Error("hwp_set_cell_background_images.mjs requires Windows Hancom Office.");

await setCellBackgrounds(input, output, items.map((item) => ({
  marker: String(item.marker ?? ""),
  path: path.resolve(String(item.path ?? "")),
  filloption: Number(item.filloption ?? item.drawType ?? 5)
})));

async function setCellBackgrounds(inputPath, outputPath, imageItems) {
  const workDir = await mkdtemp(path.join(tmpdir(), "hwp-cell-bg-"));
  const scriptPath = path.join(workDir, "apply_cell_backgrounds.py");
  const script = String.raw`
import json
import os
import sys

try:
    from pyhwpx import Hwp
except Exception as exc:
    raise SystemExit("pyhwpx is required. Install it with: pip install pyhwpx\n" + str(exc))

input_path = os.path.abspath(sys.argv[1])
output_path = os.path.abspath(sys.argv[2])
items = json.loads(sys.argv[3])

hwp = Hwp(visible=False, register_module=True)
applied = 0
try:
    if not hwp.open(input_path):
        raise RuntimeError("Hancom HWP failed to open input file.")

    for item in items:
        marker = str(item.get("marker", ""))
        image_path = os.path.abspath(str(item.get("path", "")))
        filloption = int(item.get("filloption", 5))
        if not marker:
            raise RuntimeError("image item marker is empty")
        if not os.path.exists(image_path):
            raise RuntimeError(f"Image file not found: {image_path}")

        hwp.SetPos(0, 0, 0)
        if not hwp.find(marker):
            raise RuntimeError(f"Marker not found: {marker}")
        hwp.Delete()
        hwp.TableCellBlock()
        ok = hwp.insert_background_picture(
            image_path,
            border_type="SelectedCell",
            embedded=True,
            filloption=filloption,
        )
        if not ok:
            raise RuntimeError(f"Cell background image failed: {marker}")
        try:
            hwp.Run("Cancel")
        except Exception:
            pass
        applied += 1

    hwp.save_as(output_path)
    print(json.dumps({"ok": True, "outputPath": output_path, "backgroundsApplied": applied}, ensure_ascii=False))
finally:
    try:
        hwp.quit()
    except Exception:
        pass
`;

  try {
    await writeFile(scriptPath, script, "utf8");
    await execPython(scriptPath, path.resolve(inputPath), path.resolve(outputPath), JSON.stringify(imageItems));
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

function execPython(scriptPath, inputPath, outputPath, itemsJson) {
  return new Promise((resolve, reject) => {
    execFile("python", [scriptPath, inputPath, outputPath, itemsJson], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Hancom cell background image failed: ${stderr || stdout || error.message}`));
        return;
      }
      process.stdout.write(stdout);
      resolve();
    });
  });
}
