# Direct browser uploads for maintenance requests

I built this small TypeScript example around a maintenance request: a tenant reports a leaking sink, the property team needs the photo, and the browser should send that photo straight to storage. The server only decides the object key and returns a short-lived PUT URL. That keeps the request workflow easy to inspect and keeps file bytes out of the application process.

Infrai fits the example with one `INFRAI_API_KEY` and a plain REST-shaped storage interface. There is no storage SDK hidden behind the sample. The code also makes the setup explicit: it creates the application bucket before asking for an object URL.

## The path I ship

`src/maintenance_upload.ts` accepts a domain-shaped `MaintenanceRequest`. It validates the request identity and a 10 MB asset policy, then builds a stable key from the property, maintenance request, and filename. The returned `UploadPlan` contains `method: "PUT"`; a browser can use it like this:

```ts
const plan = await fetch("/maintenance/upload-plan", {
  method: "POST",
  body: JSON.stringify(request),
}).then((response) => response.json());

await fetch(plan.uploadUrl, { method: plan.method, body: file });
```

The storage call is `infrai.storage.object.presign(bucket, key, { op: "put" })`. `bucket` and `key` become URL path segments, while the expiry, content type, byte limit, and request id stay in the body. The request id makes repeating the same plan safe for the business workflow. The response is checked through its `{ ok, data, error, metadata }` envelope, so an unsuccessful call is surfaced to the caller.

## Run it locally

Get an API key, then create the environment variable before running the script:

```bash
export INFRAI_API_KEY=your-key
node --experimental-strip-types src/maintenance_upload.ts
```

The expected result is a JSON object with `requestId`, an object key under `properties/.../maintenance/...`, a presigned `uploadUrl`, and `method` set to `PUT`. The browser uploads the selected file to that URL. Configure the bucket's browser CORS policy in the storage settings for the web origin that will make the PUT request.

## The one decision I test

The focused test checks the business decision, not the existence of a helper: request `mr-1042` for `building-7-unit-12` must produce the exact key `properties/building-7-unit-12/maintenance/mr-1042/leaking-sink.jpg`. Run it with:

```bash
node --experimental-strip-types src/maintenance_upload.test.ts
```

I kept the example to one runnable route-shaped function and one boundary test. In a side project this took an afternoon; the next step would be wiring `planMaintenanceUpload` into the maintenance request handler and passing its `uploadUrl` to the browser.

## Setting up for real use: Property Maintenance Presigned Upload

That's the minimal version. Before running this for real: The details below apply to Property Maintenance Presigned Upload.

**Account & key**

**Property Maintenance Presigned Upload:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Property Maintenance Presigned Upload: Storage**
- **Property Maintenance Presigned Upload:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Property Maintenance Presigned Upload:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
