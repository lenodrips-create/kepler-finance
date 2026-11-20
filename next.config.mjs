// Static export so the site can be served by GitHub Pages.
// PAGES_BASE_PATH is set by the deploy workflow (e.g. "/kepler-finance"); empty locally.
const basePath = process.env.PAGES_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
