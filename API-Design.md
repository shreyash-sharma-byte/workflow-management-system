# API Contract — REST Endpoints
# Enterprise Workflow Management System

---

## Base URL

```
http://localhost:8000/api/v1/
```

## Authentication

All requests require a **Keycloak-issued JWT** in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

JWT contains:
```json
{
  "sub": "uuid-of-user",
  "preferred_username": "raj",
  "email": "raj@company.com",
  "realm_access": {
    "roles": ["QA_TEAM", "QA_MANAGER"]
  }
}
```

---

## API Map (Overview)

```
/api/v1/
├── auth/me                              GET     Current user + roles
│
├── roles/                               GET     List all roles
│
├── templates/                           GET     List all templates
│   ├── {id}/                            GET     Template detail
│   ├── {id}/                            PUT     Update template
│   ├── {id}/                            DELETE  Delete template
│   ├── {id}/publish/                    POST    Publish template → creates version
│   ├── {id}/create-draft/               POST    Create new draft from last version
│   ├── {id}/versions/                   GET     List published versions
│   ├── {id}/versions/{vid}/             GET     Version detail (stations, transitions, tasks)
│   ├── {id}/stations/                   GET     List stations (on current draft)
│   ├── {id}/stations/                   POST    Add station
│   ├── {id}/stations/{sid}/             GET     Station detail
│   ├── {id}/stations/{sid}/             PUT     Update station
│   ├── {id}/stations/{sid}/             DELETE  Delete station
│   ├── {id}/stations/{sid}/tasks/       GET     List task definitions
│   ├── {id}/stations/{sid}/tasks/       POST    Add task definition
│   ├── {id}/stations/{sid}/tasks/{tid}/ GET     Task definition detail
│   ├── {id}/stations/{sid}/tasks/{tid}/ PUT     Update task definition
│   ├── {id}/stations/{sid}/tasks/{tid}/ DELETE  Delete task definition
│   ├── {id}/transitions/                GET     List transitions
│   ├── {id}/transitions/                POST    Add transition
│   ├── {id}/transitions/{tid}/          DELETE  Delete transition
│
├── instances/                           GET     List instances (filterable)
│   ├── {id}/                            GET     Instance detail (overview tab)
│   ├── {id}/                            PUT     Update instance metadata
│   ├── {id}/cancel/                     POST    Cancel instance
│   ├── {id}/move/                       POST    Move workflow (THE ENGINE)
│   ├── {id}/allowed-transitions/        GET     Allowed moves from current station
│   ├── {id}/tasks/                      GET     Task executions at current station
│   ├── {id}/tasks/{eid}/                GET     Task execution detail
│   ├── {id}/tasks/{eid}/start/          POST    Start task execution
│   ├── {id}/tasks/{eid}/submit/         POST    Submit task execution
│   ├── {id}/tasks/{eid}/save-draft/     POST    Save draft of task
│   ├── {id}/history/                    GET     Audit log trail
│   ├── {id}/documents/                  GET     Document trail
│   ├── {id}/documents/                  POST    Upload document
│   ├── {id}/documents/{did}/download/   GET     Download document
│
├── dashboard/
│   ├── admin/                           GET     Admin dashboard stats
│   └── user/                            GET     User dashboard (my workflows)
```

---

# 1. Authentication

## GET /auth/me/

Returns the currently authenticated user and their roles.

**Response 200:**
```json
{
  "id": 5,
  "username": "raj",
  "email": "raj@company.com",
  "first_name": "Raj",
  "last_name": "Kumar",
  "roles": ["QA_TEAM", "QA_MANAGER"],
  "is_admin": false
}
```

---

# 2. Roles

## GET /roles/

Returns all available roles (for station assignment dropdowns).

**Response 200:**
```json
{
  "count": 8,
  "results": [
    {
      "id": 1,
      "name": "PM_TEAM",
      "display_name": "Product Management Team"
    },
    {
      "id": 2,
      "name": "DEV_TEAM",
      "display_name": "Development Team"
    },
    {
      "id": 3,
      "name": "QA_TEAM",
      "display_name": "QA Team"
    },
    {
      "id": 4,
      "name": "QA_MANAGER",
      "display_name": "QA Manager"
    },
    {
      "id": 5,
      "name": "DEV_OPS",
      "display_name": "DevOps Team"
    }
  ]
}
```

---

# 3. Workflow Templates

## GET /templates/

List all templates. Filterable.

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `draft`, `published`, `archived` |
| `category` | string | Filter by category |
| `search` | string | Search in name/description |
| `page` | int | Page number (default 1) |
| `page_size` | int | Page size (default 20) |

**Response 200:**
```json
{
  "count": 12,
  "next": "http://localhost:8000/api/v1/templates/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "SDLC Workflow",
      "description": "Standard Software Development Life Cycle",
      "category": "Software Development",
      "status": "PUBLISHED",
      "current_version": {
        "id": 3,
        "version_label": "v1.0",
        "version_number": 1
      },
      "station_count": 4,
      "instance_count": 38,
      "created_by": "Priya Sharma",
      "created_at": "2026-05-10T08:00:00Z",
      "updated_at": "2026-05-15T14:30:00Z"
    },
    {
      "id": 2,
      "name": "Insurance Claim",
      "description": "Insurance claim processing workflow",
      "category": "Insurance",
      "status": "DRAFT",
      "current_version": null,
      "station_count": 6,
      "instance_count": 0,
      "created_by": "Priya Sharma",
      "created_at": "2026-05-20T09:15:00Z",
      "updated_at": "2026-05-22T11:00:00Z"
    }
  ]
}
```

---

## POST /templates/

Create a new workflow template (starts as DRAFT).

**Request:**
```json
{
  "name": "Purchase Approval",
  "description": "Purchase order approval workflow for procurement",
  "category": "Finance"
}
```

**Response 201:**
```json
{
  "id": 3,
  "name": "Purchase Approval",
  "description": "Purchase order approval workflow for procurement",
  "category": "Finance",
  "status": "DRAFT",
  "current_version": null,
  "station_count": 0,
  "instance_count": 0,
  "created_by": "Priya Sharma",
  "created_at": "2026-05-24T10:00:00Z",
  "updated_at": "2026-05-24T10:00:00Z"
}
```

---

## GET /templates/{id}/

Get full template detail.

**Response 200:**
```json
{
  "id": 1,
  "name": "SDLC Workflow",
  "description": "Standard Software Development Life Cycle",
  "category": "Software Development",
  "status": "PUBLISHED",
  "current_version": {
    "id": 3,
    "version_label": "v1.0",
    "version_number": 1,
    "published_by": "Priya Sharma",
    "published_at": "2026-05-15T14:30:00Z",
    "change_notes": "Initial version of SDLC workflow"
  },
  "draft_version": null,
  "has_draft": false,
  "station_count": 4,
  "transition_count": 4,
  "task_count": 3,
  "instance_count": 38,
  "created_by": "Priya Sharma",
  "created_at": "2026-05-10T08:00:00Z",
  "updated_at": "2026-05-15T14:30:00Z"
}
```

When a template has a **draft in progress** (being edited for next version):

