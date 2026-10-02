// For physical Android/iOS device: replace 'localhost' with your machine's LAN IP
// e.g. '192.168.1.42:3000' — localhost on a physical device refers to the device itself
const BACKEND_HOST = 'localhost:3000';

export const API_URL = `http://${BACKEND_HOST}`;
export const WS_URL = `ws://${BACKEND_HOST}/ws`;
