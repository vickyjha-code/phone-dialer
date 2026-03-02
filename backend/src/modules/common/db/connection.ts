import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  mongoose.connection.on('connected', () => {
    console.log('[DB] MongoDB connected successfully');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[DB] MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB disconnected');
  });

  await mongoose.connect(mongoUri);
}
