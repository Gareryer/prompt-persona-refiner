const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const isWatch = process.argv.includes('--watch');
const isDev = process.argv.includes('--dev') || isWatch;
const outdir = 'dist';

// Obfuscation settings (balanced: security + performance)
const obfuscatorConfig = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.2,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    rotateStringArray: true,
    selfDefending: false,
    shuffleStringArray: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 2,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 4,
    stringArrayWrappersType: 'function',
    stringArrayThreshold: 0.75,
    transformObjectKeys: true,
    unicodeEscapeSequence: false,
};

// Files to minify/bundle (JS)
const jsEntryPoints = [
    'security/runtime-security.js',
    'background.js',
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

// CSS files to minify
const cssFiles = [
    'content/styles.css',
    'rating/rating.css',
    'sidepanel/sidepanel.css',
    'options/styles.css',
];

// Static files to copy (no processing)
const staticFiles = [
    'manifest.json',
    'icons/icon128.png',
    'sidepanel/index.html',
    'options/index.html',
    'supabase/supabase.min.js',
];

// Helper to ensure directory exists
function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Clean and create output directory
function cleanOutdir() {
    if (fs.existsSync(outdir)) {
        fs.rmSync(outdir, { recursive: true });
    }
    fs.mkdirSync(outdir, { recursive: true });
}

// Copy static files
function copyStaticFiles() {
    console.log('Copying static files...');
    for (const file of staticFiles) {
        const src = path.join(__dirname, file);
        const dest = path.join(__dirname, outdir, file);
        if (fs.existsSync(src)) {
            ensureDir(dest);
            fs.copyFileSync(src, dest);
            console.log(`  + ${file}`);
        } else {
            console.warn(`  ! ${file} not found, skipping`);
        }
    }
}

// Validate all source files exist
function validateSources() {
    const missing = [];
    for (const file of [...jsEntryPoints, ...cssFiles]) {
        const src = path.join(__dirname, file);
        if (!fs.existsSync(src)) {
            missing.push(file);
        }
    }
    if (missing.length > 0) {
        console.error('\n[ERR] Missing declared source files:');
        missing.forEach(f => console.error(`  - ${f}`));
        process.exit(1);
    }
}

// Build and obfuscate JS files
async function buildJS() {
    console.log('\nProcessing JavaScript...');

    // First pass: esbuild minification
    await esbuild.build({
        entryPoints: jsEntryPoints,
        outdir: outdir,
        bundle: false,
        minify: !isDev,
        sourcemap: isDev ? 'inline' : false,
        target: ['chrome100'],
        format: 'iife',
        logLevel: 'info',
    });

    console.log('  + JavaScript processed');

    // Second pass: obfuscation (skip in dev/watch mode)
    if (!isDev) {
        console.log('\nObfuscating JavaScript...');

        for (const file of jsEntryPoints) {
            const outFile = path.join(__dirname, outdir, file);
            if (!fs.existsSync(outFile)) continue;

            const code = fs.readFileSync(outFile, 'utf-8');
            const obfuscated = JavaScriptObfuscator.obfuscate(code, obfuscatorConfig);
            fs.writeFileSync(outFile, obfuscated.getObfuscatedCode());
            console.log(`  [OBF] ${file}`);
        }

        console.log('  + JavaScript obfuscated');
    } else {
        console.log('\n[SKIP] Skipping obfuscation (dev mode)');
    }
}

// Minify CSS files
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
            logLevel: 'silent',
        });
        console.log(`  + ${file}`);
    }
}

// Main build
async function build() {
    const mode = isWatch ? 'watch' : isDev ? 'development' : 'production (obfuscated)';
    console.log(`Building extension for ${mode}...\n`);
    const startTime = Date.now();

    try {
        validateSources();
        cleanOutdir();
        copyStaticFiles();

        if (isWatch) {
            await buildCSS();
            const ctx = await esbuild.context({
                entryPoints: jsEntryPoints,
                outdir: outdir,
                bundle: false,
                minify: false,
                sourcemap: 'inline',
                target: ['chrome100'],
                format: 'iife',
                logLevel: 'info',
            });
            await ctx.watch();
            console.log('\n[WATCH] Watching for source file changes...');
            return;
        }

        await buildJS();
        await buildCSS();

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n[OK] Build complete in ${elapsed}s`);
        console.log(`Output: ./${outdir}/`);

        if (!isDev) {
            console.log('\n[SEC] Security features enabled:');
            console.log('   • String array encryption (base64)');
            console.log('   • Control flow flattening');
            console.log('   • Dead code injection');
            console.log('   • Identifier renaming (hexadecimal)');
        }

        console.log('\nTo install: Load the "dist" folder in chrome://extensions/');
    } catch (error) {
        console.error('[ERR] Build failed:', error);
        process.exit(1);
    }
}

build();
