# Evidencia A — Prueba de carga contra mock local

**Ejercicio:** Sofka — Script de pruebas de carga (login)  
**Herramienta:** Grafana k6 v2.4.0, Windows 10 (PowerShell)  
**Fecha de referencia:** 12 de noviembre de 2026, hora de Colombia (según sesión)  
**Origen:** Captura de consola y contenido del `resumen-mock.json` compartidos durante el ejercicio.  
**Estado:** Ejecutada y aprobada para el entorno simulado.

## Alcance

- **Objetivo:** comprobar que el script programa 20 iteraciones por segundo, lee las cinco filas del CSV, envía una solicitud POST por iteración, valida código HTTP y presencia de token y genera métricas de carga.
- **Destino:** `http://127.0.0.1:3000/auth/login`.
- **Servidor:** `mock/MockLoginServer.java`, proceso local Java que devuelve HTTP 201 y un token ficticio cuando encuentra `username` y `password` en el cuerpo. **No autentica credenciales ni reproduce la infraestructura del proveedor.**
- **Método:** POST; Content-Type: application/json; JSON `{ "username": "<del_csv>", "password": "<oculta>" }`.
- **Generador:** `scripts/login-load.js` con ejecutor `constant-arrival-rate`, `rate: 20`, `timeUnit: 1s`, `duration: 30s`, `preAllocatedVUs: 30` y `maxVUs: 50`.

## Resultados observados

| Métrica | Resultado |
|---|---:|
| Solicitudes HTTP completas | **601** |
| Throughput medio (`http_reqs.rate`) | **20,0323 solicitudes/s** |
| Iteraciones completas | **601** |
| Iteraciones descartadas | **0** |
| Checks exitosos / totales | **1.202 / 1.202 (100 %)** |
| Errores HTTP (`http_req_failed`) | **0 %** |
| Errores funcionales (`login_errors`) | **0 %** |
| Duración promedio HTTP | **0,8773 ms** |
| Mediana HTTP | **0,8194 ms** |
| p90 HTTP | **1,3751 ms** |
| p95 HTTP | **1,6681 ms** |
| Duración máxima HTTP | **63,7994 ms** |

## Criterios de aceptación de la ejecución local

| Threshold k6 | Resultado | Evaluación |
|---|---|---|
| `http_reqs: count>=600` | 601 | PASS |
| `http_req_duration: max<=1500` | 63,7994 ms | PASS |
| `http_req_failed: rate<0.03` | 0 % | PASS |
| `login_errors: rate<0.03` | 0 % | PASS |
| `dropped_iterations: count==0` | 0 | PASS |

En el exportador JSON utilizado por k6, `thresholds[expresión] = false` indica que **el umbral no ha sido incumplido**, y es coherente con los indicadores verdes de la consola. En las métricas `Rate` de errores, `value: 0` representa una tasa de error cero; la nomenclatura interna `fails`/`passes` de esa métrica no es equivalente al estado final del threshold.

## Limitaciones de interpretación

- Las cifras son del **mock local**, no de `https://fakestoreapi.com/auth/login`.
- Se midió una tasa **promedio** de aproximadamente 20 TPS durante la ventana completa; no se dispone aquí de una serie temporal que demuestre un mínimo de 20 TPS en **cada** segundo.
- El mock acepta cualquier par de campos `username`/`password` y devuelve un token estático. No permite concluir capacidad, latencia ni tasa de errores de la API real.

## Evidencias asociadas

- `evidencias/resumen-mock.json` — resumen de métricas k6 ya generado localmente (copiar desde la ejecución original).
- Captura opcional de la consola con `THRESHOLDS` y `TOTAL RESULTS`, eliminando cualquier dato sensible.
