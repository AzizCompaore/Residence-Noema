from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import FAQItem


class FAQVisibilityTests(TestCase):
    def setUp(self):
        FAQItem.objects.create(
            category='projet',
            question='Question publiée',
            answer='Réponse publiée',
            is_published=True,
        )
        FAQItem.objects.create(
            category='projet',
            question='Question brouillon',
            answer='Réponse brouillon',
            is_published=False,
        )

    def test_public_api_only_returns_published_items(self):
        response = self.client.get('/api/faq/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['question'] for item in response.json()], ['Question publiée'])

    def test_staff_can_review_unpublished_items(self):
        staff_user = get_user_model().objects.create_superuser(
            username='faq-admin',
            email='faq-admin@example.com',
            password='NoemaSecurePassword!2026',
        )
        self.client.force_login(staff_user)

        response = self.client.get('/api/faq/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)
