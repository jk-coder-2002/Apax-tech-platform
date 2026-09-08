import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "./app";
import { config } from "./config/env";
import User from "./models/userModel";
import Holding from "./models/holdingModel";

const TEST_EMAIL = `test-${Date.now()}@apax.test`;
const TEST_PASSWORD = "CorrectHorseBattery1";

let baseUrl: string;
let server: ReturnType<typeof app.listen>;

// The response envelope's `data` shape varies by endpoint (user, holdings,
// activity) - `any` here is a test-only convenience for reading whichever
// field a given assertion needs, not something shipped in app code.
interface TestEnvelope {
  success: boolean;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

async function readBody(res: Response): Promise<TestEnvelope> {
  return (await res.json()) as TestEnvelope;
}

function extractCookie(res: Response): string {
  const raw = res.headers.get("set-cookie");
  assert.ok(raw, "expected a Set-Cookie header");
  return raw!.split(";")[0];
}

before(async () => {
  await mongoose.connect(config.mongoUri);
  await User.deleteOne({ email: TEST_EMAIL });

  const user = await User.create({
    name: "Test User",
    email: TEST_EMAIL,
    gender: "unspecified",
    password: TEST_PASSWORD,
  });

  await Holding.deleteMany({ userId: user._id });
  await Holding.create({ userId: user._id, assetType: "gold", amount: 12.5 });

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  const user = await User.findOne({ email: TEST_EMAIL });
  if (user) {
    await Holding.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await mongoose.connection.close();
});

test("login: wrong password is rejected with a generic message", async () => {
  const res = await fetch(`${baseUrl}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: "wrong-password" }),
  });
  const body = await readBody(res);

  assert.equal(res.status, 401);
  assert.equal(body.success, false);
  assert.match(body.message, /invalid email or password/i);
});

test("login: unknown email gets the same generic message as wrong password", async () => {
  const res = await fetch(`${baseUrl}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nobody@apax.test", password: "whatever123" }),
  });
  const body = await readBody(res);

  assert.equal(res.status, 401);
  assert.equal(body.success, false);
  assert.match(body.message, /invalid email or password/i);
});

test("login: correct credentials succeed and set an httpOnly cookie", async () => {
  const res = await fetch(`${baseUrl}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const body = await readBody(res);

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.user.email, TEST_EMAIL);
  assert.equal(body.data.token, undefined, "token must not be exposed in the JSON body");
  assert.equal(body.data.user.password, undefined, "password hash must never be serialized");

  const setCookie = res.headers.get("set-cookie");
  assert.ok(setCookie?.toLowerCase().includes("httponly"));
});

test("GET /api/holdings: 401 with no token", async () => {
  const res = await fetch(`${baseUrl}/api/holdings`);
  assert.equal(res.status, 401);
});

test("GET /api/holdings: 401 with a tampered token", async () => {
  const loginRes = await fetch(`${baseUrl}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const cookie = extractCookie(loginRes);
  const tampered = cookie.slice(0, -1) + (cookie.endsWith("a") ? "b" : "a");

  const res = await fetch(`${baseUrl}/api/holdings`, {
    headers: { Cookie: tampered },
  });
  assert.equal(res.status, 401);
});

test("GET /api/holdings: 401 with an expired token", async () => {
  const user = await User.findOne({ email: TEST_EMAIL });
  assert.ok(user);
  const expiredToken = jwt.sign({ id: user!._id, email: user!.email }, config.jwtSecret, {
    expiresIn: -10,
  });

  const res = await fetch(`${baseUrl}/api/holdings`, {
    headers: { Cookie: `token=${expiredToken}` },
  });
  const body = await readBody(res);

  assert.equal(res.status, 401);
  assert.match(body.message, /expired/i);
});

test("GET /api/holdings: 200 with a valid token, shaped for the portfolio UI", async () => {
  const loginRes = await fetch(`${baseUrl}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const cookie = extractCookie(loginRes);

  const res = await fetch(`${baseUrl}/api/holdings`, {
    headers: { Cookie: cookie },
  });
  const body = await readBody(res);

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.data.holdings));
  const gold = body.data.holdings.find((h: { assetType: string }) => h.assetType === "gold");
  assert.equal(gold.amount, 12.5);
});
