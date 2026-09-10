import { Router } from 'express';
import { getSecurityStats, getSecurityDetails } from '../services/oijService.js';

export const oijRouter = Router();

oijRouter.get('/stats', async (req, res) => {
  try {
    const { year, crimeType, provinceId, cantonId, districtId } = req.query;
    if (!year) return res.status(400).json({ error: 'El parámetro "year" es obligatorio.' });

    const stats = await getSecurityStats({
      year: year as string,
      crimeType: crimeType as string,
      provinceId: provinceId as string,
      cantonId: cantonId as string,
      districtId: districtId as string,
    });
    res.json(stats);
  } catch (error) {
    console.error('Error en /api/security/stats:', error);
    res.status(500).json({ error: 'Ocurrió un error al consultar las estadísticas principales.' });
  }
});

oijRouter.get('/details', async (req, res) => {
  try {
    const { year, crimeType, provinceId, cantonId, districtId } = req.query;
    if (!year) return res.status(400).json({ error: 'El parámetro "year" es obligatorio.' });

    const details = await getSecurityDetails({
      year: year as string,
      crimeType: crimeType as string,
      provinceId: provinceId as string,
      cantonId: cantonId as string,
      districtId: districtId as string,
    });
    res.json(details);
  } catch (error) {
    console.error('Error en /api/security/details:', error);
    res.status(500).json({ error: 'Ocurrió un error al consultar los detalles de subdelitos.' });
  }
});
