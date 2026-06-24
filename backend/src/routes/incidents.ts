import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Get all incidents (ordered by opened_at descending)
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT i.*, m.name as monitor_name 
       FROM incidents i
       JOIN monitors m ON i.monitor_id = m.id
       ORDER BY i.opened_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single incident with alert logs
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const incidentRes = await query(
      `SELECT i.*, m.name as monitor_name, m.url as monitor_url
       FROM incidents i
       JOIN monitors m ON i.monitor_id = m.id
       WHERE i.id = $1`,
      [id]
    );
    
    if (incidentRes.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    
    const logsRes = await query(
      `SELECT * FROM alert_logs WHERE incident_id = $1 ORDER BY sent_at DESC`,
      [id]
    );

    res.json({
      ...incidentRes.rows[0],
      alert_logs: logsRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
