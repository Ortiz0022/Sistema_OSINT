# Seguridad de código, secretos y dependencias — ítem 3.2

## Qué se analiza

El workflow `.github/workflows/seguridad.yml` se ejecuta en PR y push hacia development y main, y manualmente. Es independiente del CI de calidad e imagen. No requiere cuentas de Semgrep ni licencia de Gitleaks Action: se utilizan los ejecutables open source.

- Semgrep CE 1.185.0: reglas locales de `.semgrep/rules.yml` sobre src/, server/ y scripts/. Revisa eval, comandos shell, TLS desactivado, tooltip con HTML dinámico y CORS abierto. Es un conjunto acotado específico al proyecto, no una auditoría completa ni todas las reglas de JavaScript. La regla de tooltip apunta a AM-03 y CORS a D-02; un aviso exige revisión, no demuestra explotación.
- Gitleaks 8.30.1: reglas estándar extendidas mediante `.gitleaks.toml`, historial completo disponible con `git --all`, secretos redactados. El checkout de CI usa fetch-depth 0. Sin excepciones iniciales ni baseline que oculte hallazgos.
- OSV-Scanner 2.7.1: dependencias directas y transitivas del package-lock.json, incluidas desarrollo. Consulta el servicio OSV: recibe identificadores y versiones de paquetes, no los datasets. Una falla de red no es aprobación.

## Qué bloquea

Política inicial para este PR: cualquier hallazgo de las reglas Semgrep seleccionadas (WARNING o ERROR), cualquier secreto detectado y cualquier vulnerabilidad comunicada por OSV. También bloquea un error, un reporte ausente o inválido, cero archivos Semgrep analizados o ausencia de paquetes OSV. No se ocultan problemas para obtener verde ni se cambia la regla de Imagen.

Códigos originales:
- Semgrep: `0` sin hallazgos con --error, `1` hallazgos; otros códigos son errores. --strict y la revisión del JSON impiden tratar errores de análisis como éxito.
- Gitleaks: `0` sin secretos; `10` hallazgos, configurado con --exit-code 10; cualquier otro código se trata como ejecución incompleta o error.
- OSV: `0` sin vulnerabilidades; `1` hallazgos; `127` error general y `128` sin paquetes. Cualquier código distinto de cero bloquea.

El coordinador intenta los tres escáneres, conserva cada código y retorna `1` si alguno tiene hallazgos o no se completó. Solo retorna `0` con los tres completos y sin hallazgos. Timeout por escáner: 10 minutos. Fallar al instalar también falla el job; los demás análisis se intentan siempre que no se cancele la ejecución.

El job rojo no impide por sí solo fusionar si no es requerido en el ruleset. Tras revisar esta política, la administradora debe añadir `Seguridad (Semgrep, Gitleaks, OSV)` a los checks obligatorios de development. No se modifica el ruleset automáticamente ni se afirma que ya esté configurado.

## Ejecución local

Instalar las versiones indicadas desde sus fuentes oficiales y añadirlas al PATH. Semgrep se ejecuta en Linux/macOS o contenedor Linux; para Windows usar Docker o WSL. Gitleaks y OSV ofrecen binarios de Windows. Desde un clon completo del proyecto:

```bash
python3 -m pip install semgrep==1.185.0
python3 scripts/security/run_security.py
```

Los binarios Linux de Gitleaks y OSV se instalan con URL y SHA-256 exactos en el workflow; usar ese mismo bloque en Linux. Docker/WSL debe tener las tres herramientas accesibles dentro del mismo entorno. `git fetch --unshallow` si la copia es superficial. No ejecutar scripts de terceros con tokens de escritura.

## Evidencia y tratamiento

`reportes/seguridad/resultado.json` registra commit realmente analizado, SHA del evento de GitHub, fecha, URL de ejecución y códigos. En PR, GITHUB_SHA puede ser el commit de combinación temporal de GitHub; no confundirlo con la punta de la rama. Se guardan JSON, versiones y logs por escáner como artefacto `reportes-seguridad-<SHA>` durante 30 días.

Los reportes no se versionan: reportes/ ya está ignorado. No exponer valores de secretos al registrar un hallazgo; mantener --redact=100. Registrar confirmados, falsos positivos y pendientes en el registro de Issues del 7.5, asociado al commit y al reporte. Cualquier excepción requiere justificación y revisión; este PR no crea excepciones.

No se corrigen dependencias automáticamente con npm audit fix ni se cambia código de aplicación para pasar. Un análisis que encuentra problemas puede demostrar ejecución completa aunque el check deba permanecer rojo hasta su tratamiento.

## Cómo cerrar el ítem

1. Ejecutar el workflow desde un PR que incluya estos archivos.
2. Confirmar en resultado.json que los tres terminaron, revisar JSON y logs y registrar los hallazgos.
3. Conservar URL de ejecución, commit, artefacto y revisión del integrante 4.
4. Comprobar que un hallazgo da estado rojo y que un error/no ejecución no se presenta como aprobado. La ausencia de ejecución no completa el 3.2.

Estado: configuración preparada. La ejecución local o en CI y sus resultados se documentan únicamente después de observarlos; este documento no certifica ejecuciones futuras.

Fuentes: https://docs.semgrep.dev/cli-reference ; https://github.com/gitleaks/gitleaks ; https://google.github.io/osv-scanner/output/ . Versiones y SHA-256 consultados en los releases oficiales el 10 de noviembre de 2026.
