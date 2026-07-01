import logging
from django.db import models
from django.contrib import admin
from django.db.models.query import QuerySet
from django.db.models import Q
from mongoengine import Q as MongoQ

logger = logging.getLogger("carvion.api")

class MongoQuerySet(QuerySet):
    """
    A Django QuerySet proxy that delegates all read, slice, sorting, and filter
    operations directly to a MongoEngine document objects query.
    """
    def __init__(self, model, mongo_qs=None, using=None, hints=None, query=None):
        # Initialize basic django queryset attributes without triggering SQL compilers
        self.model = model
        self._db = using
        self._hints = hints or {}
        self.query = query or self._DummyQuery(model)
        self._result_cache = None
        self._prefetch_related_lookups = ()
        self._iterable_class = None
        
        # Bind the actual MongoEngine queryset query
        if mongo_qs is not None:
            self._mongo_qs = mongo_qs
        else:
            self._mongo_qs = model._mongo_document.objects()

    class _DummyQuery:
        """A stub class to satisfy Django Admin internals referencing qs.query."""
        def __init__(self, model):
            self.model = model
            self.select_related = False
            self.standard_ordering = True
            self.annotation_select = {}
            self.extra = {}
            self.values_select = []
            self.default_cols = True
            self.order_by = []
            self.low_mark = 0
            self.high_mark = None
            self.deferred_loading = (set(), True)
            self.combinations = []

        def chain(self):
            return self

    def _clone(self):
        clone = MongoQuerySet(
            model=self.model,
            mongo_qs=self._mongo_qs,
            using=self._db,
            hints=self._hints,
            query=self.query
        )
        return clone

    def count(self):
        if self._result_cache is not None:
            return len(self._result_cache)
        return self._mongo_qs.count()

    def __len__(self):
        return self.count()

    def __bool__(self):
        return self.count() > 0

    def __getitem__(self, item):
        if self._result_cache is not None:
            return self._result_cache[item]

        if isinstance(item, slice):
            start = item.start or 0
            stop = item.stop
            sliced_qs = self._mongo_qs[start:stop]
            clone = self._clone()
            clone._mongo_qs = sliced_qs
            # Cache results immediately to prevent fallback database queries
            clone._result_cache = [self.model._from_mongo(doc) for doc in sliced_qs]
            return clone
        else:
            doc = self._mongo_qs[item]
            return self.model._from_mongo(doc)

    def __iter__(self):
        self._fetch_all()
        return iter(self._result_cache)

    def _fetch_all(self):
        if self._result_cache is None:
            self._result_cache = [self.model._from_mongo(doc) for doc in self._mongo_qs]

    def iterator(self, chunk_size=2000):
        for doc in self._mongo_qs:
            yield self.model._from_mongo(doc)

    def order_by(self, *field_names):
        mongo_order = []
        for name in field_names:
            if not name:
                continue
            # Translate django admin ordering (e.g. -created_at)
            # Standard order mapping is identical
            mongo_order.append(name)
        clone = self._clone()
        if mongo_order:
            clone._mongo_qs = self._mongo_qs.order_by(*mongo_order)
        return clone

    def filter(self, *args, **kwargs):
        clone = self._clone()
        
        # Translate kwargs filters
        for k, v in kwargs.items():
            # Skip Django internal database/lookup stubs if any
            if k == 'pk' or k == 'id':
                clone._mongo_qs = clone._mongo_qs.filter(id=v)
            else:
                clone._mongo_qs = clone._mongo_qs.filter(**{k: v})

        # Translate Q filters (used by Django Admin search)
        for arg in args:
            if isinstance(arg, Q):
                mongo_q = self._translate_django_q(arg)
                if mongo_q:
                    clone._mongo_qs = clone._mongo_qs.filter(mongo_q)

        return clone

    def _translate_django_q(self, django_q):
        q_list = []
        for child in django_q.children:
            if isinstance(child, Q):
                sub_q = self._translate_django_q(child)
                if sub_q:
                    q_list.append(sub_q)
            else:
                lookup, value = child
                # Translate pk/id fields
                if lookup == 'pk' or lookup == 'id' or lookup == 'id__exact':
                    q_list.append(MongoQ(id=value))
                else:
                    # e.g., name__icontains -> name__icontains (identical lookup suffix mapping)
                    q_list.append(MongoQ(**{lookup: value}))

        if not q_list:
            return None

        connector = django_q.connector
        combined_q = q_list[0]
        for q in q_list[1:]:
            if connector == 'OR':
                combined_q = combined_q | q
            else:
                combined_q = combined_q & q
        return combined_q

    # Stub out standard SQL query features to safely prevent SQL execution
    def select_related(self, *args, **kwargs): return self
    def prefetch_related(self, *args, **kwargs): return self
    def annotate(self, *args, **kwargs): return self
    def alias(self, *args, **kwargs): return self
    def distinct(self, *args, **kwargs): return self
    def none(self):
        clone = self._clone()
        clone._mongo_qs = clone._mongo_qs.none()
        return clone


class MongoAdminModelManager(models.Manager):
    def get_queryset(self):
        return MongoQuerySet(self.model)


class MongoAdminModel(models.Model):
    """
    Base Django Model subclass that is NOT managed by standard migrations,
    uses the MongoQuerySet manager, and defines helper methods to map between
    MongoEngine Documents and Django ORM Model fields.
    """
    objects = MongoAdminModelManager()

    class Meta:
        abstract = True
        managed = False

    @classmethod
    def _from_mongo(cls, doc):
        """Map MongoEngine document values into Django Model fields."""
        raise NotImplementedError

    def save(self, *args, **kwargs):
        # Prevent Django from attempting to execute SQL updates
        pass

    def delete(self, *args, **kwargs):
        # Prevent Django from attempting to execute SQL deletions
        pass


class MongoModelAdmin(admin.ModelAdmin):
    """
    Standard ModelAdmin subclass that delegates operations directly
    to the underlying MongoEngine document layer.
    """
    mongo_model = None

    def get_queryset(self, request):
        # Uses the custom MongoQuerySet manager
        return self.model.objects.get_queryset()

    def get_object(self, request, object_id, from_field=None):
        if not self.mongo_model:
            return None
        try:
            doc = self.mongo_model.objects.get(id=object_id)
            return self.model._from_mongo(doc)
        except Exception:
            return None

    def delete_model(self, request, obj):
        if self.mongo_model:
            try:
                doc = self.mongo_model.objects.get(id=obj.id)
                doc.delete()
            except Exception as e:
                logger.error("Failed to delete Mongo document from admin: %s", str(e))

    def delete_queryset(self, request, queryset):
        for obj in queryset:
            self.delete_model(request, obj)

    def save_model(self, request, obj, form, change):
        if not self.mongo_model:
            return
        
        try:
            if change:
                doc = self.mongo_model.objects.get(id=obj.id)
            else:
                doc = self.mongo_model()

            for field in obj._meta.fields:
                if field.name == 'id' and not change:
                    continue
                
                val = getattr(obj, field.name)
                
                # Resolve potential user references
                if field.name == 'user' or field.name == 'user_id':
                    from apps.authentication.models import User as MongoUser
                    try:
                        # If reference field, fetch document
                        val = MongoUser.objects.get(id=val)
                    except Exception:
                        pass
                
                setattr(doc, field.name, val)
                
            doc.save()
        except Exception as e:
            logger.error("Failed to save Mongo document from admin: %s", str(e))
