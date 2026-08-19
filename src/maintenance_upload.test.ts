import assert from "node:assert/strict";
import { assetKey, type MaintenanceRequest } from "./maintenance_upload.ts";

const request: MaintenanceRequest = {
  requestId: "mr-1042",
  propertyId: "building-7-unit-12",
  tenantId: "tenant-88",
  assetName: "leaking-sink.jpg",
  contentType: "image/jpeg",
  sizeBytes: 248_000,
};

assert.equal(assetKey(request), "properties/building-7-unit-12/maintenance/mr-1042/leaking-sink.jpg");
console.log("maintenance asset key policy passed");
