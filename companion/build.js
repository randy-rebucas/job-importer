const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

const isWatch = process.argv.includes("--watch");
const isProd = process.argv.includes("--prod") || process.env.NODE_ENV === "production";

const sharedOptions = {
  bundle: true,
  platform: "browser",
  target: ["chrome120"],
  sourcemap: isWatch ? "inline" : false,
  minify: isProd,
  format: "iife",
};

// Flat output — mirrors the working extension layout
const entryPoints = [
  { in: "background/service-worker.ts",    out: "dist/background" },
  { in: "popup/popup.ts",                  out: "dist/popup" },
  { in: "content/content-script.ts",       out: "dist/content" },
  { in: "content/context-actions.ts",      out: "dist/context-actions" },
];

async function build() {
  try {
    for (const entry of entryPoints) {
      const ctx = await esbuild.context({
        ...sharedOptions,
        entryPoints: [entry.in],
        outfile: `${entry.out}.js`,
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

    copyStaticAssets();

    if (!isWatch) {
      console.log("\nBuild complete. Load companion/dist/ in Chrome.");
    }
  } catch (err) {
    console.error("Build failed:", err);
    process.exit(1);
  }
}

function copyStaticAssets() {
  const distDir = "dist";
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

  // manifest
  fs.copyFileSync("manifest.json", `${distDir}/manifest.json`);

  // popup HTML
  fs.copyFileSync("popup/index.html", `${distDir}/popup.html`);

  // styles (optional)
  if (fs.existsSync("popup/styles.css")) {
    fs.copyFileSync("popup/styles.css", `${distDir}/styles.css`);
  }

  // Reuse icons from the sibling extension
  const srcIcons = "../extension/icons";
  const dstIcons = path.join(distDir, "icons");
  if (!fs.existsSync(dstIcons)) fs.mkdirSync(dstIcons, { recursive: true });
  if (fs.existsSync(srcIcons)) {
    fs.readdirSync(srcIcons).forEach((file) => {
      fs.copyFileSync(path.join(srcIcons, file), path.join(dstIcons, file));
    });
  }

  console.log("Static assets copied.");
}

build();
