import { QueueData, Env } from "./types"

export async function handleQueue(batch: MessageBatch<QueueData>, env: Env, ctx: ExecutionContext) {
  console.log(`Got batch of ${batch.messages.length} messages`)
  console.log(`Started  at ${new Date().toISOString()}`)
  for (const msg of batch.messages) {
    const stmts = [
      env.DB.prepare(`INSERT OR IGNORE INTO ips (ip) VALUES (?)`).bind(msg.body.ip),
      env.DB.prepare(
        `INSERT OR IGNORE INTO content_types (content_type) VALUES (?)`
      ).bind(msg.body.contentType),
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
      ),
    ]
    const res = await env.DB.batch(stmts)
    // console.log(new Date().toISOString() + ' - ' + msg.body.uploadName)
    // If we successfully inserted into uploads, we're good
    if (res.length === 3 && res[2].success) {
      msg.ack()
    } else {
      msg.retry()
    }
  }
  console.log(`Finished at ${new Date().toISOString()}`)
}
