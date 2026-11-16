import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  if (command === 'build' && mode === 'production' && !(process.env.VITE_API_URL || env.VITE_API_URL)) {
    throw new Error('VITE_API_URL must be set for a production build (the deployed server URL)')
  }
  return { plugins: [react(), tailwindcss()] }
})
