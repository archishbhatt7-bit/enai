let handler;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function(req, res) {
  if (!handler) {
    handler = (await import("../dist/vercel.mjs")).default;
  }
  return handler(req, res);
}
