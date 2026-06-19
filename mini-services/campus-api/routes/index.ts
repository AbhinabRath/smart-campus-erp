// =============================================================================
// Central Route Registration
// =============================================================================
// Registers all API routes with their corresponding middleware and controllers.
// Routes are grouped by module (auth, attendance, marks, etc.) and protected
// by authentication and role-based authorization middleware where appropriate.
//
// Route protection strategy:
//   - Public routes: login (no auth required)
//   - Authenticated routes: requireAuth middleware (valid session cookie)
//   - Role-restricted routes: requireRole middleware (admin/teacher/student)
//
// This central registration file makes it easy to see all available API
// endpoints at a glance and ensures consistent middleware application.
// =============================================================================

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { upload } from '../utils/fileUpload';

// Controllers
import * as authCtrl from '../controllers/authController';
import * as attendanceCtrl from '../controllers/attendanceController';
import * as marksCtrl from '../controllers/marksController';
import * as assignmentCtrl from '../controllers/assignmentController';
import * as materialCtrl from '../controllers/studyMaterialController';
import * as timetableCtrl from '../controllers/timetableController';
import * as noticeCtrl from '../controllers/noticeController';
import * as leaveCtrl from '../controllers/leaveController';
import * as analyticsCtrl from '../controllers/analyticsController';
import * as recommendationCtrl from '../controllers/recommendationController';
import * as dashboardCtrl from '../controllers/dashboardController';
import * as userCtrl from '../controllers/userController';
import * as deptCtrl from '../controllers/departmentController';
import * as subjectCtrl from '../controllers/subjectController';

const router = Router();

// =============================================================================
// AUTH ROUTES - Login/Logout/Session Validation
// =============================================================================
router.post('/auth/login', validate([
  { field: 'email', required: true, isEmail: true },
  { field: 'password', required: true, isString: true, min: 1 },
]), authCtrl.login);

router.post('/auth/logout', authCtrl.logout);
router.get('/auth/me', requireAuth, authCtrl.getMe);

// =============================================================================
// ATTENDANCE ROUTES - QR-Based Attendance Management
// =============================================================================
// Teacher creates/manages attendance sessions; students mark attendance via QR
router.post('/attendance/sessions', requireAuth, requireRole('teacher', 'admin'), validate([
  { field: 'subjectId', required: true },
  { field: 'departmentId', required: true },
  { field: 'semester', required: true, isNumber: true },
]), attendanceCtrl.createAttendanceSession);

router.get('/attendance/sessions', requireAuth, attendanceCtrl.getAttendanceSessions);
router.get('/attendance/sessions/:id', requireAuth, attendanceCtrl.getAttendanceSessionById);

router.post('/attendance/sessions/:id/end', requireAuth, requireRole('teacher', 'admin'), attendanceCtrl.endAttendanceSession);

router.post('/attendance/mark', requireAuth, requireRole('student'), validate([
  { field: 'qrCode', required: true, isString: true },
]), attendanceCtrl.markAttendance);

router.get('/attendance/my-attendance', requireAuth, requireRole('student'), attendanceCtrl.getMyAttendance);
router.get('/attendance/reports/:sessionId', requireAuth, requireRole('teacher', 'admin'), attendanceCtrl.getAttendanceReport);
router.get('/attendance/percentage', requireAuth, requireRole('student'), attendanceCtrl.getAttendancePercentage);

// =============================================================================
// MARKS ROUTES - Student Marks/Grades Management
// =============================================================================
router.post('/marks', requireAuth, requireRole('teacher', 'admin'), validate([
  { field: 'studentId', required: true },
  { field: 'subjectId', required: true },
  { field: 'examType', required: true, isIn: ['internal1', 'internal2', 'assignment', 'lab', 'semester'] },
  { field: 'marksObtained', required: true, isNumber: true },
  { field: 'totalMarks', required: true, isNumber: true },
]), marksCtrl.createMarks);

router.put('/marks/:id', requireAuth, requireRole('teacher', 'admin'), marksCtrl.updateMarks);
router.delete('/marks/:id', requireAuth, requireRole('teacher', 'admin'), marksCtrl.deleteMarks);
router.get('/marks/student/:studentId', requireAuth, requireRole('teacher', 'admin'), marksCtrl.getMarksByStudent);
router.get('/marks/subject/:subjectId', requireAuth, requireRole('teacher', 'admin'), marksCtrl.getMarksBySubject);
router.get('/marks/my-marks', requireAuth, requireRole('student'), marksCtrl.getMyMarks);

