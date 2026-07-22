Tab 1: Add Faculty

Prompt:

Create an Add Faculty module for the Admin Dashboard.

When the admin clicks "Add Faculty", display a faculty registration form with the following fields:

Faculty ID (Auto Generated)
Faculty Name
Gender (Dropdown: Male, Female)
Date of Birth
Mobile Number
Email Address
Qualification
Department
Subject(s) Assigned
Designation
Date of Joining
Experience
Address
Emergency Contact Number
Upload Profile Photo
Username
Password
Status (Active/Inactive)

Provide Save, Update, Delete, and Search Faculty options.

Searching using Faculty ID or Mobile Number should display the complete faculty profile with all stored information.

Tab 2: Transport Management

Prompt:

Create a Transport Management module for the Admin Dashboard.

Display the total number of school buses.

For each bus, allow the admin to maintain the following details:

Bus Number
Driver Name
Driver Mobile Number
Vehicle Registration Number
Capacity
Area / City Covered
Transport Route
Boarding Points
GPS Tracker Number / GPS Tracking ID
Bus Status (Active / Maintenance / Inactive)

Provide Add Bus, Update, Delete, and Search Bus options.

When the admin searches using the Bus Number, display the complete information of that bus, including all transport details.

Tab 3: Class Timetable

Prompt:

Create a Class Timetable module for the Admin Dashboard.

Provide a Class selection dropdown containing:

Nursery
LKG
UKG
Class 1 to Class 10

After selecting the class, provide a Section dropdown (A, B, C, etc.).

Instead of creating the timetable manually, allow the admin to upload the timetable in Excel format (.xlsx or .xls).

Upload Requirements
Select Class
Select Section
Upload Excel File
Validate the uploaded file before saving.
Display a preview of the uploaded timetable before confirmation.
Allow the admin to replace the uploaded file if required.
Expected Excel Format

The uploaded Excel sheet should contain the following columns:

Period Number
Subject
Faculty Name
Start Time
End Time

Each row represents one timetable period.

Features
Upload Timetable
Preview Uploaded Timetable
Save Timetable
Replace Uploaded Timetable
Delete Timetable
Search Timetable by Class and Section
Download Existing Timetable
Download Excel Template (for correct formatting)
Validation
Accept only .xlsx and .xls files.
Reject duplicate period numbers.
Ensure Start Time is earlier than End Time.
Ensure all required columns are present.
Display clear validation errors if the uploaded file format is incorrect.
Tab 4: Fee Particulars

Prompt:

Create a Fee Particulars module for the Admin Dashboard.

When the admin selects a class (Nursery to Class 10), display the fee structure containing:

Admission Fee
Tuition Fee
Books Fee
Uniform Fee
Transport Fee (Optional)
Other Charges
Total Fee

Provide an option to search a student using Student ID.

After opening the student's fee details, allow the admin to apply discounts individually for:

Books Fee (%)
Tuition Fee (%)

The system should automatically:

Calculate the discount amount
Reduce the respective fee
Display the updated fee values
Calculate and display the Final Total Fee After Discount

Provide Save and Update options.

The updated fee details should automatically be visible in the Parent Dashboard.

Tab 5: Circulars

Prompt:

Create a Circulars module for the Admin Dashboard.

The admin should be able to publish circulars using either of the following methods:

Option 1: Upload Circular
Upload Circular Image / PDF
Option 2: Message Circular
Circular Title
Message Box

When the admin publishes a circular, the system should automatically record:

Posted Date
Posted Time

Display the newest circulars first.

All published circulars should automatically be visible to:

Faculty
Parents

Provide Publish, Edit, and Delete options.

Tab 6: Events

Prompt:

Create an Events module for the Admin Dashboard.

Allow the admin to manually add school events.

Each event should contain:

Event Name
Event Date
Event Time
Venue
Event Description (Optional)

When the admin publishes an event, the system should automatically record:

Posted Date
Posted Time

Display upcoming events in chronological order.

Provide Add Event, Edit, Delete, and View Event options.

All published events should automatically be visible to:

Faculty
Parents


Faculty Module – Final Production Flow 
Overview

A faculty member can perform two roles simultaneously:

Class Teacher – Responsible for one assigned class and section.
Subject Teacher – Teaches one or more subjects in different classes and sections.
Example
Faculty: Mr. Ramesh

⭐ Class Teacher
• Grade 8-A

📘 Subject Teacher
• Mathematics – Grade 8-B
• Mathematics – Grade 9-A
• Mathematics – Grade 10-C

The system automatically identifies the faculty's role for each assigned class and displays the appropriate modules.

Faculty Login

