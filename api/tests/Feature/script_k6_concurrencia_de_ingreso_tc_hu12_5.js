import { check } from 'k6';
import http from 'k6/http';

export const options = {
    scenarios: {
        race_condition: {
            executor: 'shared-iterations',
            vus: 10,
            iterations: 10,
            maxDuration: '5s',
        },
    },
};

export default function () {
    const url = `${__ENV.API_URL}/api/examenes/${__ENV.EXAMEN_ID}/verificar-ingreso`;
    
    const qrPayload = __ENV.QR_DATA || JSON.stringify({ sis: "202600001" });

    const payload = JSON.stringify({
        qr_data: qrPayload
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${__ENV.TOKEN}`
        },
    };

    const res = http.post(url, payload, params);

    // DEBUG: Si no es 200 ni 409, imprimimos el error del backend en consola
    if (res.status !== 200 && res.status !== 409) {
        console.log(`[HTTP ${res.status}] Respuesta del backend: ${res.body}`);
    }

    check(res, {
        'Procesado correctamente (200 o 409)': (r) => r.status === 200 || r.status === 409,
        'Sin errores internos (No 500)': (r) => r.status !== 500,
    });
}