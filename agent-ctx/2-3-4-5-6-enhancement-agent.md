# Task 2-3-4-5-6: Bug Fixes, New Features & Enhancements

## Agent: Enhancement & Fix Agent

## Summary of Changes

### Critical Bug Fix: AnalyticsManager Data Shape Mismatch
- **Root Cause**: Backend analytics endpoints return OBJECTS with nested arrays (e.g., `{ totalSessions, bySubject: [...] }`), but the frontend checked `Array.isArray(data)` and treated data as flat arrays, causing all analytics to show "No analytics available."
- **Fix**: Completely rewrote `AnalyticsManager.tsx` to:
  - Parse backend response objects properly using typed interfaces (`AttendanceAnalytics`, `MarksAnalytics`, `AssignmentAnalytics`, `StudentProgress`)
  - Show summary stat cards (total sessions, avg attendance, pass rate, etc.) at the top of each tab
  - Use `bySubject` array for the attendance bar chart
  - Show meaningful empty states when there's no data but the response is valid
  - Add a department filter dropdown for admin/teacher (calls API with `?departmentId=`)
  - For student role: add a "My Progress" tab that calls `/analytics/students/:id/progress` showing attendance %, subject-wise marks chart, and exam type comparison
  - Use Skeleton components for loading states
  - Color-coded chart bars (green for good, amber for borderline, red for poor)

### New Feature: Profile Page
- Created `/src/components/features/profile/ProfilePage.tsx` with:
  - Profile card with avatar, name, email, role badge, gradient header
  - Role-specific info: Student (roll number, semester, section, department), Teacher (employee ID, designation, specialization, department), Admin (admin access note)
  - Edit profile form: name, avatar URL (saves via PUT `/api/users/:id`)
  - Change password section with current/new/confirm fields, show/hide toggles
  - Uses shadcn Card, Avatar, Input components with nice styling
- Updated `store.ts`: Added `'profile'` to `ViewId` type
- Updated `page.tsx`: Added `case 'profile': return <ProfilePage />;` and import
- Updated `AppSidebar.tsx`: Added Profile nav item (UserCircle icon) in new "Account" section, visible to all roles
- Updated `AppHeader.tsx`: Added `profile: 'Profile'` to viewTitles, fixed Profile dropdown to navigate to profile view

### Backend Updates
- Modified `routes/index.ts`: 
  - Changed PUT `/users/:id` from admin-only to authenticated (allows self-updates)
  - Added PUT `/users/:id/password` endpoint for password changes
  - Changed analytics routes from teacher/admin-only to authenticated (students need access for progress tab)
- Modified `controllers/userController.ts`:
  - `updateUser`: Non-admin users can only update their own profile (name, avatar)
  - Added `changePassword`: Users can change their own password with current password verification
- Modified `controllers/analyticsController.ts`:
  - Fixed assignment analytics query to include `departmentId` and `semester` in subject select (was causing TS error)

### Enhancement: MarksManager
- Teacher view: Replaced "Student ID" text input with proper student dropdown populated from `GET /api/users?role=student`
- Teacher view: Subject dropdown shows subject code too
- Teacher view: Exam type dropdown uses friendly labels (Internal 1, Internal 2, etc.)
- Teacher view: Added inline edit functionality (click Edit to edit marks/total/remarks in-table)
- Student view: Bar chart bars are color-coded by performance (green ≥70%, amber ≥40%, red <40%)
- Student view: Percentage column shows color-coded text
- Both views: Proper Skeleton loading states, better empty states with icons

### Enhancement: AssignmentManager
- Create form: Replaced datetime-local input with Calendar/Popover date picker + time input
- Create form: Added friendly labels and better layout
- Student view: Status badges with icons (Submitted=green, Overdue=red, Pending=amber)
- Student view: Days-left countdown for approaching deadlines
- Student view: Better file upload UI with file name display
- Student view: Submission details card with grading feedback
- Teacher view: Submissions table shows student name + roll number
- Both views: Better empty states, Skeleton loading

### Enhancement: NoticeManager
- Color-coded priority badges: urgent=red with AlertTriangle icon, high=orange with AlertCircle icon, normal=gray, low=slate
- Pinned notice indicator with pin icon and amber background highlight
- Left border color for urgent/high priority notices
- Relative time display using `date-fns formatDistanceToNow` (e.g., "2 hours ago")
- Full timestamp on hover via title attribute
- Notice detail dialog when clicking on a notice (full content, priority badge, metadata)
- Sorted notices: pinned first, then by date
- Better empty state with CTA for creators

### Enhancement: LeaveManager
- Summary stat cards at top (Pending/Approved/Rejected counts with colored left borders)
- Leave type icons: sick=Heart, casual=Coffee, academic=BookOpen, personal=User
- Duration calculation shown (e.g., "3 days") using `differenceInDays`
- Admin: Approve/reject buttons with confirmation dialog (AlertDialog-style Dialog)
- Color-coded status badges with dot indicators
- Duration calculation in apply form (shows days while selecting dates)
- Better empty states

### Global Improvements
- All loading states now use shadcn Skeleton component instead of "Loading..."
- All empty states have proper illustrations (icon in circle) and helpful messages
- AppHeader dropdown "Profile" now navigates to profile view instead of dashboard
- Changed backend dev script from `bun --hot` to `bun` to avoid Prisma/SQLite hot-reload crashes

## Files Modified/Created
1. `src/components/features/analytics/AnalyticsManager.tsx` - Complete rewrite
2. `src/components/features/profile/ProfilePage.tsx` - NEW
3. `src/components/features/marks/MarksManager.tsx` - Major enhancements
4. `src/components/features/assignments/AssignmentManager.tsx` - Major enhancements
5. `src/components/features/notices/NoticeManager.tsx` - Styling polish
6. `src/components/features/leaves/LeaveManager.tsx` - Styling polish
7. `src/lib/store.ts` - Added 'profile' to ViewId
8. `src/app/page.tsx` - Added profile view case + import
9. `src/components/layout/AppSidebar.tsx` - Added Profile nav + Account section
10. `src/components/layout/AppHeader.tsx` - Added profile to viewTitles + fixed dropdown
11. `mini-services/campus-api/routes/index.ts` - User/analytics route changes
12. `mini-services/campus-api/controllers/userController.ts` - Self-update + password change
13. `mini-services/campus-api/controllers/analyticsController.ts` - Fixed subject select
14. `mini-services/campus-api/package.json` - Changed dev script

## Lint Status
- 0 errors, 1 pre-existing warning (unused eslint-disable in auth middleware)
