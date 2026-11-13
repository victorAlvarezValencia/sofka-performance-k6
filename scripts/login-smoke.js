import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';

// 1. Cargar los usuarios desde el CSV
const usuarios = new SharedArray('usuarios-sofka', function () {

    const contenido = open('../data/users.csv');
    const lineas = contenido.trim().split(/\r?\n/);

    const cabecera = lineas.shift().trim();

    if (cabecera !== 'user,password') {
        throw new Error('El CSV debe tener las columnas user,password');
    }

    return lineas.map((linea) => {
        const campos = linea.split(',');

        if (campos.length !== 2) {
            throw new Error('Fila CSV invalida');
        }

        return {
            username: campos[0].trim(),
            password: campos[1].trim()
        };
    });
});

// 2. Configuracion de la prueba
export const options = {
    scenarios: {
        login_smoke: {
            executor: 'shared-iterations',
            vus: 1,
            iterations: 5,
            maxDuration: '6m'
        }
    }
};

// 3. Funcion que ejecuta cada usuario virtual
export default function () {

    // Seleccionar un usuario diferente por iteracion
    const indice = exec.scenario.iterationInTest;
    const usuario = usuarios[indice % usuarios.length];

    // Construir el JSON solicitado por FakeStoreAPI
    const body = JSON.stringify({
        username: usuario.username,
        password: usuario.password
    });

    // 4. Ejecutar la solicitud de login
    const respuesta = http.post(
        'https://fakestoreapi.com/auth/login',
        body,
        {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: '60s'
        }
    );

    // 5. Comprobar si recibimos un token
    let tokenValido = false;

    try {
        const token = respuesta.json('token');
        tokenValido = typeof token === 'string' && token.length > 0;
    } catch (error) {
        tokenValido = false;
    }

    // 6. Validaciones funcionales
    check(respuesta, {
        'HTTP 201 - Login exitoso': (r) => r.status === 201,
        'Token de autenticacion recibido': () => tokenValido
    });


    // 7. Mostrar resultados sin revelar contrasenas ni tokens
    console.log(
        `Usuario: ${usuario.username} | ` +
        `HTTP: ${respuesta.status} | ` +
        `Duracion: ${respuesta.timings.duration.toFixed(2)} ms | ` +
        `Autenticado: ${tokenValido}`
    );
}
