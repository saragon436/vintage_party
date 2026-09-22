// Usado solo por los tests E2E (Playwright), para que apunten al backend
// efímero de accessories-events-backend/e2e/bootstrap.ts en vez del backend
// de desarrollo normal (puerto 3000), evitando pisar datos reales.
export const environment = {
    production: false,
    apiUrl: 'http://localhost:3001',
};
