-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 12, 2026 at 03:30 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `smart_campus_erp`
--

-- --------------------------------------------------------

--
-- Table structure for table `assignments`
--

CREATE TABLE `assignments` (
  `id` varchar(191) NOT NULL,
  `teacherId` varchar(191) NOT NULL,
  `subjectId` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) NOT NULL,
  `deadline` datetime(3) NOT NULL,
  `filePath` varchar(191) DEFAULT NULL,
  `fileName` varchar(191) DEFAULT NULL,
  `maxMarks` double NOT NULL DEFAULT 100,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assignment_submissions`
--

CREATE TABLE `assignment_submissions` (
  `id` varchar(191) NOT NULL,
  `assignmentId` varchar(191) NOT NULL,
  `studentId` varchar(191) NOT NULL,
  `filePath` varchar(191) DEFAULT NULL,
  `fileName` varchar(191) DEFAULT NULL,
  `content` varchar(191) DEFAULT NULL,
  `submittedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `status` varchar(191) NOT NULL DEFAULT 'submitted',
  `marksObtained` double DEFAULT NULL,
  `feedback` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_records`
--

CREATE TABLE `attendance_records` (
  `id` varchar(191) NOT NULL,
  `studentId` varchar(191) NOT NULL,
  `attendanceSessionId` varchar(191) NOT NULL,
  `markedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `ipAddress` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_sessions`
--

CREATE TABLE `attendance_sessions` (
  `id` varchar(191) NOT NULL,
  `teacherId` varchar(191) NOT NULL,
  `subjectId` varchar(191) NOT NULL,
  `departmentId` varchar(191) NOT NULL,
  `semester` int(11) NOT NULL,
  `section` varchar(191) NOT NULL DEFAULT 'A',
  `qrCode` varchar(191) NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `duration` int(11) NOT NULL DEFAULT 15,
  `startedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `endedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leave_requests`
--

CREATE TABLE `leave_requests` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `startDate` datetime(3) NOT NULL,
  `endDate` datetime(3) NOT NULL,
  `reason` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `approvedBy` varchar(191) DEFAULT NULL,
  `comments` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marks`
--

CREATE TABLE `marks` (
  `id` varchar(191) NOT NULL,
  `studentId` varchar(191) NOT NULL,
  `subjectId` varchar(191) NOT NULL,
  `teacherId` varchar(191) NOT NULL,
  `examType` varchar(191) NOT NULL,
  `marksObtained` double NOT NULL,
  `totalMarks` double NOT NULL,
  `remarks` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notices`
--

