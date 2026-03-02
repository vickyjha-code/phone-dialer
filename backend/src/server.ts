import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { connectDB } from './modules/common/db/connection';
import { errorHandler, notFoundHandler } from './modules/common/middleware/errorHandler';
import excelRoutes from './modules/upload-excel/upload-excel.routes';
import noteRoutes from './modules/make-note/make-note.routes';

const app = express();
const PORT = process.env.PORT ?? 3000;
const IS_VERCEL = !!process.env.VERCEL;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Local dev only — Vercel serves frontend via CDN using vercel.json routes
if (!IS_VERCEL) {
  app.use(express.static(path.join(__dirname, '../../frontend')));
}

// API routes
app.use('/api/excel', excelRoutes);
app.use('/api/notes', noteRoutes);

// Local dev only — Vercel handles SPA fallback via vercel.json
if (!IS_VERCEL) {
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend', 'index.html'));
  });
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Export for Vercel serverless (must be default export)
export default app;

// Local development: connect DB then start listening
if (!IS_VERCEL) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`[SERVER] Running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('[SERVER] Failed to start:', err);
      process.exit(1);
    });
} else {
  // Vercel: connect on cold start (Mongoose caches the connection)
  connectDB().catch((err) => console.error('[DB] Connection error:', err));
}