// =============================================================================
// ASSIGNMENT ROUTES - Assignment & Submission Management
// =============================================================================
router.post('/assignments', requireAuth, requireRole('teacher', 'admin'), upload.single('file'), validate([
  { field: 'subjectId', required: true },
  { field: 'title', required: true },
  { field: 'description', required: true },
  { field: 'deadline', required: true },
]), assignmentCtrl.createAssignment);

router.put('/assignments/:id', requireAuth, requireRole('teacher', 'admin'), upload.single('file'), assignmentCtrl.updateAssignment);
router.delete('/assignments/:id', requireAuth, requireRole('teacher', 'admin'), assignmentCtrl.deleteAssignment);
router.get('/assignments', requireAuth, assignmentCtrl.getAssignments);
router.get('/assignments/:id', requireAuth, assignmentCtrl.getAssignmentById);

router.post('/assignments/:id/submit', requireAuth, requireRole('student'), upload.single('file'), assignmentCtrl.submitAssignment);
router.get('/assignments/:id/submissions', requireAuth, requireRole('teacher', 'admin'), assignmentCtrl.getSubmissions);
router.put('/assignments/submissions/:submissionId/grade', requireAuth, requireRole('teacher', 'admin'), validate([
  { field: 'marksObtained', required: true, isNumber: true },
]), assignmentCtrl.gradeSubmission);

// =============================================================================
// STUDY MATERIALS ROUTES - Educational Resource Management
// =============================================================================
router.post('/materials', requireAuth, requireRole('teacher', 'admin'), upload.single('file'), validate([
  { field: 'subjectId', required: true },
  { field: 'title', required: true },
]), materialCtrl.createMaterial);

router.get('/materials', requireAuth, materialCtrl.getMaterials);
router.get('/materials/:id', requireAuth, materialCtrl.getMaterialById);
router.get('/materials/:id/download', requireAuth, materialCtrl.downloadMaterial);
router.delete('/materials/:id', requireAuth, requireRole('teacher', 'admin'), materialCtrl.deleteMaterial);

// =============================================================================
// TIMETABLE ROUTES - Weekly Schedule Management
// =============================================================================
router.post('/timetables', requireAuth, requireRole('admin'), validate([
  { field: 'departmentId', required: true },
  { field: 'semester', required: true, isNumber: true },
  { field: 'dayOfWeek', required: true, isNumber: true },
  { field: 'periodNumber', required: true, isNumber: true },
  { field: 'subjectId', required: true },
  { field: 'teacherId', required: true },
  { field: 'roomNumber', required: true },
  { field: 'startTime', required: true },
  { field: 'endTime', required: true },
]), timetableCtrl.createTimetable);

router.post('/timetables/bulk', requireAuth, requireRole('admin'), timetableCtrl.createBulkTimetable);
router.put('/timetables/:id', requireAuth, requireRole('admin'), timetableCtrl.updateTimetable);
router.delete('/timetables/:id', requireAuth, requireRole('admin'), timetableCtrl.deleteTimetable);
router.get('/timetables', requireAuth, timetableCtrl.getTimetables);

// =============================================================================
// NOTICE ROUTES - Announcement Management
// =============================================================================
router.post('/notices', requireAuth, requireRole('admin', 'teacher'), validate([
  { field: 'title', required: true },
  { field: 'content', required: true },
]), noticeCtrl.createNotice);

router.get('/notices', requireAuth, noticeCtrl.getNotices);
router.post(
  '/notices/read-all',
  requireAuth,
  noticeCtrl.markAllNoticesRead
);

router.post(
  '/notices/:id/read',
  requireAuth,
  noticeCtrl.toggleNoticeRead
);
router.get('/notices/:id', requireAuth, noticeCtrl.getNoticeById);

router.put('/notices/:id', requireAuth, noticeCtrl.updateNotice);
router.delete('/notices/:id', requireAuth, noticeCtrl.deleteNotice);

