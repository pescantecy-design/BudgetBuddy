import { router, json, error, secrets } from '../api/_sdk';

const SUPABASE_URL = 'https://ykjeynlsrchlssjlvzqm.supabase.co';
const BREVO_SENDERS_URL = 'https://api.brevo.com/v3/senders';
const BREVO_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email';

type JsonRecord = Record<string, unknown>;

async function readSecrets() {
  const names = await secrets.listSecretNames();
  const required = ['BREVO_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'EMAIL_CODE_PEPPER'];
  const missing = required.filter(name => !names.includes(name));
  if (missing.length) throw new Error('Email verification is not fully configured.');
  const [brevoKey, serviceKey, pepper] = await Promise.all(
    required.map(name => secrets.readSecret(name))
  );
  return { brevoKey, serviceKey, pepper };
}

async function supabaseRequest(
  serviceKey: string,
  path: string,
  method = 'GET',
  body?: unknown,
  prefer?: string
) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(raw || 'Supabase database request failed.');
  return raw ? JSON.parse(raw) : null;
}

async function adminRequest(
  serviceKey: string,
  path: string,
  method = 'GET',
  body?: unknown
) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : {};
  if (!response.ok) {
    const message = typeof data.msg === 'string' ? data.msg : typeof data.message === 'string' ? data.message : 'Authentication request failed.';
    throw new Error(message);
  }
  return data;
}

function randomDigits() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return String(value[0] % 1000000).padStart(6, '0');
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

async function hashValue(value: string, pepper: string) {
  const encoded = new TextEncoder().encode(`${value}:${pepper}`);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

function toBase64Url(value: string) {
  return btoa(value).replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_');
}

async function signResetGrant(payload: string, pepper: string) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature), value => value.toString(16).padStart(2, '0')).join('');
}

async function verifyResetGrant(token: string, pepper: string) {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = await signResetGrant(payload, pepper);
  if (signature.length !== expected.length) return null;
  let mismatch = 0;
  for (let index = 0; index < signature.length; index++) mismatch |= signature.charCodeAt(index) ^ expected.charCodeAt(index);
  if (mismatch) return null;
  try {
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (!decoded.userId || !decoded.email || decoded.exp < Date.now()) return null;
    return decoded as { userId: string; email: string; exp: number };
  } catch { return null; }
}

function emailIsValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getClientIp(event: any) {
  return String(
    event?.requestContext?.http?.sourceIp ||
    event?.requestContext?.identity?.sourceIp ||
    ''
  ).trim();
}

async function enforceAuthSendRateLimit(
  serviceKey: string,
  pepper: string,
  email: string,
  clientIp: string
) {
  const emailHash = await hashValue(`auth-email:${email}`, pepper);
  const emailCount = await supabaseRequest(
    serviceKey,
    'rpc/consume_auth_request_limit',
    'POST',
    {
      p_bucket_key: `email:${emailHash}`,
      p_window_seconds: 3600,
      p_max_requests: 5,
    }
  );
  if (Number(emailCount) > 5) {
    return { allowed: false, message: 'Too many code requests for this email. Please try again later.' };
  }

  if (clientIp) {
    const ipHash = await hashValue(`auth-ip:${clientIp}`, pepper);
    const ipCount = await supabaseRequest(
      serviceKey,
      'rpc/consume_auth_request_limit',
      'POST',
      {
        p_bucket_key: `ip:${ipHash}`,
        p_window_seconds: 900,
        p_max_requests: 10,
      }
    );
    if (Number(ipCount) > 10) {
      return { allowed: false, message: 'Too many code requests from this network. Please try again later.' };
    }
  }

  return { allowed: true, message: '' };
}

