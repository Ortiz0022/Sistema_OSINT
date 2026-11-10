import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

// Ítem 4.2: pruebas de las rutas HTTP de FLU-01 (/api/security/stats y /details).
// El servicio OIJ se reemplaza por un doble de prueba: aquí se prueba solo el
// contrato HTTP (validación, códigos de estado y mensajes de error).
// Criterios: docs/requisitos/flujos-criticos.md. Convención de `it.fails`: ver
// server/services/oijService.criterios.test.ts.

vi.mock('../services/oijService.js', () => ({
  getSecurityStats: vi.fn(),
  getSecurityDetails: vi.fn(),
}));

const servicio = await import('../services/oijService.js');
const { oijRouter } = await import('./oij.js');
const getSecurityStats = vi.mocked(servicio.getSecurityStats);
const getSecurityDetails = vi.mocked(servicio.getSecurityDetails);

let server: Server;
let port: number;

beforeAll(async () => {
  const app = express();
  app.use('/api/security', oijRouter);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  getSecurityStats.mockReset().mockResolvedValue({ summary: { totalIncidents: 1 } });
  getSecurityDetails.mockReset().mockResolvedValue({ tableData: [] });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Devuelve console.error a su comportamiento normal.
  vi.restoreAllMocks();
});

/** GET con node:http (no usa fetch, así no interfiere con otros dobles de prueba). */
function get(path: string): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port, path, method: 'GET' }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data ? JSON.parse(data) : {} }));
    });
    req.on('error', reject);
    req.end();
  });
}

const ENDPOINTS = ['/api/security/stats', '/api/security/details'] as const;

describe('FLU-01 — rutas HTTP /api/security', () => {
  describe('éxito', () => {
    it('FLU-01-CA01: /stats responde 200 y pasa los filtros al servicio', async () => {
      const res = await get('/api/security/stats?year=2024&crimeType=HURTO&provinceId=1&cantonId=1&districtId=8');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ summary: { totalIncidents: 1 } });
      expect(getSecurityStats).toHaveBeenCalledWith({
        year: '2024',
        crimeType: 'HURTO',
        provinceId: '1',
        cantonId: '1',
        districtId: '8',
      });
    });

    it('FLU-01-CA03: /details responde 200 con el detalle del servicio', async () => {
      const res = await get('/api/security/details?year=2025');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ tableData: [] });
    });
  });

  describe('errores', () => {
    it.each(ENDPOINTS)('FLU-01-CA04: %s sin "year" responde 400 y no consulta al OIJ', async (endpoint) => {
      const res = await get(`${endpoint}?provinceId=1`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/year/);
      expect(getSecurityStats).not.toHaveBeenCalled();
      expect(getSecurityDetails).not.toHaveBeenCalled();
    });

    it('FLU-01-CA04 (límite): "year" vacío cuenta como ausente', async () => {
      const res = await get('/api/security/stats?year=');

      expect(res.status).toBe(400);
      expect(getSecurityStats).not.toHaveBeenCalled();
    });

    it.each(ENDPOINTS)('FLU-01-CA06: %s responde 500 con un mensaje genérico, sin detalles internos', async (endpoint) => {
      const fallo = new Error('connect ECONNREFUSED pjenlinea3.poder-judicial.go.cr TN_FechaInicio');
      getSecurityStats.mockRejectedValue(fallo);
      getSecurityDetails.mockRejectedValue(fallo);

      const res = await get(`${endpoint}?year=2024`);
      const texto = JSON.stringify(res.body);

      expect(res.status).toBe(500);
      expect(Object.keys(res.body)).toEqual(['error']);
      expect(texto).not.toMatch(/ECONNREFUSED|poder-judicial|TN_FechaInicio|stack|at /);
    });
  });

  describe('uso indebido', () => {
    it.fails('FLU-01-CA05 [HP-01, Issue #3]: un "year" no numérico responde 400 sin consultar al OIJ', async () => {
      const res = await get('/api/security/stats?year=abcd');

      expect(res.status).toBe(400);
      expect(getSecurityStats).not.toHaveBeenCalled();
    });

    it.fails('FLU-01-CA08 [HP-04, Issue #6]: parámetros repetidos (llegan como arreglo) responden 400', async () => {
      const res = await get('/api/security/stats?year=2024&provinceId=1&provinceId=2');

      expect(res.status).toBe(400);
      expect(getSecurityStats).not.toHaveBeenCalled();
    });

    it.fails('FLU-01-CA08 [HP-04, Issue #6]: un ID territorial con caracteres especiales responde 400', async () => {
      const res = await get(`/api/security/stats?year=2024&provinceId=${encodeURIComponent('1","TC_Delito":"0')}`);

      expect(res.status).toBe(400);
      expect(getSecurityStats).not.toHaveBeenCalled();
    });
  });
});
