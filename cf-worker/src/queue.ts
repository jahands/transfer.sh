import { QueueData, Env } from "./types"

export async function handleQueue(batch: MessageBatch<QueueData>, env: Env, ctx: ExecutionContext) {
  console.log(`Got batch of ${batch.messages.length} messages`)
  console.log(`Started  at ${new Date().toISOString()}`)

  // First we need to insert the IP and content type into their respective tables
  const ips = new Set(batch.messages.map((msg) => msg.body.ip))
  const contentTypes = new Set(batch.messages.map((msg) => msg.body.contentType))
  const stmts = [
    Array.from(ips).map((ip) => env.DB.prepare(`INSERT OR IGNORE INTO ips (ip) VALUES (?)`).bind(ip)),
    Array.from(contentTypes).map((contentType) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO content_types (content_type) VALUES (?)`
      ).bind(contentType)
    ),
  ].flat(1)
  const res = await env.DB.batch(stmts)
  if (res.some((r) => !r.success)) {
    console.log('Failed to insert into ips or content_types')
    batch.retryAll()
    return
  }

  // Now we can insert into uploads
  const uploadStmts = batch.messages.map((msg) =>
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
      msg.body.uploadName,
      msg.body.contentType,
      msg.body.contentLength,
      msg.body.createdOn,
      msg.body.ip
    ))
  const uploadRes = await env.DB.batch(uploadStmts)


  for (const [idx, res] of uploadRes.entries()) {
    if (res.success) {
      batch.messages[idx].ack()
    } else {
      batch.messages[idx].retry()
    }
  }
  console.log(`Finished at ${new Date().toISOString()}`)
}
