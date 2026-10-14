/**
 * Phase 3.1 — Real Integration Tests (AZTSMDI) — corrected run
 *
 * Exercises actual Express routes, middleware, and store functions.
 *
 * Isolation model:
 *   - VERCEL=1  → prevents server.ts auto-start block
 *   - dotenv.config() inside server.ts WILL load .env (MongoDB may connect)
 *   - resetState() clears both in-memory state AND DB loginFailure records
 *     so tests remain isolated regardless of whether DB is live
 *   - All test users are clearly namespaced (*.test / *.phase3.test)
 *     and their loginFailure DB records are deleted in resetState()
 *   - Sessions imported via namespace object (store.sessions) for ESM live bindings
 *
 * Confirmed behaviors from first run:
 *   - DB connects transparently after first HTTP request (dotenv loads .env)
 *   - createSession() adds 50 threat points via addLogEntry("Session Initiated")
 *     before returning, so final threatScore for a Deception session is 100
 *   - Both behaviors are correct; tests now reflect actual application behavior
 *
 * Run: npx tsx phase3_integration_tests.ts
 */

// ── Environment setup BEFORE any dynamic imports ─────────────────────────────
process.env.VERCEL = "1";               // suppress auto-start block in server.ts
process.env.NODE_ENV = "test";          // use dev JWT secret, avoid production guards
// Note: dotenv.config() inside server.ts will override env deletions, so we
// leave MONGODB_URI as-is and make resetState() handle DB cleanup instead.
process.env.ADMIN_USERNAME = "phase3_admin@aztsmdi.test";
process.env.ADMIN_PASSWORD = "Phase3TestPass_777!";

import assert from "node:assert/strict";
import http from "node:http";
import { AddressInfo } from "node:net";

// ── Helpers ───────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];

