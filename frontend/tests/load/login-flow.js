import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// --- Custom metrics ---
const loginSuccess = new Rate('login_success');
const loginDuration = new Trend('login_duration');

// --- Load test credentials ---
// Read from tests/fixtures/auth.json at runtime (inlined as default for standalone runs)
const BASE_URL = 'https://app.socialpulses.io';

export const options = {
  stages: [
    // Steady single-user login test (rate limit: 10 req/min per IP)
    { duration: '1m', target: 1 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete in < 2s
    login_success: ['rate>0.90'],       // allow 10% failure (edge cases)
    http_req_failed: ['rate<0.10'],     // allow 10% failure
  },
};

// Default test user credentials (overridable via env vars)
const USERNAME = __ENV.TEST_USERNAME || 'sam@test.com';
const PASSWORD = __ENV.TEST_PASSWORD || 'Dxb@2026';

export default function () {
  group('Login Flow', () => {
    // 1. GET login page (warm up / verify app is reachable)
    const pageRes = http.get(`${BASE_URL}/login`, {
      tags: { name: 'GET /login' },
    });
    check(pageRes, {
      'login page loads': (r) => r.status === 200,
    });

    // 2. POST login credentials
    const loginPayload = JSON.stringify({
      username: USERNAME,
      password: PASSWORD,
    });

    const loginParams = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      tags: { name: 'POST /api/auth/login' },
    };

    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      loginPayload,
      loginParams
    );

    // 3. Assertions and metrics
    const loginOk = check(loginRes, {
      'login status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'response has token or success flag': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.token !== undefined || body.success === true || body.access_token !== undefined;
        } catch {
          return false;
        }
      },
    });

    loginSuccess.add(loginOk);
    loginDuration.add(loginRes.timings.duration);

    // 4. Respect API rate limit: 10 req/minute per IP
    sleep(6);
  });
}
