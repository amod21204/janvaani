CREATE TABLE IF NOT EXISTS translation_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  original_text TEXT NOT NULL,
  source_language VARCHAR(10) NOT NULL,
  translated_text TEXT NOT NULL,
  formatted_text LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