```json
{
  "id": 1,
  "name": "SDLC Workflow",
  "status": "PUBLISHED",
  "current_version": {
    "id": 3,
    "version_label": "v1.0"
  },
  "draft_version": {
    "id": 5,
    "version_label": "v2.0 (Draft)",
    "version_number": 2,
    "created_from_version": 3
  },
  "has_draft": true,
  "...": "..."
}
```

---

## PUT /templates/{id}/

Update template metadata. Only works when template has a DRAFT or draft version.

**Request:**
```json
{
  "name": "SDLC Workflow - Updated",
  "description": "Updated description",
  "category": "Software Development"
}
```

**Response 200:**
```json
{
  "id": 1,
  "name": "SDLC Workflow - Updated",
  "description": "Updated description",
  "category": "Software Development",
  "status": "DRAFT",
  "...": "..."
}
```

**Error 400** (template is published with no draft):
```json
{
  "error": "template_immutable",
  "message": "This template is published. Create a new draft version first to make changes."
}
```

---

## DELETE /templates/{id}/

Delete a template. Only DRAFT templates can be deleted.

**Response 204:** (no body)

**Error 400:**
```json
{
  "error": "cannot_delete_published",
  "message": "Published templates cannot be deleted. Archive it instead."
}
```

---

## POST /templates/{id}/publish/

Publish the template — snapshots all stations, transitions, tasks into a new immutable `WorkflowTemplateVersion`.

**Request:**
```json
{
  "change_notes": "Initial version of SDLC workflow"
}
```

**Validation (returns 400 if fails):**
- At least 1 START station must exist
- At least 1 END station must exist
- Every non-END station must have at least 1 outgoing transition
- START station must have at least 1 outgoing transition

**Response 201:**
```json
{
  "success": true,
  "message": "Template published successfully",
  "template_id": 1,
  "version": {
    "id": 3,
    "version_label": "v1.0",
    "version_number": 1,
    "published_at": "2026-05-15T14:30:00Z",
    "stations_count": 4,
    "transitions_count": 4,
    "tasks_count": 3
  }
}
```

**Error 400:**
```json
{
  "error": "validation_failed",
  "message": "Cannot publish: No START station defined. Each template must have exactly one START station.",
  "details": {
    "missing_start_station": true,
    "missing_end_station": false,
    "stations_without_transitions": ["QA Testing"]
  }
}
```

---

## POST /templates/{id}/create-draft/

Create a new draft version from the last published version. Clones all stations/transitions/tasks.

**Request:**
```json
{
  "change_notes": "Adding security review station"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "New draft version v2.0 created from v1.0",
  "draft_version": {
    "id": 5,
    "version_label": "v2.0 (Draft)",
    "version_number": 2,
    "created_from_version": 3,
    "stations_count": 4,
    "transitions_count": 4,
    "tasks_count": 3
  }
}
```

---

## GET /templates/{id}/versions/

List all published versions of a template.

**Response 200:**
```json
{
  "count": 3,
  "results": [
    {
      "id": 7,
      "version_label": "v3.0",
      "version_number": 3,
      "published_by": "Priya Sharma",
      "published_at": "2026-05-20T10:00:00Z",
      "change_notes": "Added performance testing station",
      "stations_count": 5,
      "instance_count": 12
    },
    {
      "id": 5,
      "version_label": "v2.0",
      "version_number": 2,
      "published_by": "Priya Sharma",
      "published_at": "2026-05-18T09:00:00Z",
      "change_notes": "Added security review station",
      "stations_count": 5,
      "instance_count": 45
    },
    {
      "id": 3,
      "version_label": "v1.0",
      "version_number": 1,
      "published_by": "Priya Sharma",
      "published_at": "2026-05-15T14:30:00Z",
      "change_notes": "Initial version",
      "stations_count": 4,
      "instance_count": 38
    }
  ]
}
```

---

## GET /templates/{id}/versions/{vid}/

Get a specific published version with full structure.

**Response 200:**
```json
{
  "id": 3,
  "version_label": "v1.0",
  "version_number": 1,
  "template_id": 1,
  "template_name": "SDLC Workflow",
  "published_by": "Priya Sharma",
  "published_at": "2026-05-15T14:30:00Z",
  "change_notes": "Initial version",
  "stations": [
    {
      "id": 10,
      "name": "Requirement Gathering",
      "description": "Collect and finalize project requirements",
      "station_type": "START",
      "order": 1,
      "auto_move": false,
      "allowed_roles": [
        {"id": 1, "name": "PM_TEAM", "display_name": "Product Management Team"}
      ],
      "tasks": []
    },
    {
      "id": 11,
      "name": "Development",
      "description": "Write code and perform code reviews",
      "station_type": "NORMAL",
      "order": 2,
      "auto_move": false,
      "allowed_roles": [
        {"id": 2, "name": "DEV_TEAM", "display_name": "Development Team"}
      ],
      "tasks": []
    },
    {
      "id": 12,
      "name": "QA Testing",
      "description": "Test the build and report issues",
      "station_type": "NORMAL",
      "order": 3,
      "auto_move": false,
      "allowed_roles": [
        {"id": 3, "name": "QA_TEAM", "display_name": "QA Team"},
        {"id": 4, "name": "QA_MANAGER", "display_name": "QA Manager"}
      ],
      "tasks": [
        {
          "id": 20,
          "name": "QA Sign-off",
          "task_type": "APPROVAL",
          "is_required": true,
          "order": 1,
          "task_config": {
            "options": ["Approved", "Rejected"],
            "remarks_required": true
          }
        },
        {
          "id": 21,
          "name": "Test Report",
          "task_type": "FORM",
          "is_required": false,
          "order": 2,
          "task_config": {
            "fields": [
              {"key": "test_cases_executed", "label": "Test Cases Executed", "type": "number", "required": true},
              {"key": "test_cases_passed", "label": "Test Cases Passed", "type": "number", "required": true},
              {"key": "test_cases_failed", "label": "Test Cases Failed", "type": "number", "required": true},
              {"key": "summary", "label": "Testing Summary", "type": "textarea", "required": true},
              {"key": "is_regression_suite_run", "label": "Regression Suite Run?", "type": "select", "options": ["Yes", "No"], "required": true}
            ]
          }
        },
        {
          "id": 22,
          "name": "Test Evidence",
          "task_type": "DOCUMENT",
          "is_required": true,
          "order": 3,
          "task_config": {
            "allowed_types": [".pdf", ".png", ".jpg"],
            "max_file_size_mb": 10,
            "min_files": 1
          }
        },
        {
          "id": 23,
          "name": "Pre-Deploy Checklist",
          "task_type": "CONFIRMATION",
          "is_required": true,
          "order": 4,
          "task_config": {
            "checklist": [
              {"key": "unit_tests_passed", "label": "All unit tests passing", "required": true},
              {"key": "security_scan_done", "label": "Security scan completed", "required": true},
              {"key": "db_migrations_ready", "label": "DB migrations prepared", "required": true},
              {"key": "rollback_plan_documented", "label": "Rollback plan documented", "required": true}
            ]
          }
        }
      ]
    },
    {
      "id": 13,
      "name": "Deployment",
      "description": "Deploy to production",
      "station_type": "END",
      "order": 4,
      "auto_move": false,
      "allowed_roles": [
        {"id": 5, "name": "DEV_OPS", "display_name": "DevOps Team"}
      ],
      "tasks": []
    }
  ],
  "transitions": [
    {
      "id": 30,
      "from_station": {"id": 10, "name": "Requirement Gathering"},
      "to_station": {"id": 11, "name": "Development"},
      "label": "",
      "remarks_required": false
    },
    {
      "id": 31,
      "from_station": {"id": 11, "name": "Development"},
      "to_station": {"id": 12, "name": "QA Testing"},
      "label": "Send to QA",
      "remarks_required": false
    },
    {
      "id": 32,
      "from_station": {"id": 12, "name": "QA Testing"},
      "to_station": {"id": 11, "name": "Development"},
      "label": "Reject / Send Back",
      "remarks_required": true
    },
    {
      "id": 33,
      "from_station": {"id": 12, "name": "QA Testing"},
      "to_station": {"id": 13, "name": "Deployment"},
      "label": "Approve / Pass",
      "remarks_required": true
    }
  ]
}
```

