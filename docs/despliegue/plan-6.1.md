
# Ítem 6.1 — Despliegue automático

## Objetivo

Automatizar el despliegue del frontend y backend de Sistema OSINT
después de integrar cambios en development y superar las
comprobaciones obligatorias.

## Dependencias

- Calidad: lint, tipos, pruebas y compilación.
- Imagen: construcción Docker, análisis Trivy y SBOM.
- Versión 5.1: imagen publicada y aprobada en Docker Hub.

## Arquitectura prevista

- Frontend: Netlify (React + Vite).
- Backend: Render (Express, puerto 3001).
- Imagen: docker.io/bluelemon08/sistema-osint.
- Identificación: digest SHA-256 de la imagen publicada.

## Condiciones para desplegar

1. El evento debe ser push sobre development.
2. Las verificaciones obligatorias deben haber finalizado correctamente.
3. El job version debe proporcionar imagen y digest.
4. Desplegar exactamente la imagen aprobada, sin reconstruirla.
5. Verificar la disponibilidad del backend y del frontend.
6. Registrar commit, digest, resultado y enlaces como evidencia.

## Estado

Planificación inicial. No se ha implementado ni ejecutado
el despliegue automático.
