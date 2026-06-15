/**
 * Client-side Supabase client for browser use.
 * Uses @supabase/ssr createBrowserClient for proper cookie-based session handling.
 * Lazily initialized to avoid build-time crashes when env vars aren't set (e.g. CI).
 * Falls back to no-op when env vars are missing so the app degrades gracefully.
 */
import { createBrowserClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;

function isValidUrl(url: unknown): url is string {
  return typeof url === "string" && url.startsWith("https://");
}

function getClient() {
  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!isValidUrl(supabaseUrl) || !supabaseAnonKey) {
    console.warn(
      "Supabase not configured — running in offline mode. " +
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
    // Return no-op stub so the app doesn't crash
    _client = noopClient();
    return _client;
  }

  _client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return _client;
}

/**
 * Proxy defers createBrowserClient() until first property access.
 * This avoids build failures in CI when env vars aren't available
 * during static page generation (e.g. /_not-found prerendering).
 */
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_target, prop) {
    return Reflect.get(getClient(), prop, getClient());
  },
});

/** Returns a stub that silently no-ops all Supabase calls when unconfigured. */
function noopClient() {
  const noopFn = () => noopFn;
  noopFn.toString = () => "noop";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stub: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        // Emulate auth methods that return promises
        if (prop === "auth") return authStub();
        if (prop === "storage") return storageStub();
        if (prop === "from") return () => stub;
        if (prop === "rpc") return () => Promise.resolve({ data: null, error: null });
        return () => Promise.resolve({ data: null, error: null });
      },
    }
  );
  return stub as unknown as ReturnType<typeof createBrowserClient>;
}

function authStub() {
  return {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: () => Promise.resolve({ data: {}, error: new Error("Supabase not configured") }),
    signUp: () => Promise.resolve({ data: {}, error: new Error("Supabase not configured") }),
    signOut: () => Promise.resolve(),
    resetPasswordForEmail: () => Promise.resolve({ data: {}, error: new Error("Supabase not configured") }),
    updateUser: () => Promise.resolve({ data: {}, error: new Error("Supabase not configured") }),
    exchangeCodeForSession: () => Promise.resolve({ data: {}, error: new Error("Supabase not configured") }),
  };
}

function storageStub() {
  return { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }) };
}