// =============================================================================
// LEAVE ROUTES - Leave Management
// =============================================================================
router.post('/leaves', requireAuth, requireRole('student', 'teacher'), validate([
  { field: 'type', required: true, isIn: ['casual', 'sick', 'academic', 'personal'] },
  { field: 'startDate', required: true },
  { field: 'endDate', required: true },
  { field: 'reason', required: true },
]), leaveCtrl.createLeave);

router.get('/leaves', requireAuth, leaveCtrl.getLeaves);
router.put('/leaves/:id/approve', requireAuth, requireRole('admin'), leaveCtrl.approveLeave);
router.put('/leaves/:id/reject', requireAuth, requireRole('admin'), leaveCtrl.rejectLeave);
router.get('/leaves/my-leaves', requireAuth, leaveCtrl.getMyLeaves);

// =============================================================================
// ANALYTICS ROUTES - Data Analytics
// =============================================================================
router.get('/analytics/attendance', requireAuth, analyticsCtrl.getAttendanceAnalytics);
router.get('/analytics/marks', requireAuth, analyticsCtrl.getMarksAnalytics);
router.get('/analytics/assignments', requireAuth, analyticsCtrl.getAssignmentAnalytics);
router.get('/analytics/students/:id/progress', requireAuth, analyticsCtrl.getStudentProgress);
router.get('/analytics/department/:id', requireAuth, analyticsCtrl.getDepartmentAnalytics);

// =============================================================================
// RECOMMENDATION ROUTES - Rule-Based Recommendations
// =============================================================================
router.get('/recommendations', requireAuth, requireRole('student'), recommendationCtrl.getRecommendations);
router.post('/recommendations/generate', requireAuth, recommendationCtrl.generateStudentRecommendations);
router.put('/recommendations/:id/read', requireAuth, recommendationCtrl.markRecommendationRead);

// =============================================================================
// DASHBOARD ROUTES - Aggregated Dashboard Data
// =============================================================================
router.get('/dashboard/student', requireAuth, requireRole('student'), dashboardCtrl.getStudentDashboard);
router.get('/dashboard/teacher', requireAuth, requireRole('teacher'), dashboardCtrl.getTeacherDashboard);
router.get('/dashboard/admin', requireAuth, requireRole('admin'), dashboardCtrl.getAdminDashboard);

// =============================================================================
// USER MANAGEMENT ROUTES (Admin Only)
// =============================================================================
router.get('/users', requireAuth, requireRole('admin', 'teacher'), userCtrl.getUsers);
router.get('/users/:id', requireAuth, requireRole('admin'), userCtrl.getUserById);
router.post('/users', requireAuth, requireRole('admin'), validate([
  { field: 'email', required: true, isEmail: true },
  { field: 'password', required: true, isString: true, min: 6 },
  { field: 'name', required: true },
  { field: 'role', required: true, isIn: ['admin', 'teacher', 'student'] },
]), userCtrl.createUser);

router.put('/users/:id', requireAuth, userCtrl.updateUser);
router.put('/users/:id/password', requireAuth, userCtrl.changePassword);
router.delete('/users/:id', requireAuth, requireRole('admin'), userCtrl.deactivateUser);

// =============================================================================
// DEPARTMENT MANAGEMENT ROUTES (Admin Only)
// =============================================================================
router.get('/departments', requireAuth, deptCtrl.getDepartments);
router.post('/departments', requireAuth, requireRole('admin'), validate([
  { field: 'name', required: true },
  { field: 'code', required: true },
]), deptCtrl.createDepartment);

router.put('/departments/:id', requireAuth, requireRole('admin'), deptCtrl.updateDepartment);
router.delete('/departments/:id', requireAuth, requireRole('admin'), deptCtrl.deleteDepartment);

// =============================================================================
// SUBJECT MANAGEMENT ROUTES (Admin Only)
// =============================================================================
router.get('/subjects', requireAuth, subjectCtrl.getSubjects);
router.post('/subjects', requireAuth, requireRole('admin'), validate([
  { field: 'name', required: true },
  { field: 'code', required: true },
  { field: 'departmentId', required: true },
  { field: 'semester', required: true, isNumber: true },
]), subjectCtrl.createSubject);

router.put('/subjects/:id', requireAuth, requireRole('admin'), subjectCtrl.updateSubject);
router.delete('/subjects/:id', requireAuth, requireRole('admin'), subjectCtrl.deleteSubject);

export default router;
