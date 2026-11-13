# Reporte final comparativo de rendimiento — Sofka, Ejercicio 1

**Herramienta:** Grafana k6 v2.4.0  
**Servicio del ejercicio:** `POST https://fakestoreapi.com/auth/login`  
**Ambientes:** mock local Java y API pública de FakeStoreAPI  
**Evidencia:** resultados de consola y exportaciones JSON compartidas durante la ejecución  
**Objetivos de Sofka:** al menos **20 TPS**, duración de respuesta **máxima de 1.500 ms**, errores **inferiores al 3 %**.

> **Conclusión ejecutiva:** ambas ejecuciones completaron **601 solicitudes**, sin errores HTTP, errores de login ni iteraciones descartadas. La prueba sobre FakeStoreAPI registró **19,796 solicitudes/s de media**, ligeramente por debajo del requisito literal de **20 TPS**. Por lo tanto, los *cinco thresholds configurados en el script* aprobaron, pero **no corresponde afirmar que el umbral de throughput observado de 20 TPS quedó demostrado**. El tiempo máximo y la tasa de errores sí cumplieron los límites en esta ejecución.

## 1. Diseño y metodología

- **Entrada:** `data/users.csv`, cinco filas `user,password` proporcionadas en el ejercicio. El script traduce `user` a `username` al construir el JSON. No se reproducen contraseñas ni tokens en este documento.
- **Carga:** `scripts/login-load.js` — `constant-arrival-rate`, `rate: 20`, `timeUnit: '1s'`, duración de 30 s, 30 usuarios virtuales preasignados, máximo 50, y 10 s de parada de cortesía.
- **Operación por iteración:** un `POST /auth/login` con `Content-Type: application/json` y comprobación de HTTP **201** y presencia del campo `token` (comportamiento previamente observado con las cinco cuentas en el smoke real).
- **Checks:** dos por solicitud; **métrica funcional personalizada:** `login_errors` (proporción de logins no válidos).
- **Thresholds implementados:** `http_reqs count>=600`, `http_req_duration max<=1500`, `http_req_failed rate<0.03`, `login_errors rate<0.03`, `dropped_iterations count==0`.
- **Archivos reproducibles:** scripts JS, CSV, `mock/MockLoginServer.java`, resumen JSON y documentación. El servidor mock no representa el procesamiento interno de FakeStoreAPI.

## 2. Comparación de resultados observados

| Métrica | Mock local | FakeStoreAPI (real) |
|---|---:|---:|
| Solicitudes HTTP completadas | **601** | **601** |
| Tasa media de `http_reqs` | **20,0323 req/s** | **19,7960 req/s** |
| Iteraciones completadas | 601 | 601 |
| Iteraciones descartadas | **0** | **0** |
| Checks aprobados | **1.202 / 1.202** | **1.202 / 1.202** |
| Errores HTTP | **0 %** | **0 %** |
| Errores funcionales de login | **0 %** | **0 %** |
| Duración HTTP promedio | **0,8773 ms** | **378,0547 ms** |
| Duración HTTP mediana | 0,8194 ms | 365,1151 ms |
| Duración HTTP p90 | 1,3751 ms | 402,4673 ms |
| Duración HTTP p95 | 1,6681 ms | 427,4810 ms |
| Duración HTTP máxima | **63,7994 ms** | **783,8520 ms** |
| VUs preasignados | 30 | 30 |

**Interpretación:** la latencia de FakeStoreAPI es significativamente superior a la del mock, como cabría esperar de un servicio remoto real. Los valores de una sola ejecución no describen por sí solos la capacidad general del servicio ni su comportamiento a largo plazo.

## 3. Criterios de aceptación

| Criterio | Mock local | FakeStoreAPI | Evaluación de FakeStoreAPI |
|---|---:|---:|---|
| Mínimo 600 solicitudes en la ejecución (`count>=600`) | 601 | 601 | **PASS** (threshold implementado) |
| TPS medio observado >= 20 (`http_reqs.rate`) | 20,0323 | **19,7960** | **No demostrado**: 0,2040 req/s por debajo |
| Duración HTTP máxima <= 1.500 ms | 63,7994 ms | 783,8520 ms | **PASS** |
| Errores HTTP < 3 % | 0 % | 0 % | **PASS** |
| Errores de login < 3 % | 0 % | 0 % | **PASS** |
| Iteraciones perdidas = 0 | 0 | 0 | **PASS** |

### ¿Por qué `http_reqs` aprobó si la tasa media es 19,796?

