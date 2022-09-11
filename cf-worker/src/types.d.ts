import { Request as IttyRequest } from 'itty-router'
import type { Database } from '@cloudflare/d1'

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
	DB: Database
	BUCKET: R2Bucket
	WEBHOOK: string
}

export type Upload = {
	upload_id: number
	name: string
	content_type_id: number
	content_length: number
	created_on: number
}

export type ContentType = {
	content_type_id: number
	content_type: string
}
