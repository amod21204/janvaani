CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  text_original TEXT,
  text_improved TEXT,
  category VARCHAR(120),
  department VARCHAR(255),
  evidence_text TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  latitude FLOAT,
  longitude FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
