import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { loginHandler, meHandler, registerHandler } from '../handlers/authHandlers';

const router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.get('/me', authenticate, meHandler);

export default router;