CREATE TABLE `notices` (
  `id` varchar(191) NOT NULL,
  `authorId` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `content` varchar(191) NOT NULL,
  `targetRole` varchar(191) NOT NULL DEFAULT 'all',
  `priority` varchar(191) NOT NULL DEFAULT 'normal',
  `isPinned` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `recommendations`
--

CREATE TABLE `recommendations` (
  `id` varchar(191) NOT NULL,
  `studentId` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) NOT NULL,
  `actionUrl` varchar(191) DEFAULT NULL,
  `priority` varchar(191) NOT NULL DEFAULT 'medium',
  `isRead` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `token` varchar(191) NOT NULL,
  `role` varchar(191) NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `rollNumber` varchar(191) NOT NULL,
  `semester` int(11) NOT NULL,
  `departmentId` varchar(191) NOT NULL,
  `section` varchar(191) NOT NULL DEFAULT 'A',
  `academicYear` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `study_materials`
--

CREATE TABLE `study_materials` (
  `id` varchar(191) NOT NULL,
  `teacherId` varchar(191) NOT NULL,
  `subjectId` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `filePath` varchar(191) NOT NULL,
  `fileName` varchar(191) NOT NULL,
  `fileType` varchar(191) NOT NULL,
  `fileSize` int(11) NOT NULL,
  `downloads` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `departmentId` varchar(191) NOT NULL,
  `semester` int(11) NOT NULL,
  `credits` int(11) NOT NULL DEFAULT 3,
  `type` varchar(191) NOT NULL DEFAULT 'theory',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `teachers`
--

CREATE TABLE `teachers` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `departmentId` varchar(191) NOT NULL,
  `specialization` varchar(191) DEFAULT NULL,
  `designation` varchar(191) NOT NULL DEFAULT 'Assistant Professor',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `timetables`
--

CREATE TABLE `timetables` (
  `id` varchar(191) NOT NULL,
  `departmentId` varchar(191) NOT NULL,
  `semester` int(11) NOT NULL,
  `section` varchar(191) NOT NULL DEFAULT 'A',
  `dayOfWeek` int(11) NOT NULL,
  `periodNumber` int(11) NOT NULL,
  `subjectId` varchar(191) NOT NULL,
  `teacherId` varchar(191) NOT NULL,
  `roomNumber` varchar(191) NOT NULL,
  `startTime` varchar(191) NOT NULL,
  `endTime` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `role` varchar(191) NOT NULL,
  `avatar` varchar(191) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `assignments`
--
ALTER TABLE `assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `assignments_teacherId_idx` (`teacherId`),
  ADD KEY `assignments_subjectId_idx` (`subjectId`),
  ADD KEY `assignments_deadline_idx` (`deadline`);

--
-- Indexes for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `assignment_submissions_assignmentId_studentId_key` (`assignmentId`,`studentId`),
  ADD KEY `assignment_submissions_assignmentId_idx` (`assignmentId`),
  ADD KEY `assignment_submissions_studentId_idx` (`studentId`);

--
-- Indexes for table `attendance_records`
--
ALTER TABLE `attendance_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `attendance_records_studentId_attendanceSessionId_key` (`studentId`,`attendanceSessionId`),
  ADD KEY `attendance_records_studentId_idx` (`studentId`),
  ADD KEY `attendance_records_attendanceSessionId_idx` (`attendanceSessionId`);

--
-- Indexes for table `attendance_sessions`
--
ALTER TABLE `attendance_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `attendance_sessions_qrCode_key` (`qrCode`),
  ADD KEY `attendance_sessions_qrCode_idx` (`qrCode`),
  ADD KEY `attendance_sessions_isActive_idx` (`isActive`),
  ADD KEY `attendance_sessions_teacherId_idx` (`teacherId`),
  ADD KEY `attendance_sessions_subjectId_idx` (`subjectId`),
  ADD KEY `attendance_sessions_departmentId_fkey` (`departmentId`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `departments_name_key` (`name`),
  ADD UNIQUE KEY `departments_code_key` (`code`);

--
-- Indexes for table `leave_requests`
--
ALTER TABLE `leave_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `leave_requests_userId_idx` (`userId`),
  ADD KEY `leave_requests_status_idx` (`status`),
  ADD KEY `leave_requests_approvedBy_fkey` (`approvedBy`);

--
-- Indexes for table `marks`
--
ALTER TABLE `marks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `marks_studentId_subjectId_teacherId_examType_key` (`studentId`,`subjectId`,`teacherId`,`examType`),
  ADD KEY `marks_studentId_idx` (`studentId`),
  ADD KEY `marks_subjectId_idx` (`subjectId`),
  ADD KEY `marks_examType_idx` (`examType`),
  ADD KEY `marks_teacherId_fkey` (`teacherId`);

--
-- Indexes for table `notices`
--
ALTER TABLE `notices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notices_targetRole_idx` (`targetRole`),
  ADD KEY `notices_priority_idx` (`priority`),
  ADD KEY `notices_createdAt_idx` (`createdAt`),
  ADD KEY `notices_authorId_fkey` (`authorId`);

--
-- Indexes for table `recommendations`
--
ALTER TABLE `recommendations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `recommendations_studentId_idx` (`studentId`),
  ADD KEY `recommendations_type_idx` (`type`),
  ADD KEY `recommendations_isRead_idx` (`isRead`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sessions_token_key` (`token`),
  ADD KEY `sessions_token_idx` (`token`),
  ADD KEY `sessions_userId_idx` (`userId`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `students_userId_key` (`userId`),
  ADD UNIQUE KEY `students_rollNumber_key` (`rollNumber`),
  ADD KEY `students_rollNumber_idx` (`rollNumber`),
  ADD KEY `students_departmentId_idx` (`departmentId`),
  ADD KEY `students_semester_idx` (`semester`);

--
-- Indexes for table `study_materials`
--
ALTER TABLE `study_materials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `study_materials_teacherId_idx` (`teacherId`),
  ADD KEY `study_materials_subjectId_idx` (`subjectId`),
  ADD KEY `study_materials_fileType_idx` (`fileType`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `subjects_code_key` (`code`),
  ADD KEY `subjects_code_idx` (`code`),
  ADD KEY `subjects_departmentId_idx` (`departmentId`),
  ADD KEY `subjects_semester_idx` (`semester`);

--
-- Indexes for table `teachers`
--
ALTER TABLE `teachers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `teachers_userId_key` (`userId`),
  ADD UNIQUE KEY `teachers_employeeId_key` (`employeeId`),
  ADD KEY `teachers_employeeId_idx` (`employeeId`),
  ADD KEY `teachers_departmentId_idx` (`departmentId`);

--
-- Indexes for table `timetables`
--
ALTER TABLE `timetables`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `timetables_departmentId_semester_section_dayOfWeek_periodNum_key` (`departmentId`,`semester`,`section`,`dayOfWeek`,`periodNumber`),
  ADD KEY `timetables_departmentId_idx` (`departmentId`),
  ADD KEY `timetables_teacherId_idx` (`teacherId`),
  ADD KEY `timetables_subjectId_fkey` (`subjectId`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_key` (`email`),
  ADD KEY `users_email_idx` (`email`),
  ADD KEY `users_role_idx` (`role`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `assignments`
--
ALTER TABLE `assignments`
  ADD CONSTRAINT `assignments_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `subjects` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `assignments_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `teachers` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  ADD CONSTRAINT `assignment_submissions_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `assignments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `assignment_submissions_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `attendance_records`
--
ALTER TABLE `attendance_records`
  ADD CONSTRAINT `attendance_records_attendanceSessionId_fkey` FOREIGN KEY (`attendanceSessionId`) REFERENCES `attendance_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `attendance_records_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `attendance_sessions`
--
ALTER TABLE `attendance_sessions`
  ADD CONSTRAINT `attendance_sessions_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `attendance_sessions_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `subjects` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `attendance_sessions_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `teachers` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `leave_requests`
--
ALTER TABLE `leave_requests`
  ADD CONSTRAINT `leave_requests_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `leave_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `marks`
--
ALTER TABLE `marks`
  ADD CONSTRAINT `marks_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `marks_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `subjects` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `marks_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `teachers` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `notices`
--
ALTER TABLE `notices`
  ADD CONSTRAINT `notices_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `recommendations`
--
ALTER TABLE `recommendations`
  ADD CONSTRAINT `recommendations_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `sessions`
--
ALTER TABLE `sessions`
  ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `students_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `students_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `study_materials`
--
ALTER TABLE `study_materials`
  ADD CONSTRAINT `study_materials_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `subjects` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `study_materials_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `teachers` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `subjects`
--
ALTER TABLE `subjects`
  ADD CONSTRAINT `subjects_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `teachers`
--
ALTER TABLE `teachers`
  ADD CONSTRAINT `teachers_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `teachers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `timetables`
--
ALTER TABLE `timetables`
  ADD CONSTRAINT `timetables_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `timetables_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `subjects` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `timetables_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `teachers` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
