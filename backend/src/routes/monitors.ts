import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Get all monitors
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM monitors ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create monitor
router.post('/', async (req: Request, res: Response) => {
  const { name, url, method, expected_status, check_interval_seconds, latency_threshold_ms, error_rate_threshold_pct, webhook_url } = req.body;
  try {
    const result = await query(
      `INSERT INTO monitors (name, url, method, expected_status, check_interval_seconds, latency_threshold_ms, error_rate_threshold_pct, webhook_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, url, method || 'GET', expected_status || 200, check_interval_seconds || 60, latency_threshold_ms || 1000, error_rate_threshold_pct || 50, webhook_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update monitor
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, url, method, expected_status, check_interval_seconds, latency_threshold_ms, error_rate_threshold_pct, webhook_url, is_active } = req.body;
  try {
    const result = await query(
      `UPDATE monitors 
       SET name=$1, url=$2, method=$3, expected_status=$4, check_interval_seconds=$5, latency_threshold_ms=$6, error_rate_threshold_pct=$7, webhook_url=$8, is_active=$9
       WHERE id=$10 RETURNING *`,
      [name, url, method, expected_status, check_interval_seconds, latency_threshold_ms, error_rate_threshold_pct, webhook_url, is_active, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete monitor
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query('DELETE FROM monitors WHERE id=$1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get historical check results for a monitor (last 24 hours by default)
router.get('/:id/history', async (req: Request, res: Response) => {
  const { id } = req.params;
  const hours = parseInt(req.query.hours as string) || 24;
  try {
    const result = await query(
      `SELECT status_code, latency_ms, success, checked_at 
       FROM check_results 
       WHERE monitor_id = $1 AND checked_at >= NOW() - INTERVAL '${hours} hours'
       ORDER BY checked_at ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
