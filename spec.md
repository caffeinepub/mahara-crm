# Mahara CRM

## Current State
New project. Only scaffold files exist (empty Motoko actor, no frontend components).

## Requested Changes (Diff)

### Add
- **Authentication**: Email/password signup and login with role-based access (Admin, Sales Rep) using the authorization component
- **Dashboard page**: Stats cards (Total Leads, Converted, Hot Leads, Pending Follow-ups), conversion funnel chart, recent activity feed
- **Leads/Contacts module**: Full table with columns (Parent Name, Phone, Child Name, Age, Branch, Interest, Score, Status, Source, Actions), add/edit/delete leads, lead scoring 0-100, search and filter
- **Lead Detail page**: Full lead info, notes section, activity timeline, status change dropdown, schedule follow-up
- **Pipeline view (Kanban)**: Columns (New, Contacted, Visit Booked, Converted, Dropped), drag-and-drop cards, card shows parent name, child name, score badge
- **Follow-up system**: List of pending follow-ups with due dates, mark as done
- **Settings page**: User/role management, branch management
- **Dark sidebar navigation** with routing between all pages
- **Mobile responsive layout**

### Modify
- Empty Motoko actor → full CRM backend with stable storage

### Remove
- Nothing

## Implementation Plan

### Backend (Motoko)
- Data types: Lead, Note, Activity, FollowUp, User, Branch
- Lead fields: id, parentName, phone, childName, age, branch, interest, score (0-100), status (New/Contacted/VisitBooked/Converted/Dropped), source, assignedTo, createdAt, updatedAt
- Note fields: id, leadId, content, authorId, createdAt
- Activity fields: id, leadId, type (StatusChange/NoteAdded/FollowUpScheduled/FollowUpDone), description, actorId, createdAt
- FollowUp fields: id, leadId, dueDate, message, isDone, createdAt
- User fields: id, email, name, role (Admin/SalesRep), branches
- Branch fields: id, name
- CRUD for all entities stored in stable hashmaps
- Query functions: getLeadsByStatus, getLeadsByBranch, searchLeads, getDashboardStats, getPendingFollowUps, getActivitiesByLead

### Frontend (React/TypeScript/Tailwind)
- Dark sidebar layout with nav links
- Pages: Dashboard, Leads, Lead Detail, Pipeline, Follow-ups, Settings
- Auth screens: Login, Register
- Kanban board with drag-and-drop (using @dnd-kit or similar)
- Charts for conversion funnel (recharts)
- Responsive design with mobile nav
