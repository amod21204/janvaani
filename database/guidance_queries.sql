CREATE TABLE IF NOT EXISTS guidance_queries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  query_text TEXT NOT NULL,
  documents_required JSON NOT NULL,
  steps JSON NOT NULL,
  where_to_go TEXT NOT NULL,
  tips JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
