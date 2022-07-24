# cf-worker

## SQL command reference

### Get uploads and join content types
```sql
SELECT
  u.upload_id,
  u.name,
  u.content_length,
  strftime('%Y-%m-%d %H:%M:%S', datetime(created_on/1000,'unixepoch')) created_on,
  ct.content_type,
  ips.ip
FROM uploads u
JOIN content_types ct ON u.content_type_id = ct.content_type_id
JOIN ips ON u.ip_id = ips.ip_id;

-- COMPACT:
select u.upload_id,u.name,u.content_length,strftime('%Y-%m-%d %H:%M:%S', datetime(created_on/1000,'unixepoch')) created_on,ct.content_type,ips.ip from uploads u join content_types ct on u.content_type_id=ct.content_type_id join ips on u.ip_id=ips.ip_id;

-- Latest 10 uploads:
select * from (select u.upload_id,u.name,u.content_length,printf("%,d",(content_length/1024)) as size_kb,strftime('%Y-%m-%d %H:%M:%S', datetime(created_on/1000,'unixepoch')) created_on,ct.content_type,ips.ip from uploads u join content_types ct on u.content_type_id=ct.content_type_id join ips on u.ip_id=ips.ip_id order by created_on desc limit 10) order by created_on;
```
