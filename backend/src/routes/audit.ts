import { Router } from 'express';
import { listAuditLogsHandler } from '../handlers/auditHandlers';

const router = Router();

router.get('/', listAuditLogsHandler);

export default router;