async function sendVerificationEmail(brevoKey: string, email: string, code: string, purpose: string) {
  const senderResponse = await fetch(BREVO_SENDERS_URL, {
    headers: { 'api-key': brevoKey, accept: 'application/json' },
  });
  if (!senderResponse.ok) {
    console.error('Brevo sender lookup failed:', senderResponse.status, await senderResponse.text());
    throw new Error('BudgetBuddy could not read your Brevo sender settings. Check the API key and account permissions.');
  }
  const senderData = await senderResponse.json() as JsonRecord;
  const senders = Array.isArray(senderData.senders) ? senderData.senders as JsonRecord[] : [];
  const sender = senders.find((item) =>
    item.active === true &&
    typeof item.email === 'string' &&
    item.isDefault === true
  ) || senders.find((item) =>
    item.active === true && typeof item.email === 'string'
  );
  if (!sender || typeof sender.email !== 'string') {
    throw new Error('Please add and verify at least one active sender under Brevo > Settings > Senders. BudgetBuddy will use an active verified sender automatically.');
  }

  const response = await fetch(BREVO_EMAIL_URL, {
    method: 'POST',
    headers: {
      'api-key': brevoKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: typeof sender.name === 'string' ? sender.name : 'BudgetBuddy', email: sender.email },
      to: [{ email }],
      subject: purpose === 'password_reset' ? 'Your BudgetBuddy password reset code' : 'Your BudgetBuddy verification code',
      htmlContent: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#171827"><h2>${purpose === 'password_reset' ? 'Reset your BudgetBuddy password' : 'Verify your BudgetBuddy account'}</h2><p>Use this code to ${purpose === 'signup' ? 'finish creating your account' : purpose === 'password_reset' ? 'reset your password' : 'sign in'}:</p><div style="font-size:34px;letter-spacing:10px;font-weight:700;padding:18px 0;color:#5965e8">${code}</div><p>This code expires in 10 minutes and can only be used once.</p><p>If you did not request this code, you can ignore this email.</p></div>`,
    }),
  });
  if (!response.ok) {
    console.error('Brevo email send failed:', response.status, await response.text());
    throw new Error('Brevo could not send the verification email. Check that your sender is active and transactional email is enabled.');
  }
}

