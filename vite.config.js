import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [react(), tailwindcss()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        chunkSizeWarningLimit: 800,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) {
                        return undefined
                    }

                    if (id.includes('@react-three/fiber')) {
                        return 'viewer-fiber'
                    }

                    if (id.includes('@react-three/drei')) {
                        return 'viewer-drei'
                    }

                    if (id.includes('node_modules/three')) {
                        return 'viewer-three'
                    }

                    if (id.includes('firebase')) {
                        return 'firebase'
                    }

                    if (id.includes('framer-motion')) {
                        return 'motion'
                    }

                    return undefined
                },
            },
        },
    },
    server: {
        port: 5173,
    },
})
