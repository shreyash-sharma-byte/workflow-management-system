"""
Demo data generator — creates rich demo content for screenshots/presentation.
Run: python manage.py shell < config/demo_data.py
Or: docker-compose exec backend python manage.py shell < config/demo_data.py
"""
import os, django, uuid
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
django.setup()

from django.contrib.auth.models import Group
from apps.accounts.models import User
from apps.workflows.models import WorkflowTemplate, WorkflowTemplateVersion, Station, Transition, TaskDefinition
from apps.instances.models import WorkflowInstance, WorkflowInstanceHistory, TaskExecution
from apps.instances.engine import WorkflowEngine
from apps.notifications.models import Notification
from apps.documents.models import Document
from django.utils import timezone

print("🧹 Clearing all data...")
WorkflowInstanceHistory.objects.all().delete()
TaskExecution.objects.all().delete()
Document.objects.all().delete()
WorkflowInstance.objects.all().delete()
Notification.objects.all().delete()
Transition.objects.all().delete()
TaskDefinition.objects.all().delete()
Station.objects.all().delete()
WorkflowTemplateVersion.objects.all().delete()
WorkflowTemplate.objects.all().delete()
print("✅ Cleared")

# ── Users ────────────────────────────────────────────────
admin = User.objects.get(username='admin.rahul')
priya = User.objects.get(username='pm.divya')
vikram = User.objects.get(username='vikram')
rohan = User.objects.get(username='dev.rohan')
pooja = User.objects.get(username='dev.pooja')
qa_team = User.objects.get(username='qa.amit')
qa_lead = User.objects.get(username='qa.lead.kavya')
pm_head = User.objects.get(username='pm.head.vikram')
admin2 = User.objects.get(username='priya')

# ── Roles ────────────────────────────────────────────────
dev_team = Group.objects.get(name='DEV_TEAM')
qa_role = Group.objects.get(name='QA_TEAM')
pm_team = Group.objects.get(name='PM_TEAM')
admin_role = Group.objects.get(name='ADMIN')
qa_mgr = Group.objects.get(name='QA_MANAGER')
pm_mgr = Group.objects.get(name='PM_MANAGER')
dev_lead = Group.objects.get(name='DEV_LEAD')
hr_team, _ = Group.objects.get_or_create(name='HR_TEAM')
finance, _ = Group.objects.get_or_create(name='FINANCE_TEAM')
devops = Group.objects.get(name='DEV_OPS')

# Add admin and some users to needed groups for demo
admin.groups.add(hr_team, finance, dev_team)
admin2.groups.add(finance)
pm_head.groups.add(hr_team)

engine = WorkflowEngine()

def make_template(name, desc, creator, stations_data):
    """stations_data: [(name, type, roles, tasks)] — tasks: [(name, type, required, config)]"""
    t = WorkflowTemplate.objects.create(name=name, description=desc, status='DRAFT', created_by=creator)
    v = WorkflowTemplateVersion.objects.create(
        template=t, version_number=1, version_label='v1.0', published_by=creator
    )
    t.draft_version = v
    t.save()

    stations = []
    for i, (sname, stype, roles, tasks) in enumerate(stations_data):
        s = Station.objects.create(
            template_version=v, name=sname, station_type=stype, order=i+1
        )
        if roles:
            s.allowed_roles.set(roles)
        for j, (tname, ttype, required, config) in enumerate(tasks):
            td = TaskDefinition.objects.create(
                station=s, name=tname, task_type=ttype, is_required=required,
                order=j+1, task_config=config
            )
            # Assign task roles = station roles
            if roles:
                td.allowed_roles.set(roles)
            td.save()
        stations.append(s)

    # Create transitions between consecutive stations
    for i in range(len(stations) - 1):
        Transition.objects.create(
            template_version=v,
            from_station=stations[i], to_station=stations[i+1],
            label='Send to ' + stations[i+1].name
        )

    # Publish
    t.current_version = v
    t.status = 'PUBLISHED'
    t.draft_version = None
    t.save()
    print(f"  ✅ {name}")
    return t

