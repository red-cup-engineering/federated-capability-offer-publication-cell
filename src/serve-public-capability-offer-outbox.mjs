const ACTIVITYPUB = "application/activity+json";
const CONTEXT = "https://www.w3.org/ns/activitystreams";
const PUBLIC = new Set(["as:Public", "https://www.w3.org/ns/activitystreams#Public"]);

export function servePublicCapabilityOfferOutbox(request, material) {
  if (!(request instanceof Request) || !material || Object.getPrototypeOf(material) !== Object.prototype) {
    throw new TypeError("one request and one exact publication material record are required");
  }
  const origin = new URL(material.origin);
  if (origin.protocol !== "https:" && origin.hostname !== "127.0.0.1" && origin.hostname !== "localhost") {
    throw new TypeError("publication origin must use HTTPS outside loopback development");
  }
  if (typeof material.identifier !== "string" || !/^[a-z0-9][a-z0-9._-]*$/u.test(material.identifier)) {
    throw new TypeError("publication identifier is invalid");
  }
  const actor = new URL(`/actors/${material.identifier}`, origin).href;
  const outbox = `${actor}/outbox`;
  const activity = material.activity;
  const addressed = Array.isArray(activity?.to) ? activity.to : [activity?.to];
  let agentCard;
  try {
    agentCard = new URL(activity?.attachment?.href);
  } catch {
    agentCard = undefined;
  }
  if (activity?.type !== "Offer" || activity.actor !== actor || typeof activity.id !== "string"
      || !PUBLIC.has(addressed[0]) || addressed.length !== 1
      || activity.object?.mediaType !== "application/rmn+cbor"
      || !/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(activity.object?.name ?? "")
      || activity.attachment?.name !== "A2A Agent Card" || activity.attachment?.mediaType !== "application/json"
      || !agentCard || (agentCard.protocol !== "https:" && agentCard.hostname !== "127.0.0.1" && agentCard.hostname !== "localhost")) {
    throw new TypeError("publication material is not one exact public RMN capability Offer");
  }
  if (request.method !== "GET") {
    return Object.freeze({status: 405, contentType: ACTIVITYPUB, body: Object.freeze({
      "@context": CONTEXT, type: "Reject", object: {type: "PublicCapabilityOfferOutboxRefusal", code: "method-not-allowed"},
    })});
  }
  const url = new URL(request.url);
  if (url.pathname === new URL(actor).pathname) {
    return Object.freeze({status: 200, contentType: ACTIVITYPUB, body: Object.freeze({
      "@context": CONTEXT, id: actor, type: "Service", preferredUsername: material.identifier,
      name: material.name, summary: material.summary, outbox,
      attachment: Object.freeze({type: "Link", name: "A2A Agent Card", mediaType: "application/json", href: agentCard.href}),
    })});
  }
  if (url.pathname === new URL(outbox).pathname) {
    return Object.freeze({status: 200, contentType: ACTIVITYPUB, body: Object.freeze({
      "@context": CONTEXT, id: outbox, type: "OrderedCollection", totalItems: 1, orderedItems: [activity],
    })});
  }
  return Object.freeze({status: 404, contentType: ACTIVITYPUB, body: Object.freeze({
    "@context": CONTEXT, type: "Reject", object: {type: "PublicCapabilityOfferOutboxRefusal", code: "route-not-owned"},
  })});
}
