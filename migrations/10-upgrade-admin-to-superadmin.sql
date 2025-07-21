-- Migration to upgrade existing admin users to superadmin
-- This ensures that existing admin users continue to have full access including cost_price functionality

UPDATE users 
SET role = 'superadmin' 
WHERE role = 'admin' AND username != 'testadmin';

-- Note: We exclude 'testadmin' as it was created for testing purposes
-- You can remove this exclusion if you want all admins to be superadmins
