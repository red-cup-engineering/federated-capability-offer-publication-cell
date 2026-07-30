import assert from "node:assert/strict";
import test from "node:test";
import {servePublicCapabilityOfferOutbox} from "../src/serve-public-capability-offer-outbox.mjs";

const origin = "https://seller.example";
const identifier = "one-seller";
const actor = `${origin}/actors/${identifier}`;
const activity = Object.freeze({
  "@context": "https://www.w3.org/ns/activitystreams",
  id: `${origin}/activities/offer-1`,
  type: "Offer",
  actor,
  to: "as:Public",
  object: {type: "Document", mediaType: "application/rmn+cbor", name: `ni:///sha-256;${"A".repeat(43)}`},
  attachment: {type: "Link", mediaType: "application/json", name: "A2A Agent Card", href: `${origin}/.well-known/agent-card.json`},
});
const material = {origin, identifier, name: "One seller", summary: "One exact offer.", activity};

test("serves the exact public offer without inbox or queue capabilities", () => {
  const result = servePublicCapabilityOfferOutbox(new Request(`${actor}/outbox`), material);
  assert.equal(result.status, 200);
  assert.equal(result.body.type, "OrderedCollection");
  assert.equal(result.body.totalItems, 1);
  assert.equal(result.body.orderedItems[0], activity);
  const actorProjection = servePublicCapabilityOfferOutbox(new Request(actor), material);
  assert.equal(actorProjection.body.attachment.href, `${origin}/.well-known/agent-card.json`);
});

test("refuses inbox and mutation routes", () => {
  assert.equal(servePublicCapabilityOfferOutbox(new Request(`${actor}/inbox`), material).status, 404);
  assert.equal(servePublicCapabilityOfferOutbox(new Request(`${actor}/outbox`, {method: "POST"}), material).status, 405);
});

test("refuses a foreign or private offer before serving", () => {
  assert.throws(
    () => servePublicCapabilityOfferOutbox(new Request(`${actor}/outbox`), {...material, activity: {...activity, actor: "https://foreign.example/actor"}}),
    /not one exact public/u,
  );
});

test("refuses a publication that cannot name a signed Agent Card reference", () => {
  assert.throws(
    () => servePublicCapabilityOfferOutbox(new Request(`${actor}/outbox`), {...material, activity: {...activity, attachment: {...activity.attachment, href: "not a URL"}}}),
    /not one exact public/u,
  );
});
