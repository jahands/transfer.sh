import pRetry from 'p-retry'
import type { IttyRequest, Env } from './types'
import mime from 'mime-types'

export const defaultCors = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': '*',
	'Access-Control-Allow-Headers': '*',
}

function getBucket(req: IttyRequest, env: Env): R2Bucket {
	const url = new URL(req.url)
	if (['transfer.geostyx.com', 'upload.geostyx.com'].includes(url.hostname)) {
		return env.BUCKET_GEO
	} else if (['archive.uuid.rocks'].includes(url.hostname)) {
		return env.BUCKET_ARCHIVE
	} else if (
		['transfer.uuid.rocks', 'transfer2.uuid.rocks'].includes(url.hostname)
	) {
		return env.BUCKET
	}
	throw new Error('Unknown bucket')
}

async function getFile(req: IttyRequest, env: Env, _ctx: ExecutionContext) {
	if (!req.params || !req.params.id || !req.params.file) {
		return Response.json({ error: 'Missing id or file' }, { status: 400 })
	}
	const { id, file } = req.params
	const fileDecoded = decodeURIComponent(file)
	const bucket = getBucket(req, env)
	const res = await bucket.get(`${id}/${fileDecoded}`)
	if (!res) {
		return Response.json({ error: 'File not found' }, { status: 404 })
	}
	const contentType =
		res.httpMetadata?.contentType ||
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
	const isGoogleDocs = ['Google.Sheets', 'GoogleDocs'].some((str) =>
		headers.get('User-Agent')?.includes(str)
	)
	if (
		!isGoogleDocs &&
		headers.get('User-Agent')?.toLowerCase().startsWith('mozilla')
	) {
		return passthrough(req, env, _ctx)
	}
	return getFile(req, env, _ctx)
}

async function passthrough(req: IttyRequest, env: Env, ctx: ExecutionContext) {
	const res = await fetch(req as Request)
	const newRes = new Response(res.body, res)
	for (const [key, value] of Object.entries(defaultCors)) {
		newRes.headers.set(key, value)
	}
	return newRes
}

async function putFile(req: IttyRequest, env: Env, ctx: ExecutionContext) {
	const url = new URL(req.url)
	if (url.hostname === 'transfer.geostyx.com') {
		return new Response('forbidden', {
			status: 403,
			statusText: 'Forbidden',
		})
	}

	const res = await passthrough(req, env, ctx)
	if (res.ok) {
		// only record successful uploads to db
		ctx.waitUntil(recordToDB(req, env, ctx))
	}
	return res
}

// Middleware that records the upload to the DB via Queues
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
		const contentLength = parseInt(
			req.headers.get('Content-Length') ||
				// X-Content-Length is for when we just want to record to DB, not actually upload bytes
				req.headers.get('X-Content-Length') ||
				'-1'
		)
		const uploadName = fileDecoded
		const createdOn = Date.now()

		// Record the upload to DB via Queues
		if (uploadName && uploadName.length > 0 && contentLength > 0) {
			await pRetry(
				async () =>
					env.QUEUE.send({
						uploadName,
						contentType,
						contentLength,
						createdOn,
						ip,
					}),
				{
					retries: 5,
					minTimeout: 1000,
					randomize: true,
					onFailedAttempt: async (e) => {
						console.log('Failed to record to DB, retrying...', e.message)
					},
				}
			)
		}
	}
}

export default {
	getFile,
	getFileOrPassthrough,
	passthrough,
	recordToDB,
	putFile,
}
