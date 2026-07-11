let handler;

export default async function(req, res) {
  if (!handler) {
    handler = (await import("../dist/vercel.mjs")).default;
  }
  return handler(req, res);
}
