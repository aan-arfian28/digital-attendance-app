import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitroV2Plugin } from '@tanstack/nitro-v2-vite-plugin'

const config = defineConfig({
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    nitroV2Plugin({
      preset: 'node-server'
    }),
    viteReact(),
  ],
  server: {
    host: true, // expose the server to the network
    allowedHosts: ['cluster-gotten-sciences-marathon.trycloudflare.com'], // cloudflared tunnel - no http://
    // allowedHosts: ['*'], // allow all hosts

    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  },

})

export default config
