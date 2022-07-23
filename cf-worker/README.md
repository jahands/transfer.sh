# cf-worker

## SQL command reference

### Get uploads and join content types
```sql
select u.upload_id,u.name,u.content_length,strftime('%Y-%m-%d %H:%M:%S', datetime(created_on/1000,'unixepoch')) created_on,ct.content_type from uploads u join content_types ct on u.content_type_id=ct.content_type_id;
```
