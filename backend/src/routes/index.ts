import { Router } from 'express';
import postsRouter from './posts';
import authRouter from './auth';

const router = Router();

router.use('/posts', postsRouter);
router.use('/auth', authRouter);

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'OSKADUSI API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