def make_instance(template, title, user, instance_data=None):
    version = template.current_version
    inst = engine.create_instance(version, user, title, instance_data or {})
    return inst

def do_task(instance, task_exec, user, response, remarks=''):
    return engine.submit_task(task_exec, user, response, remarks)

def move(instance, to_station, user):
    return engine.move(instance, to_station, user)

# ══════════════════════════════════════════════════════════
# TEMPLATE 1: Software Release Approval
# ══════════════════════════════════════════════════════════
t1 = make_template('Software Release Approval', 'Standard release process: development → QA → staging → production sign-off',
    admin, [
    ('Development', 'START', [dev_team], [
        ('Feature Implementation', 'CONFIRMATION', True,
         {'checklist': [{'key':'unit_tests','label':'All unit tests passing','required':True},
                        {'key':'code_review','label':'Peer code review done','required':True},
                        {'key':'docs','label':'API docs updated','required':False}]}),
        ('Deploy to Staging', 'APPROVAL', True,
         {'options': ['Deploy to Staging', 'Needs More Work']}),
    ]),
    ('QA Review', 'NORMAL', [qa_role, qa_mgr], [
        ('Run Test Suite', 'FORM', True,
         {'fields': [{'key':'test_cases','label':'Test Cases Executed','type':'number','required':True},
                     {'key':'passed','label':'Passed','type':'number','required':True},
                     {'key':'failed','label':'Failed','type':'number','required':True},
                     {'key':'summary','label':'Test Summary','type':'textarea','required':True}]}),
        ('Security Scan', 'CONFIRMATION', True,
         {'checklist': [{'key':'owasp','label':'OWASP Top 10 scan completed','required':True},
                        {'key':'deps','label':'Dependency vulnerabilities checked','required':True},
                        {'key':'pentest','label':'Penetration test passed','required':True}]}),
        ('QA Sign-off', 'APPROVAL', True,
         {'options': ['Approved for UAT', 'Rejected - Send Back', 'Conditional Approval']}),
        ('Upload Test Report', 'DOCUMENT', False,
         {'min_files': 0, 'allowed_types': ['.pdf', '.png']}),
    ]),
    ('UAT Verification', 'NORMAL', [pm_team], [
        ('UAT Checklist', 'CONFIRMATION', True,
         {'checklist': [{'key':'smoke','label':'Smoke tests passed','required':True},
                        {'key':'stakeholder','label':'Stakeholder sign-off received','required':True},
                        {'key':'rollback','label':'Rollback plan documented','required':True}]}),
        ('Go/No-Go Decision', 'APPROVAL', True,
         {'options': ['Go for Production', 'No-Go', 'Conditional Go']}),
    ]),
    ('Production Release', 'END', [admin_role], [
        ('Release Notes', 'FORM', True,
         {'fields': [{'key':'version','label':'Release Version','type':'text','required':True},
                     {'key':'highlights','label':'Key Highlights','type':'textarea','required':True},
                     {'key':'rollback','label':'Rollback Plan Reference','type':'text','required':False}]}),
        ('Final Approval', 'APPROVAL', True,
         {'options': ['Released', 'Abort Release']}),
    ]),
])

# ══════════════════════════════════════════════════════════
# TEMPLATE 2: Employee Onboarding
# ══════════════════════════════════════════════════════════
t2 = make_template('Employee Onboarding', 'New employee onboarding: HR → IT → Manager → completion',
    admin, [
    ('HR Initiation', 'START', [hr_team], [
        ('Collect Documents', 'DOCUMENT', False, {'min_files': 1}),
        ('Employee Details Form', 'FORM', True,
         {'fields': [{'key':'full_name','label':'Full Name','type':'text','required':True},
                     {'key':'email','label':'Work Email','type':'email','required':True},
                     {'key':'department','label':'Department','type':'select','options':['Engineering','Product','Sales','Marketing'],'required':True},
                     {'key':'start_date','label':'Start Date','type':'date','required':True}]}),
    ]),
    ('IT Setup', 'NORMAL', [admin_role], [
        ('Equipment Checklist', 'CONFIRMATION', True,
         {'checklist': [{'key':'laptop','label':'Laptop assigned','required':True},
                        {'key':'email','label':'Email account created','required':True},
                        {'key':'vpn','label':'VPN access configured','required':True},
                        {'key':'tools','label':'Dev tools installed','required':True}]}),
    ]),
    ('Manager Introduction', 'NORMAL', [dev_team], [
        ('Team Orientation', 'CONFIRMATION', True,
         {'checklist': [{'key':'intro','label':'Team introduction done','required':True},
                        {'key':'mentor','label':'Buddy/mentor assigned','required':True},
                        {'key':'roadmap','label':'30-60-90 day plan shared','required':True}]}),
    ]),
    ('Onboarding Complete', 'END', [], [
        ('Final Confirmation', 'APPROVAL', True, {'options': ['Onboarding Complete', 'Pending Items']}),
    ]),
])

