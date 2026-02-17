-- Migration: Add base salary and salary type to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS base_salary DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary_type VARCHAR(20) DEFAULT 'Monthly';
