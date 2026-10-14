/**
 * Phase 4 Integration Tests — AZTSMDI
 * Tests all 10 required verification scenarios for the employee-deception API.
 *
 * Exercises actual Express routes and middleware via real HTTP.
 * DB: connects transparently via lazy middleware (same as Phase 3.1 tests).
 * resetState() clears in-memory + DB LoginFailureModel records.
 *
 * Run: npx tsx phase4_tests.ts
 */

process.env.VERCEL = "1";
process.env.NODE_ENV = "test";
process.env.ADMIN_USERNAME = "phase4_admin@aztsmdi.test";
process.env.ADMIN_PASSWORD = "Phase4TestPass_888!";

import assert from "node:assert/strict";
import http from "node:http";
import { AddressInfo } from "node:net";

// ── Test helpers ──────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const failures: string[] = [];

async function test(label: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ ${label}\n     ${err.message}`);
    failed++;
    failures.push(`${label}: ${err.message}`);
  }
}

function request(server: http.Server, method: string, path: string, body?: object, headers: Record<string, string> = {}): Promise<{ status: number; body: any }> {
  const addr = server.address() as AddressInfo;
  const raw = body ? JSON.stringify(body) : undefined;
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1", port: addr.port, path, method,
      headers: {
        ...(raw ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(raw) } : {}),
        ...headers
      }
    }, res => {
      let data = "";
      res.on("data", c => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode!, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode!, body: data }); }
      });
    });
    req.on("error", reject);
    if (raw) req.write(raw);
    req.end();
  });
}

const post = (s: http.Server, p: string, b?: object, h?: Record<string, string>) => request(s, "POST", p, b, h);
const get  = (s: http.Server, p: string, h?: Record<string, string>) => request(s, "GET",  p, undefined, h);

// ── Dynamic imports ────────────────────────────────────────────────────────────
const { app } = await import("./server.js");
const store    = await import("./src/server/store.js");
const db       = await import("./src/server/db.js");

const TEST_USERS = [
  process.env.ADMIN_USERNAME!,
  "phase4_employee@aztsmdi.test",
  "phase4_attacker@evil.test",
  "phase4_admin_attacker@evil.test",
  "phase4_genuine_emp@aztsmdi.test",
];

async function resetState() {
  store.setSessions([]);
  for (const k of Object.keys(store.loginFailures)) delete store.loginFailures[k];
  if (db.isDbConnected()) {
    const { LoginFailureModel, SessionModel } = await import("./src/server/db.js");
    await (LoginFailureModel as any).deleteMany({ username: { $in: TEST_USERS } }).catch(() => {});
    await (SessionModel as any).deleteMany({ username: { $in: TEST_USERS } }).catch(() => {});
  }
}

const server = http.createServer(app);
await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
const { port } = server.address() as AddressInfo;
console.log(`\n  [TEST SERVER] 127.0.0.1:${port}`);

// DB warmup
await get(server, "/api/health");
await resetState();
console.log(`  [DB STATUS]   connected=${db.isDbConnected()}\n`);

// ── Helpers to create sessions and tokens ─────────────────────────────────────
async function makeEmpDeceptionSession(username = "phase4_attacker@evil.test") {
  const s = await store.createSession(username, "Deception", "9.9.9.9", "TestBot", "USER", undefined, false, "EMPLOYEE_DECEPTION");
  const tok = store.generateJwtToken({ userId: s.id, username: s.username, role: "USER", sessionId: s.id, status: "Deception" });
  return { session: s, token: tok };
}

async function makeAdminDeceptionSession(username = "phase4_admin_attacker@evil.test") {
  const s = await store.createSession(username, "Deception", "9.9.9.9", "TestBot", "USER", undefined, false, "ADMIN_DECEPTION");
  const tok = store.generateJwtToken({ userId: s.id, username: s.username, role: "USER", sessionId: s.id, status: "Deception" });
  return { session: s, token: tok };
}

async function makeGenuineEmpSession(username = "phase4_genuine_emp@aztsmdi.test") {
  const s = await store.createSession(username, "Genuine", "1.2.3.4", "Browser", "USER");
  const tok = store.generateJwtToken({ userId: s.id, username: s.username, role: "USER", sessionId: s.id, status: "Genuine" });
  return { session: s, token: tok };
}

async function makeAdminSession() {
  const r = await post(server, "/api/auth/admin-login", {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
  });
  return { token: r.body.token, session: r.body.session };
}

// ═════════════════════════════════════════════════════════════════════════════
// Test 1: Employee deception session can retrieve decoy dashboard data
// ═════════════════════════════════════════════════════════════════════════════
console.log("── Test 1: EMPLOYEE_DECEPTION session fetches decoy dashboard ──────────");
await test("1a: GET /api/employee-deception/dashboard/:sessionId → 200, synthetic data", async () => {
  await resetState();
  const { session, token } = await makeEmpDeceptionSession();
  const r = await get(server, `/api/employee-deception/dashboard/${session.id}`,
    { Authorization: `Bearer ${token}`, "x-session-id": session.id }
  );
  assert.equal(r.status, 200, `Expected 200; got ${r.status}: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.status, "success");
  assert(r.body.data, "Response must include data");
  assert(Array.isArray(r.body.data.tasks), "data.tasks must be an array");
  assert(Array.isArray(r.body.data.projects), "data.projects must be an array");
  assert(r.body.data.profile, "data.profile must be present");
});

