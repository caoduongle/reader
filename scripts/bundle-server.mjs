import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const jsdomPatch = {
  name: 'jsdom-patch',
  setup(build) {
    // 1. Patch computed-style.js to inline default-stylesheet.css
    build.onLoad({ filter: /computed-style\.js$/ }, async (args) => {
      let contents = await fs.promises.readFile(args.path, 'utf8');
      const cssPath = path.resolve(path.dirname(args.path), '../../../browser/default-stylesheet.css');
      if (fs.existsSync(cssPath)) {
        const cssContent = await fs.promises.readFile(cssPath, 'utf8');
        contents = contents.replace(
          /const defaultStyleSheet = fs\.readFileSync\([\s\S]*?\);/,
          `const defaultStyleSheet = ${JSON.stringify(cssContent)};`
        );
      }
      return { contents, loader: 'js' };
    });

    // 2. Patch css-tree files to avoid createRequire(import.meta.url) failure in CJS
    build.onLoad({ filter: /css-tree[/\\]lib[/\\].*\.js$/ }, async (args) => {
      let contents = await fs.promises.readFile(args.path, 'utf8');
      contents = contents.replace(
        /const require = createRequire\(import\.meta\.url\);/g,
        '// const require = createRequire(import.meta.url);'
      );
      return { contents, loader: 'js' };
    });

    // 3. Patch XMLHttpRequest-impl.js to avoid require.resolve("./xhr-sync-worker.js")
    build.onLoad({ filter: /XMLHttpRequest-impl\.js$/ }, async (args) => {
      let contents = await fs.promises.readFile(args.path, 'utf8');
      contents = contents.replace(
        'const syncWorkerFile = require.resolve("./xhr-sync-worker.js");',
        'const syncWorkerFile = null;'
      );
      return { contents, loader: 'js' };
    });
  },
};

await esbuild.build({
  entryPoints: ['server.js'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist-electron/server.cjs',
  plugins: [jsdomPatch],
});

console.log('Successfully bundled server.js with jsdom and css-tree patches');