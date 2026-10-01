import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
// AI requests require Firebase authentication and are handled by the callable Function.
app.post('/api/chat', (_req, res) => {
  res.status(410).json({ error: 'Refresh VertexIS to use the authenticated assistant.' });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const httpServer = createHttpServer(app);
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // Share the app port instead of opening Vite's default WebSocket port (24678).
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[VertexIS Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