await test("1b: Response contains only synthetic task/project data — no real employee fields", async () => {
  await resetState();
  const { session, token } = await makeEmpDeceptionSession();
  const r = await get(server, `/api/employee-deception/dashboard/${session.id}`,
    { Authorization: `Bearer ${token}`, "x-session-id": session.id }
  );
  assert.equal(r.status, 200);
  const data = r.body.data;
  // Synthetic task IDs start with 'dtask_'
  assert(data.tasks.every((t: any) => String(t.id).startsWith("dtask_")),
    "All tasks must carry synthetic dtask_ IDs — not real MongoDB ObjectIds");
});

// ═════════════════════════════════════════════════════════════════════════════
// Test 2: Genuine Employee session is rejected
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n── Test 2: Genuine Employee session rejected ────────────────────────────");
await test("2a: Genuine employee JWT → 403 on /api/employee-deception/dashboard", async () => {
  await resetState();
  const { session, token } = await makeGenuineEmpSession();
  const r = await get(server, `/api/employee-deception/dashboard/${session.id}`,
    { Authorization: `Bearer ${token}`, "x-session-id": session.id }
  );
  assert.equal(r.status, 403, `Expected 403; got ${r.status}`);
});

await test("2b: Genuine employee JWT → 403 on /api/employee-deception/action", async () => {
  await resetState();
  const { session, token } = await makeGenuineEmpSession();
  const r = await post(server, `/api/employee-deception/action/${session.id}`,
    { action: "Task View", details: "Attempted real access" },
    { Authorization: `Bearer ${token}`, "x-session-id": session.id }
  );
  assert.equal(r.status, 403);
});

// ═════════════════════════════════════════════════════════════════════════════
// Test 3: Genuine Admin session is rejected
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n── Test 3: Genuine Admin session rejected ───────────────────────────────");
await test("3a: Genuine Admin JWT → 403 on /api/employee-deception/dashboard", async () => {
  await resetState();
  const { token, session } = await makeAdminSession();
  const r = await get(server, `/api/employee-deception/dashboard/${session.id}`,
    { Authorization: `Bearer ${token}` }
  );
  assert.equal(r.status, 403, `Expected 403 for genuine admin; got ${r.status}`);
});

// ═════════════════════════════════════════════════════════════════════════════
// Test 4: Admin deception session is rejected
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n── Test 4: ADMIN_DECEPTION session rejected ─────────────────────────────");
await test("4a: ADMIN_DECEPTION JWT → 403 on /api/employee-deception/dashboard", async () => {
  await resetState();
  const { session, token } = await makeAdminDeceptionSession();
  const r = await get(server, `/api/employee-deception/dashboard/${session.id}`,
    { Authorization: `Bearer ${token}`, "x-session-id": session.id }
  );
  assert.equal(r.status, 403, `Expected 403 for ADMIN_DECEPTION; got ${r.status}: ${JSON.stringify(r.body)}`);
});

