CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'general'
);

-- Insert default admin user (username: admin, password: admin123)
-- INSERT INTO users (username, password, role)
-- VALUES ('admin', '$2b$10$wqjQwQnQwQnQwQnQwQnQOeQnQwQnQwQnQwQnQwQnQwQnQwQnQy', 'admin')
-- ON CONFLICT (username) DO NOTHING;
INSERT INTO users (username, password, role)
VALUES ('admin', '$2b$10$3v3WCeFUZoz46VhyZawcGeMXtD/moFyYvp1VMxGSdnV1a/8RjKwwm', 'admin')
ON CONFLICT (username) DO NOTHING;
-- The above password hash is a placeholder. Replace with a real bcrypt hash in the backend or migration script.