Faculty logs in using:

Employee ID / Username
Password

↓

Redirect to Faculty Dashboard

Faculty Dashboard
Welcome Section

Display:

Profile Photo
Faculty Name
Employee ID
Designation
Subjects Assigned
Dashboard Summary Cards

Display:

Total Assigned Classes
Class Teacher Sections
Total Students Under Class Teacher
Pending Parent Requests
Pending Leave Requests
Unread Parent Messages
Homework Assigned Today
My Assigned Classes

Display every assigned class.

Example

⭐ Grade 8-A
Role: Class Teacher

📘 Grade 8-B
Role: Subject Teacher

📘 Grade 9-A
Role: Subject Teacher

📘 Grade 10-C
Role: Subject Teacher

Clicking a class opens the respective dashboard.

Recent Activities

Examples:

Attendance submitted
Homework assigned
Marks uploaded
Parent request approved
Achievement added
Notifications

Display:

Parent Messages
Leave Requests
Parent Profile Update Requests
School Circulars
School Events
Student Birthdays
Class Teacher Dashboard

When the teacher opens their assigned Class Teacher section:

Grade 8-A

├── Student Directory
├── Attendance
├── Assignments
├── Achievements
├── Parent Requests
├── Leave Management
├── Parent Communication
└── Announcements
1. Student Directory

This is the master module for student management.

Features
Add Student
View All Students
Search by Student Name
Search by Student ID
Search by Roll Number
Edit Student
Transfer Student
Generate Student Digital ID
Add Student
Student Information
Student Photograph
Admission Number
Roll Number
Digital ID
Student Name
Admission Date
Date of Birth
Gender
Aadhaar Number
Blood Group
Religion
Caste / Category
Nationality
Previous School
Academic Information
Academic Year
Class
Section
House
Medium
Second Language
Optional Subject
Medical Information
Medical History
Allergies
Existing Diseases
Current Medication
Emergency Medical Notes
Address
Current Address
Permanent Address
City
State
PIN Code
Parent Details

Father

Name
Aadhaar Number
Occupation
Qualification
Mobile Number
Alternate Mobile Number
Email

Mother

Name
Aadhaar Number
Occupation
Qualification
Mobile Number
Alternate Mobile Number
Email

Guardian (Optional)

Name
Relation
Mobile Number
Address
Transport Details
Transport Required (Yes/No)
Bus Number
Route
Boarding Point

After saving, the student is added to the assigned class.

View All Students

Display:

Student Photo
Roll Number
Student ID
Student Name
Gender
Parent Name
Parent Mobile Number
Actions
Search Student

Search using:

Student Name
Student ID
Roll Number

Clicking a student opens the Student Profile.

Student Profile
Personal Details
Student Information
Parent Information
Address
Medical Information
Transport Information
Academic Details
Attendance
Assignments
Assessment Results
Achievements
Documents (View Only)
Aadhaar
Birth Certificate
Transfer Certificate
Medical Certificate
Other Uploaded Documents
Communication
Parent Communication History
Leave History
2. Attendance

Only the Class Teacher can take attendance.

Attendance options:

Present
Absent
Late
Half Day
Leave

Attendance is immediately visible in the Parent Dashboard.

3. Assignments

Upload:

Classwork
Homework

Fields:

Subject
Date
Classwork
Homework
Attachments
Due Date

Parents can view assignments in their dashboard.

4. Achievements

Add student achievements.

Fields:

Achievement Title
Description
Category
Competition/Event Name
Date
Student Photograph
Certificate

Automatically visible to parents.

5. Parent Requests

Parents can request updates for:

Address
Mobile Number
Guardian Information
Medical Information
Student Photograph

The Class Teacher can:

View
Approve
Reject
Add Remarks

Approved requests update the student profile.

6. Leave Management

Parents submit leave requests.

The Class Teacher can:

View Requests
Approve
Reject
Add Remarks

Parents see the updated leave status.

7. Parent Communication

Private communication between the Class Teacher and parents.

Individual Message

Example:

Rahul is performing well in Science, but he needs additional practice in Mathematics. Please encourage him to revise daily for the upcoming examinations.

Broadcast Message

Send messages to:

Entire Class
Selected Students
Low Attendance Students
Low Performance Students
Parent Replies

Parents can reply.

Conversation history is maintained.

8. Announcements

Class-specific announcements.

Examples:

Parents Meeting
Project Submission
Unit Test Schedule
Notebook Reminder

Visible only to parents of that class.

Subject Teacher Dashboard

When opening a class where the faculty is only a Subject Teacher:

Grade 9-A

├── Students (View Only)
├── Assignments
└── Assessments
1. Students (View Only)

