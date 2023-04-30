import { Router } from 'itty-router'

import type { IRequest, IMethods } from './types'
import api from './api'
import { handleQueue } from './queue'

const router = Router<IRequest, IMethods>()

router.get('/get/:id/:file', api.getFile)
router.get('/:id/:file', api.getFileOrPassthrough)
// I have a script that uploads directly to R2 via rclone, this endpoint
// simply records it to the DB
router.put(
	'/record-upload/:file',
	api.recordToDB,
	() => new Response('', { status: 204 })
)
router.put('*', api.recordToDB, api.passthrough)
router.all('*', api.passthrough)

export default {
	fetch: router.handle,
	queue: handleQueue
}
