-- Create comment tables for tests, test groups, and medical reports with image support
-- This migration adds comprehensive commenting functionality with image uploads

-- Table for test-specific comments
CREATE TABLE IF NOT EXISTS `test_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `medical_report_id` int NOT NULL,
  `test_id` int NOT NULL,
  `comment` TEXT NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_test_comments_medical_report_idx` (`medical_report_id`),
  KEY `fk_test_comments_test_idx` (`test_id`),
  CONSTRAINT `fk_test_comments_medical_report` FOREIGN KEY (`medical_report_id`) REFERENCES `medical_report` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_test_comments_test` FOREIGN KEY (`test_id`) REFERENCES `test` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table for test group-specific comments
CREATE TABLE IF NOT EXISTS `test_group_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `medical_report_id` int NOT NULL,
  `test_group_id` int NOT NULL,
  `comment` TEXT NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_test_group_comments_medical_report_idx` (`medical_report_id`),
  KEY `fk_test_group_comments_test_group_idx` (`test_group_id`),
  CONSTRAINT `fk_test_group_comments_medical_report` FOREIGN KEY (`medical_report_id`) REFERENCES `medical_report` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_test_group_comments_test_group` FOREIGN KEY (`test_group_id`) REFERENCES `test_group` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table for storing comment images (supports up to 3 images per comment)
CREATE TABLE IF NOT EXISTS `comment_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comment_type` enum('test','test_group','medical_report') NOT NULL,
  `comment_id` int NOT NULL, -- References test_comments.id, test_group_comments.id, or medical_report.id
  `image_path` varchar(500) NOT NULL,
  `image_name` varchar(255) NOT NULL,
  `image_size` int DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `upload_order` tinyint NOT NULL DEFAULT 1, -- 1, 2, or 3 for ordering
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comment_images_type_id` (`comment_type`, `comment_id`),
  KEY `idx_comment_images_upload_order` (`upload_order`),
  CONSTRAINT `chk_upload_order` CHECK (`upload_order` BETWEEN 1 AND 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_test_comments_medical_report_test 
ON test_comments(medical_report_id, test_id);

CREATE INDEX IF NOT EXISTS idx_test_group_comments_medical_report_group 
ON test_group_comments(medical_report_id, test_group_id);

CREATE INDEX IF NOT EXISTS idx_comment_images_type_id_order 
ON comment_images(comment_type, comment_id, upload_order);

-- Add constraint to limit 3 images per comment
ALTER TABLE comment_images 
ADD CONSTRAINT `chk_max_images_per_comment` 
CHECK (
  (SELECT COUNT(*) FROM comment_images ci2 
   WHERE ci2.comment_type = comment_type 
   AND ci2.comment_id = comment_id) <= 3
);

SELECT 'Comment tables with image support created successfully' AS status;