# ══════════════════════════════════════════════════════════
# TEMPLATE 3: Expense Reimbursement
# ══════════════════════════════════════════════════════════
t3 = make_template('Expense Reimbursement', 'Expense claim: submit → manager approve → finance review → payment',
    priya, [
    ('Expense Submission', 'START', [dev_team, qa_role, pm_team], [
        ('Expense Details', 'FORM', True,
         {'fields': [{'key':'amount','label':'Total Amount ($)','type':'number','required':True},
                     {'key':'category','label':'Category','type':'select','options':['Travel','Meals','Supplies','Software','Other'],'required':True},
                     {'key':'description','label':'Description','type':'textarea','required':True},
                     {'key':'date','label':'Date of Expense','type':'date','required':True}]}),
        ('Attach Receipts', 'DOCUMENT', False, {'min_files': 1}),
    ]),
    ('Manager Approval', 'NORMAL', [pm_mgr, admin_role], [
        ('Review & Approve', 'APPROVAL', True,
         {'options': ['Approved', 'Rejected', 'Needs Clarification']}),
    ]),
    ('Finance Review', 'NORMAL', [finance], [
        ('Verify Receipts', 'CONFIRMATION', True,
         {'checklist': [{'key':'receipts','label':'All receipts attached','required':True},
                        {'key':'policy','label':'Complies with expense policy','required':True},
                        {'key':'budget','label':'Within budget allocation','required':True}]}),
        ('Finance Decision', 'APPROVAL', True,
         {'options': ['Approve Payment', 'Reject', 'Request More Info']}),
    ]),
    ('Payment Processed', 'END', [], [
        ('Payment Confirmation', 'APPROVAL', True,
         {'options': ['Payment Sent', 'Payment Failed']}),
    ]),
])

# ══════════════════════════════════════════════════════════
# TEMPLATE 4: Bug Fix Workflow
# ══════════════════════════════════════════════════════════
t4 = make_template('Bug Fix Workflow', 'Bug lifecycle: triage → dev → code review → QA → deploy',
    admin, [
    ('Bug Triage', 'START', [qa_role, qa_mgr, pm_team], [
        ('Bug Assessment', 'FORM', True,
         {'fields': [{'key':'severity','label':'Severity','type':'select','options':['Critical','High','Medium','Low'],'required':True},
                     {'key':'reproducible','label':'Reproducible?','type':'select','options':['Yes','No','Sometimes'],'required':True},
                     {'key':'found_in','label':'Found in version','type':'text','required':True},
                     {'key':'description','label':'Bug Description','type':'textarea','required':True}]}),
        ('Attach Screenshots', 'DOCUMENT', False, {'min_files': 0, 'max_files': 5}),
    ]),
    ('Development', 'NORMAL', [dev_team], [
        ('Root Cause Analysis', 'FORM', True,
         {'fields': [{'key':'root_cause','label':'Root Cause','type':'textarea','required':True},
                     {'key':'fix_approach','label':'Fix Approach','type':'textarea','required':True},
                     {'key':'estimated_hours','label':'Estimated Hours','type':'number','required':True}]}),
        ('Code Fix', 'APPROVAL', True,
         {'options': ['Fix Completed', 'Cannot Reproduce', 'Won\'t Fix']}),
    ]),
    ('Code Review', 'NORMAL', [dev_team], [
        ('Review Checklist', 'CONFIRMATION', True,
         {'checklist': [{'key':'tests','label':'Tests added for the fix','required':True},
                        {'key':'regression','label':'No regression in related areas','required':True},
                        {'key':'standards','label':'Follows coding standards','required':True}]}),
    ]),
    ('QA Verification', 'NORMAL', [qa_role, qa_mgr], [
        ('Verify Fix', 'APPROVAL', True,
         {'options': ['Fix Verified', 'Still Reproducible', 'Partial Fix']}),
        ('Regression Test', 'FORM', True,
         {'fields': [{'key':'tests_run','label':'Regression Tests Run','type':'number','required':True},
                     {'key':'passed','label':'Passed','type':'number','required':True},
                     {'key':'notes','label':'Notes','type':'textarea','required':False}]}),
    ]),
    ('Deploy Fix', 'END', [admin_role], [
        ('Deployment', 'APPROVAL', True,
         {'options': ['Deployed to Production', 'Scheduled for Next Release']}),
    ]),
])