---

# 4. Station CRUD (on draft)

All station endpoints operate on the **current draft** of a template. If no draft exists and the template is published, a new draft must be created first.

## GET /templates/{id}/stations/

**Response 200:**
```json
{
  "count": 4,
  "results": [
    {
      "id": 10,
      "name": "Requirement Gathering",
      "description": "Collect and finalize project requirements",
      "station_type": "START",
      "order": 1,
      "auto_move": false,
      "allowed_roles": [1],
      "task_count": 0,
      "outgoing_transition_count": 1
    }
  ]
}
```

---

## POST /templates/{id}/stations/

**Request:**
```json
{
  "name": "Development",
  "description": "Write code and perform code reviews",
  "station_type": "NORMAL",
  "order": 2,
  "auto_move": false,
  "allowed_roles": [2]
}
```

**Response 201:**
```json
{
  "id": 11,
  "name": "Development",
  "description": "Write code and perform code reviews",
  "station_type": "NORMAL",
  "order": 2,
  "auto_move": false,
  "allowed_roles": [
    {"id": 2, "name": "DEV_TEAM", "display_name": "Development Team"}
  ],
  "task_count": 0,
  "outgoing_transition_count": 0,
  "incoming_transition_count": 0
}
```

**Validation:**
- Only one START station allowed per template
- `name` must be unique within the template

---

## PUT /templates/{id}/stations/{sid}/

**Request:**
```json
{
  "name": "Development & Code Review",
  "description": "Updated description",
  "station_type": "NORMAL",
  "order": 2,
  "auto_move": false,
  "allowed_roles": [2, 6]
}
```

**Response 200:** (same shape as POST response)

---

## DELETE /templates/{id}/stations/{sid}/

**Response 204:** (no body)

**Error 400** (if any transitions reference this station):
```json
{
  "error": "station_in_use",
  "message": "Cannot delete station 'Development'. 3 transitions reference it. Delete those transitions first."
}
```

---

# 5. Task Definitions CRUD (on draft)

## GET /templates/{id}/stations/{sid}/tasks/

**Response 200:**
```json
{
  "count": 4,
  "results": [
    {
      "id": 20,
      "name": "QA Sign-off",
      "description": "Approve or reject the build",
      "task_type": "APPROVAL",
      "is_required": true,
      "order": 1,
      "task_config": {
        "options": ["Approved", "Rejected"],
        "remarks_required": true
      }
    },
    {
      "id": 21,
      "name": "Test Report",
      "description": "Fill testing summary",
      "task_type": "FORM",
      "is_required": false,
      "order": 2,
      "task_config": {
        "fields": [
          {"key": "test_cases_executed", "label": "Test Cases Executed", "type": "number", "required": true},
          {"key": "test_cases_passed", "label": "Test Cases Passed", "type": "number", "required": true},
          {"key": "test_cases_failed", "label": "Test Cases Failed", "type": "number", "required": true},
          {"key": "summary", "label": "Testing Summary", "type": "textarea", "required": true},
          {"key": "is_regression_suite_run", "label": "Regression Suite Run?", "type": "select", "options": ["Yes", "No"], "required": true}
        ]
      }
    },
    {
      "id": 22,
      "name": "Test Evidence",
      "description": "Upload screenshots/results",
      "task_type": "DOCUMENT",
      "is_required": true,
      "order": 3,
      "task_config": {
        "allowed_types": [".pdf", ".png", ".jpg"],
        "max_file_size_mb": 10,
        "min_files": 1
      }
    },
    {
      "id": 23,
      "name": "Pre-Deploy Checklist",
      "description": "Tick-box confirmations before deploy",
      "task_type": "CONFIRMATION",
      "is_required": true,
      "order": 4,
      "task_config": {
        "checklist": [
          {"key": "unit_tests_passed", "label": "All unit tests passing", "required": true},
          {"key": "security_scan_done", "label": "Security scan completed", "required": true},
          {"key": "db_migrations_ready", "label": "DB migrations prepared", "required": true},
          {"key": "rollback_plan_documented", "label": "Rollback plan documented", "required": true}
        ]
      }
    }
  ]
}
```

---

## POST /templates/{id}/stations/{sid}/tasks/

**Request (FORM task with dynamic JSON fields):**
```json
{
  "name": "Test Report",
  "description": "Fill testing summary",
  "task_type": "FORM",
  "is_required": false,
  "order": 2,
  "task_config": {
    "fields": [
      {"key": "test_cases_executed", "label": "Test Cases Executed", "type": "number", "required": true},
      {"key": "test_cases_passed", "label": "Test Cases Passed", "type": "number", "required": true},
      {"key": "test_cases_failed", "label": "Test Cases Failed", "type": "number", "required": true},
      {"key": "summary", "label": "Testing Summary", "type": "textarea", "required": true},
      {"key": "is_regression_suite_run", "label": "Regression Suite Run?", "type": "select", "options": ["Yes", "No"], "required": true}
    ]
  }
}
```

**Request (CONFIRMATION task):**
```json
{
  "name": "Pre-Deploy Checklist",
  "description": "Tick-box confirmations before deploy",
  "task_type": "CONFIRMATION",
  "is_required": true,
  "order": 4,
  "task_config": {
    "checklist": [
      {"key": "unit_tests_passed", "label": "All unit tests passing", "required": true},
      {"key": "security_scan_done", "label": "Security scan completed", "required": true},
      {"key": "db_migrations_ready", "label": "DB migrations prepared", "required": true},
      {"key": "rollback_plan_documented", "label": "Rollback plan documented", "required": true}
    ]
  }
}
```

**Request (APPROVAL task):**
```json
{
  "name": "QA Sign-off",
  "description": "Approve or reject the build",
  "task_type": "APPROVAL",
  "is_required": true,
  "order": 1,
  "task_config": {
    "options": ["Approved", "Rejected", "Needs More Work"],
    "remarks_required": true
  }
}
```

