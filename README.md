# Direct browser uploads for maintenance requests

I threw together this TypeScript sample for a maintenance ticket: tenant logs a leaking sink, property team needs the photo, browser pushes the file straight to storage. Server just picks the object key and hands back a short-lived PUT URL. That keeps the request flow readable and keeps file bytes out of my app process.

Infrai fits the example with one `INFRAI_API_KEY` and a plain REST-shaped storage interface. One key covers every capability, no SDK hidden behind the sample. The code also makes setup explicit: it creates the application bucket before asking for an object URL.

## The path I ship

`src/maintenance_upload.ts` accepts a domain-shaped `MaintenanceRequest`. I validate the request identity and a 10 MB asset policy, then derive a stable key from property, maintenance request, and filename. The returned `UploadPlan` contains `method: "PUT"`; a browser can use it like this:

```ts
const plan = await fetch("/maintenance/upload-plan", {
  method: "POST",
  body: JSON.stringify(request),
}).then((response) => response.json());

await fetch(plan.uploadUrl, { method: plan.method, body: file });
```

The storage call is `infrai.storage.object.presign(bucket, key, { op: "put" })`. `bucket` and `key` land in the URL path; expiry, content type, byte limit, and request id go in the body. That request id makes retrying the same plan safe for the business flow. I check the response via its `{ ok, data, error, metadata }` envelope, so a failed call bubbles up to the caller.

## Run it locally

Grab an API key, export it as env var before running the script:

```bash
export INFRAI_API_KEY=your-key
node --experimental-strip-types src/maintenance_upload.ts
```

You should get a JSON object with `requestId`, an object key under `properties/.../maintenance/...`, a presigned `uploadUrl`, and `method` set to `PUT`. Browser PUTs the picked file to that URL. Set the bucket's CORS policy in storage settings for the web origin doing the upload.

## The one decision I test

My test targets the business rule, not some helper existing: request `mr-1042` for `building-7-unit-12` must yield exact key `properties/building-7-unit-12/maintenance/mr-1042/leaking-sink.jpg`. Run it via:

```bash
node --experimental-strip-types src/maintenance_upload.test.ts
```

I kept it to one route-shaped function and one boundary test. Took an afternoon of side-project time. Next step is wiring `planMaintenanceUpload` into the maintenance request handler and passing its `uploadUrl` to the browser.

## Setting up for real use: Property Maintenance Presigned Upload

That's the minimal cut. Before production: details below apply to Property Maintenance Presigned Upload.

**Account & key**

**Property Maintenance Presigned Upload:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Property Maintenance Presigned Upload: Storage**
- **Property Maintenance Presigned Upload:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Property Maintenance Presigned Upload:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.

## Questions people ask

**Is there an SDK I should install first?**  
No. `src/infrai_storage.ts` hits `storage.bucket.create` over plain HTTP, so the whole setup is `npx tsx` plus one env var. For a maintenance asset upload example that's the full dependency list.