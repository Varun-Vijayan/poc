-- Companies/Organizations table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- Used for namespace naming
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    subscription_tier VARCHAR(50) DEFAULT 'standard' -- basic, standard, enterprise
);

-- Namespaces table
CREATE TABLE namespaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., "production", "development" 
    temporal_namespace VARCHAR(255) UNIQUE NOT NULL, -- e.g., "company-a-production"
    description TEXT,
    retention_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL, -- admin, developer, viewer
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Namespace permissions (which users can access which namespaces)
CREATE TABLE namespace_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    namespace_id UUID REFERENCES namespaces(id) ON DELETE CASCADE,
    permission_level VARCHAR(50) NOT NULL, -- admin, read_write, read_only
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, namespace_id)
);

-- JWT tokens for API access
CREATE TABLE api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_name VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    permissions JSONB NOT NULL, -- JWT claims
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Worker registrations
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    namespace_id UUID REFERENCES namespaces(id) ON DELETE CASCADE,
    worker_name VARCHAR(255) NOT NULL,
    task_queue VARCHAR(255) NOT NULL,
    worker_type VARCHAR(100) NOT NULL, -- e.g., "validation", "processing", "notification"
    last_heartbeat TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(namespace_id, worker_name)
);

-- Indexes for performance
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_namespaces_company_id ON namespaces(company_id);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_namespace_permissions_user_id ON namespace_permissions(user_id);
CREATE INDEX idx_namespace_permissions_namespace_id ON namespace_permissions(namespace_id);
CREATE INDEX idx_api_tokens_user_id ON api_tokens(user_id);
CREATE INDEX idx_workers_namespace_id ON workers(namespace_id); 

