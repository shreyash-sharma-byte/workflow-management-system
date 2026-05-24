# Seed Users & Passwords
# Enterprise Workflow Management System
# ============================================================

DEFAULT PASSWORD FOR ALL USERS: Workflow@123

---

## Keycloak Admin
| Username | Password | Realm |
|----------|----------|-------|
| admin    | admin    | master |

---

## Users by Role

### ADMIN (System Administrator)
| Username          | Full Name      | Email                    |
|-------------------|----------------|--------------------------|
| priya             | Priya Sharma   | priya@company.com        |
| admin.rahul       | Rahul Verma    | rahul@company.com        |
| admin.sneha       | Sneha Patel    | sneha@company.com        |

### PM_TEAM (Product Management)
| Username          | Full Name      | Email                    |
|-------------------|----------------|--------------------------|
| ananya            | Ananya Gupta   | ananya@company.com       |
| pm.karan          | Karan Joshi    | karan@company.com        |
| pm.divya          | Divya Reddy    | divya@company.com        |

### PM_MANAGER (Product Management Manager)
| Username          | Full Name      | Email                    |
|-------------------|----------------|--------------------------|
| manager.akash     | Akash Singh    | akash@company.com        |
| pm.lead.meera     | Meera Nair     | meera@company.com        |
| pm.head.vikram    | Vikram Chopra  | vikram.head@company.com  |

### DEV_TEAM (Development Team)
| Username          | Full Name      | Email                    |
|-------------------|----------------|--------------------------|
| vikram            | Vikram Singh   | vikram@company.com       |
| dev.rohan         | Rohan Das      | rohan@company.com        |
| dev.pooja         | Pooja Iyer     | pooja@company.com        |

### DEV_LEAD (Development Lead)
| Username          | Full Name      | Email                    |
|-------------------|----------------|--------------------------|
| lead.arjun        | Arjun Nair     | arjun.lead@company.com   |
| lead.neha         | Neha Kulkarni  | neha.lead@company.com    |
| lead.manoj        | Manoj Tiwari   | manoj@company.com        |

### QA_TEAM (QA Team)
| Username          | Full Name      | Email                    |
|-------------------|----------------|--------------------------|
| raj               | Raj Kumar      | raj@company.com          |
| qa.sita           | Sita Menon     | sita@company.com         |
| qa.amit           | Amit Saxena    | amit@company.com         |

### QA_MANAGER (QA Manager)
| Username          | Full Name      | Email                    |
|-------------------|----------------|--------------------------|
| amit.manager      | Amit Shah      | amit.manager@company.com |
| qa.lead.kavya     | Kavya Rao      | kavya@company.com        |
| qa.head.suresh    | Suresh Pillai  | suresh@company.com       |

### DEV_OPS (DevOps Team)
| Username          | Full Name      | Email                    |
|-------------------|----------------|--------------------------|
| ops.rajesh        | Rajesh Kumar   | rajesh@company.com       |
| ops.deepika       | Deepika Sen    | deepika@company.com      |
| ops.harish        | Harish Bhat    | harish@company.com       |

### AUDITOR (Auditor - Read Only)
| Username          | Full Name      | Email                    |
|-------------------|----------------|--------------------------|
| neha              | Neha Desai     | neha@company.com         |
| auditor.ravi      | Ravi Malhotra  | ravi@company.com         |
| auditor.tina      | Tina Bose      | tina@company.com         |

---

## Quick Test Users (also in Keycloak realm export)

| Username   | Role       | Password    |
|------------|------------|-------------|
| priya      | ADMIN      | Workflow@123 |
| ananya     | PM_TEAM    | Workflow@123 |
| vikram     | DEV_TEAM   | Workflow@123 |
| raj        | QA_TEAM    | Workflow@123 |
| neha       | AUDITOR    | Workflow@123 |
| arjun      | PM_TEAM    | Workflow@123 |
| amit.manager | QA_MANAGER | Workflow@123 |
| ops.rajesh | DEV_OPS    | Workflow@123 |

---

## Role ↔ Permissions

| Role        | Can Create Templates | Can Create Instances | Can Execute Tasks | Can Move Workflow | View Audit Log |
|-------------|:--------------------:|:--------------------:|:-----------------:|:-----------------:|:--------------:|
| ADMIN       | ✓                    | ✓                    | ✓                 | ✓                 | ✓              |
| PM_TEAM     | ✗                    | ✓                    | ✗                 | ✗                 | ✓              |
| PM_MANAGER  | ✗                    | ✓                    | ✗                 | ✗                 | ✓              |
| DEV_TEAM    | ✗                    | ✗                    | ✓ (at their station) | ✓ (at their station) | ✓          |
| DEV_LEAD    | ✗                    | ✗                    | ✓                 | ✓                 | ✓              |
| QA_TEAM     | ✗                    | ✗                    | ✓                 | ✓                 | ✓              |
| QA_MANAGER  | ✗                    | ✗                    | ✓                 | ✓                 | ✓              |
| DEV_OPS     | ✗                    | ✗                    | ✓                 | ✓                 | ✓              |
| AUDITOR     | ✗                    | ✗                    | ✗                 | ✗                 | ✓ (read-only)  |

---

## How to Get a Token (curl)

```bash
# Replace USERNAME with any user from above
curl -s -X POST "http://localhost:8080/realms/workflow-realm/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=workflow-platform" \
  -d "username=USERNAME" \
  -d "password=Workflow@123" \
  -d "grant_type=password" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])"
```
