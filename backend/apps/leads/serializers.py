from rest_framework import serializers, generics, permissions
from rest_framework.throttling import AnonRateThrottle
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from .models import Lead


def notify_sales_team(subject, message, reply_to=None):
    recipient = getattr(settings, 'NOEMA_CONTACT_EMAIL', 'finance@urielgroup.fr')
    send_mail(
        subject,
        message,
        getattr(settings, 'DEFAULT_FROM_EMAIL', recipient),
        [recipient],
        fail_silently=False,
        reply_to=[reply_to] if reply_to else None,
    )


class LeadSerializer(serializers.ModelSerializer):
    """
    Reçoit la soumission du simulateur / des formulaires de financement.
    Le frontend envoie `interested_apartment_id` (voir types.ts::LeadSubmission) ;
    on l'expose ici pour ne pas imposer un renommage côté React.
    """
    interested_apartment_id = serializers.PrimaryKeyRelatedField(
        source='interested_apartment', queryset=Lead._meta.get_field('interested_apartment').related_model.objects.all(),
        required=False, allow_null=True
    )
    simulation = serializers.JSONField(source='simulation_data', required=False)
    website = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=0)

    class Meta:
        model = Lead
        fields = [
            'id', 'first_name', 'last_name', 'phone_whatsapp', 'email', 'residence_country',
            'age', 'employment_status', 'professional_seniority_years',
            'project_purpose', 'funds_availability',
            'monthly_net_income', 'has_co_borrower', 'co_borrower_monthly_income',
            'additional_monthly_income', 'down_payment', 'existing_monthly_loans',
            'desired_duration_years', 'interested_apartment_id', 'interested_apartment_ref',
            'interested_apartment_price', 'simulation', 'ai_conversation_summary', 'notes',
            'utm_source', 'utm_medium', 'utm_campaign',
            'consent_marketing', 'consent_data_processing',
            'website',
            'pipeline_stage', 'created_at',
        ]
        read_only_fields = ['id', 'pipeline_stage', 'created_at']

    def validate(self, attrs):
        if attrs.get('consent_data_processing') is not True:
            raise serializers.ValidationError({'consent_data_processing': 'Ce consentement est requis pour traiter la demande.'})
        return attrs

    def validate_email(self, value):
        validate_email(value)
        return value.strip().lower()

    def validate_phone_whatsapp(self, value):
        value = value.strip()
        if len(''.join(character for character in value if character.isdigit())) < 7:
            raise serializers.ValidationError('Veuillez fournir un numéro de téléphone valide.')
        return value