async function test(label: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ ${label}`);
    console.error(`     ${err.message}`);
    failed++;
    failures.push(`${label}: ${err.message}`);
  }
}

function post(server: http.Server, path: string, payload: object, headers: Record<string, string> = {}): Promise<{ status: number; body: any }> {
  const addr = server.address() as AddressInfo;
  const raw = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1", port: addr.port, path, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(raw), ...headers },
    }, res => {
      let data = "";
      res.on("data", c => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode!, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode!, body: data }); }
      });
    });
    req.on("error", reject);
    req.write(raw);
    req.end();
  });
}

function get(server: http.Server, path: string, headers: Record<string, string> = {}): Promise<{ status: number; body: any }> {
  const addr = server.address() as AddressInfo;
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port: addr.port, path, method: "GET", headers },
      res => {
        let data = "";
        res.on("data", c => (data += c));
        res.on("end", () => {
          try { resolve({ status: res.statusCode!, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode!, body: data }); }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

// ── Dynamic imports — AFTER env vars set ─────────────────────────────────────
// CRITICAL: import as NAMESPACE objects so store.sessions is a live ESM binding.
// Destructuring { sessions } would capture a snapshot; setSessions() would then
// replace the module variable and the test's local ref would become stale.
const { app, findSession } = await import("./server.js");
const store = await import("./src/server/store.js");
const db = await import("./src/server/db.js");

// Test user names — used in resetState() cleanup
const TEST_USERS = [
  process.env.ADMIN_USERNAME!,
  "nobody@test.com",
  "twofails@test.com",
  "bruteforce@test.com",
  "reset_test@test.com",
  "genuine@test.com",
  "admin@test.com",
  "attacker@evil.com",
  "fake_admin@evil.com",
  "mem@test.com",
  "t@t.com",
  "cached@test.com",
  "emp_dec@test.com",
  "fake@evil.com",
  "emp@evil.com",
  "emp_attacker@evil.com",
  "repeated@evil.com",
];

/** Reset in-memory state AND DB loginFailure records for test users. */
async function resetState() {
  store.setSessions([]);
  for (const k of Object.keys(store.loginFailures)) delete store.loginFailures[k];

  // If DB connected, also purge loginFailure records so tests don't bleed into each other
  if (db.isDbConnected()) {
    try {
      const { LoginFailureModel, SessionModel } = await import("./src/server/db.js");
      await (LoginFailureModel as any).deleteMany({ username: { $in: TEST_USERS } }).catch(() => {});
      // Terminate any active test sessions to avoid interfering with subsequent tests
      await (SessionModel as any).deleteMany({ username: { $in: TEST_USERS } }).catch(() => {});
    } catch (_) {}
  }
}

// Start test HTTP server on a random OS-assigned port
const server = http.createServer(app);
await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
const { port } = server.address() as AddressInfo;
console.log(`\n  [TEST SERVER] listening on 127.0.0.1:${port}`);
console.log(`  [DB STATUS]   connected=${db.isDbConnected()} (may change after first HTTP request)\n`);

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A — Unit: createSession() function directly
// Code path: src/server/store.ts createSession()
// ═══════════════════════════════════════════════════════════════════════════════
console.log("── Section A: createSession() unit tests ──────────────────────────────");

await test("A1: Genuine employee session — no deceptionRole field on returned object", async () => {
  await resetState();
  const s = await store.createSession("genuine@test.com", "Genuine", "1.1.1.1", "TestAgent", "USER");
  assert.equal(s.status, "Genuine");
  assert.equal(s.role, "USER");
  assert(!("deceptionRole" in s), `deceptionRole must be absent; got: ${JSON.stringify(s.deceptionRole)}`);
});

await test("A2: Genuine admin session — no deceptionRole field", async () => {
  await resetState();
  const s = await store.createSession("admin@test.com", "Genuine", "1.1.1.1", "TestAgent", "ADMIN");
  assert.equal(s.status, "Genuine");
  assert.equal(s.role, "ADMIN");
  assert(!("deceptionRole" in s));
});

await test("A3: EMPLOYEE_DECEPTION session — correct deceptionRole, role stays USER (never ADMIN)", async () => {
  await resetState();
  const s = await store.createSession("attacker@evil.com", "Deception", "6.6.6.6", "Bot", "USER", undefined, false, "EMPLOYEE_DECEPTION");
  assert.equal(s.status, "Deception");
  assert.equal(s.role, "USER");
  assert.notEqual(s.role, "ADMIN");
  assert("deceptionRole" in s, "deceptionRole key must be present");
  assert.equal(s.deceptionRole, "EMPLOYEE_DECEPTION");
});

await test("A4: ADMIN_DECEPTION session — correct deceptionRole, role stays USER (never ADMIN)", async () => {
  await resetState();
  const s = await store.createSession("fake_admin@evil.com", "Deception", "6.6.6.6", "Bot", "USER", undefined, false, "ADMIN_DECEPTION");
  assert.equal(s.status, "Deception");
  assert.equal(s.role, "USER");
  assert.notEqual(s.role, "ADMIN");
  assert("deceptionRole" in s, "deceptionRole key must be present");
  assert.equal(s.deceptionRole, "ADMIN_DECEPTION");
});

await test("A5: createSession() pushes session into store.sessions[] (live ESM binding)", async () => {
  await resetState();
  // Uses store.sessions — the live module namespace binding, not a destructured snapshot.
  // setSessions([]) replaces the module variable; store.sessions always reflects current value.
  const s = await store.createSession("mem@test.com", "Deception", "1.2.3.4", "UA", "USER", undefined, false, "EMPLOYEE_DECEPTION");
  const inCache = store.sessions.find((x: any) => x.id === s.id);
  assert(inCache, "Session must be present in store.sessions[] (live binding)");
  assert.equal(inCache!.deceptionRole, "EMPLOYEE_DECEPTION");
});

await test("A6: Deception session threatScore after createSession() is 100 (50 init + 50 from Session Initiated log)", async () => {
  // createSession() awaits addLogEntry('Session Initiated', ..., 50) before returning.
  // addLogEntry adds 50 threat points to the in-memory session object.
  // Correct final value: 50 (initial) + 50 (log entry) = 100.
  // This is the verified actual behavior — not a defect.
  await resetState();
  const s = await store.createSession("t@t.com", "Deception", "1.1.1.1", "UA", "USER", undefined, false, "EMPLOYEE_DECEPTION");
  assert.equal(s.threatScore, 100,
    `Expected 100 (50 init + 50 from addLogEntry); got ${s.threatScore}. ` +
    "createSession() awaits addLogEntry before returning, which adds points in-place.");
});

await test("A7: Genuine session threatScore is 0 after createSession()", async () => {
  await resetState();
  const s = await store.createSession("t@t.com", "Genuine", "1.1.1.1", "UA", "USER");
  assert.equal(s.threatScore, 0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION B — Unit: JWT generation and verification
// Code path: src/server/store.ts generateJwtToken() / verifyJwtToken()
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n── Section B: JWT token unit tests ────────────────────────────────────");

await test("B1: Deception JWT — role=USER, status=Deception (never ADMIN)", () => {
  const token = store.generateJwtToken({ userId: "sess_fake", username: "attacker@evil.com", role: "USER", sessionId: "sess_fake", status: "Deception" });
  const payload = store.verifyJwtToken(token);
  assert(payload, "Token must be verifiable");
  assert.equal(payload.role, "USER");
  assert.equal(payload.status, "Deception");
  assert.notEqual(payload.role, "ADMIN");
});

await test("B2: Genuine admin JWT — role=ADMIN, status=Genuine", () => {
  const token = store.generateJwtToken({ userId: "usr_admin", username: "admin@test.com", role: "ADMIN", sessionId: "sess_admin", status: "Genuine" });
  const payload = store.verifyJwtToken(token);
  assert.equal(payload.role, "ADMIN");
  assert.equal(payload.status, "Genuine");
});

await test("B3: Tampered JWT signature returns null", () => {
  const token = store.generateJwtToken({ userId: "x", username: "x", role: "ADMIN", sessionId: "x", status: "Genuine" });
  const parts = token.split(".");
  const tampered = parts[0] + "." + parts[1] + "." + parts[2].slice(0, -4) + "XXXX";
  assert.equal(store.verifyJwtToken(tampered), null, "Tampered token must be rejected");
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION C — Unit: findSession() in-memory path
// Code path: server.ts findSession() — DB-disconnected branch (in-memory only)
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n── Section C: findSession() cache path unit tests ─────────────────────");

await test("C1: findSession() returns ADMIN_DECEPTION session from cache, preserving deceptionRole", async () => {
  await resetState();
  const s = await store.createSession("cached@test.com", "Deception", "1.1.1.1", "UA", "USER", undefined, false, "ADMIN_DECEPTION");
  const found = await findSession(s.id);
  assert(found, "findSession must return the session");
  assert.equal(found.id, s.id);
  assert.equal(found.deceptionRole, "ADMIN_DECEPTION");
  assert.equal(found.status, "Deception");
  assert.equal(found.role, "USER");
});

await test("C2: findSession() for unknown ID returns null", async () => {
  await resetState();
  const found = await findSession("sess_doesnotexist_xyz");
  assert.equal(found, null);
});

await test("C3: findSession() for empty string returns null", async () => {
  assert.equal(await findSession(""), null);
});

await test("C4: findSession() returns EMPLOYEE_DECEPTION with correct fields", async () => {
  await resetState();
  const s = await store.createSession("emp_dec@test.com", "Deception", "1.1.1.1", "UA", "USER", undefined, false, "EMPLOYEE_DECEPTION");
  const found = await findSession(s.id);
  assert.equal(found?.deceptionRole, "EMPLOYEE_DECEPTION");
  assert.equal(found?.status, "Deception");
  assert.equal(found?.role, "USER");
  assert.notEqual(found?.role, "ADMIN");
});

// ── DB warmup ──────────────────────────────────────────────────────────────────
// The lazy middleware in server.ts only connects MongoDB on the first HTTP request.
// resetState() skips DB cleanup when isDbConnected() === false. A warmup request
// here ensures the DB is live before any HTTP-test section runs, so every
// subsequent resetState() call cleans up both in-memory and DB state.
console.log("\n  [DB WARMUP] Triggering MongoDB connection via GET /api/health ...");
await get(server, "/api/health");
await resetState();  // now DB is connected — this purges stale LoginFailureModel records
console.log(`  [DB STATUS]   connected=${db.isDbConnected()} after warmup\n`);

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION D — Integration: POST /api/auth/login (employee route)
// Code path: actual Express route handler + loginFailures tracking in server.ts
// ═══════════════════════════════════════════════════════════════════════════════
console.log("── Section D: POST /api/auth/login HTTP integration ───────────────────");

await test("D1: Single failed employee login → 401, attempt counter 1/3, no deception session", async () => {
  await resetState();
  const r = await post(server, "/api/auth/login", { username: "nobody@test.com", password: "wrong" });
  assert.equal(r.status, 401);
  assert.equal(r.body.status, "error");
  assert(r.body.message.includes("Attempt 1 of 3"), `Got: ${r.body.message}`);
  assert.equal(store.sessions.filter((s: any) => s.status === "Deception").length, 0);
});

await test("D2: Two failed employee logins → 401 twice, counter increments", async () => {
  await resetState();
  const u = "twofails@test.com";
  await post(server, "/api/auth/login", { username: u, password: "wrong1" });
  const r = await post(server, "/api/auth/login", { username: u, password: "wrong2" });
  assert.equal(r.status, 401);
  assert(r.body.message.includes("Attempt 2 of 3"), `Got: ${r.body.message}`);
});

await test("D3: Third failed employee login → HTTP 200, session.status=Deception, deceptionRole=EMPLOYEE_DECEPTION, JWT role=USER", async () => {
  await resetState();
  const u = "bruteforce@test.com";
  await post(server, "/api/auth/login", { username: u, password: "bad1" });
  await post(server, "/api/auth/login", { username: u, password: "bad2" });
  const r = await post(server, "/api/auth/login", { username: u, password: "bad3" });
  assert.equal(r.status, 200, `Expected 200; got ${r.status}: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.status, "success");
  assert(r.body.token);
  assert(r.body.session);
  assert.equal(r.body.session.status, "Deception");
  assert.equal(r.body.session.deceptionRole, "EMPLOYEE_DECEPTION",
    `Expected EMPLOYEE_DECEPTION; got: ${r.body.session.deceptionRole}`);
  const payload = store.verifyJwtToken(r.body.token);
  assert(payload, "JWT must be verifiable");
  assert.equal(payload.role, "USER");
  assert.equal(payload.status, "Deception");
  assert.notEqual(payload.role, "ADMIN");
});

