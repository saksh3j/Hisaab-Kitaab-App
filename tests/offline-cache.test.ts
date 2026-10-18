import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const worker = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");

describe("offline service worker", () => {
  it("uses a versioned cache and retains the prior deployment cache", () => {
    expect(worker).toContain('const CACHE_NAME = "hisaab-kitaab-v2"');
    expect(worker).toContain('const PREVIOUS_CACHE_NAME = "hisaab-kitaab-v1"');
  });

  it("serves the cached shell before attempting a network refresh", () => {
    expect(worker).toContain('const shell = await cache.match("/")');
    expect(worker).toContain("event.waitUntil(networkResponse.catch(() => undefined))");
    expect(worker).toContain('cache.match("/offline.html")');
  });
});
