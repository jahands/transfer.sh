import type { IttyRequest, Env, Upload } from './types'
import mime from 'mime-types'

async function getFile(req: IttyRequest, env: Env, _ctx: ExecutionContext) {
	if (!req.params || !req.params.id || !req.params.file) {
		return Response.json({ error: 'Missing id or file' }, { status: 400 })
	}
	const { id, file } = req.params
	const fileDecoded = decodeURIComponent(file)
	const res = await env.BUCKET.get(`${id}/${fileDecoded}`)
	if (!res) {
		return Response.json({ error: 'File not found' }, { status: 404 })
	}
	const contentType =
		res.httpMetadata.contentType ||
		mime.lookup(fileDecoded) ||
		'application/octet-stream'

	return new Response(res.body, {
		status: 200,
		headers: {
			'Content-Type': contentType,
			'Content-Disposition': `attachment; filename="${fileDecoded}"`,
			'Content-Length': `${res.size}`,
		},
	})
}

async function getFileOrPassthrough(
	req: IttyRequest,
	env: Env,
	_ctx: ExecutionContext
) {
	const headers = (req as Request).headers
	if (headers.get('User-Agent')?.toLowerCase().startsWith('mozilla')) {
		return passthrough(req, env, _ctx)
	}
	return getFile(req, env, _ctx)
}

async function passthrough(req: IttyRequest, env: Env, ctx: ExecutionContext) {
	return fetch(req as Request)
}

// Middleware that records the upload to the DB
async function recordToDB(
	req: IttyRequest,
	env: Env,
	ctx: ExecutionContext
): Promise<void> {
	if (req.method === 'PUT' && req instanceof Request) {
		const url = new URL(req.url)
		const file = url.pathname.split('/').pop() || ''
		const fileDecoded = decodeURIComponent(file)
		const contentType =
			req.headers.get('Content-Type') ||
			mime.lookup(fileDecoded) ||
			'application/octet-stream'
		const ip = req.headers.get('CF-Connecting-IP') || ''
		// Record the upload to DB
		const upload: Upload = {
			upload_id: -1, // no-op, DB will assign an ID
			name: fileDecoded,
			content_type_id: -1, // no-op, DB will assign a content type ID
			// X-Content-Length is for when we just want to record to DB, not actually upload bytes
			content_length: parseInt(
				req.headers.get('Content-Length') ||
					req.headers.get('X-Content-Length') ||
					'-1'
			),
			created_on: Date.now(),
		}
		if (upload.name && upload.name.length > 0 && upload.content_length > 0) {
			const stmts = [
				env.DB.prepare(`INSERT OR IGNORE INTO ips (ip) VALUES (?)`).bind(ip),
				env.DB.prepare(
					`INSERT OR IGNORE INTO content_types (content_type) VALUES (?)`
				).bind(contentType),
				env.DB.prepare(
					`INSERT INTO uploads (name, content_type_id, content_length, created_on, ip_id)
						VALUES (
							?,
							(SELECT content_type_id FROM content_types WHERE content_type=? LIMIT 1),
							?,
							?,
							(SELECT ip_id FROM ips WHERE ip=? LIMIT 1)
						)`
				).bind(
					upload.name,
					contentType,
					upload.content_length,
					upload.created_on,
					ip
				),
			]
			ctx.waitUntil(env.DB.batch(stmts))
		}
	}
}

export default {
	getFile,
	getFileOrPassthrough,
	passthrough,
	recordToDB,
}
