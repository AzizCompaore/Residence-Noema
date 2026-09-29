from django.db import migrations


def update_financing_defaults(apps, schema_editor):
    Residence = apps.get_model('residences', 'Residence')
    Residence.objects.update(
        indicative_interest_rate=8.0,
        indicative_debt_ratio_limit=35.0,
    )


class Migration(migrations.Migration):
    dependencies = [
        ('residences', '0009_set_estimated_delivery_month'),
    ]

    operations = [
        migrations.RunPython(update_financing_defaults, migrations.RunPython.noop),
    ]