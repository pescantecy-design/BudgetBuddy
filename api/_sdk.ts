// Small replacement for "@appdeploy/sdk" so the backend can run on Vercel.
// Secrets are read from Vercel Environment Variables.
export type RouteResult = { statusCode: number; body: unknown };
export type RouteHandler = (ctx: any) => Promise<RouteResult> | RouteResult;

export const json = (data: unknown, statusCode = 200): RouteResult => ({ statusCode, body: data });
export const error = (message: string, statusCode = 400): RouteResult => ({
  statusCode,
  body: { error: message },
});

const SECRET_NAMES = ['BREVO_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'EMAIL_CODE_PEPPER'];
export const secrets = {
  async listSecretNames() {
    return SECRET_NAMES.filter(name => Boolean(process.env[name]));
  },
  async readSecret(name: string) {
    return process.env[name] || '';
  },
};

export const router = (routes: Record<string, RouteHandler[]>) => routes;
