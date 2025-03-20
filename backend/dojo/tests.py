from django.test import TestCase
from .models import Dojo, OpenMat
from unittest.mock import patch

class DojoSignalTest(TestCase):
    @patch('dojo.tasks.fetch_open_mat_info_from_website')
    @patch('dojo.tasks.fetch_open_mat_info_via_google_search')
    def test_dojo_creation_with_open_mat(self, mock_google_search, mock_website):
        mock_website.return_value = True
        mock_google_search.return_value = False

        dojo = Dojo.objects.create(
            name="Test Dojo",
            address="123 Test Street",
            latitude=35.6895,
            longitude=139.6917,
            website="https://testdojo.com",
            is_visitor_friendly=True
        )

        self.assertTrue(dojo.has_open_mat())
        self.assertEqual(dojo.open_mats.count(), 1)
        open_mat = dojo.open_mats.first()
        self.assertEqual(open_mat.day_of_week, 'Monday')
        self.assertEqual(open_mat.start_time.strftime('%H:%M'), '18:00')
        self.assertEqual(open_mat.end_time.strftime('%H:%M'), '20:00')

    @patch('dojo.tasks.fetch_open_mat_info_from_website')
    @patch('dojo.tasks.fetch_open_mat_info_via_google_search')
    def test_dojo_creation_without_open_mat(self, mock_google_search, mock_website):
        mock_website.return_value = False
        mock_google_search.return_value = False

        dojo = Dojo.objects.create(
            name="No Open Mat Dojo",
            address="456 No Mat Avenue",
            latitude=34.0522,
            longitude=-118.2437,
            website="https://noopenmatdojo.com",
            is_visitor_friendly=False
        )

        self.assertFalse(dojo.has_open_mat())
        self.assertEqual(dojo.open_mats.count(), 0)
