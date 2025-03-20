# jiujitsuInfo/views.py (新規作成)
# jiujitsuInfo/views.py

# jiujitsuInfo/views.py
from django.http import HttpResponse

def home(request):
    return HttpResponse("Hello, this is the home page.")
