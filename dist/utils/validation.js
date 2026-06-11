import httpError from './httpError.js';
export function requireAny(payload, fields, label) {
    const found = fields.find((field) => payload[field] !== undefined && payload[field] !== null && payload[field] !== '');
    if (!found) {
        throw httpError(400, `${label || fields.join(' ou ')} e obrigatorio.`);
    }
    return payload[found];
}
export function requireField(payload, field, label) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
        throw httpError(400, `${label || field} e obrigatorio.`);
    }
    return payload[field];
}
export function validateCoordinates(payload) {
    const latitude = Number(requireField(payload, 'latitude', 'latitude'));
    const longitude = Number(requireField(payload, 'longitude', 'longitude'));
    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
        throw httpError(400, 'latitude deve ser um numero entre -90 e 90.');
    }
    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
        throw httpError(400, 'longitude deve ser um numero entre -180 e 180.');
    }
    return { latitude, longitude };
}
