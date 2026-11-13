SOFKA — EJERCICIO 1: PRUEBAS DE CARGA CON GRAFANA k6
===================================================

1. DESCRIPCION
--------------
Prueba de carga del servicio POST https://fakestoreapi.com/auth/login,
con datos parametrizados desde un CSV y un escenario programado a
20 iteraciones por segundo durante 30 segundos.

Se incluyen dos tipos de evidencia:
 - Mock local Java: validacion del script y generador de carga.
 - FakeStoreAPI: medicion observada del servicio real.

IMPORTANTE: la ejecucion sobre FakeStoreAPI ya esta documentada.
No repetir ni aumentar carga sobre el servicio publico sin permiso del
operador. La URL suministrada en un ejercicio no implica por si sola
permiso del tercero para pruebas sostenidas de rendimiento.

2. VERSIONES Y HERRAMIENTAS
-------------------------
 - Grafana k6: 2.4.0 (Windows amd64).
 - Sistema utilizado localmente: Windows 10 y PowerShell.
 - Java JDK: 21 (solo para MockLoginServer.java).
 - Editor: IntelliJ IDEA (opcional).
 - Git: para clonacion y versionamiento.
 - No se requiere Maven, npm ni Node.js.

Instalacion k6 en Windows (si no esta instalado):
 winget install --id GrafanaLabs.k6 --exact --source winget

Documentacion: https://grafana.com/docs/k6/latest/set-up/install-k6/

3. REQUISITOS
-------------
 - k6 instalado y disponible en el PATH.
 - Para usar el mock, tener Java 21 en el PATH.
 - Puerto local 3000 disponible.
 - Archivo data/users.csv con cabecera user,passwd y los cinco
   registros de prueba suministrados en el enunciado.
 - Conexion a Internet solo para FakeStoreAPI y GitHub.

Comprobar versiones:
 k6 version
 java -version
 git --version

4. OBTENER EL PROYECTO
----------------------
Crear/clonar el repositorio publico:
 git clone https://github.com/victorAlvarezValencia/sofka-performance-k6.git
 cd sofka-performance-k6

5. ESTRUCTURA PRINCIPAL
-----------------------
 scripts/verificar-k6.js    : comprobacion opcional del CLI.
 scripts/login-smoke.js     : smoke de 5 logins contra FakeStoreAPI.
 scripts/login-load.js      : prueba de carga, por defecto al mock.
 data/users.csv             : cinco usuarios de prueba; cabecera user,passwd.
 mock/MockLoginServer.java  : servidor local simulado HTTP 201.
 evidencias/                : dos resúmenes JSON y reportes Markdown.
 conclusiones.txt           : hallazgos y conclusiones.

El CSV se lee mediante SharedArray y se convierte a JSON con campos
username y password. En cada iteracion se envia UN POST.

6. VERIFICAR CONFIGURACION SIN EJECUTAR CARGA
--------------------------------------------
Desde la raiz del proyecto:
 k6 inspect --execution-requirements .\scripts\login-load.js

Se espera encontrar:
 executor: constant-arrival-rate
 rate: 20
 timeUnit: 1s
 duration: 30s
 preAllocatedVUs: 30
 maxVUs: 50
 gracefulStop: 10s

La inspeccion NO envia solicitudes HTTP.

7. EJECUTAR LA PRUEBA LOCAL REPRODUCIBLE
--------------------------------------
TERMINAL 1 (mantener abierta):
 java .\mock\MockLoginServer.java

El mock escucha en http://127.0.0.1:3000/auth/login.
No valida las credenciales: responde HTTP 201 y token ficticio al
recibir los campos de usuario y contrasena.

TERMINAL 2:
 Remove-Item Env:TARGET_URL -ErrorAction SilentlyContinue
 New-Item -ItemType Directory -Force .\resultados-locales | Out-Null
 k6 run --summary-export=".\resultados-locales\resumen-mock-reproduccion.json" .\scripts\login-load.js

Detener el mock con Ctrl+C en la terminal 1.
Los resultados reproducidos van a resultados-locales/, sin
sobrescribir los JSON de evidencia originales.

8. EJECUTAR EL SMOKE FUNCIONAL
------------------------------
Este comando ejecuta 5 peticiones, NO 20 TPS:
 k6 run .\scripts\login-smoke.js

En la ejecucion observada hubo 5 respuestas HTTP 201 y 5 tokens validos.
La duracion media fue 365,31 ms y el maximo 387,90 ms.

9. PRUEBA DE CARGA EN FAKESTOREAPI (CONDICIONADA)
------------------------------------------------
La evidencia del servicio real ya esta incluida en el repositorio.
Solo si existe AUTORIZACION para una nueva prueba sostenida:

 $env:TARGET_URL = 'https://fakestoreapi.com/auth/login'
 $env:LOAD_AUTHORIZED = 'yes'
 New-Item -ItemType Directory -Force .\resultados-locales | Out-Null
 k6 run --summary-export=".\resultados-locales\resumen-fakestore-reproduccion.json" .\scripts\login-load.js
 Remove-Item Env:TARGET_URL -ErrorAction SilentlyContinue
 Remove-Item Env:LOAD_AUTHORIZED -ErrorAction SilentlyContinue

Interrumpir con Ctrl+C si aparecen respuestas 429, 503 o evidencia de
sobrecarga del proveedor. No implementar ejecucion automatica en CI
contra el servicio publico sin permiso explicito.

10. THRESHOLDS CONFIGURADOS
--------------------------
 - http_req_duration: max<=1500 (milisegundos)
 - http_req_failed: rate<0.03
 - login_errors: rate<0.03
 - dropped_iterations: count==0
 - http_reqs: count>=600

NOTA: count>=600 es conteo acumulado, NO un umbral de TPS medio.
El requisito de al menos 20 TPS debe contrastarse tambien contra
http_reqs.rate y, preferiblemente, con metricas por intervalo.

11. RESULTADOS REGISTRADOS
-------------------------
                          MOCK LOCAL       FAKESTOREAPI
 Solicitudes             601              601
 Tasa media (req/s)      20,0323          19,7960
 Checks aprobados        1202/1202        1202/1202
 Errores HTTP            0 %              0 %
 Errores login           0 %              0 %
 Iteraciones perdidas    0                0
 Promedio HTTP (ms)      0,8773           378,0547
 p95 HTTP (ms)          1,6681           427,4810
 Maximo HTTP (ms)       63,7994          783,8520

Los cinco thresholds implementados pasaron en las dos ejecuciones.
Sin embargo, la tasa media observada para FakeStoreAPI (19,7960 req/s)
quedo ligeramente POR DEBAJO de 20 TPS. Por precision, NO se declara
aprobado el requisito estricto de throughput medio medido.

12. REPORTES Y SEGURIDAD
------------------------
 evidencias/resumen-mock.json
 evidencias/resumen-fakestore.json
 evidencias/evidencia-mock.md
 evidencias/evidencia-fakestore.md
 evidencias/reporte-performance-sofka.md

No publicar tokens reutilizables, contrasenas personales o trazas HTTP
sin revisar. Los CSV son fixtures de prueba, nunca datos productivos.

Si un JSON de resumen muestra thresholds[expresion]=false, indica que
el threshold NO fue violado en esa ejecucion.

13. CONCLUSIONES
---------------
Consultar conclusiones.txt y evidencias/reporte-performance-sofka.md.
El mock comprueba el generador de carga; NO certifica el backend real.
Una ejecucion documentada por entorno no garantiza el mismo rendimiento
en todas las condiciones futuras.
