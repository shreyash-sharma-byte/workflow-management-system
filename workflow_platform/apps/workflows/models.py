from django.db import models

# ── Workflow Template ────────────────────────────────────────

class WorkflowTemplate(models.Model):
    """
    Master workflow template. Editable while status=DRAFT.
    Once published, becomes immutable — edit requires create-draft.
    """
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PUBLISHED = 'PUBLISHED', 'Published'
        ARCHIVED = 'ARCHIVED', 'Archived'

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    # Denormalized pointer to the currently published version (NULL if never published)
    current_version = models.ForeignKey(
        'WorkflowTemplateVersion',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='currently_for_template'
    )

    # The current draft version (if being edited for next version)
    draft_version = models.ForeignKey(
        'WorkflowTemplateVersion',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='draft_for_template'
    )

    created_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='templates_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.status})"

    @property
    def is_published(self):
        return self.status == self.Status.PUBLISHED

    @property
    def has_draft(self):
        return self.draft_version is not None


# ── Workflow Template Version ────────────────────────────────

class WorkflowTemplateVersion(models.Model):
    """Immutable snapshot of a template at publish time."""
    template = models.ForeignKey(WorkflowTemplate, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    version_label = models.CharField(max_length=50)

    published_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='published_versions')
    published_at = models.DateTimeField(auto_now_add=True)
    change_notes = models.TextField(blank=True)

    # If this version was used to create a new draft, this points to that draft
    next_draft = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='previous_version')

    class Meta:
        unique_together = [('template', 'version_number')]
        ordering = ['-version_number']

    def __str__(self):
        return f"{self.template.name} v{self.version_number}"


# ── Station ─────────────────────────────────────────────────

class Station(models.Model):
    """A workflow stage within a template version."""
    class StationType(models.TextChoices):
        START = 'START', 'Start'
        NORMAL = 'NORMAL', 'Normal'
        END = 'END', 'End'

    template_version = models.ForeignKey(WorkflowTemplateVersion, on_delete=models.CASCADE,
                                         related_name='stations')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    station_type = models.CharField(max_length=10, choices=StationType.choices, default=StationType.NORMAL)
    order = models.PositiveIntegerField(default=0)

    # Roles allowed to act on this station (references Django Group)
    allowed_roles = models.ManyToManyField('auth.Group', blank=True, related_name='accessible_stations')

    configuration = models.JSONField(default=dict, blank=True)
    auto_move = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['template_version', 'order']
        unique_together = [('template_version', 'name')]

    def __str__(self):
        return f"{self.name} ({self.station_type})"

    @property
    def is_start(self):
        return self.station_type == self.StationType.START

    @property
    def is_end(self):
        return self.station_type == self.StationType.END


# ── Transition ──────────────────────────────────────────────

class Transition(models.Model):
    """Directional edge: from_station → to_station."""
    template_version = models.ForeignKey(WorkflowTemplateVersion, on_delete=models.CASCADE,
                                         related_name='transitions')
    from_station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name='outgoing_transitions')
    to_station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name='incoming_transitions')
    label = models.CharField(max_length=100, blank=True)
    remarks_required = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('template_version', 'from_station', 'to_station')]
        ordering = ['from_station__order']

    def __str__(self):
        label_str = f" ({self.label})" if self.label else ""
        return f"{self.from_station.name} → {self.to_station.name}{label_str}"


# ── Task Definition ─────────────────────────────────────────

class TaskDefinition(models.Model):
    """Template-level task configuration with JSON-driven form config."""
    class TaskType(models.TextChoices):
        APPROVAL = 'APPROVAL', 'Approval'
        FORM = 'FORM', 'Form'
        DOCUMENT = 'DOCUMENT', 'Document Upload'
        CONFIRMATION = 'CONFIRMATION', 'Confirmation Checklist'
        PAYMENT = 'PAYMENT', 'Payment'
        API = 'API', 'API Call'
        EMAIL = 'EMAIL', 'Email Notification'

    station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name='task_definitions')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    task_type = models.CharField(max_length=20, choices=TaskType.choices)
    is_required = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    # JSON configuration — drives dynamic form rendering
    # See API-Design.md Section 5 for full schema per task type
    task_config = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['station', 'order']
        unique_together = [('station', 'name')]

    def __str__(self):
        return f"{self.name} ({self.task_type}) @ {self.station.name}"