# ══════════════════════════════════════════════════════════
# TEMPLATE 5: Leave Request
# ══════════════════════════════════════════════════════════
t5 = make_template('Leave Request', 'Leave/PTO request: employee → manager → HR record',
    admin, [
    ('Leave Application', 'START', [dev_team, qa_role, pm_team, admin_role], [
        ('Leave Details', 'FORM', True,
         {'fields': [{'key':'leave_type','label':'Leave Type','type':'select','options':['Annual','Sick','Personal','Unpaid'],'required':True},
                     {'key':'from_date','label':'From Date','type':'date','required':True},
                     {'key':'to_date','label':'To Date','type':'date','required':True},
                     {'key':'reason','label':'Reason','type':'textarea','required':True},
                     {'key':'handover','label':'Handover Person','type':'text','required':True}]}),
    ]),
    ('Manager Decision', 'NORMAL', [pm_mgr, admin_role], [
        ('Approve/Reject', 'APPROVAL', True,
         {'options': ['Approved', 'Rejected', 'Discuss']}),
    ]),
    ('HR Record', 'END', [hr_team], [
        ('Record in System', 'CONFIRMATION', True,
         {'checklist': [{'key':'recorded','label':'Leave recorded in HR system','required':True},
                        {'key':'notified','label':'Team notified','required':True},
                        {'key':'backup','label':'Backup coverage confirmed','required':True}]}),
    ]),
])

print(f"\n📊 Created {WorkflowTemplate.objects.count()} templates")

# ══════════════════════════════════════════════════════════
# INSTANCES: Create 2 per template in varied states
# ══════════════════════════════════════════════════════════

print("\n🔄 Creating instances...")

# ── Template 1: Software Release ───────────────────────
# Instance 1: In progress at QA Review with tasks done
rel_v = t1.current_version
dev_st = rel_v.stations.get(name='Development')
qa_st = rel_v.stations.get(name='QA Review')
uat_st = rel_v.stations.get(name='UAT Verification')
prod_st = rel_v.stations.get(name='Production Release')

# T1 instances
i1 = make_instance(t1, 'v2.4.1 — Payment Gateway Integration', priya)
# Do all dev tasks, move to QA
# Do all dev tasks, move to QA
for te in i1.task_executions.filter(station=dev_st):
    if te.task_definition.name == 'Feature Implementation':
        do_task(i1, te, rohan, {'unit_tests': True, 'code_review': True, 'docs': True}, 'All features done, reviewed by Vikram')
    elif te.task_definition.name == 'Deploy to Staging':
        do_task(i1, te, rohan, {'decision': 'Deploy to Staging'}, 'Staging deployment successful')
move(i1, qa_st, rohan)
# In QA now — do some QA tasks but not all
for te in i1.task_executions.filter(station=qa_st):
    if te.task_definition.name == 'Run Test Suite':
        do_task(i1, te, qa_team, {'test_cases': 120, 'passed': 115, 'failed': 5, 'summary': '5 failures in payment edge cases, under investigation'})
    elif te.task_definition.name == 'Security Scan':
        do_task(i1, te, qa_team, {'owasp': True, 'deps': True, 'pentest': True})
    # Skip DOCUMENT and SIGN_OFF tasks for this instance (in progress)