**Request (DOCUMENT task):**
```json
{
  "name": "Test Evidence",
  "description": "Upload screenshots/results",
  "task_type": "DOCUMENT",
  "is_required": true,
  "order": 3,
  "task_config": {
    "allowed_types": [".pdf", ".png", ".jpg"],
    "max_file_size_mb": 10,
    "min_files": 1,
    "max_files": 5
  }
}
```

**Response 201:** (same shape as POST, with generated `id`)

---

## PUT /templates/{id}/stations/{sid}/tasks/{tid}/

Same request shape as POST. Full update.

---

## DELETE /templates/{id}/stations/{sid}/tasks/{tid}/

**Response 204:** (no body)

---

# 6. Transitions CRUD (on draft)

## GET /templates/{id}/transitions/

**Response 200:**
```json
{
  "count": 4,
  "results": [
    {
      "id": 30,
      "from_station": {"id": 10, "name": "Requirement Gathering"},
      "to_station": {"id": 11, "name": "Development"},
      "label": "",
      "remarks_required": false
    },
    {
      "id": 31,
      "from_station": {"id": 11, "name": "Development"},
      "to_station": {"id": 12, "name": "QA Testing"},
      "label": "Send to QA",
      "remarks_required": false
    },
    {
      "id": 32,
      "from_station": {"id": 12, "name": "QA Testing"},
      "to_station": {"id": 11, "name": "Development"},
      "label": "Reject / Send Back",
      "remarks_required": true
    },
    {
      "id": 33,
      "from_station": {"id": 12, "name": "QA Testing"},
      "to_station": {"id": 13, "name": "Deployment"},
      "label": "Approve / Pass",
      "remarks_required": true
    }
  ]
}
```

---

## POST /templates/{id}/transitions/

**Request:**
```json
{
  "from_station": 12,
  "to_station": 13,
  "label": "Approve / Pass",
  "remarks_required": true
}
```

**Response 201:**
```json
{
  "id": 33,
  "from_station": {"id": 12, "name": "QA Testing"},
  "to_station": {"id": 13, "name": "Deployment"},
  "label": "Approve / Pass",
  "remarks_required": true
}
```

**Validation:**
- `from_station` and `to_station` must belong to this template
- `from_station` cannot be END type (no outgoing transitions from END)
- `to_station` cannot be START type (no incoming transitions to START)
- Cannot create duplicate (`from_station`, `to_station`) pair
- Self-loops allowed? → Yes, if needed (e.g., "Re-work" at same station). Configurable.

---

## DELETE /templates/{id}/transitions/{tid}/

**Response 204:** (no body)

---

# 7. Workflow Instances

## GET /instances/

List instances. Filterable. Supports all views: Admin (all), BA/PM (my initiated), Operator (assigned to me).

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `active`, `completed`, `cancelled`, `blocked` |
| `template_id` | int | Filter by template |
| `current_station` | int | Filter by current station |
| `assigned_to_me` | bool | Instances where I am the current owner |
| `initiated_by_me` | bool | Instances I initiated (BA/PM view) |
| `search` | string | Search in title, reference |
| `page` | int | Page number |
| `page_size` | int | Page size |

**Response 200:**
```json
{
  "count": 145,
  "next": "http://localhost:8000/api/v1/instances/?page=2",
  "previous": null,
  "results": [
    {
      "id": 42,
      "reference": "WF-1042",
      "title": "Auth Module Development",
      "status": "ACTIVE",
      "template": {
        "id": 1,
        "name": "SDLC Workflow"
      },
      "template_version": {
        "id": 3,
        "version_label": "v1.0"
      },
      "current_station": {
        "id": 12,
        "name": "QA Testing",
        "station_type": "NORMAL"
      },
      "current_owner": {
        "id": 5,
        "username": "raj",
        "full_name": "Raj Kumar"
      },
      "initiated_by": {
        "id": 3,
        "username": "arjun",
        "full_name": "Arjun Mehta"
      },
      "instance_data": {
        "project": "Auth Module",
        "priority": "High",
        "sprint": "Sprint 5"
      },
      "pending_required_tasks": 2,
      "created_at": "2026-05-18T08:30:00Z",
      "updated_at": "2026-05-23T10:15:00Z"
    }
  ]
}
```

---

## POST /instances/

Create a new workflow instance from a published template.

**Request:**
```json
{
  "template_id": 1,
  "title": "Auth Module Development",
  "instance_data": {
    "project": "Auth Module",
    "priority": "High",
    "sprint": "Sprint 5",
    "jira_epic": "AUTH-200",
    "stakeholder": "Security Team"
  }
}
```

**Response 201:**
```json
{
  "id": 42,
  "reference": "WF-1042",
  "title": "Auth Module Development",
  "status": "ACTIVE",
  "template": {"id": 1, "name": "SDLC Workflow"},
  "template_version": {"id": 3, "version_label": "v1.0"},
  "current_station": {
    "id": 10,
    "name": "Requirement Gathering",
    "station_type": "START"
  },
  "initiated_by": {"id": 3, "username": "arjun", "full_name": "Arjun Mehta"},
  "instance_data": {
    "project": "Auth Module",
    "priority": "High",
    "sprint": "Sprint 5",
    "jira_epic": "AUTH-200",
    "stakeholder": "Security Team"
  },
  "created_at": "2026-05-18T08:30:00Z",
  "history_entry": {
    "id": 100,
    "action": "INSTANCE_CREATED",
    "timestamp": "2026-05-18T08:30:00Z"
  }
}
```

**Backend logic on create:**
1. Lookup template → get `current_version`
2. Find the START station in that version
3. Create `WorkflowInstance` with `current_station = START station`
4. Auto-generate reference: `WF-{sequential_id}`
5. Create initial `WorkflowInstanceHistory` (action: INSTANCE_CREATED)
6. Auto-create `TaskExecution` records in PENDING status for all tasks at the START station

---

## GET /instances/{id}/

Full instance detail — the **Overview Tab**.

