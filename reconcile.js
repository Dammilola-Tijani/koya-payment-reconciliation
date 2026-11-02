// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

// Latest attempt per txn_id (ts is ISO-8601 UTC, so it sorts as text).
const latest = new Map();

const lines = fs.readFileSync("payments.jsonl", "utf8").split("\n");
for (const line of lines) {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue; // truncated / unreadable line
  }
  if (!event || typeof event !== "object") continue;
  const txnId = event.txn_id;
  if (!txnId) continue; // event without a txn_id
  const current = latest.get(txnId);
  if (!current || event.ts >= current.ts) latest.set(txnId, event);
}

// Amounts arrive as numbers or strings such as "4,804.15". Work in kobo to avoid float drift.
function toKobo(value) {
  return Math.round(Number(String(value).replace(/,/g, "")) * 100);
}

let totalKobo = 0;
let count = 0;
for (const event of latest.values()) {
  if (event.status === "success") {
    totalKobo += toKobo(event.amount);
    count += 1;
  }
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(totalKobo / 100)}`);
}
