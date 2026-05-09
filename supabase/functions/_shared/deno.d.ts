// Minimal Deno + Web API type stubs for TypeScript LSP (non-Deno tooling).
// The real Deno runtime provides these globals; this file lets editors that
// lack the Deno language server extension resolve the types without errors.

declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
  };

  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
    options?: { port?: number; hostname?: string }
  ): void;
}

// Web platform globals available in Deno (and browsers) but absent from
// plain ES lib — needed so the TS LSP resolves them in Edge Function files.
declare function fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;

declare const console: {
  log(...data: unknown[]): void;
  error(...data: unknown[]): void;
  warn(...data: unknown[]): void;
  info(...data: unknown[]): void;
  debug(...data: unknown[]): void;
};

// Minimal stubs for Web Fetch API types used in Edge Functions
declare class Headers {
  constructor(init?: Record<string, string> | [string, string][]);
  get(name: string): string | null;
  set(name: string, value: string): void;
  append(name: string, value: string): void;
  has(name: string): boolean;
  delete(name: string): void;
}

declare class Request {
  constructor(input: string | URL, init?: RequestInit);
  readonly method: string;
  readonly url: string;
  readonly headers: Headers;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

declare class Response {
  constructor(body?: BodyInit | null, init?: ResponseInit);
  readonly ok: boolean;
  readonly status: number;
  readonly headers: Headers;
  json(): Promise<unknown>;
  text(): Promise<string>;
  static json(data: unknown, init?: ResponseInit): Response;
}

declare interface RequestInit {
  method?: string;
  headers?: Record<string, string> | Headers;
  body?: string | null;
}

declare interface ResponseInit {
  status?: number;
  statusText?: string;
  headers?: Record<string, string> | Headers;
}

declare type BodyInit = string | Blob | ArrayBuffer | URLSearchParams | FormData;

// Deno-style URL imports — minimal stubs so the TS LSP resolves them without
// requiring the Deno language server extension or root-level node_modules.
declare module 'https://esm.sh/@supabase/supabase-js@2.45.4' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function createClient(url: string, key: string, options?: Record<string, unknown>): any;
}
