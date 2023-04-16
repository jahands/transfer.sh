-- npx d1-console@latest
-- use transfer-sh
-- <run queries>
SELECT
  u.upload_id,
  u.name,
  u.content_length,
  strftime(
    "%Y-%m-%d %H:%M:%S",
    datetime(created_on / 1000, "unixepoch")
  ) created_on,
  ct.content_type,
  ips.ip
FROM
  uploads u
  JOIN content_types ct ON u.content_type_id = ct.content_type_id
  JOIN ips ON u.ip_id = ips.ip_id;

-- COMPACT:
SELECT
  u.upload_id,
  u.name,
  u.content_length,
  strftime(
    "%Y-%m-%d %H:%M:%S",
    datetime(created_on / 1000, "unixepoch")
  ) created_on,
  ct.content_type,
  ips.ip
FROM
  uploads u
  JOIN content_types ct ON u.content_type_id = ct.content_type_id
  JOIN ips ON u.ip_id = ips.ip_id;

-- Latest 15 uploads:
SELECT
  *
FROM
  (
    SELECT
      u.upload_id,
      u.name,
      printf("%,d", content_length) as size,
      strftime(
        "%Y-%m-%d %H:%M:%S",
        datetime(created_on / 1000, "unixepoch")
      ) created_on,
      ct.content_type,
      ips.ip
    FROM
      uploads u
      JOIN content_types ct ON u.content_type_id = ct.content_type_id
      JOIN ips ON u.ip_id = ips.ip_id
    ORDER BY
      created_on DESC
    LIMIT
      15
  )
ORDER BY
  created_on;

--Size and count of uploads per IP
SELECT
  ip_address,
  printf("%,d", total_size) as total_size,
  upload_count,
  strftime(
    "%Y-%m-%d %H:%M:%S",
    datetime(upload_first / 1000, "unixepoch")
  ) upload_first,
  strftime(
    "%Y-%m-%d %H:%M:%S",
    datetime(upload_last / 1000, "unixepoch")
  ) upload_last
FROM
  (
    SELECT
      ips.ip                as ip_address,
      sum(u.content_length) as total_size,
      count(*)              as upload_count,
      min(created_on)       as upload_first,
      max(created_on)       as upload_last
    FROM
      uploads u
      JOIN content_types ct ON ct.content_type_id = u.content_type_id
      JOIN ips ON u.ip_id = ips.ip_id
    GROUP BY
      ips.ip
    ORDER BY
      total_size
  );

-- Uploads per content type:
SELECT
  ct.content_type,
  count(ct.content_type) as upload_count
FROM
  uploads u
  JOIN content_types ct ON ct.content_type_id = u.content_type_id
GROUP BY
  ct.content_type
ORDER BY
  upload_count;

--Size and count of uploads per content type:
SELECT
  content_type,
  printf("%,d", total_size) as total_size,
  upload_count
FROM
  (
    SELECT
      ct.content_type,
      sum(u.content_length)  as total_size,
      count(ct.content_type) as upload_count
    FROM
      uploads u
      JOIN content_types ct ON ct.content_type_id = u.content_type_id
    GROUP BY
      ct.content_type
    ORDER BY
      total_size
  );
