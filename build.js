const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');
const isDev = process.argv.includes('--dev') || isWatch;
const outdir = 'dist';

// Static files to copy directly
const staticFiles = [
    'manifest.json',
    'icons/icon128.png',
    'sidepanel/index.html',
    'options/index.html',
    'supabase/supabase.min.js',
];

// CSS files to minify
const cssFiles = [
    'content/styles.css',
    'rating/rating.css',
    'sidepanel/sidepanel.css',
    'options/styles.css',
];

// Individual scripts to minify (Non-bundled entry points for content & UI)
const unbundledJsFiles = [
    'security/runtime-security.js',
    'bridge/extension-bridge.js',
    'theme/theme-controller.js',
    'content/templates.js',
    'content/observer.js',
    'content/scraper.js',
    'content/diff.js',
    'logging/logger.js',
    'model/model-registry.js',
    'model/model-manager.js',
    'rating/rating-manager.js',
    'rating/rating-ui.js',
    'rating/rating-injector.js',
    'llm/llm-client.js',
    'llm/llm-config.js',
    'memory/component-schemas.js',
    'memory/memory-controller.js',
    'memory/analyzer-registry.js',
    'memory/analyzers/recent-focus.js',
    'memory/analyzers/unified-analyzer.js',
    'memory/context-assembler.js',
    'memory/index.js',
    'extractor/extractor.js',
    'sidepanel/sidepanel.js',
    'options/index.js',
    'options/model-manager-ui.js',
    'supabase/supabase-client.js'
];

function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function cleanOutdir() {
    if (fs.existsSync(outdir)) {
        fs.rmSync(outdir, { recursive: true });
    }
    fs.mkdirSync(outdir, { recursive: true });
}

function copyStaticFiles() {
    console.log('Copying static files...');
    for (const file of staticFiles) {
        const src = path.join(__dirname, file);
        const dest = path.join(__dirname, outdir, file);
        if (fs.existsSync(src)) {
            ensureDir(dest);
            fs.copyFileSync(src, dest);
            console.log('  + ' + file);
        } else {
            console.warn('  ! ' + file + ' not found, skipping');
        }
    }
}

async function buildJS() {
    console.log('\nBuilding & Bundling JavaScript (ESBuild)...');

    // 1. Bundle modular Background Service Worker
    console.log('  [+] Bundling background/index.js -> dist/background.js');
    await esbuild.build({
        entryPoints: [{ in: 'background/index.js', out: 'background' }],
        outdir: outdir,
        bundle: true,
        minify: !isDev,
        sourcemap: isDev ? 'inline' : false,
        target: ['chrome100'],
        format: 'iife',
        logLevel: 'info'
    });

    // 2. Build remaining standalone modules
    const standaloneEntries = unbundledJsFiles.map(file => ({
        in: file,
        out: file.replace(/\.js$/, '')
    }));

    await esbuild.build({
        entryPoints: standaloneEntries,
        outdir: outdir,
        bundle: false,
        minify: !isDev,
        sourcemap: isDev ? 'inline' : false,
        target: ['chrome100'],
        format: 'iife',
        logLevel: 'info'
    });

    console.log('  [OK] JavaScript bundling complete');
}

async function buildCSS() {
    console.log('\nMinifying CSS...');
    for (const file of cssFiles) {
        const src = path.join(__dirname, file);
        const dest = path.join(__dirname, outdir, file);
        ensureDir(dest);

        await esbuild.build({
            entryPoints: [src],
            outfile: dest,
            minify: !isDev,
            sourcemap: false,
            logLevel: 'silent'
        });
        console.log('  + ' + file);
    }
}

async function build() {
    const mode = isWatch ? 'watch' : isDev ? 'development' : 'production';
    console.log('Building extension for ' + mode + ' (CWS-Compliant ESBuild)...\n');
    const startTime = Date.now();

    try {
        cleanOutdir();
        copyStaticFiles();

        if (isWatch) {
            await buildCSS();
            const allEntries = [
                { in: 'background/index.js', out: 'background' },
                ...unbundledJsFiles.map(f => ({ in: f, out: f.replace(/\.js$/, '') }))
            ];
            const ctx = await esbuild.context({
                entryPoints: allEntries,
                outdir: outdir,
                bundle: false,
                minify: false,
                sourcemap: 'inline',
                target: ['chrome100'],
                format: 'iife',
                logLevel: 'info'
            });
            await ctx.watch();
            console.log('\n[WATCH] Watching for source file changes...');
            return;
        }

        await buildJS();
        await buildCSS();

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log('\n[OK] Build complete in ' + elapsed + 's');
        console.log('Output: ./' + outdir + '/');
        console.log('\nTo install: Load the "dist" folder in chrome://extensions/');
    } catch (error) {
        console.error('[ERR] Build failed:', error);
        process.exit(1);
    }
}

build();
