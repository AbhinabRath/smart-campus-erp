import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { generateMyIdCard } from '../controllers/idCardController';

const router = Router();

router.get(
  '/my',
  requireAuth,
  generateMyIdCard
);

export default router;