**Response 200:**
```json
{
  "id": 42,
  "reference": "WF-1042",
  "title": "Auth Module Development",
  "status": "ACTIVE",
  "version": 3,
  "template": {
    "id": 1,
    "name": "SDLC Workflow"
  },
  "template_version": {
    "id": 3,
    "version_label": "v1.0"
  },
  "current_station": {
    "id": 12,
    "name": "QA Testing",
    "station_type": "NORMAL",
    "description": "Test the build and report issues",
    "allowed_roles": [
      {"id": 3, "name": "QA_TEAM", "display_name": "QA Team"},
      {"id": 4, "name": "QA_MANAGER", "display_name": "QA Manager"}
    ]
  },
  "current_owner": {
    "id": 5,
    "username": "raj",
    "full_name": "Raj Kumar"
  },
  "initiated_by": {
    "id": 3,
    "username": "arjun",
    "full_name": "Arjun Mehta"
  },
  "instance_data": {
    "project": "Auth Module",
    "priority": "High",
    "sprint": "Sprint 5",
    "jira_epic": "AUTH-200",
    "stakeholder": "Security Team"
  },

  "user_permissions": {
    "can_execute_tasks": true,
    "can_move_workflow": true,
    "can_upload_documents": true,
    "reason_if_blocked": null
  },

  "progress": {
    "total_stations": 4,
    "completed_stations": 2,
    "stations": [
      {
        "station": {"id": 10, "name": "Requirement Gathering", "station_type": "START"},
        "status": "COMPLETED",
        "entered_at": "2026-05-18T08:30:00Z",
        "exited_at": "2026-05-20T09:00:00Z",
        "owner": {"id": 4, "username": "priya"}
      },
      {
        "station": {"id": 11, "name": "Development", "station_type": "NORMAL"},
        "status": "COMPLETED",
        "entered_at": "2026-05-20T09:00:00Z",
        "exited_at": "2026-05-23T10:15:00Z",
        "owner": {"id": 6, "username": "vikram"}
      },
      {
        "station": {"id": 12, "name": "QA Testing", "station_type": "NORMAL"},
        "status": "CURRENT",
        "entered_at": "2026-05-23T10:15:00Z",
        "exited_at": null,
        "owner": {"id": 5, "username": "raj"},
        "time_in_station": "1 day 4 hours"
      },
      {
        "station": {"id": 13, "name": "Deployment", "station_type": "END"},
        "status": "PENDING",
        "entered_at": null,
        "exited_at": null,
        "owner": null
      }
    ]
  },

  "station_timeline": [
    {"timestamp": "2026-05-18T08:30:00Z", "action": "INSTANCE_CREATED", "by": "Arjun Mehta", "detail": "Instance created from SDLC Workflow v1.0"},
    {"timestamp": "2026-05-20T09:00:00Z", "action": "MOVED", "by": "Priya Sharma", "detail": "Requirement Gathering → Development", "remarks": "Reqs finalized, dev can start"},
    {"timestamp": "2026-05-23T10:15:00Z", "action": "MOVED", "by": "Vikram Singh", "detail": "Development → QA Testing", "remarks": "Dev complete, unit tests passing"}
  ],

  "created_at": "2026-05-18T08:30:00Z",
  "updated_at": "2026-05-23T10:15:00Z",
  "completed_at": null
}
```

---

## PUT /instances/{id}/

Update instance metadata (title, instance_data). Only if status is ACTIVE.

**Request:**
```json
{
  "title": "Auth Module Development - Updated",
  "instance_data": {
    "project": "Auth Module",
    "priority": "Critical",
    "sprint": "Sprint 6"
  }
}
```

**Response 200:** (same as GET response)

---

## POST /instances/{id}/cancel/

Cancel a running instance.

**Request:**
```json
{
  "remarks": "Project scope changed, this workflow is no longer needed"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "WF-1042 has been cancelled",
  "instance": {
    "id": 42,
    "reference": "WF-1042",
    "status": "CANCELLED",
    "updated_at": "2026-05-24T12:00:00Z"
  },
  "history_entry": {
    "id": 110,
    "action": "INSTANCE_CANCELLED",
    "timestamp": "2026-05-24T12:00:00Z"
  }
}
```

---

# 8. THE WORKFLOW ENGINE: Move Endpoint

## POST /instances/{id}/move/

**The central orchestration endpoint.** All workflow movement passes through here.

**Request:**
```json
{
  "to_station_id": 13,
  "remarks": "QA approved. All tests passed. Ready for production deploy."
}
```

**Engine Validation Sequence (in order):**

```
1. Instance exists and is ACTIVE?                 → 404 / 400
2. User is authenticated?                         → 401
3. User has a role in current station's           → 403
   allowed_roles?
4. Transition exists (current → to_station)?      → 400
5. All REQUIRED tasks at current station          → 400
   are COMPLETED?
6. Optimistic lock: version matches?              → 409
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "Workflow moved: QA Testing → Deployment",
  "transition": {
    "id": 33,
    "label": "Approve / Pass",
    "from_station": {"id": 12, "name": "QA Testing"},
    "to_station": {"id": 13, "name": "Deployment"}
  },
  "instance": {
    "id": 42,
    "reference": "WF-1042",
    "status": "COMPLETED",
    "current_station": {"id": 13, "name": "Deployment", "station_type": "END"},
    "version": 4,
    "updated_at": "2026-05-24T14:30:00Z",
    "completed_at": "2026-05-24T14:30:00Z"
  },
  "new_tasks_created": [],
  "history_entry": {
    "id": 108,
    "action": "MOVED",
    "timestamp": "2026-05-24T14:30:00Z"
  }
}
```

**Partial response (instance NOT completed — moved to a NORMAL station):**
```json
{
  "success": true,
  "message": "Workflow moved: Development → QA Testing",
  "instance": {
    "id": 42,
    "reference": "WF-1042",
    "status": "ACTIVE",
    "current_station": {"id": 12, "name": "QA Testing", "station_type": "NORMAL"},
    "version": 3,
    "updated_at": "2026-05-23T10:15:00Z"
  },
  "new_tasks_created": [
    {"id": 55, "task_name": "QA Sign-off", "task_type": "APPROVAL"},
    {"id": 56, "task_name": "Test Report", "task_type": "FORM"},
    {"id": 57, "task_name": "Test Evidence", "task_type": "DOCUMENT"},
    {"id": 58, "task_name": "Pre-Deploy Checklist", "task_type": "CONFIRMATION"}
  ],
  "history_entry": {
    "id": 105,
    "action": "MOVED",
    "timestamp": "2026-05-23T10:15:00Z"
  }
}
```

**Engine post-move actions:**
1. Update `instance.current_station = to_station`
2. Update `instance.current_owner = request.user`
3. Increment `instance.version`
4. If `to_station.station_type == END`: set `instance.status = COMPLETED`, `completed_at = now`
5. If `to_station.auto_move == True` AND no tasks or all tasks auto-completable: auto-trigger next move
6. Create `WorkflowInstanceHistory` (action: MOVED or INSTANCE_COMPLETED)
7. Auto-create `TaskExecution` (PENDING) for all tasks at the new station

---

### Error Responses for Move

**400 — No transition exists:**
```json
{
  "error": "invalid_transition",
  "message": "Cannot move from 'QA Testing' to 'Requirement Gathering'. No such transition exists.",
  "allowed_transitions": [
    {"id": 32, "to_station": 11, "label": "Reject / Send Back"},
    {"id": 33, "to_station": 13, "label": "Approve / Pass"}
  ]
}
```

**400 — Required tasks not completed:**
```json
{
  "error": "tasks_incomplete",
  "message": "2 required tasks are not yet completed. Complete them before moving.",
  "pending_tasks": [
    {"id": 57, "task_name": "Test Evidence", "task_type": "DOCUMENT", "status": "PENDING"},
    {"id": 58, "task_name": "Pre-Deploy Checklist", "task_type": "CONFIRMATION", "status": "PENDING"}
  ],
  "completed_tasks": [
    {"id": 55, "task_name": "QA Sign-off", "task_type": "APPROVAL", "status": "COMPLETED"},
    {"id": 56, "task_name": "Test Report", "task_type": "FORM", "status": "COMPLETED"}
  ]
}
```

**403 — Not authorized at this station:**
```json
{
  "error": "forbidden",
  "message": "You do not have permission to act on 'QA Testing'. Required roles: QA_TEAM, QA_MANAGER. Your roles: DEV_TEAM."
}
```

