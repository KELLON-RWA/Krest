import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeSessionHash,
  computeVisitorHash,
  generateProjectKeys,
  hashPassword,
  sha256Hex,
  verifyPassword,
} from "../apps/api/src/lib/hashing.js";

test("sha256Hex matches a known digest", () => {
  assert.equal(
    sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
});

test("visitor hashes are deterministic within a salt and change with inputs", () => {
  const a = computeVisitorHash("salt-a", "project-1", "203.0.113.7", "UA/1");
  const b = computeVisitorHash("salt-a", "project-1", "203.0.113.7", "UA/1");
  const otherSalt = computeVisitorHash("salt-b", "project-1", "203.0.113.7", "UA/1");
  const otherProject = computeVisitorHash("salt-a", "project-2", "203.0.113.7", "UA/1");

  assert.equal(a, b);
  assert.notEqual(a, otherSalt);
  assert.notEqual(a, otherProject);
  assert.match(a, /^[a-f0-9]{64}$/);
});

test("session hashes use fixed 30-minute windows", () => {
  const visitor = "visitor";
  const windowMs = 30 * 60 * 1000;
  const start = windowMs * 1000 + 1000;

  assert.equal(
    computeSessionHash("salt", visitor, start),
    computeSessionHash("salt", visitor, start + windowMs - 2000)
  );
  assert.notEqual(
    computeSessionHash("salt", visitor, start),
    computeSessionHash("salt", visitor, start + windowMs)
  );
});

test("generated project keys keep prefixes and hash the secret", () => {
  const keys = generateProjectKeys();
  assert.ok(keys.publicKey.startsWith("pk_live_"));
  assert.ok(keys.secretKey.startsWith("sk_live_"));
  assert.equal(keys.secretKeyHash, sha256Hex(keys.secretKey));
  assert.ok(keys.secretKey.startsWith(keys.secretKeyPrefix));
});

test("password hashes verify only the original password", async () => {
  const stored = await hashPassword("correct horse battery staple");
  assert.equal(await verifyPassword("correct horse battery staple", stored), true);
  assert.equal(await verifyPassword("wrong password", stored), false);
  assert.equal(await verifyPassword("whatever", "malformed"), false);
});
