import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { signup, signin, me } from '../controllers/auth.controller.js';

const router = Router();

// Slows down password guessing. Disabled under test so the suite is not throttled.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  message: { success: false, message: 'Too many attempts. Please wait a few minutes and try again.' },
});

router.post('/signup', authLimiter, asyncHandler(signup));
router.post('/signin', authLimiter, asyncHandler(signin));
router.get('/me', requireAuth, me);

export default router;