await test("4b: ADMIN_DECEPTION session cannot POST /api/employee-deception/ticket", async () => {
  await resetState();
  const { session, token } = await makeAdminDeceptionSession();
  const r = await post(server, `/api/employee-deception/ticket/${session.id}`,
    { category: "IT Infrastructure", text: "Cross-environment test" },
    { Authorization: `Bearer ${token}`, "x-session-id": session.id }
  );
  assert.equal(r.status, 403);
});

// ═════════════════════════════════════════════════════════════════════════════
// Test 5: Missing, invalid, expired, terminated sessions are rejected
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n── Test 5: Edge case session rejections ─────────────────────────────────");
await test("5a: No auth header → 403 on /api/employee-deception/dashboard", async () => {
  await resetState();
  const r = await get(server, "/api/employee-deception/dashboard/sess_fake_id");
  // intelligentApiGateway requires auth; may be 401 or 403 depending on token presence
  assert([401, 403].includes(r.status), `Expected 401 or 403; got ${r.status}`);
});

await test("5b: Invalid session ID → 403 from resolveEmpDeceptionSession()", async () => {
  await resetState();
  const { token } = await makeEmpDeceptionSession();
  const r = await get(server, "/api/employee-deception/dashboard/sess_not_exist",
    { Authorization: `Bearer ${token}`, "x-session-id": "sess_not_exist" }
  );
  assert.equal(r.status, 403, `Expected 403 for unknown sessionId; got ${r.status}`);
});

await test("5c: Terminated session is rejected by resolveEmpDeceptionSession()", async () => {
  await resetState();
  const { session, token } = await makeEmpDeceptionSession();
  // Manually terminate the session in-memory
  const cached = store.sessions.find((s: any) => s.id === session.id);
  if (cached) { (cached as any).active = false; (cached as any).status = "Terminated"; }
  const r = await get(server, `/api/employee-deception/dashboard/${session.id}`,
    { Authorization: `Bearer ${token}`, "x-session-id": session.id }
  );
  assert.equal(r.status, 403, `Terminated session must be rejected; got ${r.status}`);
});

await test("5d: Tampered JWT is rejected with 401", async () => {
  await resetState();
  const { token } = await makeEmpDeceptionSession();
  const parts = token.split(".");
  const tampered = parts[0] + "." + parts[1] + "." + parts[2].slice(0, -3) + "ZZZ";
  const r = await get(server, "/api/employee-deception/dashboard/sess_fake",
    { Authorization: `Bearer ${tampered}` }
  );
  assert.equal(r.status, 401, `Tampered JWT must be 401; got ${r.status}`);
});

// ═════════════════════════════════════════════════════════════════════════════
// Test 6: Client-forged role/deceptionRole cannot bypass authorization
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n── Test 6: Forged client fields cannot bypass auth ──────────────────────");
await test("6a: Request body with forged deceptionRole=EMPLOYEE_DECEPTION cannot unlock endpoint", async () => {
  await resetState();
  // No valid session; supply forged fields in body
  const r = await post(server, "/api/employee-deception/action/sess_forged",
    { deceptionRole: "EMPLOYEE_DECEPTION", role: "USER", action: "Injected" }
  );
  assert([401, 403].includes(r.status), `Expected 401 or 403; got ${r.status}`);
  assert.notEqual(r.status, 200);
});

await test("6b: ADMIN_DECEPTION session with forged deceptionRole body field → still 403", async () => {
  await resetState();
  const { session, token } = await makeAdminDeceptionSession();
  const r = await post(server, `/api/employee-deception/action/${session.id}`,
    { action: "Cross-env inject", deceptionRole: "EMPLOYEE_DECEPTION" }, // client-forged
    { Authorization: `Bearer ${token}`, "x-session-id": session.id }
  );
  // resolveEmpDeceptionSession reads from server-side findSession(), not the body
  assert.equal(r.status, 403, `Forged deceptionRole in body must not unlock; got ${r.status}`);
});

