# Sofka — Pruebas de carga de login con Grafana k6

Proyecto de automatización de pruebas de rendimiento para el **Ejercicio 1 — Script de Pruebas de Carga** de Sofka. Implementa un escenario de **20 iteraciones por segundo durante 30 segundos**, utilizando cinco usuarios parametrizados mediante CSV, comprobaciones funcionales y umbrales (*thresholds*) de rendimiento.

**Servicio solicitado:** `POST https://fakestoreapi.com/auth/login`  
**Herramienta utilizada:** Grafana k6 **v2.4.0**  
**Repositorio previsto:** `https://github.com/victorAlvarezValencia/sofka-performance-k6`

> **Resultado y precisión:** la prueba real completó **601 solicitudes**, con **0 % de errores**, **0 iteraciones descartadas** y una latencia máxima de **783,85 ms**. El generador estuvo configurado a 20 llegadas/s, pero la tasa media reportada por k6 fue **19,796 solicitudes/s**. Por lo tanto, **no se declara satisfecho estrictamente el requisito de ≥20 TPS medidos**, aunque los cinco thresholds originalmente configurados resultaron aprobados.

## Objetivos y criterios de Sofka

| Requisito | Implementación o comprobación |
|---|---|
| API | `POST /auth/login` de FakeStoreAPI |
| Datos de entrada | `data/users.csv`, columnas `user,password`, cinco filas suministradas en el ejercicio |
| Tasa programada | 20 iteraciones/s con `constant-arrival-rate` |
| Latencia permitida | Máximo **1.500 ms** por petición HTTP |
| Tasa de error permitida | **Menos del 3 %** |
| Evidencia de ejecución | Resúmenes JSON y reportes Markdown para mock local y FakeStoreAPI |
| Reproducibilidad | Scripts, CSV, mock Java y guía de comandos |

Cada iteración envía **una solicitud POST**; por eso se analizan `iterations`, `http_reqs`, `http_reqs.rate` y `dropped_iterations` por separado. **20 VUs no equivale a 20 TPS.**

## Estructura del repositorio

```text
sofka-performance-k6/
├── scripts/
│   ├── verificar-k6.js              # Comprobación inicial de instalación (opcional)
│   ├── login-smoke.js               # Cinco logins secuenciales contra FakeStoreAPI
│   └── login-load.js                # Escenario de carga, por defecto al mock local
├── data/
│   └── users.csv                    # Cinco credenciales de PRUEBA del enunciado
├── mock/
│   └── MockLoginServer.java         # API local simulada; NO autentica realmente
├── evidencias/
│   ├── resumen-mock.json            # Resumen de k6, ejecución local
│   ├── resumen-fakestore.json       # Resumen de k6, ejecución remota observada
│   ├── evidencia-mock.md
│   ├── evidencia-fakestore.md
│   └── reporte-performance-sofka.md
├── README.md
├── readme.txt                       # Instrucciones paso a paso requeridas
├── conclusiones.txt                 # Hallazgos y conclusiones requeridas
└── .gitignore
```

La estructura indica los archivos de la entrega prevista. Los dos resúmenes JSON deben ser los exportados de las ejecuciones reales, sin alterar sus métricas. Si algún archivo de evidencia falta en la copia del proyecto, debe incorporarse antes de la entrega.

## Herramientas y versiones

- **Grafana k6:** `v2.4.0` (instalación verificada en Windows 10 x64).
- **Java:** JDK 21 para ejecutar el servidor mock opcional (no es requerido por k6).
- **Editor:** IntelliJ IDEA, VS Code u otro editor de JavaScript (opcional).
- **Sistema local utilizado:** Windows 10 / PowerShell.
- **Git:** para clonar y versionar. **No requiere Node.js, npm ni Maven.**
- **Red:** acceso HTTPS al servicio remoto, únicamente cuando corresponda.

Los resultados dependen del equipo y entorno. El proyecto no incluye una aplicación Java comercial ni frameworks de terceros para el mock.

## Instalación y preparación

1. Instalar k6 siguiendo su documentación oficial: <https://grafana.com/docs/k6/latest/set-up/install-k6/>. En Windows puede utilizarse:

   ```powershell
   winget install --id GrafanaLabs.k6 --exact --source winget
   ```

2. Verificar las herramientas:

   ```powershell
   k6 version
   java -version
   git --version
   ```

3. Obtener el proyecto (cuando el repositorio público esté creado):

   ```powershell
   git clone https://github.com/victorAlvarezValencia/sofka-performance-k6.git
   cd sofka-performance-k6
   ```

4. Confirmar que `data/users.csv` existe, que su primera línea es `user,password` y que contiene las **cinco filas proporcionadas para esta prueba**. Los scripts convierten `user` en el campo JSON `username`. No utilizar credenciales personales ni de producción.

## Ejecución paso a paso

### A. Inspección sin peticiones HTTP

```powershell
k6 inspect --execution-requirements .\scripts\login-load.js
```

Debe reconocer `constant-arrival-rate`, `rate: 20`, `timeUnit: 1s`, `duration: 30s`, 30 VUs preasignados, máximo 50 VUs y los cinco thresholds. **La inspección no constituye una prueba de rendimiento.**

### B. Prueba de carga contra el mock local (reproducible sin afectar terceros)

**Terminal 1:**

