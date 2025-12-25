-- Drop old audit logs table and recreate with new schema
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Create audit logs table with new enhanced schema
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  
  -- Actor information
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  staff_name VARCHAR(255) NOT NULL,
  staff_role VARCHAR(100) NOT NULL,
  
  -- Action details
  action_type VARCHAR(100) NOT NULL, -- e.g., 'player_created', 'bonus_processed', 'seat_assigned'
  action_category VARCHAR(50) NOT NULL, -- e.g., 'player_management', 'financial', 'table_management'
  description TEXT NOT NULL,
  
  -- Target information (optional)
  target_type VARCHAR(50), -- e.g., 'player', 'staff', 'table'
  target_id UUID,
  target_name VARCHAR(255),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_club_id ON audit_logs(club_id);
CREATE INDEX idx_audit_logs_staff_id ON audit_logs(staff_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_action_category ON audit_logs(action_category);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_target_type ON audit_logs(target_type);
CREATE INDEX idx_audit_logs_search ON audit_logs USING gin(to_tsvector('english', staff_name || ' ' || COALESCE(target_name, '') || ' ' || description));

-- Add comment
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail of all staff activities in the club';

