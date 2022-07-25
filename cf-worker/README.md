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

-- Latest 15 uploads:
select * from (select u.upload_id,u.name,printf("%,d",(content_length/1024)) as size_kb,strftime('%Y-%m-%d %H:%M:%S', datetime(created_on/1000,'unixepoch')) created_on,ct.content_type,ips.ip from uploads u join content_types ct on u.content_type_id=ct.content_type_id join ips on u.ip_id=ips.ip_id order by created_on desc limit 15) order by created_on;

-- Like above but show size in bytes:
select * from (select u.upload_id,u.name,printf("%,d",content_length) as size,strftime('%Y-%m-%d %H:%M:%S', datetime(created_on/1000,'unixepoch')) created_on,ct.content_type,ips.ip from uploads u join content_types ct on u.content_type_id=ct.content_type_id join ips on u.ip_id=ips.ip_id order by created_on desc limit 15) order by created_on;

-- Uploads per IP:
select ips.ip, count(ips.ip) as upload_count from uploads u join ips on ips.ip_id=u.ip_id group by ips.ip order by upload_count;

-- Uploads per content type:
select ct.content_type, count(ct.content_type) as upload_count from uploads u join content_types ct on ct.content_type_id=u.content_type_id group by ct.content_type order by upload_count;

--Size of uploads per content type:
select content_type,printf("%,d",total_size) as total_size from (select ct.content_type, sum(u.content_length) as total_size from uploads u join content_types ct on ct.content_type_id=u.content_type_id group by ct.content_type order by total_size);
```
