# dojo/admin.py

from django.contrib import admin
from .models import Dojo, Feedback, OpenMat

class DojoAdmin(admin.ModelAdmin):
    filter_horizontal = ('open_mats',)
    list_display = ('name', 'address', 'is_visitor_friendly')
    list_filter = ('is_visitor_friendly',)

admin.site.register(Dojo, DojoAdmin)
admin.site.register(OpenMat)
admin.site.register(Feedback)
