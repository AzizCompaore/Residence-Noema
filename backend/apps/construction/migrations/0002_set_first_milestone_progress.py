from django.db import migrations


def set_first_milestone_progress(apps, schema_editor):
    ConstructionMilestone = apps.get_model('construction', 'ConstructionMilestone')
    ConstructionMilestone.objects.filter(
        stage_number=1,
        status='in_progress',
    ).update(progress_percent=80)


class Migration(migrations.Migration):
    dependencies = [
        ('construction', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(set_first_milestone_progress, migrations.RunPython.noop),
    ]