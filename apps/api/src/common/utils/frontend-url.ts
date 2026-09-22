export function getFrontendUrl(): string {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}
