import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import path from 'path';
import { startSession, sessions } from './sessions';
import { startWorker } from './worker';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'dev-secret-token';

// Middleware de autenticación interna
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.post('/internal/sessions/:companyId/start', authMiddleware, async (req, res) => {
  const companyId = req.params.companyId as string;
  
  if (sessions.has(companyId)) {
    return res.json({ message: 'Session already active', status: 'active' });
  }

  try {
    // Iniciamos sesión (no esperamos a que termine de conectar porque puede requerir QR)
    startSession(companyId);
    res.json({ message: 'Session startup initiated', status: 'starting' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

app.get('/internal/sessions/:companyId/status', authMiddleware, (req, res) => {
  const companyId = req.params.companyId as string;
  const isActive = sessions.has(companyId);
  res.json({ status: isActive ? 'active' : 'inactive' });
});

app.listen(PORT, () => {
  console.log(`[Baileys Service] Listening on port ${PORT}`);
  // Iniciar el worker de envíos en segundo plano
  startWorker();
});
