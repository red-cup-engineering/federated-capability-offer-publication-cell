export interface PublicCapabilityOfferPublication {
  readonly status: number;
  readonly contentType: "application/activity+json";
  readonly body: Readonly<Record<string, unknown>>;
}
export declare function servePublicCapabilityOfferOutbox(
  request: Request,
  material: Readonly<Record<string, unknown>>,
): PublicCapabilityOfferPublication;
