-- Add active status to users table for deactivation functionality
-- This allows admins to deactivate users who have activities instead of deleting them

-- Add active column to users table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'active'
    ) THEN
        ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT true;
        
        -- Update existing users to be active
        UPDATE users SET active = true WHERE active IS NULL;
        
        -- Add not null constraint
        ALTER TABLE users ALTER COLUMN active SET NOT NULL;
    END IF;
END $$;

-- Create index for active status
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);

-- Create index for active usernames (for login performance)
CREATE INDEX IF NOT EXISTS idx_users_username_active ON users(username, active);

SELECT 'User active status column added successfully!' as status;
