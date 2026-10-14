/* src/tests/helpers.ts */
import * as jwt from "jsonwebtoken";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

/** Sign a JWT for test use. Uses the same secret as the app (fallback to dev secret). */
export const signJwt = (payload: object, expiresIn = "1h"): string => {
  const secret = process.env.JWT_SECRET ?? "dev-secret-for-tests";
  return (jwt.sign as any)(payload, secret, { expiresIn });
};

/** Simple wrapper around fetch for the test server. */
export const apiFetch = async (
  method: "GET" | "POST",
  url: string,
  body?: any,
  token?: string
) => {
  const opts: any = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  };
  const res = await fetch(`http://localhost:3000${url}`, opts);
  const text = await res.text();
  return { status: res.status, data: text };
};

/** Cleanup function to delete artefacts created during tests. */
export const cleanupTestArtifacts = async (sessionIds: string[] = [], alertIds: string[] = [], csvPath?: string) => {
  // Delete sessions
  for (const id of sessionIds) {
    try {
      await apiFetch("POST", "/api/auth/logout", { sessionId: id });
    } catch (_) {}
  }
  // Delete alerts (direct DB removal – safe in test DB only)
  if (alertIds.length && process.env.NODE_ENV !== "production") {
    const { AlertModel } = await import("../server/db.js");
    await AlertModel.deleteMany({ _id: { $in: alertIds } }).catch(() => {});
  }
  // Delete benchmark CSV if it was created
  if (csvPath && fs.existsSync(csvPath)) {
    fs.unlinkSync(csvPath);
  }
};
