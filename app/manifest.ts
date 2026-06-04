import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ProEstimate",
    short_name: "ProEstimate",
    description: "AI-powered estimating and proposal platform for contractors",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["business", "productivity"],
    shortcuts: [
      {
        name: "New Estimate",
        short_name: "New Estimate",
        description: "Create a new estimate",
        url: "/estimates/new",
      },
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "View dashboard",
        url: "/dashboard",
      },
    ],
  };
}
