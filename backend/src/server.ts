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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend')));

// API routes
app.use('/api/excel', excelRoutes);
app.use('/api/notes', noteRoutes);

// Serve frontend for any non-API route
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend', 'index.html'));
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

async function start(): Promise<void> {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`[SERVER] Running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[SERVER] Failed to start:', err);
    process.exit(1);
  }
}

start();
