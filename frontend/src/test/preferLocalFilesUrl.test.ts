import { afterEach, describe, expect, it, vi } from "vitest";
import { preferLocalFilesUrl, publicifyAssetUrl } from "../utils/questionRender";

describe("preferLocalFilesUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rewrites R2 pack assets to /api/local-files on localhost", () => {
    vi.stubGlobal("window", { location: { hostname: "127.0.0.1" } });
    expect(
      preferLocalFilesUrl(
        "https://pub-e97c6c0fb4ed4d289eea27512d33293d.r2.dev/2025/diagrams/NEET_2025_Q38_fig_0.webp?v=1"
      )
    ).toBe("/api/local-files/2025/diagrams/NEET_2025_Q38_fig_0.webp");
  });

  it("leaves R2 URLs alone on production hosts", () => {
    vi.stubGlobal("window", { location: { hostname: "www.techmuzzle.in" } });
    const url =
      "https://pub-e97c6c0fb4ed4d289eea27512d33293d.r2.dev/2025/diagrams/NEET_2025_Q38_fig_0.webp";
    expect(preferLocalFilesUrl(url)).toBe(url);
    expect(publicifyAssetUrl(url)).toBe(url);
  });

  it("keeps /api/local-files on localhost", () => {
    vi.stubGlobal("window", { location: { hostname: "127.0.0.1" } });
    const url = "/api/local-files/2025/diagrams/NEET_2025_Q23_fig_0.webp?v=1";
    expect(publicifyAssetUrl(url)).toBe("/api/local-files/2025/diagrams/NEET_2025_Q23_fig_0.webp");
  });

  it("rewrites /api/local-files to R2 on production hosts", () => {
    vi.stubGlobal("window", { location: { hostname: "www.techmuzzle.in" } });
    expect(
      publicifyAssetUrl("/api/local-files/2025/diagrams/NEET_2025_Q23_fig_0.webp?v=1783859273195")
    ).toBe(
      "https://pub-e97c6c0fb4ed4d289eea27512d33293d.r2.dev/2025/diagrams/NEET_2025_Q23_fig_0.webp"
    );
  });
});
