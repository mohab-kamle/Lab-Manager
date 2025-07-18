-- Migration: Unify status ENUM in medical_report_has_test and medical_report_has_culture
-- Date: 2024-06-09

ALTER TABLE medical_report_has_test 
  MODIFY status ENUM('pending','done','low','critical low','normal','high','critical high','abnormal') DEFAULT 'pending';

ALTER TABLE medical_report_has_culture 
  MODIFY status ENUM('pending','done','low','critical low','normal','high','critical high','abnormal') DEFAULT 'pending'; 