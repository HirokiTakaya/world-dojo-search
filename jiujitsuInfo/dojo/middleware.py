from django.utils.deprecation import MiddlewareMixin

class COOPMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        response['Cross-Origin-Opener-Policy'] = 'same-origin'
        return response
