#!/usr/bin/env node
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {servePublicCapabilityOfferOutbox} from "../src/serve-public-capability-offer-outbox.mjs";

const material = JSON.parse(await readFile(
  process.env.CAPABILITY_OFFER_PUBLICATION_MATERIAL
    ?? new URL("../content/activitypub/publication.json", import.meta.url),
  "utf8",
));
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? "15614");
createServer(async (incoming, outgoing) => {
  const body = [];
  for await (const chunk of incoming) body.push(chunk);
  const request = new Request(new URL(incoming.url, material.origin), {
    method: incoming.method,
    headers: incoming.headers,
    ...(body.length === 0 ? {} : {body: Buffer.concat(body), duplex: "half"}),
  });
  let projection;
  try {
    projection = servePublicCapabilityOfferOutbox(request, material);
  } catch {
    projection = {status: 500, contentType: "application/activity+json", body: {
      "@context": "https://www.w3.org/ns/activitystreams", type: "Reject",
      object: {type: "PublicCapabilityOfferOutboxRefusal", code: "invalid-material"},
    }};
  }
  outgoing.writeHead(projection.status, {"content-type": `${projection.contentType}; charset=utf-8`});
  outgoing.end(`${JSON.stringify(projection.body)}\n`);
}).listen(port, host, () => process.stdout.write(JSON.stringify({
  type: "PublicCapabilityOfferOutboxListening", actor: `/actors/${material.identifier}`, host, port,
}) + "\n"));
