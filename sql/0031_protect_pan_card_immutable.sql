-- Create function to protect PAN card from being changed after initial submission
-- PAN card is a legal document and MUST be immutable once set
CREATE OR REPLACE FUNCTION protect_pan_card_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- If PAN card was already set (not null) and is being changed to a different value
    IF OLD.pan_card IS NOT NULL AND NEW.pan_card IS DISTINCT FROM OLD.pan_card THEN
        RAISE EXCEPTION 'PAN Card cannot be changed after initial submission. This is a legal document and must remain immutable. Please contact support if there was an error during registration.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on players table to enforce PAN card immutability
DROP TRIGGER IF EXISTS trg_protect_pan_card_immutability ON players;
CREATE TRIGGER trg_protect_pan_card_immutability
    BEFORE UPDATE ON players
    FOR EACH ROW
    WHEN (OLD.pan_card IS DISTINCT FROM NEW.pan_card)
    EXECUTE FUNCTION protect_pan_card_immutability();

-- Add comment
COMMENT ON FUNCTION protect_pan_card_immutability() IS 'Protects PAN card from being modified after initial submission - it is a legal document';
