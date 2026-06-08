/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export — produces a fully client-side site under `out/`.
  // Reinforces the "nothing leaves your browser" promise: there is no
  // server runtime to deploy or to leak through.
  output: "export",
  images: { unoptimized: true },
  // Allow the app to be hosted under any subpath without code changes.
  trailingSlash: true,
};

export default nextConfig;