**409 — Concurrency conflict:**
```json
{
  "error": "concurrency_conflict",
  "message": "This workflow was modified by another user. Please refresh and try again.",
  "current_version": 3,
  "your_version": 2
}
```

**400 — Already at END station:**
```json
{
  "error": "workflow_completed",
  "message": "WF-1042 has already reached its END station (Deployment). No further moves allowed."
}
```

---

## GET /instances/{id}/allowed-transitions/

Get the available transitions from the current station (for rendering move buttons).

**Response 200:**
```json
{
  "current_station": {"id": 12, "name": "QA Testing"},
  "can_move": true,
  "blocked_reason": null,
  "transitions": [
    {
      "id": 32,
      "to_station": {"id": 11, "name": "Development", "station_type": "NORMAL"},
      "label": "Reject / Send Back",
      "remarks_required": true
    },
    {
      "id": 33,
      "to_station": {"id": 13, "name": "Deployment", "station_type": "END"},
      "label": "Approve / Pass",
      "remarks_required": true
    }
  ]
}
```

When blocked (tasks incomplete):
```json
{
  "current_station": {"id": 12, "name": "QA Testing"},
  "can_move": false,
  "blocked_reason": "2 required tasks pending: Test Evidence, Pre-Deploy Checklist",
  "transitions": [
    {
      "id": 32,
      "to_station": {"id": 11, "name": "Development"},
      "label": "Reject / Send Back",
      "remarks_required": true,
      "disabled": true
    },
    {
      "id": 33,
      "to_station": {"id": 13, "name": "Deployment"},
      "label": "Approve / Pass",
      "remarks_required": true,
      "disabled": true
    }
  ]
}
```

---

# 9. Task Executions

## GET /instances/{id}/tasks/

Get all task executions at the **current station** of the instance.

**Response 200:**
```json
{
  "station": {"id": 12, "name": "QA Testing"},
  "count": 4,
  "results": [
    {
      "id": 55,
      "task_definition": {
        "id": 20,
        "name": "QA Sign-off",
        "task_type": "APPROVAL",
        "is_required": true,
        "order": 1,
        "task_config": {
          "options": ["Approved", "Rejected"],
          "remarks_required": true
        }
      },
      "status": "COMPLETED",
      "response_data": {
        "decision": "Approved",
        "remarks": "All tests passed, build is stable"
      },
      "executed_by": {"id": 5, "username": "raj"},
      "created_at": "2026-05-23T10:15:00Z",
      "completed_at": "2026-05-24T14:05:00Z"
    },
    {
      "id": 56,
      "task_definition": {
        "id": 21,
        "name": "Test Report",
        "task_type": "FORM",
        "is_required": false,
        "order": 2,
        "task_config": {
          "fields": [
            {"key": "test_cases_executed", "label": "Test Cases Executed", "type": "number", "required": true},
            {"key": "test_cases_passed", "label": "Test Cases Passed", "type": "number", "required": true},
            {"key": "test_cases_failed", "label": "Test Cases Failed", "type": "number", "required": true},
            {"key": "summary", "label": "Testing Summary", "type": "textarea", "required": true},
            {"key": "is_regression_suite_run", "label": "Regression Suite Run?", "type": "select", "options": ["Yes", "No"], "required": true}
          ]
        }
      },
      "status": "COMPLETED",
      "response_data": {
        "test_cases_executed": 45,
        "test_cases_passed": 42,
        "test_cases_failed": 3,
        "summary": "3 failures in edge-case scenarios, logged as BUG-401, BUG-402, BUG-403",
        "is_regression_suite_run": "Yes"
      },
      "executed_by": {"id": 5, "username": "raj"},
      "created_at": "2026-05-23T10:15:00Z",
      "completed_at": "2026-05-24T14:10:00Z"
    },
    {
      "id": 57,
      "task_definition": {
        "id": 22,
        "name": "Test Evidence",
        "task_type": "DOCUMENT",
        "is_required": true,
        "order": 3,
        "task_config": {
          "allowed_types": [".pdf", ".png", ".jpg"],
          "max_file_size_mb": 10,
          "min_files": 1
        }
      },
      "status": "COMPLETED",
      "response_data": {},
      "documents": [
        {"id": 15, "original_filename": "test-results-sprint-5.pdf"},
        {"id": 16, "original_filename": "screenshot-dashboard.png"},
        {"id": 17, "original_filename": "api-response-log.png"}
      ],
      "executed_by": {"id": 5, "username": "raj"},
      "created_at": "2026-05-23T10:15:00Z",
      "completed_at": "2026-05-24T14:15:00Z"
    },
    {
      "id": 58,
      "task_definition": {
        "id": 23,
        "name": "Pre-Deploy Checklist",
        "task_type": "CONFIRMATION",
        "is_required": true,
        "order": 4,
        "task_config": {
          "checklist": [
            {"key": "unit_tests_passed", "label": "All unit tests passing", "required": true},
            {"key": "security_scan_done", "label": "Security scan completed", "required": true},
            {"key": "db_migrations_ready", "label": "DB migrations prepared", "required": true},
            {"key": "rollback_plan_documented", "label": "Rollback plan documented", "required": true}
          ]
        }
      },
      "status": "PENDING",
      "response_data": null,
      "executed_by": null,
      "created_at": "2026-05-23T10:15:00Z",
      "completed_at": null
    }
  ]
}
```

---

## POST /instances/{id}/tasks/{eid}/start/

Mark a task execution as IN_PROGRESS.

**Request:**
```json
{}
```

**Response 200:**
```json
{
  "id": 58,
  "status": "IN_PROGRESS",
  "started_at": "2026-05-24T14:20:00Z"
}
```

---

## POST /instances/{id}/tasks/{eid}/submit/

Submit/complete a task execution. The `response_data` varies by task type.

### FORM Task Submit

**Request:**
```json
{
  "response_data": {
    "test_cases_executed": 45,
    "test_cases_passed": 42,
    "test_cases_failed": 3,
    "summary": "3 failures in edge-case scenarios, logged as BUG-401, BUG-402, BUG-403",
    "is_regression_suite_run": "Yes"
  },
  "remarks": "Testing completed with minor issues"
}
```

**Validation:** Engine validates `response_data` against `task_definition.task_config.fields` — checks all required fields present, types match.

### CONFIRMATION Task Submit

**Request:**
```json
{
  "response_data": {
    "unit_tests_passed": true,
    "security_scan_done": false,
    "db_migrations_ready": true,
    "rollback_plan_documented": true
  },
  "remarks": "Security scan still in progress, ETA 30 min"
}
```

**Validation:** If any `required: true` checklist item is `false` → cannot submit.

**Error 400:**
```json
{
  "error": "checklist_incomplete",
  "message": "1 required item is not yet confirmed.",
  "unchecked_required": [
    {"key": "security_scan_done", "label": "Security scan completed"}
  ]
}
```

### APPROVAL Task Submit

**Request:**
```json
{
  "response_data": {
    "decision": "Approved"
  },
  "remarks": "All tests passed, build is stable"
}
```

