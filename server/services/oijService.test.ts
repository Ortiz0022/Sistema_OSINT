
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSecurityStats } from './oijService.js';

describe('FLU-01-CA07 — Respuesta inesperada del OIJ', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('rechaza respuestas HTTP 200 con estructura inválida', async () => {
        // Simulamos el proveedor externo sin utilizar Internet.
        const fetchSimulado = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                mensaje: 'Formato inesperado',
            }),
        });

        vi.stubGlobal('fetch', fetchSimulado);

        // Usamos un año ficticio para evitar coincidencias de caché.
        const consulta = getSecurityStats({ year: '2097' });

        // El requisito establece que no se deben aceptar datos inválidos.
        await expect(consulta).rejects.toThrow();

        // Confirmamos que las dos respuestas fueron simuladas.
        expect(fetchSimulado).toHaveBeenCalledTimes(2);
    });
});
