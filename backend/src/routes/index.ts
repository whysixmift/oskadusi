import { Router } from 'express';
import postsRouter from './posts';
import authRouter from './auth';
import blogRouter from './blog';
import statusRouter from './status';
import telegramRouter from './telegram';

const router = Router();

router.use('/posts', postsRouter);
router.use('/auth', authRouter);
router.use('/blog', blogRouter);
router.use('/status', statusRouter);
router.use('/telegram', telegramRouter);

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'OSKADUSI API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
