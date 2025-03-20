# dojo/management/commands/update_dojo_hours.py

from django.core.management.base import BaseCommand
from dojo.models import Dojo
from dojo.utils import fetch_place_details
from django.conf import settings

class Command(BaseCommand):
    help = 'Update hours for all Dojo objects'

    def handle(self, *args, **options):
        api_key = settings.GOOGLE_API_KEY
        if not api_key:
            self.stdout.write(self.style.ERROR('Google API key is missing in settings.'))
            return

        dojos = Dojo.objects.all()
        for dojo in dojos:
            detail_data = fetch_place_details("https://maps.googleapis.com/maps/api/place/details/json", dojo.place_id, api_key)
            if detail_data and 'hours' in detail_data:
                dojo.hours = detail_data['hours']
                dojo.save()
                self.stdout.write(self.style.SUCCESS(f'Updated hours for {dojo.name}'))
            else:
                dojo.hours = ["No hours available"]
                dojo.save()
                self.stdout.write(self.style.WARNING(f'No hours found for {dojo.name}, set to default'))
