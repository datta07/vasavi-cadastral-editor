import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function satelliteTilesPlugin() {
  return {
    name: 'satellite-tiles-handler',
    configureServer(server) {
      server.middlewares.use('/satellite_tiles', (req, res, next) => {
        const cleanUrl = decodeURIComponent(req.url.replace(/\?.*$/, ''));
        const filePath = path.join(__dirname, 'satellite_tiles', cleanUrl);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          res.setHeader('Content-Type', 'image/jpeg');
          fs.createReadStream(filePath).pipe(res);
        } else {
          next();
        }
      });
    },
    closeBundle() {
      const src = path.resolve(__dirname, 'satellite_tiles');
      const dest = path.resolve(__dirname, 'dist', 'satellite_tiles');
      if (fs.existsSync(src)) {
        fs.cpSync(src, dest, { recursive: true });
        console.log('[vite] Copied satellite_tiles to dist/satellite_tiles');
      }
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), satelliteTilesPlugin()],
  server: {
    port: 5173,
    strictPort: true
  }
});