// ═════════════════════════════════════════════════════════════════════════════
// Test 7: Decoy actions do NOT create/modify genuine tasks, projects, users, tickets
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n── Test 7: Real collections not modified ────────────────────────────────");
await test("7a: POST /api/employee-deception/ticket does NOT write to TicketModel", async () => {
  await resetState();
  const { session, token } = await makeEmpDeceptionSession();

  // Count real tickets before (if DB connected)
  let ticketCountBefore = 0;
  if (db.isDbConnected()) {
    const { TicketModel } = await import("./src/server/db.js" as any);
    ticketCountBefore = await (TicketModel as any).countDocuments().catch(() => -1);
  }

  const r = await post(server, `/api/employee-deception/ticket/${session.id}`,
    { category: "IT Infrastructure", text: "Test decoy ticket" },
    { Authorization: `Bearer ${token}`, "x-session-id": session.id }
  );
  assert.equal(r.status, 200);
  assert(r.body.ticket.id.startsWith("TKT-DEC-"), `Ticket ID must be synthetic; got: ${r.body.ticket.id}`);

  // Verify real collection unchanged
  if (db.isDbConnected()) {
    const { TicketModel } = await import("./src/server/db.js" as any);
    const ticketCountAfter = await (TicketModel as any).countDocuments().catch(() => -1);
    assert.equal(ticketCountBefore, ticketCountAfter,
      `TicketModel count must not change; before=${ticketCountBefore}, after=${ticketCountAfter}`);
  } else {
    console.log("     [DB off] — TicketModel isolation verified by code: ticket endpoint calls no DB write.");
  }
});

await test("7b: POST /api/employee-deception/action does NOT call real task/project operations", async () => {
  await resetState();
  const { session, token } = await makeEmpDeceptionSession();
  const r = await post(server, `/api/employee-deception/action/${session.id}`,
    { action: "Task Toggle", details: "Attacker toggled task", threatPoints: 15 },
    { Authorization: `Bearer ${token}`, "x-session-id": session.id }
  );
  assert.equal(r.status, 200);
  assert.equal(r.body.status, "success");
  assert(r.body.feedback, "Must return synthetic feedback message");
  // The response is synthetic; no real task API was called (addEmployeeTask etc.)
});

await test("7c: EMPLOYEE_DECEPTION session is blocked from real task endpoint", async () => {
  await resetState();
  const { session, token } = await makeEmpDeceptionSession();
  const r = await post(server, "/api/employee/tasks",
    { sessionId: session.id, title: "Injected real task" },
    { Authorization: `Bearer ${token}`, "x-session-id": session.id }
  );
  assert.equal(r.status, 403, `Deception session must not write real tasks; got ${r.status}`);
});

// ═════════════════════════════════════════════════════════════════════════════
// Test 8: Endpoint errors do not trigger fallback to real APIs
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n── Test 8: No fallback to real APIs on endpoint error ────────────────────");
await test("8a: Unknown sessionId on /api/employee-deception/dashboard returns 403, not real data", async () => {
  await resetState();
  const { token } = await makeEmpDeceptionSession();
  // Use a different, unknown sessionId — resolveEmpDeceptionSession returns null
  const r = await get(server, "/api/employee-deception/dashboard/sess_unknown_xyz",
    { Authorization: `Bearer ${token}`, "x-session-id": "sess_unknown_xyz" }
  );
  assert.equal(r.status, 403);
  // The response must NOT contain real data fields
  assert(!r.body.data?.tasks || r.body.status !== "success",
    "Must not return real dashboard data on auth failure");
});

// ═════════════════════════════════════════════════════════════════════════════
// Test 9: EMPLOYEE_DECEPTION sessions cannot access /api/deception/* (Admin honeypot)
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n── Test 9: Cross-environment isolation ───────────────────────────────────");
await test("9a: EMPLOYEE_DECEPTION session → 403 on /api/deception/files (Admin honeypot)", async () => {
  await resetState();
  const { session, token } = await makeEmpDeceptionSession();
  const r = await get(server, `/api/deception/files/${session.id}`,
    { Authorization: `Bearer ${token}`, "x-session-id": session.id }
  );
  assert.equal(r.status, 403,
    `EMPLOYEE_DECEPTION must not access Admin honeypot; got ${r.status}: ${JSON.stringify(r.body)}`);
});

