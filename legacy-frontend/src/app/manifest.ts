import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Legacy — crypto inheritance on Monad",
    short_name: "Legacy",
    description:
      "Passkey-native, zero-custody crypto inheritance. Your assets never leave your wallet; you prove you're alive with a passkey verified on-chain.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0E11",
    theme_color: "#0B0E11",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
