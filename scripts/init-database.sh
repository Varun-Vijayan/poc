#!/bin/bash

echo "🗄️ Initializing Multi-Tenant Database Schema..."

# Connect to PostgreSQL and create schema
docker exec -i temporal-postgresql psql -U temporal -d temporal < database/schema.sql

echo "✅ Database schema created successfully!"

# Insert sample data
docker exec -i temporal-postgresql psql -U temporal -d temporal << 'EOF'
-- Insert platform admin company
INSERT INTO companies (id, name, slug) VALUES 
('00000000-0000-0000-0000-000000000000', 'XFlow Platform', 'platform');

-- Insert platform admin user
INSERT INTO users (company_id, email, password_hash, first_name, last_name, role) VALUES 
('00000000-0000-0000-0000-000000000000', 'admin@xflow.com', '$2b$10$example_hash', 'Platform', 'Admin', 'platform_admin');

EOF

echo "✅ Sample data inserted successfully!"
echo "🔑 Platform admin login: admin@xflow.com / platform123" 