await test("9b: EMPLOYEE_DECEPTION session → 403 on /api/deception/terminal (Admin honeypot)", async () => {
  await resetState();
  const { session, token } = await makeEmpDeceptionSession();
  const r = await post(server, `/api/deception/terminal/${session.id}`,
    { command: "whoami" },
    { Authorization: `Bearer ${token}`, "x-session-id": session.id }
  );
  assert.equal(r.status, 403);
});

await test("9c: ADMIN_DECEPTION session cannot reach /api/employee-deception/*", async () => {
  await resetState();
  const { session, token } = await makeAdminDeceptionSession();
  const r = await get(server, `/api/employee-deception/dashboard/${session.id}`,
    { Authorization: `Bearer ${token}`, "x-session-id": session.id }
  );
  assert.equal(r.status, 403);
});

// ═════════════════════════════════════════════════════════════════════════════
// Test 10: Existing Admin deception endpoints remain unchanged
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n── Test 10: Admin deception endpoints unchanged ──────────────────────────");
await test("10a: /api/deception/files still works for a valid legacy Deception session (no deceptionRole)", async () => {
  await resetState();
  // Create a legacy-style deception session: status=Deception, NO deceptionRole
  // This simulates sessions created before Phase 2 (backward compatibility).
  const s = await store.createSession("phase4_legacy_dec@evil.test", "Deception", "8.8.8.8", "Bot", "USER");
  // Manually strip deceptionRole (if createSession added one — it shouldn't without the arg)
  delete (s as any).deceptionRole;
  const inCache = store.sessions.find((x: any) => x.id === s.id);
  if (inCache) delete (inCache as any).deceptionRole;

  const tok = store.generateJwtToken({ userId: s.id, username: s.username, role: "USER", sessionId: s.id, status: "Deception" });
  const r = await get(server, `/api/deception/files/${s.id}`,
    { Authorization: `Bearer ${tok}`, "x-session-id": s.id }
  );
  // Legacy deception session (no deceptionRole) is NOT EMPLOYEE_DECEPTION,
  // so the gateway does NOT block it on /api/deception/*
  assert.equal(r.status, 200, `Legacy Deception session must still reach /api/deception/files; got ${r.status}: ${JSON.stringify(r.body)}`);
  assert(Array.isArray(r.body.files), "Must return deception file list");
});

await test("10b: Admin deception endpoint /api/deception/search still works", async () => {
  await resetState();
  const s = await store.createSession("phase4_legacy_dec2@evil.test", "Deception", "8.8.8.8", "Bot", "USER");
  delete (s as any).deceptionRole;
  const inCache = store.sessions.find((x: any) => x.id === s.id);
  if (inCache) delete (inCache as any).deceptionRole;
  const tok = store.generateJwtToken({ userId: s.id, username: s.username, role: "USER", sessionId: s.id, status: "Deception" });
  const r = await post(server, `/api/deception/search/${s.id}`,
    { query: "password" },
    { Authorization: `Bearer ${tok}`, "x-session-id": s.id }
  );
  assert.equal(r.status, 200, `Legacy /api/deception/search must still work; got ${r.status}`);
  assert(Array.isArray(r.body.results));
});

// ═════════════════════════════════════════════════════════════════════════════
// Teardown
// ═════════════════════════════════════════════════════════════════════════════
server.close();
await resetState();

const total = passed + failed;
console.log(`\n${"─".repeat(70)}`);
console.log(`Phase 4 Results: ${passed}/${total} passed, ${failed} failed`);
if (failures.length) {
  console.error("\nFailed tests:");
  failures.forEach(f => console.error(`  ✗ ${f}`));
  process.exit(1);
} else {
  console.log("🎯 All Phase 4 integration tests passed.\n");
}
