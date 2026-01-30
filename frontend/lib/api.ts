const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;
type ApiOptions = RequestInit & { json?: any };

async function safeJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

// 🔁 gọi refresh bằng refresh_token cookie
async function tryRefresh(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/users/refresh/`, {
    method: "POST",
    credentials: "include",
  });
  return res.ok;
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { json, headers, ...rest } = options;

  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      },
      credentials: "include",
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });

  let res = await doFetch();

  // access hết hạn → refresh → retry 1 lần
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch();
    }
  }

  const data: any = await safeJson(res);

  if (!res.ok) {
    const msg = data?.message || data?.detail || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}