El threshold configurado fue **`count>=600`**: comprueba la **cantidad total**, no la tasa media. k6 registró 601 solicitudes, por eso aparece en verde. La tasa **`http_reqs.rate`** del resumen se calcula respecto de la ventana temporal de medición usada por k6, que no tiene por qué ser exactamente 30,000 s; por eso arroja **19,796 req/s** pese a que el ejecutor programó 20 llegadas/s y completó 601 solicitudes. Esto no significa que hubiese fallos: significa que un contador acumulado y una tasa son métricas diferentes.

Para una validación estricta de **20 TPS observados**, conviene incorporar una condición adicional de tasa (`http_reqs: ['count>=600', 'rate>=20']`) y estudiar los datos por intervalos. Una nueva ejecución contra un servicio público requeriría autorización para ese volumen; **no se ajustaron retrospectivamente los datos ni se repitió la carga para forzar un resultado favorable**.

### Sobre las propiedades JSON del summary

En estas exportaciones, `thresholds[expresión]: false` significa que el threshold **no fue violado**. Asimismo, las métricas de tipo `Rate` reflejan valores booleanos registrados: `login_errors.value: 0` indica **0 % de errores**, aunque el JSON muestre nombres internos `passes` y `fails` que pueden resultar contraintuitivos. Para la evaluación se privilegian el valor de la métrica y el estado mostrado por k6.

## 4. Hallazgos

1. **Conectividad y respuesta correcta:** los cinco usuarios del CSV pasaron el smoke funcional real con HTTP 201 y token. La prueba de carga real volvió a comprobar esas condiciones en 601 solicitudes.
2. **Tiempo de respuesta dentro del límite:** durante la carga contra FakeStoreAPI, el máximo observado fue **783,852 ms**, inferior a los **1.500 ms** permitidos; p95 = **427,481 ms**.
3. **Errores dentro del límite:** **0 de 601** solicitudes con error HTTP y **0 de 601** autenticaciones funcionalmente fallidas.
4. **Sin descartes:** `dropped_iterations = 0`, lo que indica que no se omitieron iteraciones por insuficiencia de capacidad del generador de carga.
5. **Objetivo de throughput ajustado:** se programaron 20 llegadas por segundo y se completaron 601 peticiones; el valor **realmente reportado** fue **19,796 req/s**, levemente inferior a 20. Con los datos entregados no podemos certificar 20 TPS medios o constantes en todos los segundos.
6. **Simulación vs entorno real:** el mock valida el mecanismo del generador, no la capacidad de la API externa. Las conclusiones del proveedor se basan exclusivamente en la columna real.

## 5. Limitaciones y precauciones

- FakeStoreAPI es un servicio público. El enunciado de Sofka suministra el endpoint, pero **no consta en estos materiales una autorización explícita del operador para cargas sostenidas**. No se recomienda repetir ni incrementar la carga sin aclarar ese permiso.
- Se registra una sola ejecución de carga por ambiente. No se dispone de series temporales por segundo, repetición estadística ni monitoreo de recursos de servidor.
- Las cifras mostradas describen el entorno y momento de prueba, no constituyen una garantía de rendimiento futuro.
- Los archivos JSON resumidos que se publiquen deben revisarse para evitar credenciales y tokens reutilizables.
- Para un reporte reproducible, publicar los archivos de k6 y los resultados **con los nombres exactos de las ejecuciones**; no reemplazar valores de una prueba por los del otro ambiente.

## 6. Reproducción

Desde la raíz del proyecto, con k6 v2.4.0 y el CSV de prueba preparado:

**Mock local (Java 21):**

```powershell
java .\mock\MockLoginServer.java
```

En otra terminal:

```powershell
k6 run --summary-export='.\evidencias\resumen-mock.json' .\scripts\login-load.js
```

**Smoke funcional de FakeStoreAPI (cinco solicitudes):**

```powershell
k6 run .\scripts\login-smoke.js
```

**Carga en FakeStoreAPI:** solo cuando exista autorización para el volumen del ejercicio; el script incorpora una barrera explícita para evitar lanzarla accidentalmente. La evidencia de esta ejecución ya realizada está registrada en `evidencia-fakestore.md` y `resumen-fakestore.json`.

## 7. Conclusión

**Las dos ejecuciones muestran una automatización de carga operativa, 601 solicitudes procesadas en cada ambiente, 100 % de checks aprobados y ninguna iteración descartada.** En FakeStoreAPI, la duración máxima observada fue **783,852 ms** y la tasa de errores fue **0 %**, por lo que ambas condiciones de calidad del enunciado se cumplieron en la muestra. Respecto de **20 TPS**, el escenario estuvo configurado a 20 iteraciones/s, pero la métrica promedio observada fue **19,796 req/s**, por lo que ese objetivo queda **marginalmente por debajo y no debe declararse plenamente aprobado** bajo una lectura estricta. Esta diferencia se registra como hallazgo de performance y como oportunidad para afinar los umbrales y la medición temporal.