```powershell
java .\mock\MockLoginServer.java
```

El mock atiende `http://127.0.0.1:3000/auth/login` y devuelve HTTP 201 con un token **ficticio** cuando encuentra los campos esperados. **No valida las contraseñas** ni reproduce el servicio de FakeStoreAPI.

**Terminal 2:**

```powershell
New-Item -ItemType Directory -Force .\resultados-locales | Out-Null
k6 run --summary-export=".\resultados-locales\resumen-mock-reproduccion.json" .\scripts\login-load.js
```

El script apunta al mock por defecto. Si la variable `TARGET_URL` quedó definida en esa terminal, elimínala antes de ejecutar: `Remove-Item Env:TARGET_URL -ErrorAction SilentlyContinue`. Cierra el servidor con **Ctrl+C**.

### C. Smoke de FakeStoreAPI (cinco autenticaciones)

```powershell
k6 run .\scripts\login-smoke.js
```

Esta ejecución no es una prueba de carga: utiliza cinco iteraciones con un VU. En la línea base observada, las cinco respuestas fueron HTTP **201** con token, con duración promedio de **365,31 ms**.

### D. Carga real de FakeStoreAPI — ejecución condicionada a autorización

El ejercicio nombra un servicio público de un tercero. **No se debe repetir ni incrementar el volumen de carga sin confirmar autorización del responsable del servicio.** El script requiere una habilitación explícita antes de apuntar al endpoint remoto:

```powershell
# Solo tras confirmar permiso para una carga sostenida de 20 TPS:
$env:TARGET_URL = 'https://fakestoreapi.com/auth/login'
$env:LOAD_AUTHORIZED = 'yes'
New-Item -ItemType Directory -Force .\resultados-locales | Out-Null
k6 run --summary-export=".\resultados-locales\resumen-fakestore-reproduccion.json" .\scripts\login-load.js
Remove-Item Env:TARGET_URL -ErrorAction SilentlyContinue
Remove-Item Env:LOAD_AUTHORIZED -ErrorAction SilentlyContinue
```

**La ejecución real incluida en la evidencia ya se realizó.** No es necesario repetirla para evaluar los archivos publicados. Los archivos bajo `resultados-locales/` son salidas de reproducción y se excluyen de Git para preservar las evidencias originales.

## Resultados documentados

| Métrica | Mock local | FakeStoreAPI |
|---|---:|---:|
| Solicitudes e iteraciones completadas | 601 | 601 |
| Tasa media `http_reqs.rate` | **20,0323 req/s** | **19,7960 req/s** |
| Checks correctos | 1.202 / 1.202 | 1.202 / 1.202 |
| Errores HTTP | 0 % | 0 % |
| Errores funcionales de login | 0 % | 0 % |
| Iteraciones descartadas | 0 | 0 |
| Tiempo HTTP promedio | 0,8773 ms | 378,0547 ms |
| Tiempo HTTP p95 | 1,6681 ms | 427,4810 ms |
| Tiempo HTTP máximo | 63,7994 ms | 783,8520 ms |

Los **cinco thresholds implementados** pasaron: `http_reqs count>=600`, `http_req_duration max<=1500`, `http_req_failed rate<0.03`, `login_errors rate<0.03` y `dropped_iterations count==0`.

**Advertencia sobre throughput:** `count>=600` verifica el **número de solicitudes**, no la tasa promedio. La prueba remota registró **19,7960 req/s**, por lo que no prueba estrictamente **≥20 TPS medidos**. El mock demuestra que el generador pudo mantener la carga prevista en un servicio local sencillo; no certifica el desempeño de la API externa.

## Evidencias y reportes

- [`evidencias/reporte-performance-sofka.md`](evidencias/reporte-performance-sofka.md): comparativo y análisis técnico.
- [`evidencias/evidencia-mock.md`](evidencias/evidencia-mock.md): análisis del entorno simulado.
- [`evidencias/evidencia-fakestore.md`](evidencias/evidencia-fakestore.md): análisis del endpoint real.
- `evidencias/resumen-mock.json` y `evidencias/resumen-fakestore.json`: exportaciones originales resumidas de k6.
- `conclusiones.txt`: hallazgos, limitaciones y evaluación frente al enunciado.

Los JSON exportados contienen métricas agregadas, no los tokens de autenticación. Aun así, **revisar todos los archivos antes de publicarlos**; excluir trazas HTTP sin depurar, registros y secretos.

## Alcance y buenas prácticas

- El `MockLoginServer.java` no simula la seguridad ni la latencia reales; solo valida la infraestructura del generador de carga.
- Se dispone de **una ejecución documentada** de carga por entorno, no de pruebas repetidas ni de series temporales por segundo.
- No automatizar cargas sostenidas contra FakeStoreAPI en GitHub Actions. Para CI, usar una validación sin tráfico externo o un entorno de carga autorizado.
- Si se desea medir el cumplimiento estricto de TPS, complementar el threshold de conteo con uno de tasa y analizar intervalos por segundo; no alterar retrospectivamente los resultados observados.

**Conclusión:** script, parametrización, validaciones y evidencias están implementados. Tiempo y tasa de errores cumplieron en la ejecución real; el throughput promedio medido fue **ligeramente inferior** al mínimo de 20 TPS solicitado y se declara como tal.