Search using:

Student Name
Student ID
Roll Number

View:

Basic Profile
Attendance Summary
Academic Information
Achievements

No editing permissions.

2. Assignments

Upload:

Classwork
Homework

Fields:

Subject
Date
Classwork
Homework
Attachments
Due Date

Automatically visible to parents.

3. Assessments

Assessment Types:

Assignment
Unit Test
Monthly Test
Quarterly Exam
Half-Yearly Exam
Pre-Final Exam
Final Exam
Practical
Project

For every student:

Marks Obtained
Total Marks
Grade
Remarks

These are automatically displayed in the Parent Dashboard.

Common Modules (Available to Every Faculty)
Circulars (View Only)

Published by Admin.

Examples:

Holiday Notice
Examination Notification
School Announcement
Events (View Only)

Published by Admin.

Examples:

Annual Day
Sports Day
Science Exhibition
Parent Meeting
My Profile

Display:

Profile Photo
Faculty Name
Employee ID
Designation
Qualification
Subjects Assigned
Experience
Address

Actions:

Change Password
Update Profile Photo
Permission Matrix
Feature	Class Teacher	Subject Teacher
Student Directory	✅	❌
Add/Edit Student	✅	❌
View Student Profile	✅	✅ (Read Only)
Attendance	✅	❌
Assignments (Classwork & Homework)	✅	✅
Assessments / Marks Entry	❌	✅
Achievements	✅	❌
Parent Requests	✅	❌
Leave Management	✅	❌
Parent Communication	✅	❌
Announcements	✅	❌
Circulars	View Only	View Only
Events	View Only	View Only
My Profile	✅	✅
Complete Workflow
Admin
│
├── Creates Faculty
├── Creates Classes & Sections
├── Assigns Subjects
└── Assigns Class Teacher
        │
        ▼
Faculty Login
        │
        ▼
Faculty Dashboard
        │
        ▼
My Assigned Classes
        │
        ├───────────────────────────────┐
        │                               │
        ▼                               ▼
Class Teacher                     Subject Teacher
Dashboard                         Dashboard
        │                               │
        ├── Student Directory           ├── Students (View Only)
        │      ├── Add Student          ├── Assignments
        │      ├── View Students        └── Assessments
        │      ├── Search Student
        │      └── Student Profile
        │
        ├── Attendance
        ├── Assignments
        ├── Achievements
        ├── Parent Requests
        ├── Leave Management
        ├── Parent Communication
        └── Announcements
                │
                ▼
        Parent Dashboard Updates
        ├── Student Profile
        ├── Attendance
        ├── Assignments
        ├── Assessment Results
        ├── Achievements
        ├── Leave Status
        ├── Parent Messages
        └── Announcements

This flow keeps the system centered on classes, sections, subjects, and teacher responsibilities rather than departments, which is a better fit for a Nursery–10th school ERP. It also aligns cleanly with your Admin and Parent modules while maintaining clear permissions between Class Teachers and Subject Teachers.

# Parent Dashboard – School ERP

The Parent Dashboard should be designed as a centralized portal where parents can view all information related to their child. This dashboard is **view-only** for most modules, with limited actions such as submitting leave requests and uploading required documents. Every piece of information displayed on this dashboard is updated by the respective faculty members or the school administration.

The dashboard navigation should contain the following modules:

* Profile
* Academics
* Assignments
* Assessments
* Activities
* Achievements
* Attendance
* Fee Particulars
* Leaves
* Circulars
* Transport GPS Tracking
* Route Map
* Document Upload

---

# 1. Profile

The **Profile** page should be the first page displayed immediately after the parent logs in. It should present a complete overview of the student's personal, academic, transport, and parent information in a clean and organized layout.

The profile should display the following student information:

* Student Photograph
* Student Name
* Student ID
* Roll Number
* Digital ID
* Date of Birth
* Gender
* Aadhaar Number
* Blood Group
* Caste
* House
* Class
* Section
* Admission Date
* Previous School
* Medical History
* Residential Address
* PIN Code

It should also display the parent and guardian information, including:

* Father Name
* Mother Name
* Guardian Name (if applicable)
* Parent Mobile Numbers
* Parent Aadhaar Numbers
* Email Address
* Emergency Contact Details

Additional information shown on the profile page should include:

* Transport Details
* Attendance Summary
* Class Teacher Information
* Academic Year

This page serves as a complete digital student profile where parents can easily access all essential details in one place.

---

# 2. Academics

The Academics section provides parents with complete information regarding their child's academic progress.

The first component displayed should be the **Weekly Timetable**, showing all subjects scheduled for each day and period.

