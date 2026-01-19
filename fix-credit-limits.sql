-- Fix existing credit requests to set credit_limit = amount where credit_limit is 0
UPDATE credit_requests 
SET credit_limit = amount 
WHERE credit_limit = 0 OR credit_limit IS NULL;

-- Show updated records
SELECT id, player_name, amount, credit_limit, status, created_at 
FROM credit_requests 
ORDER BY created_at DESC 
LIMIT 10;
