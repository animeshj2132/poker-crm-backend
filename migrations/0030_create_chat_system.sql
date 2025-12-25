-- Chat System Migration

-- Chat Sessions Table (for both staff and player chats)
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    
    -- Session type
    session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('staff', 'player')),
    
    -- For staff chat: staff-to-staff
    staff_initiator_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    staff_recipient_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    
    -- For player chat: player-to-staff
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    
    -- Session metadata
    subject VARCHAR(500),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    
    -- Timestamps
    last_message_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP,
    
    -- Indexes
    CONSTRAINT valid_staff_chat CHECK (
        (session_type = 'staff' AND staff_initiator_id IS NOT NULL AND staff_recipient_id IS NOT NULL) OR
        (session_type = 'player' AND player_id IS NOT NULL)
    )
);

CREATE INDEX idx_chat_sessions_club ON chat_sessions(club_id);
CREATE INDEX idx_chat_sessions_type ON chat_sessions(session_type);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_player ON chat_sessions(player_id);
CREATE INDEX idx_chat_sessions_staff_initiator ON chat_sessions(staff_initiator_id);
CREATE INDEX idx_chat_sessions_staff_recipient ON chat_sessions(staff_recipient_id);
CREATE INDEX idx_chat_sessions_assigned_staff ON chat_sessions(assigned_staff_id);
CREATE INDEX idx_chat_sessions_last_message ON chat_sessions(last_message_at DESC);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    
    -- Sender info (either staff or player)
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('staff', 'player')),
    sender_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    sender_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    sender_name VARCHAR(200) NOT NULL,
    
    -- Message content
    message TEXT NOT NULL,
    
    -- Message metadata
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_sender CHECK (
        (sender_type = 'staff' AND sender_staff_id IS NOT NULL) OR
        (sender_type = 'player' AND sender_player_id IS NOT NULL)
    )
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_sender_staff ON chat_messages(sender_staff_id);
CREATE INDEX idx_chat_messages_sender_player ON chat_messages(sender_player_id);
CREATE INDEX idx_chat_messages_unread ON chat_messages(is_read) WHERE is_read = FALSE;

-- Function to update last_message_at
CREATE OR REPLACE FUNCTION update_chat_session_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_sessions 
    SET last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_message_at when a new message is added
DROP TRIGGER IF EXISTS trigger_update_chat_session_last_message ON chat_messages;
CREATE TRIGGER trigger_update_chat_session_last_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_session_last_message();

-- Comments
COMMENT ON TABLE chat_sessions IS 'Stores chat sessions between staff members or between players and staff';
COMMENT ON TABLE chat_messages IS 'Stores individual messages in chat sessions';
COMMENT ON COLUMN chat_sessions.session_type IS 'Type of chat: staff (staff-to-staff) or player (player-to-staff support)';
COMMENT ON COLUMN chat_sessions.status IS 'Status: open, in_progress, resolved, closed';