class LeadCreateView(generics.CreateAPIView):
    """
    Endpoint public (formulaire de simulation / rappel) : création uniquement.
    La consultation des prospects reste réservée au back-office Django Admin.
    """
    serializer_class = LeadSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]
    queryset = Lead.objects.all()

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def get(self, request, *args, **kwargs):
        leads = self.get_queryset().select_related('interested_apartment')
        serializer = self.get_serializer(leads, many=True)
        return Response({'success': True, 'data': serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        email = validated_data.get('email', '').lower().strip()
        phone = ''.join(character for character in validated_data.get('phone_whatsapp', '') if character.isdigit())
        existing_lead = next(
            (
                lead for lead in Lead.objects.all()
                if lead.email.lower().strip() == email
                or ''.join(character for character in lead.phone_whatsapp if character.isdigit()) == phone
            ),
            None,
        )
        if existing_lead:
            for field, value in validated_data.items():
                if field not in {'pipeline_stage', 'notes'} and value not in (None, '', {}):
                    setattr(existing_lead, field, value)
            existing_lead.follow_up_count += 1
            existing_lead.save()
            lead = existing_lead
        else:
            lead = serializer.save()
        simulation = validated_data.get('simulation_data') or {}
        try:
            notify_sales_team(
                f'Nouvelle demande de financement - {lead.first_name} {lead.last_name}',
                (
                    'Une nouvelle demande de financement a été enregistrée depuis le site NOEMA.\n\n'
                    f'Nom : {lead.first_name} {lead.last_name}\n'
                    f'Email : {lead.email}\n'
                    f'WhatsApp : {lead.phone_whatsapp}\n'
                    f'Pays de résidence : {lead.residence_country}\n'
                    f'Lot : {lead.interested_apartment_ref or "Non précisé"}\n'
                    f'Prix du lot : {lead.interested_apartment_price or "Non précisé"} FCFA\n'
                    f'Apport : {lead.down_payment or "Non précisé"} FCFA\n'
                    f'Durée : {lead.desired_duration_years or "Non précisée"} ans\n'
                    f'Simulation : {simulation}\n\n'
                    'Le prospect a demandé une étude personnalisée.'
                ),
                reply_to=lead.email,
            )
        except Exception:
            # The lead remains saved in the CRM if SMTP is temporarily unavailable.
            pass
        return Response(
            {'success': True, 'message': 'Votre demande a bien été enregistrée. Un conseiller Uriel Group vous recontacte très prochainement.', 'data': {'id': lead.id}},
            status=201
        )



class AppointmentNotificationView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        required_fields = ('first_name', 'last_name', 'email', 'phone_whatsapp', 'appointment_date', 'appointment_time')
        if str(request.data.get('website', '')).strip():
            return Response({'success': False, 'error': 'Demande invalide.'}, status=400)
        if request.data.get('consent_data_processing') is not True:
            return Response({'success': False, 'error': 'Votre accord est requis pour traiter la demande.'}, status=400)
        appointment_mode = str(request.data.get('appointment_mode', '')).strip()
        if appointment_mode not in {'visio', 'presentiel'}:
            return Response({'success': False, 'error': 'Choisissez un type de rendez-vous valide.'}, status=400)
        if any(not str(request.data.get(field, '')).strip() for field in required_fields):
            return Response({'success': False, 'error': 'Tous les champs du rendez-vous sont obligatoires.'}, status=400)

        first_name = str(request.data['first_name']).strip()
        last_name = str(request.data['last_name']).strip()
        email = str(request.data['email']).strip()
        try:
            validate_email(email)
        except ValidationError:
            return Response({'success': False, 'error': 'Adresse email invalide.'}, status=400)
        phone_whatsapp = str(request.data['phone_whatsapp']).strip()
        appointment_date = str(request.data['appointment_date']).strip()
        appointment_time = str(request.data['appointment_time']).strip()
        timezone = str(request.data.get('timezone', 'Africa/Abidjan')).strip()
        recipient = getattr(settings, 'NOEMA_CONTACT_EMAIL', 'finance@urielgroup.fr')
        subject = f'Nouvelle demande de rendez-vous visio - {first_name} {last_name}'
        message = (
            'Une nouvelle demande de rendez-vous visio a été soumise depuis le site NOEMA.\n\n'
            f'Nom : {first_name} {last_name}\n'
            f'Email : {email}\n'
            f'WhatsApp : {phone_whatsapp}\n'
            f'Date demandée : {appointment_date}\n'
            f'Heure demandée : {appointment_time}\n'
            f'Type de rendez-vous : {"Présentiel" if appointment_mode == "presentiel" else "Visio"}\n'
            f'Fuseau : {timezone}\n\n'
            'Merci de confirmer le créneau avec le prospect.'
        )
        try:
            send_mail(
                subject,
                message,
                getattr(settings, 'DEFAULT_FROM_EMAIL', recipient),
                [recipient],
                fail_silently=False,
                reply_to=[email],
            )
        except Exception:
            return Response({'success': False, 'error': 'La demande est valide mais l’envoi de l’email a échoué. Vérifiez la configuration SMTP.'}, status=502)

        return Response({'success': True, 'message': 'La demande de rendez-vous a été envoyée à notre équipe.'}, status=201)
