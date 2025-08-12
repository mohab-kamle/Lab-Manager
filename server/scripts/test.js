import http from 'k6/http';
import { check, sleep, group } from 'k6';

export let options = {
  stages: [
    { duration: '10s', target: 50 },
    { duration: '20s', target: 100 },
    { duration: '40s', target: 200 },
    { duration: '20s', target: 0 }, // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:3001';
const credentials = {
  username: 'ab123',
  password: 'admin123',
  lab_id: 1,
};

export function setup() {
  const res = http.post(`${BASE_URL}/emp/login`, JSON.stringify(credentials), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '10s',
  });

  check(res, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => r.json('token') !== undefined,
  });

  const body = res.json();
  console.log(`✅ Logged in as ${body.user?.name || 'unknown'} (${body.user?.role || 'role'})`);

  return { token: body.token };
}

export default function (data) {
  const token = data.token;
  if (!token) return;

  const params = {
    headers: { Authorization: `Bearer ${token}` },
    timeout: '10s',
  };

  // Pick a random flow
  const choice = Math.random();

  if (choice < 0.6) {
    group('📄 Fetch Medical Reports', () => {
      const reportsRes = http.get(`${BASE_URL}/medical-reports/`, params);

      if (reportsRes.timings.duration > 1000) {
        console.warn(`⚠️ /medical-reports took ${reportsRes.timings.duration}ms`);
      }

      check(reportsRes, {
        'reports fetch status is 200': (res) => res.status === 200,
        'reports response is array': (res) => Array.isArray(res.json()),
      });

      let medicalReports = [];
      try {
        medicalReports = reportsRes.json();
      } catch {
        console.error('❌ Failed to parse medical reports');
      }

      if (medicalReports.length > 0) {
        const firstReport = medicalReports[0];

        group('📊 Fetch Detailed Report Data', () => {
          const detailedRes = http.get(
            `${BASE_URL}/medical-reports/${firstReport.id}/results-data`,
            params
          );

          if (detailedRes.timings.duration > 1000) {
            console.warn(`⚠️ /results-data took ${detailedRes.timings.duration}ms`);
          }

          check(detailedRes, {
            'detailed data fetch status is 200': (res) => res.status === 200,
          });
        });
      }
    });
  } else {
    group('👤 Fetch Profile', () => {
      const profileRes = http.get(`${BASE_URL}/emp/profile`, params);

      if (profileRes.timings.duration > 1000) {
        console.warn(`⚠️ /emp/profile took ${profileRes.timings.duration}ms`);
      }

      check(profileRes, {
        'profile fetch status is 200': (res) => res.status === 200,
      });
    });
  }

  sleep(1);
}