print("  ✅ Instance: v2.4.1 Payment Gateway (at QA Review, 3/5 tasks done)")

# Instance 2: Completed
i2 = make_instance(t1, 'v2.3.0 — Notification System', priya)
for te in i2.task_executions.filter(station=dev_st):
    do_task(i2, te, rohan, {'unit_tests': True, 'code_review': True, 'docs': True} if 'Feature' in te.task_definition.name else {'decision': 'Deploy to Staging'})
move(i2, qa_st, rohan)
for te in i2.task_executions.filter(station=qa_st):
    if 'Run Test' in te.task_definition.name:
        do_task(i2, te, qa_lead, {'test_cases': 95, 'passed': 95, 'failed': 0, 'summary': 'All tests green'})
    elif 'Security' in te.task_definition.name:
        do_task(i2, te, qa_lead, {'owasp': True, 'deps': True, 'pentest': True})
    elif 'Sign-off' in te.task_definition.name:
        do_task(i2, te, qa_lead, {'decision': 'Approved for UAT'})
    # Skip DOCUMENT task (no files uploaded)
move(i2, uat_st, qa_lead)
for te in i2.task_executions.filter(station=uat_st):
    do_task(i2, te, priya, {'smoke': True, 'stakeholder': True, 'rollback': True} if 'Checklist' in te.task_definition.name else {'decision': 'Go for Production'})
move(i2, prod_st, priya)
for te in i2.task_executions.filter(station=prod_st):
    if 'Release Notes' in te.task_definition.name:
        do_task(i2, te, admin, {'version': 'v2.3.0', 'highlights': 'New notification system with email + in-app', 'rollback': 'Revert commit abc123'})
    else:
        do_task(i2, te, admin, {'decision': 'Released'})
# i2 is now COMPLETED (moved to END station)
print("  ✅ Instance: v2.3.0 Notification System (COMPLETED)")

# ── Template 2: Employee Onboarding ────────────────────
onb_v = t2.current_version
hr_st = onb_v.stations.get(name='HR Initiation')
it_st = onb_v.stations.get(name='IT Setup')
mgr_st = onb_v.stations.get(name='Manager Introduction')
done_st = onb_v.stations.get(name='Onboarding Complete')

i3 = make_instance(t2, 'New Hire — Sarah Chen (Senior Frontend Engineer)', admin)
# HR collects form only (skip doc task since no real files)
for te in i3.task_executions.filter(station=hr_st):
    if 'Collect' in te.task_definition.name:
        continue  # skip DOCUMENT task — needs real file uploads
    else:
        do_task(i3, te, admin, {'full_name': 'Sarah Chen', 'email': 'sarah.chen@company.com', 'department': 'Engineering', 'start_date': '2026-06-15'})
move(i3, it_st, admin)
# IT partially done
for te in i3.task_executions.filter(station=it_st):
        do_task(i3, te, admin, {'laptop': True, 'email': True, 'vpn': True, 'tools': True}, 'All equipment provisioned')
print("  ✅ Instance: Sarah Chen onboarding (at IT Setup, in progress)")

i4 = make_instance(t2, 'New Hire — Alex Kumar (Product Manager)', admin)
for te in i4.task_executions.filter(station=hr_st):
    if 'Collect' in te.task_definition.name:
        continue  # skip doc task
    elif 'Form' in te.task_definition.name:
        do_task(i4, te, admin, {'full_name': 'Alex Kumar', 'email': 'alex.k@company.com', 'department': 'Product', 'start_date': '2026-05-01'})
    else:
        do_task(i4, te, admin, {})
move(i4, it_st, admin)
for te in i4.task_executions.filter(station=it_st):
    do_task(i4, te, admin, {'laptop': True, 'email': True, 'vpn': True, 'tools': True})
move(i4, mgr_st, admin)  # admin can move from IT Setup (ADMIN station)
for te in i4.task_executions.filter(station=mgr_st):
    do_task(i4, te, pooja, {'intro': True, 'mentor': True, 'roadmap': True})
