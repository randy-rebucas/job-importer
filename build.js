const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

const isWatch = process.argv.includes("--watch");

const sharedOptions = {
  bundle: true,
  platform: "browser",
  target: ["chrome120"],
  sourcemap: isWatch ? "inline" : false,
  minify: !isWatch,
};

const entryPoints = [
  {
    in: "extension/content.ts",
    out: "extension/dist/content",
  },
  {
    in: "extension/background.ts",
    out: "extension/dist/background",
  },
  {
    in: "extension/popup.ts",
    out: "extension/dist/popup",
  },
];

async function build() {
  try {
    // Build each entry point separately (MV3 requires no top-level await in service worker)
    for (const entry of entryPoints) {
      const ctx = await esbuild.context({
        ...sharedOptions,
        entryPoints: [entry.in],
        outfile: `${entry.out}.js`,
        // Service worker (background) must be an IIFE, not ESM
        format: entry.in.includes("background") ? "iife" : "iife",
      });

      if (isWatch) {
        await ctx.watch();
        console.log(`Watching ${entry.in}...`);
      } else {
        await ctx.rebuild();
        await ctx.dispose();
        console.log(`Built ${entry.in} -> ${entry.out}.js`);
      }
    }

    // Copy static assets to dist
    copyStaticAssets();

    if (!isWatch) {
      console.log("\nBuild complete. Load extension/dist/ in Chrome.");
    }
  } catch (err) {
    console.error("Build failed:", err);
    process.exit(1);
  }
}

function copyStaticAssets() {
  const distDir = "extension/dist";
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copy manifest
  fs.copyFileSync("extension/manifest.json", `${distDir}/manifest.json`);

  // Copy popup HTML
  if (fs.existsSync("extension/popup.html")) {
    fs.copyFileSync("extension/popup.html", `${distDir}/popup.html`);
  }

  // Copy styles
  if (fs.existsSync("extension/styles.css")) {
    fs.copyFileSync("extension/styles.css", `${distDir}/styles.css`);
  }

  // Copy icons directory if it exists
  const iconsDir = "extension/icons";
  const distIconsDir = `${distDir}/icons`;
  if (fs.existsSync(iconsDir)) {
    if (!fs.existsSync(distIconsDir)) {
      fs.mkdirSync(distIconsDir, { recursive: true });
    }
    fs.readdirSync(iconsDir).forEach((file) => {
      fs.copyFileSync(path.join(iconsDir, file), path.join(distIconsDir, file));
    });
  }

  console.log("Static assets copied.");
}

build();
