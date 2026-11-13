import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate } from 'k6/metrics';
import exec from 'k6/execution';

// =========================================
// SOFKA - PRUEBA DE CARGA DEL LOGIN
// =========================================

// Entorno local por defecto.
// Usar un servicio externo solo con autorizacion.
const TARGET_URL = __ENV.TARGET_URL ||
    'http://127.0.0.1:3000/auth/login';

if (
    TARGET_URL.startsWith('https://fakestoreapi.com') &&
    __ENV.LOAD_AUTHORIZED !== 'yes'
) {
    throw new Error(
        'Se requiere autorizacion para ejecutar carga sobre FakeStoreAPI.'
    );
}

// 1. Cargar usuarios del CSV
const usuarios = new SharedArray('usuarios-sofka', () => {
    const contenido = open('../data/users.csv');
    const lineas = contenido.trim().split(/\r?\n/);

    if (lineas.shift().trim() !== 'user,passwd') {
        throw new Error('Cabecera CSV invalida');
    }

    return lineas.map(linea => {
        const [username, password] = linea.split(',');

        return {
            username: username.trim(),
            password: password.trim()
        };
    });
});

// 2. Metrica personalizada de errores funcionales
const loginErrors = new Rate('login_errors');

// 3. Configuracion de carga
export const options = {
    scenarios: {
        login_carga: {
            executor: 'constant-arrival-rate',
            rate: 20,
            timeUnit: '1s',
            duration: '30s',
            preAllocatedVUs: 30,
            maxVUs: 50,
            gracefulStop: '10s'
        }
    },

    thresholds: {
        // Tiempo maximo permitido: 1.5 segundos
        http_req_duration: ['max<=1500'],

        // Menos de 3% de errores HTTP
        http_req_failed: ['rate<0.03'],

        // Menos de 3% de errores funcionales
        login_errors: ['rate<0.03'],

        // No perder iteraciones programadas
        dropped_iterations: ['count==0'],

        // 20 solicitudes/s durante 30 segundos
        http_reqs: ['count>=600']
    }
};

// 4. Ejecucion de cada transaccion
export default function () {

    const indice =
        exec.scenario.iterationInTest % usuarios.length;

    const usuario = usuarios[indice];

    const body = JSON.stringify({
        username: usuario.username,
        password: usuario.password
    });

    const respuesta = http.post(
        TARGET_URL,
        body,
        {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: '5s',
            tags: {
                name: 'login'
            }
        }
    );

    // 5. Validar autenticacion
    let tokenValido = false;

    try {
        const token = respuesta.json('token');
        tokenValido =
            typeof token === 'string' && token.length > 0;
    } catch (error) {
        tokenValido = false;
    }

    const loginExitoso =
        respuesta.status === 201 && tokenValido;

    check(respuesta, {
        'HTTP 201': r => r.status === 201,
        'Token recibido': () => tokenValido
    });

    loginErrors.add(!loginExitoso);
}