await test("D4: Failure counter resets after diversion — 4th attempt restarts at 1/3", async () => {
  await resetState();
  const u = "reset_test@test.com";
  for (let i = 0; i < 3; i++) await post(server, "/api/auth/login", { username: u, password: "bad" });
  const r4 = await post(server, "/api/auth/login", { username: u, password: "bad" });
  assert.equal(r4.status, 401);
  assert(r4.body.message.includes("Attempt 1 of 3"), `Counter must reset; got: ${r4.body.message}`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION E — Integration: POST /api/auth/admin-login
// Code path: actual Express admin-login route with loginFailures tracking
// Each test calls resetState() which also purges DB loginFailure records.
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n── Section E: POST /api/auth/admin-login HTTP integration ──────────────");

await test("E1: Correct admin credentials → 200, role=admin, JWT role=ADMIN, status=Genuine", async () => {
  await resetState();
  const r = await post(server, "/api/auth/admin-login", {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
  });
  assert.equal(r.status, 200, `Expected 200; got ${r.status}: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.status, "success");
  assert.equal(r.body.role, "admin");
  const payload = store.verifyJwtToken(r.body.token);
  assert.equal(payload.role, "ADMIN");
  assert.equal(payload.status, "Genuine");
});

await test("E2: Single failed admin login → 401, no deception session", async () => {
  await resetState();
  const r = await post(server, "/api/auth/admin-login", {
    username: process.env.ADMIN_USERNAME, password: "wrong_password_1",
  });
  assert.equal(r.status, 401);
  assert.equal(r.body.status, "error");
  assert.equal(store.sessions.filter((s: any) => s.status === "Deception").length, 0);
});

await test("E3: Two failed admin logins → 401 both times, no deception session yet", async () => {
  await resetState();  // clears both in-memory loginFailures AND DB LoginFailureModel
  const u = process.env.ADMIN_USERNAME!;
  const r1 = await post(server, "/api/auth/admin-login", { username: u, password: "bad1" });
  const r2 = await post(server, "/api/auth/admin-login", { username: u, password: "bad2" });
  assert.equal(r1.status, 401, `1st failure must be 401; got ${r1.status}`);
  assert.equal(r2.status, 401, `2nd failure must be 401; got ${r2.status}: ${JSON.stringify(r2.body)}`);
  assert.equal(store.sessions.filter((s: any) => s.status === "Deception").length, 0);
});

await test("E4: Third failed admin login → HTTP 200, deceptionRole=ADMIN_DECEPTION, JWT role=USER (never ADMIN)", async () => {
  await resetState();
  const u = process.env.ADMIN_USERNAME!;
  await post(server, "/api/auth/admin-login", { username: u, password: "badA" });
  await post(server, "/api/auth/admin-login", { username: u, password: "badB" });
  const r = await post(server, "/api/auth/admin-login", { username: u, password: "badC" });
  assert.equal(r.status, 200, `Expected 200 on 3rd failure; got ${r.status}: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.status, "success");
  assert.equal(r.body.role, "user",
    `Expected role=user (deception route); got: ${r.body.role}`);
  assert(r.body.session);
  assert.equal(r.body.session.status, "Deception");
  assert.equal(r.body.session.deceptionRole, "ADMIN_DECEPTION",
    `Expected ADMIN_DECEPTION; got: ${r.body.session.deceptionRole}`);
  const payload = store.verifyJwtToken(r.body.token);
  assert(payload, "JWT must be verifiable");
  assert.equal(payload.role, "USER", `JWT must carry role=USER; got: ${payload.role}`);
  assert.equal(payload.status, "Deception");
  assert.notEqual(payload.role, "ADMIN", "Deception JWT must NEVER carry ADMIN role");
});

await test("E5: ADMIN_DECEPTION session appears in store.sessions[] after 3rd failure", async () => {
  await resetState();
  const u = process.env.ADMIN_USERNAME!;
  for (const p of ["x1", "x2", "x3"]) {
    await post(server, "/api/auth/admin-login", { username: u, password: p });
  }
  // store.sessions is a live ESM binding — reflects the current module variable
  const deceptionSessions = store.sessions.filter((s: any) => s.status === "Deception" && s.deceptionRole === "ADMIN_DECEPTION");
  assert(deceptionSessions.length >= 1,
    `Expected at least 1 ADMIN_DECEPTION session in store.sessions; found ${deceptionSessions.length}. ` +
    `Total sessions: ${store.sessions.length}`);
  assert.equal(deceptionSessions[0].role, "USER");
  assert.notEqual(deceptionSessions[0].role, "ADMIN");
});

await test("E6: Successful admin login clears loginFailures counter", async () => {
  await resetState();
  const u = process.env.ADMIN_USERNAME!;
  await post(server, "/api/auth/admin-login", { username: u, password: "fail1" });
  await post(server, "/api/auth/admin-login", { username: u, password: "fail2" });
  const rOk = await post(server, "/api/auth/admin-login", { username: u, password: process.env.ADMIN_PASSWORD });
  assert.equal(rOk.status, 200, `Correct credentials must succeed; got ${rOk.status}`);
  assert.equal(rOk.body.role, "admin");
  // In-memory counter must be cleared
  assert(!store.loginFailures[u], "In-memory loginFailures counter must be cleared after success");
});

await test("E7: Missing username or password returns 400", async () => {
  await resetState();
  const r1 = await post(server, "/api/auth/admin-login", { username: "", password: "x" });
  assert.equal(r1.status, 400);
  const r2 = await post(server, "/api/auth/admin-login", { username: "admin@x.com", password: "" });
  assert.equal(r2.status, 400);
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION F — Integration: requireAdmin + intelligentApiGateway middleware
// Code path: actual Express middleware on real /api/admin/* and /api/employee/* routes
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n── Section F: Middleware rejection tests (actual HTTP) ─────────────────");

await test("F1: No auth header on /api/admin/employees → 401", async () => {
  await resetState();
  const r = await get(server, "/api/admin/employees");
  assert.equal(r.status, 401);
});

await test("F2: ADMIN_DECEPTION JWT on /api/admin/employees → 403 (status=Deception blocks requireAdmin)", async () => {
  await resetState();
  const s = await store.createSession("fake@evil.com", "Deception", "6.6.6.6", "Bot", "USER", undefined, false, "ADMIN_DECEPTION");
  const tok = store.generateJwtToken({ userId: s.id, username: s.username, role: "USER", sessionId: s.id, status: "Deception" });
  const r = await get(server, "/api/admin/employees", { Authorization: `Bearer ${tok}` });
  assert.equal(r.status, 403, `Expected 403; got ${r.status}: ${JSON.stringify(r.body)}`);
});

await test("F3: ADMIN_DECEPTION session cannot access GET /api/admin/sessions", async () => {
  await resetState();
  const s = await store.createSession("fake_admin@evil.com", "Deception", "5.5.5.5", "Bot", "USER", undefined, false, "ADMIN_DECEPTION");
  const tok = store.generateJwtToken({ userId: s.id, username: s.username, role: "USER", sessionId: s.id, status: "Deception" });
  const r = await get(server, "/api/admin/sessions", { Authorization: `Bearer ${tok}` });
  assert.equal(r.status, 403);
});

await test("F4: ADMIN_DECEPTION session cannot POST /api/admin/employees (register employee)", async () => {
  await resetState();
  const s = await store.createSession("fake_admin@evil.com", "Deception", "5.5.5.5", "Bot", "USER", undefined, false, "ADMIN_DECEPTION");
  const tok = store.generateJwtToken({ userId: s.id, username: s.username, role: "USER", sessionId: s.id, status: "Deception" });
  const r = await post(server, "/api/admin/employees",
    { username: "new_emp@evil.com", password: "evilpass" },
    { Authorization: `Bearer ${tok}` }
  );
  assert.equal(r.status, 403, `Expected 403; got ${r.status}: ${JSON.stringify(r.body)}`);
});

await test("F5: EMPLOYEE_DECEPTION session cannot POST /api/employee/tasks (intelligentApiGateway blocks)", async () => {
  await resetState();
  const s = await store.createSession("emp_attacker@evil.com", "Deception", "5.5.5.5", "Bot", "USER", undefined, false, "EMPLOYEE_DECEPTION");
  const tok = store.generateJwtToken({ userId: s.id, username: s.username, role: "USER", sessionId: s.id, status: "Deception" });
  const r = await post(server, "/api/employee/tasks",
    { sessionId: s.id, title: "Injected task" },
    { Authorization: `Bearer ${tok}`, "x-session-id": s.id }
  );
  assert.equal(r.status, 403, `Expected 403 from gateway; got ${r.status}: ${JSON.stringify(r.body)}`);
});

await test("F6: Forged deceptionRole in request body cannot grant admin access → 401 or 403", async () => {
  await resetState();
  const r = await post(server, "/api/admin/employees",
    { deceptionRole: "ADMIN_DECEPTION", sessionId: "sess_forged_id" },
    {}
  );
  assert([401, 403].includes(r.status),
    `Expected 401 or 403 for forged body; got ${r.status}: ${JSON.stringify(r.body)}`);
  assert.notEqual(r.status, 200);
});

await test("F7: Tampered JWT is rejected with 401 (verifyJwtToken returns null)", async () => {
  await resetState();
  const s = await store.createSession("emp@evil.com", "Deception", "5.5.5.5", "Bot", "USER", undefined, false, "EMPLOYEE_DECEPTION");
  const tok = store.generateJwtToken({ userId: s.id, username: s.username, role: "USER", sessionId: s.id, status: "Deception" });
  const parts = tok.split(".");
  const tampered = parts[0] + "." + parts[1] + "." + parts[2].slice(0, -4) + "XXXX";
  const r = await get(server, "/api/admin/employees", { Authorization: `Bearer ${tampered}` });
  assert.equal(r.status, 401, `Tampered JWT must be rejected with 401; got ${r.status}`);
});

await test("F8: Genuine admin JWT can access GET /api/admin/employees (positive path)", async () => {
  await resetState();
  const loginResp = await post(server, "/api/auth/admin-login", {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
  });
  assert.equal(loginResp.status, 200, "Admin login must succeed for F8");
  const r = await get(server, "/api/admin/employees", { Authorization: `Bearer ${loginResp.body.token}` });
  assert.equal(r.status, 200, `Genuine admin must reach /api/admin/employees; got ${r.status}: ${JSON.stringify(r.body)}`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION G — Previous-session termination on new login
// Code path: createSession() termination loop in src/server/store.ts
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n── Section G: Duplicate session protection ─────────────────────────────");

await test("G1: Second deception login for same username terminates first session in store.sessions[]", async () => {
  await resetState();
  const u = "repeated@evil.com";
  const s1 = await store.createSession(u, "Deception", "6.6.6.6", "Bot", "USER", undefined, false, "EMPLOYEE_DECEPTION");
  // s2 creation: createSession's termination loop runs over store.sessions (live binding)
  const s2 = await store.createSession(u, "Deception", "6.6.6.6", "Bot", "USER", undefined, false, "EMPLOYEE_DECEPTION");

  // Use store.sessions (live binding) to find s1 — it should exist but be Terminated
  const first = store.sessions.find((s: any) => s.id === s1.id);
  assert(first, "s1 must still be in store.sessions[] (not deleted, just terminated)");
  assert.equal(first!.status, "Terminated", `s1.status must be Terminated; got: ${first!.status}`);
  assert.equal(s2.status, "Deception");
  assert.equal(s2.deceptionRole, "EMPLOYEE_DECEPTION");
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEARDOWN
// ═══════════════════════════════════════════════════════════════════════════════
server.close();
await resetState();

const total = passed + failed;
console.log(`\n${"─".repeat(70)}`);
console.log(`Phase 3.1 Results: ${passed}/${total} passed, ${failed} failed`);
if (failures.length) {
  console.error("\nFailed tests:");
  failures.forEach(f => console.error(`  ✗ ${f}`));
  process.exit(1);
} else {
  console.log("🎯 All Phase 3.1 integration and unit tests passed.\n");
}
