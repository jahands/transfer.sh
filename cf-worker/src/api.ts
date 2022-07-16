import { IttyRequest, Env } from "./types";
import mime from "mime-types";

async function getFile(req: IttyRequest, env: Env, _ctx: ExecutionContext) {
  if (!req.params || !req.params.id || !req.params.file) {
    return Response.json({ error: "Missing id or file" }, { status: 400 });
  }
  const { id, file } = req.params;
  const fileDecoded = decodeURIComponent(file);
  const res = await env.BUCKET.get(`${id}/${fileDecoded}`);
  if (!res) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }
  const contentType =
    res.httpMetadata.contentType ||
    mime.lookup(fileDecoded) ||
    "application/octet-stream";

  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileDecoded}"`,
      "Content-Length": `${res.size}`,
    },
  });
}

async function getFileOrPassthrough(
  req: IttyRequest,
  env: Env,
  _ctx: ExecutionContext
) {
  const headers = (req as Request).headers;
  if (headers.get("User-Agent")?.toLowerCase().startsWith("mozilla")) {
    return passthrough(req, env, _ctx);
  }
  return getFile(req, env, _ctx);
}

async function passthrough(
  req: IttyRequest,
  _env: Env,
  _ctx: ExecutionContext
) {
  return fetch(req as Request);
}

export default {
  getFile,
  getFileOrPassthrough,
  passthrough,
};
