import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import flyerRouter from './routes/flyer.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/flyer', flyerRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[server] running on port ${PORT}`);
  console.log(`[server] bot token: ${process.env.TELEGRAM_BOT_TOKEN ? '✓ set' : '✗ MISSING'}`);
});
