import http from 'k6/http';
import { check, sleep } from 'k6';

// Target the nginx edge (round-robins across api replicas). Override: -e BASE_URL=...
const BASE = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
  stages: [
    { duration: '30s', target: 1000 }, // ramp up to 1000 VUs
    { duration: '2m', target: 1000 },  // hold at 1000
    { duration: '30s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],   // <1% errors
    http_req_duration: ['p(95)<500'], // 95% under 500ms
  },
};

export default function () {
  // Mostly reads (list), some writes — mirrors a typical read-heavy API.
  const list = http.get(`${BASE}/books`);
  check(list, { 'list 200': (r) => r.status === 200 });

  if (Math.random() < 0.2) {
    const payload = JSON.stringify({ title: `Book ${__VU}-${__ITER}`, author: 'k6', year: 2026 });
    const created = http.post(`${BASE}/books`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    check(created, { 'create 201': (r) => r.status === 201 });
  }

  sleep(1);
}
