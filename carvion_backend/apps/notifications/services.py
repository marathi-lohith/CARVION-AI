import queue
import json
import logging
from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer

logger = logging.getLogger("carvion.api")

# Global in-memory list tracking active SSE queues: { user_id_str: [Queue, Queue, ...] }
sse_listeners = {}

def register_listener(user_id_str: str) -> queue.Queue:
    """Register a new connection queue listener for real-time SSE streams."""
    q = queue.Queue(maxsize=15)
    if user_id_str not in sse_listeners:
        sse_listeners[user_id_str] = []
    sse_listeners[user_id_str].append(q)
    return q


def unregister_listener(user_id_str: str, q: queue.Queue):
    """Clean up and remove a closed queue listener from memory mappings."""
    if user_id_str in sse_listeners:
        if q in sse_listeners[user_id_str]:
            sse_listeners[user_id_str].remove(q)
        if not sse_listeners[user_id_str]:
            del sse_listeners[user_id_str]


def send_notification(user, type_str: str, title: str, message: str) -> Notification:
    """
    Publish a notification event:
    1. Saves the record to MongoDB collection.
    2. Serializes details and broadcasts to any active real-time SSE queues.
    """
    # Write alert record
    notification = Notification(
        user=user,
        type=type_str,
        title=title,
        message=message
    )
    notification.save()
    
    # Broadcast details
    serializer = NotificationSerializer(notification)
    serialized_payload = json.dumps(serializer.data)
    
    user_id_str = str(user.id)
    if user_id_str in sse_listeners:
        logger.info("Broadcasting real-time alert event to %d active SSE tabs for user: %s", len(sse_listeners[user_id_str]), user.email)
        for q in sse_listeners[user_id_str]:
            try:
                # Evict oldest if queue overflowed to prevent blocking
                if q.full():
                    try:
                        q.get_nowait()
                    except queue.Empty:
                        pass
                q.put_nowait(serialized_payload)
            except Exception as exc:
                logger.error("Failed to push alert to client queue: %s", str(exc))

    return notification
