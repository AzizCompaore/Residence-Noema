from django.db import migrations


def update_contact_details(apps, schema_editor):
    Residence = apps.get_model('residences', 'Residence')
    Residence.objects.update(
        whatsapp_number='+377678630862',
        email_contact='finance@urielgroup.fr',
    )


class Migration(migrations.Migration):
    dependencies = [
        ('residences', '0010_update_financing_defaults'),
    ]

    operations = [
        migrations.RunPython(update_contact_details, migrations.RunPython.noop),
    ]