For every subject, display:

* Subject Name
* Subject Teacher
* Teacher Contact Information

Below the timetable, display the examination results uploaded by the respective subject teachers.

Each subject should include:

* Exam Name
* Exam Date
* Subject Name
* Marks Obtained
* Total Marks
* Grade

At the end of the results section, automatically display:

* Total Marks Obtained
* Overall Percentage
* Final Grade
* Class Rank
* Section Rank

All academic records are view-only for parents.

---

# 3. Assignments

The Assignments section functions as the student's digital diary.

Every subject teacher should be able to update:

* Classwork
* Homework

Each assignment should display:

* Subject Name
* Date
* Classwork
* Homework
* Attachments (if any)

Parents can only view the assignments uploaded by the respective teachers.

---

# 4. Assessments

This section should remain empty for now and be reserved for future development.

---

# 5. Activities

The Activities section displays all school activities created by the School Admin.

The Admin can create activities from categories such as:

* Cultural Activities
* Sports Activities
* Academic Activities
* Club Activities
* Social Activities
* School Events
* Educational Activities

Examples include:

* Dance Competition
* Singing Competition
* Drama
* Music Performance
* Art Competition
* Drawing & Painting
* Rangoli Competition
* Fashion Show
* Cultural Fest
* Cricket
* Football
* Basketball
* Volleyball
* Badminton
* Chess
* Athletics
* Kabaddi
* Kho-Kho
* Yoga
* Swimming
* Quiz Competition
* Debate
* Essay Writing
* Elocution
* Spell Bee
* Science Exhibition
* Mathematics Olympiad
* Coding Competition
* Robotics Workshop
* STEM Challenge
* Science Club
* Coding Club
* Robotics Club
* Eco Club
* Literature Club
* Photography Club
* Music Club
* Dance Club
* Drama Club
* Entrepreneurship Club
* Tree Plantation
* Community Service
* Charity Events
* Food Donation
* Environmental Campaigns
* Annual Day
* Sports Day
* Independence Day
* Republic Day
* Teachers' Day
* Children's Day
* Graduation Ceremony
* Freshers' Day
* Farewell
* Parent Meetings
* Field Trips
* Industrial Visits
* Museum Visits
* Science Park Visits
* Educational Tours
* Nature Camps

Each activity should display:

* Activity Name
* Category
* Description
* Venue
* Date
* Time
* Registration Information
* Registration Deadline (if applicable)
* Activity Status

Parents can view all upcoming and completed activities.

---

# 6. Achievements

This section displays achievements uploaded by the Class Teacher or authorized faculty.

Each achievement should include:

* Achievement Title
* Description
* Date
* Competition/Event Name
* Certificate (if uploaded)
* Student Photograph

Parents can only view achievement records.

---

# 7. Attendance

Attendance is updated by the faculty.

Parents should be able to view:

* Today's Attendance
* Monthly Attendance
weekly attendance
* Overall Attendance Percentage

Attendance statistics should also include:

* Total Working Days
* Present Days
* Absent Days
* Leave Days

---

# 8. Fee Particulars

Fee information is managed by the School Admin.

Each fee record should display:

* Academic Year
* Class
* Fee Category (Academic Fee, Books Fee, Exam Fee, etc.)
* Total Fee Amount
* Concession
* Payable Amount
* Paid Amount
* Due Amount
* Payment Status

Parents can only view fee information.

---

# 9. Leaves

Parents can submit leave requests for their child.

The leave request form should contain:

* Student Name
* From Date
* To Date
* Reason for Leave
* Recipient

The recipient can be:

* Principal
* School Admin
* Class Teacher

Parents should also be able to view previous leave requests along with their approval status.

---

# 10. Circulars

Circulars are published by the School Admin.

This section should display school announcements such as:

* Holidays
* Festivals
* Competitions
* Parent Meetings
* School Events
* Examination Notifications
* Important Announcements

Each circular should display:

* Title
* Description
* Date
* Attachments/PDF (if available)

Parents can view and download circulars.

---

# 11. Transport GPS Tracking

This module should be created as a placeholder page and kept empty for future implementation of live school bus GPS tracking.

---

# 12. Route Map

This module should also remain empty and be reserved for future implementation of transport route mapping.

---

# 13. Document Upload

Parents should be able to upload student-related documents for school verification.

Supported documents include:

* Student Aadhaar Card
* Birth Certificate
* Previous School Study Certificate
* Conduct Certificate
* Transfer Certificate
* Medical Certificates
* Passport Photograph
* Any additional documents required by the school

The uploaded documents should be visible to the School Admin for verification and approval.