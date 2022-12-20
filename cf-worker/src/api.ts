import type { IttyRequest, Env, Upload } from './types'
import mime from 'mime-types'

export const defaultCors = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': '*',
	'Access-Control-Allow-Headers': '*',
}

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
			...defaultCors,
		},
	})
}

async function getFileOrPassthrough(
	req: IttyRequest,
	env: Env,
	_ctx: ExecutionContext
) {
	const headers = (req as Request).headers
	const isGoogleDocs = ['Google.Sheets', 'GoogleDocs'].some((str) => headers.get('User-Agent')?.includes(str))
	if (!isGoogleDocs && headers.get('User-Agent')?.toLowerCase().startsWith('mozilla')) {
		return passthrough(req, env, _ctx)
	}
	return getFile(req, env, _ctx)
}

async function passthrough(req: IttyRequest, env: Env, ctx: ExecutionContext) {
	const res = await fetch(req as Request)
	const newRes = new Response(res.body, res)
	for(const [key, value] of Object.entries(defaultCors)) {
		newRes.headers.set(key, value)
	}
	return newRes
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
			let extension: string | null = null
			if (upload.name.includes('.')) {
				const parts = upload.name.split('.')
				const ext = parts[parts.length - 1]
				const blocked = env.BLOCKLIST.split(',')
				if (!blocked.includes(ext.toLowerCase())) {
					extension = ext;
				}
			}
			if (!extension) {
				extension = 'None'
			}
			ctx.waitUntil(env.DB.batch(stmts))
			ctx.waitUntil(fetch(env.WEBHOOK, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ size: upload.content_length, extension })
			}))
		}
	}
}

export default {
	getFile,
	getFileOrPassthrough,
	passthrough,
	recordToDB,
}
