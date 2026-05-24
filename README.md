# ⚡ Enterprise Workflow Management System

A full-stack enterprise workflow execution platform where organizations can create reusable workflow templates, configure stations with role-based access, execute workflow instances, and maintain complete immutable audit trails.

---

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Angular   │────▶│   Django    │────▶│ PostgreSQL  │
│  Port 4200  │     │  Port 8000  │     │  Port 5432  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   
       │                   ▼                   
       │            ┌─────────────┐            
       └───────────▶│  Keycloak   │            
                    │  Port 8080  │            
                    └─────────────┘            
```

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 17, TypeScript, Keycloak JS adapter |
| Backend | Django 4.2, Django REST Framework |
| Auth | Keycloak 25 with JWT (RS256) |
| Database | PostgreSQL 16 |
| DevOps | Docker, Docker Compose |

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Ports 4200, 8000, 8080, 5432 available

### One-Command Launch

```bash
git clone https://github.com/shreyashsharmaprojects-del/workflow-management-system.git
cd workflow-management-system/workflow_platform
sudo docker-compose up -d --build
```

Wait 60 seconds for all services to initialize, then open:

| Service | URL |
|---------|-----|
| **Angular App** | http://localhost:4200 |
| **Django API** | http://localhost:8000/api/v1/docs/ |
| **Keycloak** | http://localhost:8080 |

### Login

| User | Password | Role |
|------|----------|------|
| `priya` | `Workflow@123` | Admin (full access) |
| `arjun` | `Workflow@123` | PM (create instances) |
| `raj` | `Workflow@123` | QA Team (execute tasks) |
| `vikram` | `Workflow@123` | Developer (execute tasks) |
| `neha` | `Workflow@123` | Auditor (read-only) |

> 📋 [Full seed user list →](SEED_USERS.md)

---

## ✨ Features

### Phase 1 ✅

- **Keycloak SSO** — JWT authentication with automatic user provisioning and role sync
- **RBAC** — 9 roles, station-level permissions, admin/operator/auditor separation
- **Workflow Templates** — Create reusable templates with visual station builder
- **Stations & Transitions** — START/NORMAL/END stations with directional edges
- **Workflow Engine** — Central orchestration with 5-step validation
- **Workflow Instances** — Create from templates, track progress, move through stations
- **Immutable Audit Log** — Append-only history with full attribution
- **Document Trail** — File uploads tracked across all stations
- **Angular Dashboard** — Role-based views (admin stats, operator workload)

### Phase 2 (Planned)

- Dynamic task forms from JSON schema
- CONFIRMATION checklists, APPROVAL flows, DOCUMENT requirements
- Email notifications on workflow movement
- Advanced filtering and reporting

---

## 🧩 Core Concepts

### Workflow Template → Instance Flow

```
Admin creates Template       BA/PM creates Instance       Operators execute
     │                              │                         │
     ▼                              ▼                         ▼
┌──────────┐                 ┌──────────┐              ┌──────────┐
│ Template │                 │ WF-1042  │              │ Execute  │
│  v1.0    │────────────────▶│ Active   │─────────────▶│ Tasks    │
│ Immutable│                 │ @ Req St │              │ Move →   │
└──────────┘                 └──────────┘              └──────────┘
```

### Workflow Engine Validation

Every workflow move passes through 5 checks:

1. ✅ Instance is ACTIVE?
2. ✅ User has role permission at current station?
3. ✅ Transition exists (current → target)?
4. ✅ All required tasks completed?
5. ✅ Optimistic lock (no concurrent modification)?

### Station Ownership

Stations are assigned to **roles**, not users. Only users with matching Keycloak roles can act:

```
Station: QA Testing
Allowed Roles: QA_TEAM, QA_MANAGER

→ User "raj" (QA_TEAM) can execute tasks & move
→ User "vikram" (DEV_TEAM) gets 403 Forbidden
```

---

## 📂 Project Structure

```
workflow-management-system/
├── PRD.txt                          # Product requirements
├── UX-Flow-Design.md                # Screen designs & user flows
├── ORM-Design.md                    # Database schema & Django models
├── API-Design.md                    # Full REST API contract
├── SEED_USERS.md                    # All 27 seed users & passwords
│
├── workflow_platform/               # Django Backend
│   ├── config/                      # Settings, URLs, WSGI
│   ├── apps/
│   │   ├── accounts/                # User model, Keycloak JWT auth
│   │   ├── workflows/               # Templates, Stations, Transitions, Tasks
│   │   ├── instances/               # Workflow Engine, History, Task Executions
│   │   ├── documents/               # Document trail (immutable)
│   │   ├── notifications/           # Email notifications (Phase 2)
│   │   └── dashboard/               # Admin & user dashboard APIs
│   ├── docker-compose.yml           # Full stack orchestration
│   └── keycloak/                    # Realm config with roles & users
│
└── workflow_frontend/               # Angular Frontend
    └── src/app/
        ├── core/auth/               # Keycloak init, guards, interceptors
        ├── core/services/           # API service (40+ endpoints)
        ├── shared/models/           # TypeScript interfaces
        ├── layout/                  # Sidebar, header, shell
        └── features/
            ├── dashboard/           # Stats cards, workload view
            ├── templates/           # CRUD, station builder, transitions
            └── instances/           # List, create, detail, task execution
```

---

## 🔌 API Endpoints (40+)

| Group | Endpoints |
|-------|----------|
| Auth | `GET /auth/me` |
| Templates | CRUD + publish + create-draft + versions |
| Stations | CRUD (on draft) |
| Tasks | CRUD with JSON config per type |
| Transitions | Directional edges with labels |
| Instances | CRUD + move + cancel + allowed-transitions |
| Task Executions | start, submit, save-draft |
| History | Immutable audit log with filters |
| Documents | Upload, list, download |
| Dashboard | Admin stats, user workload |

> 📋 [Full API contract →](API-Design.md)

---

## 🗄️ Database Models (11)

| Model | Purpose | Mutability |
|-------|---------|------------|
| `WorkflowTemplate` | Template metadata | Mutable (DRAFT) |
| `WorkflowTemplateVersion` | Frozen snapshot | **Immutable** |
| `Station` | Workflow stage | **Immutable** (in version) |
| `Transition` | Directional edge | **Immutable** (in version) |
| `TaskDefinition` | Task config (JSON) | **Immutable** (in version) |
| `WorkflowInstance` | Running workflow | Mutable |
| `WorkflowInstanceHistory` | Audit log | **Append-only** |
| `TaskExecution` | Task runtime | Mutable |
| `Document` | File upload | **Append-only** |
| `Notification` | Email record | Mutable |
| `User` | Extended Django user | Mutable |

> 📋 [Full ORM design →](ORM-Design.md)

---

## 🧪 API Testing

```bash
# Get a token
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/workflow-realm/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=workflow-platform" \
  -d "username=priya" -d "password=Workflow@123" \
  -d "grant_type=password" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Test auth
curl -s http://localhost:8000/api/v1/auth/me/ -H "Authorization: Bearer $TOKEN"

# Create template
curl -s -X POST http://localhost:8000/api/v1/templates/ \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"SDLC Workflow","description":"Standard SDLC","category":"Software"}'
```

---

## 🛠️ Development

### Backend (local)

```bash
cd workflow_platform
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

### Frontend (local)

```bash
cd workflow_frontend
npm install
ng serve --host 0.0.0.0 --port 4200
```

---

## 📄 License

MIT
