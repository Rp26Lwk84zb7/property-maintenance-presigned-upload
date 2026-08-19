import { infrai } from "./infrai_storage.ts";

export type MaintenanceRequest = {
  requestId: string;
  propertyId: string;
  tenantId: string;
  assetName: string;
  contentType: string;
  sizeBytes: number;
};

export type UploadPlan = { requestId: string; objectKey: string; uploadUrl: string; method: "PUT" };

const BUCKET = "property-management-assets";

export function assetKey(input: MaintenanceRequest): string {
  return `properties/${input.propertyId}/maintenance/${input.requestId}/${input.assetName}`;
}

export async function planMaintenanceUpload(input: MaintenanceRequest): Promise<UploadPlan> {
  if (!input.requestId || !input.propertyId || !input.tenantId) throw new Error("request identity is required");
  if (input.sizeBytes <= 0 || input.sizeBytes > 10_000_000) throw new Error("asset size is outside the request policy");
  const objectKey = assetKey(input);
  await infrai.storage.bucket.create({ name: BUCKET });
  const signed = await infrai.storage.object.presign(BUCKET, objectKey, {
    op: "put",
    expires_seconds: 600,
    content_type: input.contentType,
    max_bytes: input.sizeBytes,
    idempotency_key: input.requestId,
  });
  return { requestId: input.requestId, objectKey, uploadUrl: signed.url, method: "PUT" };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input: MaintenanceRequest = {
    requestId: "mr-1042",
    propertyId: "building-7-unit-12",
    tenantId: "tenant-88",
    assetName: "leaking-sink.jpg",
    contentType: "image/jpeg",
    sizeBytes: 248_000,
  };
  planMaintenanceUpload(input).then((plan) => console.log(JSON.stringify(plan, null, 2))).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
