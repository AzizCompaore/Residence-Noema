"""
URLs for Leads app
"""
from django.urls import path
from .serializers import LeadCreateView
from .serializers import AppointmentNotificationView, LeadCreateView

urlpatterns = [
    path('', LeadCreateView.as_view(), name='lead-create'),
    path('appointment-notification/', AppointmentNotificationView.as_view(), name='appointment-notification'),
]
