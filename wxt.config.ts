import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: '.',
  entrypointsDir: 'entrypoints',
  publicDir: 'public',
  outDir: '.output',
  manifest: {
    name: 'Prompt Assistant - AI Context-Aware Engineer',
    version: '1.0.0',
    description: 'Persist personas and refine prompts across Gemini, ChatGPT, Claude, DeepSeek, Grok, and Meta AI',
    permissions: [
      'storage',
      'unlimitedStorage',
      'tabs',
      'clipboardWrite',
      'sidePanel',
      'downloads'
    ],
    host_permissions: [
      'https://gemini.google.com/*',
      'https://chatgpt.com/*',
      'https://chat.openai.com/*',
      'https://claude.ai/*',
      'https://chat.deepseek.com/*',
      'https://grok.com/*',
      'https://x.com/i/grok*',
      'https://*.meta.ai/*',
      'https://generativelanguage.googleapis.com/*',
      'https://api.openai.com/*',
      'https://api.anthropic.com/*',
      'https://openrouter.ai/*'
    ],
    action: {
      default_title: 'Open Memory Control Panel',
      default_icon: {
        '16': 'icons/icon16.png',
        '32': 'icons/icon32.png',
        '48': 'icons/icon48.png',
        '128': 'icons/icon128.png'
      }
    },
    side_panel: {
      default_path: 'sidepanel/index.html'
    },
    commands: {
      'trigger-refine': {
        suggested_key: {
          default: 'Ctrl+Shift+R',
          mac: 'Command+Shift+R'
        },
        description: 'Refine current prompt'
      },
      'open-sidepanel': {
        suggested_key: {
          default: 'Alt+M'
        },
        description: 'Open Memory Control Panel'
      }
    }
  },
  vite: () => ({
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  })
});
