-- Update patient gender column to accept 'Male' and 'Female'
-- This migration changes the ENUM values from 'f','m' to 'Male','Female'

-- First, update existing data to use new values
UPDATE patient SET gender = 'Male' WHERE gender = 'm';
UPDATE patient SET gender = 'Female' WHERE gender = 'f';

-- Then modify the column to accept new ENUM values
ALTER TABLE patient MODIFY COLUMN gender ENUM('Male', 'Female') NULL; 