move(i4, done_st, admin)
for te in i4.task_executions.filter(station=done_st):
    do_task(i4, te, admin, {'decision': 'Onboarding Complete'})
print("  ✅ Instance: Alex Kumar onboarding (COMPLETED)")

# ── Template 3: Expense Reimbursement ──────────────────
exp_v = t3.current_version
exp_sub_st = exp_v.stations.get(name='Expense Submission')
mgr_appr_st = exp_v.stations.get(name='Manager Approval')
fin_st = exp_v.stations.get(name='Finance Review')
pay_st = exp_v.stations.get(name='Payment Processed')

i5 = make_instance(t3, 'AWS re:Invent 2026 — Travel Reimbursement', rohan)
for te in i5.task_executions.filter(station=exp_sub_st):
    if te.task_definition.task_type == 'DOCUMENT':
        continue
    if te.task_definition.task_type == 'FORM':
        do_task(i5, te, rohan, {'amount': 2450, 'category': 'Travel', 'description': 'Flight + hotel for AWS re:Invent Las Vegas', 'date': '2026-11-28'})
move(i5, mgr_appr_st, rohan)
print("  ✅ Instance: AWS Travel Reimbursement (at Manager Approval)")

i6 = make_instance(t3, 'Team Lunch — Q2 Celebration', pooja)
for te in i6.task_executions.filter(station=exp_sub_st):
    if te.task_definition.task_type == 'DOCUMENT':
        continue
    if te.task_definition.task_type == 'DOCUMENT':
        continue
    do_task(i6, te, pooja, {'amount': 320, 'category': 'Meals', 'description': 'Team lunch at Olive Garden for Q2 targets met', 'date': '2026-06-15'})
move(i6, mgr_appr_st, pooja)
for te in i6.task_executions.filter(station=mgr_appr_st):
    do_task(i6, te, pm_head, {'decision': 'Approved'}, 'Within team budget, approved')
move(i6, fin_st, pm_head)
for te in i6.task_executions.filter(station=fin_st):
    if 'Verify' in te.task_definition.name:
        do_task(i6, te, admin, {'receipts': True, 'policy': True, 'budget': True})
    else:
        do_task(i6, te, admin, {'decision': 'Approve Payment'})
move(i6, pay_st, admin)
for te in i6.task_executions.filter(station=pay_st):
    do_task(i6, te, admin, {'decision': 'Payment Sent'})
print("  ✅ Instance: Team Lunch Q2 (COMPLETED)")

# ── Template 4: Bug Fix ────────────────────────────────
bug_v = t4.current_version
triage_st = bug_v.stations.get(name='Bug Triage')
dev_fix_st = bug_v.stations.get(name='Development')
cr_st = bug_v.stations.get(name='Code Review')
qa_ver_st = bug_v.stations.get(name='QA Verification')
deploy_st = bug_v.stations.get(name='Deploy Fix')

i7 = make_instance(t4, 'BUG-4891: Login page crashes on Safari 18', qa_team)
for te in i7.task_executions.filter(station=triage_st):
    if te.task_definition.task_type == 'DOCUMENT':
        continue
    else:
        do_task(i7, te, qa_team, {'severity': 'Critical', 'reproducible': 'Yes', 'found_in': 'v2.4.0', 'description': 'Safari 18 throws IndexedDB error on login, entire page crashes to white screen'})
move(i7, dev_fix_st, qa_team)
for te in i7.task_executions.filter(station=dev_fix_st):
    if 'Root Cause' in te.task_definition.name:
        do_task(i7, te, vikram, {'root_cause': 'IndexedDB not supported in Safari 18 private mode. Missing feature detection.', 'fix_approach': 'Add feature detection with localStorage fallback', 'estimated_hours': 4})
    else:
        do_task(i7, te, vikram, {'decision': 'Fix Completed'}, 'Fixed in branch bugfix/safari-login, PR #2841')
move(i7, cr_st, vikram)
print("  ✅ Instance: BUG-4891 Safari login crash (at Code Review)")

