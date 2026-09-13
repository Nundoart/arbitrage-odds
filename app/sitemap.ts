import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://arbitrage-odds-ivory.vercel.app/",
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
  ];
}