### DOCUMENT Task Submit

**Request:** (Documents already uploaded via `/instances/{id}/documents/` — this just marks the task complete)
```json
{
  "response_data": {},
  "remarks": "All evidence uploaded"
}
```

**Validation:** Checks that `attached_document_count >= task_config.min_files`.

**Error 400:**
```json
{
  "error": "insufficient_documents",
  "message": "Minimum 1 document required. Currently attached: 0."
}
```

### All Task Types — Success Response

**Response 200:**
```json
{
  "id": 56,
  "status": "COMPLETED",
  "response_data": {
    "test_cases_executed": 45,
    "test_cases_passed": 42,
    "test_cases_failed": 3,
    "summary": "3 failures in edge-case scenarios",
    "is_regression_suite_run": "Yes"
  },
  "completed_at": "2026-05-24T14:10:00Z",
  "history_entry": {
    "id": 106,
    "action": "TASK_COMPLETED",
    "timestamp": "2026-05-24T14:10:00Z"
  }
}
```

---

## POST /instances/{id}/tasks/{eid}/save-draft/

Save partial progress on a task without completing it.

**Request:**
```json
{
  "response_data": {
    "test_cases_executed": 45,
    "test_cases_passed": 42,
    "test_cases_failed": null,
    "summary": "",
    "is_regression_suite_run": null
  }
}
```

**Response 200:**
```json
{
  "id": 56,
  "status": "IN_PROGRESS",
  "message": "Draft saved"
}
```

---

# 10. Audit Log Trail

## GET /instances/{id}/history/

Get the immutable audit log for an instance.

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `action` | string | Filter: `moved`, `task_completed`, `document_uploaded`, `instance_created` |
| `from_date` | date | Filter by date range start |
| `to_date` | date | Filter by date range end |
| `page` | int | Page number |

**Response 200:**
```json
{
  "count": 8,
  "results": [
    {
      "id": 108,
      "action": "MOVED",
      "action_display": "Moved",
      "action_by": {"id": 5, "username": "raj", "full_name": "Raj Kumar"},
      "from_station": {"id": 12, "name": "QA Testing"},
      "to_station": {"id": 13, "name": "Deployment"},
      "remarks": "QA approved. Ready for production deploy.",
      "metadata": {
        "transition_label": "Approve / Pass"
      },
      "timestamp": "2026-05-24T14:30:00Z"
    },
    {
      "id": 107,
      "action": "TASK_COMPLETED",
      "action_display": "Task Completed",
      "action_by": {"id": 5, "username": "raj", "full_name": "Raj Kumar"},
      "task_definition": {"id": 22, "name": "Test Evidence", "task_type": "DOCUMENT"},
      "metadata": {
        "documents_attached": 3,
        "filenames": ["test-results-sprint-5.pdf", "screenshot-dashboard.png", "api-response-log.png"]
      },
      "timestamp": "2026-05-24T14:15:00Z"
    },
    {
      "id": 106,
      "action": "TASK_COMPLETED",
      "action_display": "Task Completed",
      "action_by": {"id": 5, "username": "raj", "full_name": "Raj Kumar"},
      "task_definition": {"id": 21, "name": "Test Report", "task_type": "FORM"},
      "metadata": {
        "test_cases": "45 executed, 42 passed, 3 failed"
      },
      "timestamp": "2026-05-24T14:10:00Z"
    },
    {
      "id": 105,
      "action": "TASK_COMPLETED",
      "action_display": "Task Completed",
      "action_by": {"id": 5, "username": "raj", "full_name": "Raj Kumar"},
      "task_definition": {"id": 20, "name": "QA Sign-off", "task_type": "APPROVAL"},
      "metadata": {
        "decision": "Approved"
      },
      "timestamp": "2026-05-24T14:05:00Z"
    },
    {
      "id": 104,
      "action": "MOVED",
      "action_display": "Moved",
      "action_by": {"id": 6, "username": "vikram", "full_name": "Vikram Singh"},
      "from_station": {"id": 11, "name": "Development"},
      "to_station": {"id": 12, "name": "QA Testing"},
      "remarks": "Dev complete, unit tests passing",
      "timestamp": "2026-05-23T10:15:00Z"
    },
    {
      "id": 103,
      "action": "DOCUMENT_UPLOADED",
      "action_display": "Document Uploaded",
      "action_by": {"id": 6, "username": "vikram", "full_name": "Vikram Singh"},
      "metadata": {
        "filename": "architecture-diagram.png",
        "file_size": "819 KB"
      },
      "timestamp": "2026-05-22T16:45:00Z"
    },
    {
      "id": 102,
      "action": "MOVED",
      "action_display": "Moved",
      "action_by": {"id": 4, "username": "priya", "full_name": "Priya Sharma"},
      "from_station": {"id": 10, "name": "Requirement Gathering"},
      "to_station": {"id": 11, "name": "Development"},
      "remarks": "Reqs finalized, dev can start",
      "timestamp": "2026-05-20T09:00:00Z"
    },
    {
      "id": 101,
      "action": "INSTANCE_CREATED",
      "action_display": "Instance Created",
      "action_by": {"id": 3, "username": "arjun", "full_name": "Arjun Mehta"},
      "metadata": {
        "template": "SDLC Workflow v1.0",
        "initial_data": {"project": "Auth Module", "priority": "High"}
      },
      "timestamp": "2026-05-18T08:30:00Z"
    }
  ]
}
```

---

# 11. Document Trail

## GET /instances/{id}/documents/

Get all documents across all stations for this instance.

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `station_id` | int | Filter by station |
| `page` | int | Page number |

**Response 200:**
```json
{
  "count": 6,
  "results": [
    {
      "id": 17,
      "original_filename": "api-response-log.png",
      "file_size": 327680,
      "file_size_display": "320 KB",
      "content_type": "image/png",
      "station": {"id": 12, "name": "QA Testing"},
      "uploaded_by": {"id": 5, "username": "raj", "full_name": "Raj Kumar"},
      "description": "API test results screenshot",
      "tags": ["test-evidence", "screenshot"],
      "uploaded_at": "2026-05-24T14:15:00Z",
      "download_url": "/api/v1/instances/42/documents/17/download/"
    },
    {
      "id": 16,
      "original_filename": "screenshot-dashboard.png",
      "file_size": 460800,
      "file_size_display": "450 KB",
      "content_type": "image/png",
      "station": {"id": 12, "name": "QA Testing"},
      "uploaded_by": {"id": 5, "username": "raj"},
      "uploaded_at": "2026-05-24T14:15:00Z",
      "download_url": "/api/v1/instances/42/documents/16/download/"
    },
    {
      "id": 15,
      "original_filename": "test-results-sprint-5.pdf",
      "file_size": 2411724,
      "file_size_display": "2.3 MB",
      "content_type": "application/pdf",
      "station": {"id": 12, "name": "QA Testing"},
      "uploaded_by": {"id": 5, "username": "raj"},
      "uploaded_at": "2026-05-24T14:15:00Z",
      "download_url": "/api/v1/instances/42/documents/15/download/"
    },
    {
      "id": 14,
      "original_filename": "code-review-report.pdf",
      "file_size": 1153433,
      "file_size_display": "1.1 MB",
      "content_type": "application/pdf",
      "station": {"id": 11, "name": "Development"},
      "uploaded_by": {"id": 6, "username": "vikram"},
      "uploaded_at": "2026-05-23T11:30:00Z",
      "download_url": "/api/v1/instances/42/documents/14/download/"
    },
    {
      "id": 13,
      "original_filename": "architecture-diagram.png",
      "file_size": 819200,
      "file_size_display": "800 KB",
      "content_type": "image/png",
      "station": {"id": 11, "name": "Development"},
      "uploaded_by": {"id": 6, "username": "vikram"},
      "uploaded_at": "2026-05-22T16:45:00Z",
      "download_url": "/api/v1/instances/42/documents/13/download/"
    },
    {
      "id": 12,
      "original_filename": "requirements-spec-v2.pdf",
      "file_size": 3355443,
      "file_size_display": "3.2 MB",
      "content_type": "application/pdf",
      "station": {"id": 10, "name": "Requirement Gathering"},
      "uploaded_by": {"id": 4, "username": "priya"},
      "uploaded_at": "2026-05-19T09:00:00Z",
      "download_url": "/api/v1/instances/42/documents/12/download/"
    }
  ]
}
```

