import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "signals.settings")
django.setup()

from signals.apps.signals.models import Category

if not Category.objects.filter(name="Afval").exists():
    Category.objects.create(
        name="Afval",
        public_name="Afval op straat",
        is_active=True,
        is_public_accessible=True
    )
    print("Categorie 'Afval' aangemaakt!")
else:
    print("Categorie 'Afval' bestaat al.")
