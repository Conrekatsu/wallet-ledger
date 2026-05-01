import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { loginHandler, registerHandler, userHandler } from '../handlers/authHandlers';

const router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.get('/user', authenticate, userHandler);

export default router;
