CREATE TABLE IF NOT EXISTS survey_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  year_level VARCHAR(20) NOT NULL CHECK (year_level IN ('1er año', '2do año', '3er año', '4to año', '5to año')),
  access_link VARCHAR(255) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expiration_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES system_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS survey_group_items (
  id SERIAL PRIMARY KEY,
  group_id UUID REFERENCES survey_groups(id) ON DELETE CASCADE,
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  UNIQUE(group_id, survey_id)
);
