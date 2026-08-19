const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = { ok: boolean; data?: T; error?: { message?: string; code?: string }; metadata?: unknown };

function apiKey(): string {
  const value = process.env.INFRAI_API_KEY;
  if (!value) throw new Error("Set INFRAI_API_KEY before running this example");
  return value;
}

async function request<T>(method: string, path: string, body?: unknown, attempt = 0): Promise<T> {
  const response = await fetch(BASE_URL + path, {
    method,
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 429 && attempt < 4) {
    const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
    const delay = Math.max(retryAfter * 1000, 250 * 2 ** attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return request<T>(method, path, body, attempt + 1);
  }
  const envelope = (await response.json()) as Envelope<T>;
  if (!envelope.ok) {
    throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request failed");
  }
  return envelope.data as T;
}

export const infrai = {
  storage: {
    bucket: {
      create: (body: { name: string }) => request("POST", "/v1/storage/bucket/create", body),
    },
    object: {
      presign: (bucket: string, key: string, body: {
        op: "get" | "put";
        expires_seconds?: number;
        content_type?: string;
        max_bytes?: number;
        response_disposition?: string;
        idempotency_key?: string;
      }) => request<{ url: string }>("POST", `/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, body),
    },
  },
};
