# Evidencia B — Prueba de carga ejecutada contra FakeStoreAPI

**Estado:** EJECUTADA · **Destino real:** `POST https://fakestoreapi.com/auth/login`  
**Framework:** Grafana k6 v2.4.0  
**Fuente:** captura de consola y datos de `resumen-fakestore.json` compartidos durante el ejercicio.  
**Escenario:** 20 iteraciones programadas/s durante 30 s; 30 VUs preasignados; límite 50; una solicitud HTTP por iteración.

## Resultados de la carga real

| Métrica | Observado |
|---|---:|
| Solicitudes completadas | 601 |
| Throughput `http_reqs.rate` | **19,795992 req/s** |
| Iteraciones completadas | 601 |
| Iteraciones descartadas | 0 |
| Checks aprobados | 1.202 / 1.202 (100 %) |
| Respuestas HTTP esperadas | 601 con HTTP 201 y token |
| `http_req_failed.value` | 0 % |
| `login_errors.value` | 0 % |
| `http_req_duration.avg` | 378,0547 ms |
| `http_req_duration.med` | 365,1151 ms |
| `http_req_duration.p(90)` | 402,4673 ms |
| `http_req_duration.p(95)` | 427,4810 ms |
| `http_req_duration.max` | **783,8520 ms** |
| `iteration_duration.max` | 935,2099 ms |
| VUs en uso observados | entre 6 y 16 |
| VUs preasignados | 30 |

## Thresholds configurados

| Expresión | Valor observado | Resultado |
|---|---:|---|
| `dropped_iterations: count==0` | 0 | PASS |
| `http_req_duration: max<=1500` | 783,852 ms | PASS |
| `http_req_failed: rate<0.03` | 0 % | PASS |
| `http_reqs: count>=600` | 601 | PASS |
| `login_errors: rate<0.03` | 0 % | PASS |

**Nota importante sobre TPS:** el criterio literal de Sofka es **al menos 20 TPS**; el valor `http_reqs.rate` registrado fue **19,796**, inferior en ~0,204 solicitudes/s. El escenario **programó** 20 iteraciones por segundo y el threshold de **conteo acumulado** aprobó, pero estas cifras no justifican afirmar que se alcanzaron al menos 20 TPS de media en el indicador de k6. Tampoco hay datos agregados por segundo para certificar estabilidad en cada intervalo.

**Interpretación del JSON:** `thresholds[expresión] = false` quiere decir que **no se violó** el umbral. Para `login_errors`, `value = 0` es tasa de errores de 0 %; no interpretar los `fails` internos de un Rate como errores reales de login cuando la métrica vale 0.

## Entradas y validaciones

- CSV: encabezado `user,password` y cinco filas de prueba del enunciado, alternadas de manera parametrizada.
- Petición: JSON con campos `username` y `password` hacia `/auth/login`.
- Validaciones en cada solicitud: HTTP 201 y presencia de un token no vacío, sin imprimirlo.
- No se publican contraseñas ni tokens de autenticación en este documento.

## Línea base previa (no es carga)

El smoke real ejecutó 5 logins, obtuvo 10/10 checks exitosos, HTTP 201 y token en cada uno; promedio 365,31 ms, máximo 387,90 ms, p95 384,43 ms. No debe confundirse con la carga de 601 solicitudes.

## Conclusión específica del entorno real

Se verificaron **601 respuestas funcionalmente correctas, 0 % de errores y máximo 783,852 ms**. El throughput medio observado de **19,796 req/s** queda ligeramente por debajo del requisito literal de 20 TPS pese a que el ejecutor se configuró para programar esa tasa. Reportar esta diferencia de forma explícita. Para aumentar volumen o repetir carga sobre un servicio de terceros, verificar previamente la autorización del operador.

**Archivos recomendados como respaldo:** `resumen-fakestore.json`, captura del panel `THRESHOLDS`/`TOTAL RESULTS` y `scripts/login-load.js`. Revisar el JSON antes de subirlo a GitHub.
