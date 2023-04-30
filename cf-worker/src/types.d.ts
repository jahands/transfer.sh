import { Request as IttyRequest } from 'itty-router'

export type IttyRequest = IttyRequest

export type MethodType =
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'DELETE'
	| 'PATCH'
	| 'HEAD'
	| 'OPTIONS'

export interface IRequest extends IttyRequest {
	method: MethodType // method is required to be on the interface
	url: string // url is required to be on the interface
	optional?: string
}

export interface IMethods extends IHTTPMethods {
	get: Route
	post: Route
	put: Route
	delete: Route
	patch: Route
	head: Route
	options: Route
}

export type Handler = (
	req: IttyRequest,
	env: Env,
	ctx: ExecutionContext
) => Promise<Response>

export interface Env {
	DB: D1Database
	BUCKET: R2Bucket
	BLOCKLIST: string
	QUEUE: Queue<QueueData>
}

export type ContentType = {
	content_type_id: number
	content_type: string
}

export type QueueData = {
	uploadName: string
	contentType: string
	contentLength: number
	createdOn: number
	ip: string
}