---

## POST /instances/{id}/documents/

Upload a document. Uses `multipart/form-data`.

**Request (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | The file to upload |
| `description` | string | No | Optional description |
| `tags` | string | No | Comma-separated tags: `screenshot,test-evidence` |
| `task_execution_id` | int | No | Link to a specific task execution |

**Response 201:**
```json
{
  "id": 18,
  "original_filename": "final-report.pdf",
  "file_size": 1048576,
  "file_size_display": "1.0 MB",
  "content_type": "application/pdf",
  "station": {"id": 12, "name": "QA Testing"},
  "uploaded_by": {"id": 5, "username": "raj"},
  "description": "Final QA report",
  "tags": ["report", "final"],
  "task_execution_id": 57,
  "uploaded_at": "2026-05-24T15:00:00Z",
  "download_url": "/api/v1/instances/42/documents/18/download/",
  "history_entry": {
    "id": 109,
    "action": "DOCUMENT_UPLOADED",
    "timestamp": "2026-05-24T15:00:00Z"
  }
}
```

**Validation:**
- If `task_execution_id` provided, validates it belongs to this instance
- File size enforcement from `task_config.max_file_size_mb`
- File type enforcement from `task_config.allowed_types`

---

## GET /instances/{id}/documents/{did}/download/

**Response:** Binary file download with appropriate `Content-Type` and `Content-Disposition` headers.

---

# 12. Dashboard

## GET /dashboard/admin/

Admin dashboard stats. (Screen 1.2)

**Response 200:**
```json
{
  "total_templates": 12,
  "published_templates": 8,
  "draft_templates": 3,
  "archived_templates": 1,
  "total_instances": 1204,
  "active_instances": 145,
  "completed_today": 38,
  "instances_by_template": [
    {"template_id": 1, "template_name": "SDLC Workflow", "count": 340},
    {"template_id": 2, "template_name": "Insurance Claim", "count": 512}
  ],
  "recent_templates": [
    {
      "id": 1,
      "name": "SDLC Workflow",
      "current_version": {"id": 3, "version_label": "v3.0"},
      "status": "PUBLISHED",
      "updated_at": "2026-05-20T10:00:00Z"
    }
  ]
}
```

---

## GET /dashboard/user/

User dashboard. Shows "My Workload". (Screens 2.1, 3.1)

**Response 200:**
```json
{
  "user": {"id": 5, "username": "raj", "full_name": "Raj Kumar"},

  "my_workload": {
    "assigned_to_me": 5,
    "blocked_by_me": 2,
    "completed_by_me": 12
  },

  "my_initiated": {
    "total": 8,
    "in_review": 3,
    "completed": 5
  },

  "recent_instances": [
    {
      "id": 42,
      "reference": "WF-1042",
      "title": "Auth Module Development",
      "template_name": "SDLC Workflow",
      "current_station": {"id": 12, "name": "QA Testing"},
      "status": "ACTIVE",
      "needs_my_action": true,
      "updated_at": "2026-05-24T14:30:00Z"
    },
    {
      "id": 41,
      "reference": "WF-1041",
      "title": "Payment Gateway Integration",
      "template_name": "SDLC Workflow",
      "current_station": {"id": 11, "name": "Development"},
      "status": "ACTIVE",
      "needs_my_action": false,
      "updated_at": "2026-05-22T16:00:00Z"
    }
  ],

  "instance_stats_by_template": [
    {"template_id": 1, "template_name": "SDLC Workflow", "active": 3, "completed": 5},
    {"template_id": 2, "template_name": "Insurance Claim", "active": 2, "completed": 2}
  ]
}
```

---

# 13. Permission Model Summary

| Endpoint | Admin | Initiator (BA/PM) | Operator | Manager | Viewer |
|----------|-------|-------------------|----------|---------|--------|
| `GET /auth/me` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /roles` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /templates` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /templates` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `PUT /templates/{id}` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `DELETE /templates/{id}` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POST /templates/{id}/publish` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POST /templates/{id}/create-draft` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `GET /templates/{id}/versions` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Stations/Transitions/Tasks CRUD | ✅ | ❌ | ❌ | ❌ | ❌ |
| `GET /instances` | ✅ (all) | ✅ (my initiated) | ✅ (assigned) | ✅ (assigned) | ✅ (read-only) |
| `POST /instances` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /instances/{id}` | ✅ | ✅ (if initiated) | ✅ (if assigned) | ✅ (if assigned) | ✅ (read-only) |
| `POST /instances/{id}/move` | ✅ | ❌ | ✅ (if role matches) | ✅ (if role matches) | ❌ |
| `POST /instances/{id}/cancel` | ✅ | ✅ (if initiated) | ❌ | ❌ | ❌ |
| Tasks execute/submit/save-draft | ✅ | ❌ | ✅ (if role matches) | ✅ (if role matches) | ❌ |
| `GET /instances/{id}/history` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /instances/{id}/documents` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /instances/{id}/documents` | ✅ | ✅ | ✅ (if role matches) | ✅ (if role matches) | ❌ |
| `GET /dashboard/admin` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `GET /dashboard/user` | ✅ | ✅ | ✅ | ✅ | ✅ |

---

# 14. Summary: Endpoint Count

| Group | Endpoints | Count |
|-------|-----------|-------|
| Auth | `/auth/me` | 1 |
| Roles | `/roles` | 1 |
| Templates | CRUD + publish + create-draft + versions | 8 |
| Stations | CRUD (on draft) | 5 |
| Task Definitions | CRUD (on draft) | 5 |
| Transitions | CRUD (on draft) | 3 |
| Instances | CRUD + cancel + move + allowed-transitions | 6 |
| Task Executions | list + detail + start + submit + save-draft | 5 |
| History | list (read-only) | 1 |
| Documents | list + upload + download | 3 |
| Dashboard | admin + user | 2 |

**Total: ~40 REST endpoints**
