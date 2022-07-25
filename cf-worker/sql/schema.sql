CREATE TABLE
  ips (
    ip_id INTEGER NOT NULL PRIMARY KEY,
    ip VARCHAR(0) NOT NULL,
    CONSTRAINT unq_ips_ip UNIQUE (ip)
  );

CREATE TABLE
  content_types (
    content_type_id INTEGER NOT NULL PRIMARY KEY,
    content_type VARCHAR(0) NOT NULL,
    CONSTRAINT unq_content_types_type UNIQUE (content_type)
  );

CREATE TABLE
  uploads (
    upload_id INTEGER NOT NULL PRIMARY KEY,
    name VARCHAR(0),
    content_length INTEGER,
    created_on INTEGER,
    content_type_id INTEGER NOT NULL,
    ip_id INTEGER NOT NULL,
    FOREIGN KEY (content_type_id) REFERENCES content_types(content_type_id) FOREIGN KEY (ip_id) REFERENCES ips(ip_id)
  );