function queryValue(value: string) {
  return encodeURIComponent(value);
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],

  'POST /api/email-verification/start': [async ({ body, event }) => {
    const input = (body || {}) as JsonRecord;
    const email = String(input.email || '').trim().toLowerCase();
    const purpose = String(input.purpose || '');
    let userId = String(input.userId || '');
    const password = String(input.password || '');
    const displayName = String(input.displayName || '').trim();
    const deviceToken = String(input.deviceToken || '');

    if (!emailIsValid(email)) return error('Enter a valid email address.', 400);
    if (!['signup', 'login', 'google'].includes(purpose)) return error('Invalid verification request.', 400);

    let createdUserInThisRequest = false;
    try {
      const { brevoKey, serviceKey, pepper } = await readSecrets();
      const rateLimit = await enforceAuthSendRateLimit(serviceKey, pepper, email, getClientIp(event));
      if (!rateLimit.allowed) return error(rateLimit.message, 429);

      if (purpose === 'signup' && !userId) {
        if (password.length < 8) return error('Password must be at least 8 characters.', 400);
        const created = await adminRequest(serviceKey, '/auth/v1/admin/users', 'POST', {
          email,
          password,
          email_confirm: false,
          user_metadata: { full_name: displayName, name: displayName },
        });
        userId = String(created.id || created.user?.id || '');
        if (!userId) throw new Error('Could not create the account.');
        createdUserInThisRequest = true;
      }

      if (!userId) return error('Your sign-in session could not be validated. Please try again.', 400);

      const accountResponse = await adminRequest(serviceKey, `/auth/v1/admin/users/${encodeURIComponent(userId)}`);
      const account = accountResponse.user || accountResponse;
      if (String(account.email || '').toLowerCase() !== email) {
        return error('The email address does not match this account.', 400);
      }

      if (purpose === 'login' && deviceToken) {
        const tokenHash = await hashValue(deviceToken, pepper);
        const trusted = await supabaseRequest(
          serviceKey,
          `trusted_devices?user_id=eq.${queryValue(userId)}&token_hash=eq.${queryValue(tokenHash)}&expires_at=gt.${queryValue(new Date().toISOString())}&select=id&limit=1`
        );
        if (Array.isArray(trusted) && trusted.length) return json({ trusted: true, userId });
      }

      const existing = await supabaseRequest(
        serviceKey,
        `email_verification_challenges?email=eq.${queryValue(email)}&purpose=eq.${purpose}&select=sent_at,locked_until&limit=1`
      );
      if (Array.isArray(existing) && existing.length) {
        const row = existing[0];
        if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
          return error('Too many incorrect codes. Try again in a few minutes.', 423);
        }
        const elapsed = Math.floor((Date.now() - new Date(row.sent_at).getTime()) / 1000);
        if (elapsed < 60) return error(`Please wait ${60 - elapsed} seconds before requesting another code.`, 429);
      }

      const code = randomDigits();
      const codeHash = await hashValue(code, pepper);
      await supabaseRequest(
        serviceKey,
        'email_verification_challenges?on_conflict=email,purpose',
        'POST',
        {
          email,
          purpose,
          user_id: userId,
          code_hash: codeHash,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          attempts: 0,
          locked_until: null,
          sent_at: new Date().toISOString(),
          used_at: null,
        },
        'resolution=merge-duplicates,return=minimal'
      );

      try {
        await sendVerificationEmail(brevoKey, email, code, purpose);
      } catch (mailError) {
        await supabaseRequest(
          serviceKey,
          `email_verification_challenges?email=eq.${queryValue(email)}&purpose=eq.${purpose}`,
          'DELETE'
        );
        if (createdUserInThisRequest && userId) {
          await adminRequest(serviceKey, `/auth/v1/admin/users/${encodeURIComponent(userId)}`, 'DELETE');
        }
        throw mailError;
      }

      return json({ sent: true, userId, expiresIn: 600, cooldownSeconds: 60 });
    } catch (err) {
      console.error('Email verification start failed:', err);
      const message = err instanceof Error ? err.message : 'Unable to send a verification code.';
      return error(message.includes('already been registered') || message.includes('already exists')
        ? 'An account with this email already exists. Please log in instead.'
        : message, 400);
    }
  }],

  'POST /api/password-reset/start': [async ({ body, event }) => {
    const input = (body || {}) as JsonRecord;
    const email = String(input.email || '').trim().toLowerCase();
    if (!emailIsValid(email)) return error('Enter a valid email address.', 400);
    try {
      const { brevoKey, serviceKey, pepper } = await readSecrets();
      const rateLimit = await enforceAuthSendRateLimit(serviceKey, pepper, email, getClientIp(event));
      if (!rateLimit.allowed) return error(rateLimit.message, 429);
      const usersResponse = await adminRequest(serviceKey, '/auth/v1/admin/users?per_page=1000&page=1');
      const users = Array.isArray(usersResponse.users) ? usersResponse.users : [];
      const account = users.find((item: JsonRecord) => String(item.email || '').toLowerCase() === email) as JsonRecord | undefined;
      if (!account || !account.id) return json({ sent: true, expiresIn: 600, cooldownSeconds: 60 });
      const existing = await supabaseRequest(
        serviceKey,
        `email_verification_challenges?email=eq.${queryValue(email)}&purpose=eq.password_reset&select=sent_at,locked_until&limit=1`
      );
      if (Array.isArray(existing) && existing.length) {
        const row = existing[0];
        if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) return error('Too many incorrect codes. Try again in a few minutes.', 423);
        const elapsed = Math.floor((Date.now() - new Date(row.sent_at).getTime()) / 1000);
        if (elapsed < 60) return error(`Please wait ${60 - elapsed} seconds before requesting another code.`, 429);
      }
      const code = randomDigits();
      const codeHash = await hashValue(code, pepper);
      await supabaseRequest(
        serviceKey,
        'email_verification_challenges?on_conflict=email,purpose',
        'POST',
        {
          email,
          purpose: 'password_reset',
          user_id: String(account.id),
          code_hash: codeHash,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          attempts: 0,
          locked_until: null,
          sent_at: new Date().toISOString(),
          used_at: null,
        },
        'resolution=merge-duplicates,return=minimal'
      );
      await sendVerificationEmail(brevoKey, email, code, 'password_reset');
      return json({ sent: true, expiresIn: 600, cooldownSeconds: 60 });
    } catch (err) {
      console.error('Password reset start failed:', err);
      const message = err instanceof Error ? err.message : 'Unable to send a password reset code.';
      return error(message, 400);
    }
  }],

  'POST /api/password-reset/verify': [async ({ body }) => {
    const input = (body || {}) as JsonRecord;
    const email = String(input.email || '').trim().toLowerCase();
    const code = String(input.code || '').replace(/\D/g, '');
    if (!emailIsValid(email) || !/^\d{6}$/.test(code)) return error('Enter the six-digit code.', 400);
    try {
      const { serviceKey, pepper } = await readSecrets();
      const existing = await supabaseRequest(
        serviceKey,
        `email_verification_challenges?email=eq.${queryValue(email)}&purpose=eq.password_reset&select=user_id&limit=1`
      );
      if (!Array.isArray(existing) || !existing.length || !existing[0].user_id) return error('That code is incorrect or expired. Request a new one.', 400);
      const codeHash = await hashValue(code, pepper);
      const result = await supabaseRequest(serviceKey, 'rpc/verify_email_challenge', 'POST', {
        p_email: email,
        p_purpose: 'password_reset',
        p_code_hash: codeHash,
      });
      const status = typeof result === 'string' ? result : String(result?.verify_email_challenge || '');
      if (status === 'locked') return error('Too many incorrect codes. Your reset is locked for 5 minutes.', 423);
      if (status === 'expired') return error('That code has expired. Request a new one.', 410);
      if (status !== 'verified') return error('That code is incorrect. Please try again.', 400);
      const payload = toBase64Url(JSON.stringify({ userId: String(existing[0].user_id), email, exp: Date.now() + 10 * 60 * 1000 }));
      const grant = `${payload}.${await signResetGrant(payload, pepper)}`;
      const grantHash = await hashValue(grant, pepper);
      const accountResponse = await adminRequest(serviceKey, `/auth/v1/admin/users/${encodeURIComponent(String(existing[0].user_id))}`);
      const account = accountResponse.user || accountResponse;
      const appMetadata = (account.app_metadata || {}) as JsonRecord;
      await adminRequest(serviceKey, `/auth/v1/admin/users/${encodeURIComponent(String(existing[0].user_id))}`, 'PUT', {
        app_metadata: { ...appMetadata, budgetbuddy_password_reset_grant_hash: grantHash },
      });
      return json({ verified: true, resetGrant: grant, expiresIn: 600 });
    } catch (err) {
      console.error('Password reset code verification failed:', err);
      return error(err instanceof Error ? err.message : 'Unable to verify this code.', 400);
    }
  }],

  'POST /api/password-reset/complete': [async ({ body }) => {
    const input = (body || {}) as JsonRecord;
    const grant = String(input.resetGrant || '');
    const password = String(input.password || '');
    if (password.length < 8) return error('Password must be at least 8 characters.', 400);
    try {
      const { serviceKey, pepper } = await readSecrets();
      const verified = await verifyResetGrant(grant, pepper);
      if (!verified) return error('Your reset session expired. Request a new code.', 401);
      const accountResponse = await adminRequest(serviceKey, `/auth/v1/admin/users/${encodeURIComponent(verified.userId)}`);
      const account = accountResponse.user || accountResponse;
      const appMetadata = (account.app_metadata || {}) as JsonRecord;
      const grantHash = await hashValue(grant, pepper);
      if (appMetadata.budgetbuddy_password_reset_grant_hash !== grantHash) {
        return error('This reset session has already been used or replaced. Request a new code.', 401);
      }
      const nextMetadata = { ...appMetadata };
      delete nextMetadata.budgetbuddy_password_reset_grant_hash;
      await adminRequest(serviceKey, `/auth/v1/admin/users/${encodeURIComponent(verified.userId)}`, 'PUT', {
        password,
        app_metadata: nextMetadata,
      });
      return json({ updated: true });
    } catch (err) {
      console.error('Password reset completion failed:', err);
      return error(err instanceof Error ? err.message : 'Unable to update your password.', 400);
    }
  }],

  'POST /api/email-verification/verify': [async ({ body }) => {
    const input = (body || {}) as JsonRecord;
    const email = String(input.email || '').trim().toLowerCase();
    const purpose = String(input.purpose || '');
    const userId = String(input.userId || '');
    const code = String(input.code || '').replace(/\D/g, '');
    const trustDevice = input.trustDevice === true;

    if (!emailIsValid(email) || !userId || !['signup', 'login', 'google'].includes(purpose) || !/^\d{6}$/.test(code)) {
      return error('Enter the six-digit verification code.', 400);
    }

    try {
      const { serviceKey, pepper } = await readSecrets();
      const accountResponse = await adminRequest(serviceKey, `/auth/v1/admin/users/${encodeURIComponent(userId)}`);
      const account = accountResponse.user || accountResponse;
      if (String(account.email || '').toLowerCase() !== email) return error('Verification request does not match this account.', 400);

      const codeHash = await hashValue(code, pepper);
      const result = await supabaseRequest(serviceKey, 'rpc/verify_email_challenge', 'POST', {
        p_email: email,
        p_purpose: purpose,
        p_code_hash: codeHash,
      });
      const status = typeof result === 'string' ? result : String(result?.verify_email_challenge || '');
      if (status === 'locked') return error('Too many incorrect codes. Your verification is locked for 5 minutes.', 423);
      if (status === 'expired') return error('That code has expired. Request a new one.', 410);
      if (status !== 'verified') return error('That code is incorrect. Please try again.', 400);

      if (purpose === 'signup') {
        await adminRequest(serviceKey, `/auth/v1/admin/users/${encodeURIComponent(userId)}`, 'PUT', {
          email_confirm: true,
        });
      }

      let trustedDeviceToken: string | undefined;
      if (trustDevice && purpose !== 'google') {
        trustedDeviceToken = randomToken();
        const tokenHash = await hashValue(trustedDeviceToken, pepper);
        await supabaseRequest(serviceKey, 'trusted_devices', 'POST', {
          user_id: userId,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }, 'resolution=merge-duplicates,return=minimal');
      }

      return json({ verified: true, trustedDeviceToken });
    } catch (err) {
      console.error('Email verification failed:', err);
      return error(err instanceof Error ? err.message : 'Unable to verify this code.', 400);
    }
  }],
});