i8 = make_instance(t4, 'BUG-4872: Dashboard charts render blank on mobile', qa_team)
for te in i8.task_executions.filter(station=triage_st):
    if te.task_definition.task_type == 'DOCUMENT':
        continue
    do_task(i8, te, qa_team, {'severity': 'Medium', 'reproducible': 'Yes', 'found_in': 'v2.4.0', 'description': 'Charts show blank canvas on viewports < 768px. Canvas width calculates to 0.'})
move(i8, dev_fix_st, qa_team)
for te in i8.task_executions.filter(station=dev_fix_st):
    if 'Root Cause' in te.task_definition.name:
        do_task(i8, te, rohan, {'root_cause': 'Chart.js resize observer not handling CSS grid transitions on mobile', 'fix_approach': 'Added ResizeObserver polyfill + explicit canvas resize on breakpoint change', 'estimated_hours': 3})
    else:
        do_task(i8, te, rohan, {'decision': 'Fix Completed'})
move(i8, cr_st, rohan)
for te in i8.task_executions.filter(station=cr_st):
    do_task(i8, te, vikram, {'tests': True, 'regression': True, 'standards': True})
move(i8, qa_ver_st, vikram)
for te in i8.task_executions.filter(station=qa_ver_st):
    if 'Verify' in te.task_definition.name:
        do_task(i8, te, qa_team, {'decision': 'Fix Verified'})
    else:
        do_task(i8, te, qa_team, {'tests_run': 45, 'passed': 45, 'notes': 'All mobile viewports tested, charts render correctly'})
move(i8, deploy_st, qa_team)
for te in i8.task_executions.filter(station=deploy_st):
    do_task(i8, te, admin, {'decision': 'Deployed to Production'})
print("  ✅ Instance: BUG-4872 Dashboard mobile charts (COMPLETED)")

# ── Template 5: Leave Request ──────────────────────────
leave_v = t5.current_version
leave_start_st = leave_v.stations.get(name='Leave Application')
leave_mgr_st = leave_v.stations.get(name='Manager Decision')
leave_hr_st = leave_v.stations.get(name='HR Record')

i9 = make_instance(t5, 'Annual Leave — 10 days (July 10-20)', rohan)
for te in i9.task_executions.filter(station=leave_start_st):
    do_task(i9, te, rohan, {'leave_type': 'Annual', 'from_date': '2026-07-10', 'to_date': '2026-07-20', 'reason': 'Family vacation to Europe', 'handover': 'Vikram Sharma'})
move(i9, leave_mgr_st, rohan)
print("  ✅ Instance: Annual Leave 10 days (at Manager Decision)")

i10 = make_instance(t5, 'Sick Leave — 1 day (June 5)', pooja)
for te in i10.task_executions.filter(station=leave_start_st):
    do_task(i10, te, pooja, {'leave_type': 'Sick', 'from_date': '2026-06-05', 'to_date': '2026-06-05', 'reason': 'Fever and body ache', 'handover': 'Ananya Patel'})
move(i10, leave_mgr_st, pooja)
for te in i10.task_executions.filter(station=leave_mgr_st):
    do_task(i10, te, pm_head, {'decision': 'Approved'}, 'Get well soon!')
move(i10, leave_hr_st, pm_head)
for te in i10.task_executions.filter(station=leave_hr_st):
    do_task(i10, te, admin, {'recorded': True, 'notified': True, 'backup': True})
print("  ✅ Instance: Sick Leave 1 day (COMPLETED)")

# ── Summary ─────────────────────────────────────────────
print(f"\n🎉 DONE!")
print(f"   Templates: {WorkflowTemplate.objects.count()}")
print(f"   Instances: {WorkflowInstance.objects.count()}")
print(f"   ACTIVE: {WorkflowInstance.objects.filter(status='ACTIVE').count()}")
print(f"   COMPLETED: {WorkflowInstance.objects.filter(status='COMPLETED').count()}")
print(f"   Task Executions: {TaskExecution.objects.count()}")
print(f"   History Entries: {WorkflowInstanceHistory.objects.count()}")
print(f"   Notifications: {Notification.objects.count()}")
print(f"   Documents: {Document.objects.count()}")
