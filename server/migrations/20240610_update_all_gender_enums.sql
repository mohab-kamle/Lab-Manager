-- Update all gender columns to accept 'Male' and 'Female' instead of 'f' and 'm'
-- This migration updates all tables that have gender columns

-- Update patient table
UPDATE patient SET gender = 'Male' WHERE gender = 'm';
UPDATE patient SET gender = 'Female' WHERE gender = 'f';
ALTER TABLE patient MODIFY COLUMN gender ENUM('Male', 'Female') NULL;

-- Update doctor table
UPDATE doctor SET gender = 'Male' WHERE gender = 'm';
UPDATE doctor SET gender = 'Female' WHERE gender = 'f';
ALTER TABLE doctor MODIFY COLUMN gender ENUM('Male', 'Female') NULL;

-- Update employee table
UPDATE employee SET gender = 'Male' WHERE gender = 'm';
UPDATE employee SET gender = 'Female' WHERE gender = 'f';
ALTER TABLE employee MODIFY COLUMN gender ENUM('Male', 'Female') NULL;

-- Update test_component table
UPDATE test_component SET gender = 'Male' WHERE gender = 'm';
UPDATE test_component SET gender = 'Female' WHERE gender = 'f';
ALTER TABLE test_component MODIFY COLUMN gender ENUM('Male', 'Female') NULL; 