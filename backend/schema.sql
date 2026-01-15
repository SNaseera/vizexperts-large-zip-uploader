CREATE TABLE uploads (
  id VARCHAR(64) PRIMARY KEY,
  filename VARCHAR(255),
  total_size BIGINT,
  total_chunks INT,
  status ENUM('UPLOADING','PROCESSING','COMPLETED','FAILED'),
  final_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chunks (
  upload_id VARCHAR(64),
  chunk_index INT,
  status ENUM('PENDING','RECEIVED'),
  received_at TIMESTAMP,
  PRIMARY KEY (upload_id, chunk_index),
  INDEX(upload_id)
);
