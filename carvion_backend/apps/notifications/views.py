import logging
import queue
from django.http import StreamingHttpResponse
from rest_framework.decorators import api_view, permission_classes, renderer_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.renderers import BaseRenderer

class ServerSentEventRenderer(BaseRenderer):
    media_type = "text/event-stream"
    format = "txt"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer
from apps.notifications.services import register_listener, unregister_listener
from common.exceptions import NotFound
from common.permissions import IsAdminUser

logger = logging.getLogger("carvion.api")

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notification_list_view(request):
    """GET: Fetch list of notifications (both read and unread) for current user."""
    notifications = Notification.objects(user=request.user).order_by("-created_at")[:100]
    serializer = NotificationSerializer(notifications, many=True)
    return Response({
        "success": True,
        "data": serializer.data
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_read_view(request, notification_id):
    """POST: Mark a specific notification as read."""
    try:
        notif = Notification.objects.get(id=notification_id, user=request.user)
    except Notification.DoesNotExist:
        raise NotFound("Requested notification alert not found.")

    notif.is_read = True
    notif.save()
    return Response({"success": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_all_read_view(request):
    """POST: Mark all unread notifications for current user as read."""
    Notification.objects(user=request.user, is_read=False).update(set__is_read=True)
    return Response({"success": True})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_notification_view(request, notification_id):
    """DELETE: Permanently delete a notification document."""
    try:
        notif = Notification.objects.get(id=notification_id, user=request.user)
    except Notification.DoesNotExist:
        raise NotFound("Requested notification alert not found.")
        
    notif.delete()
    return Response({"success": True})



def event_stream_generator(user):
    """
    Generator yielding SSE messages.
    Registers a thread-safe Queue, waits for notification events, 
    and issues keep-alive pings to prevent browser timeout disconnects.
    """
    user_id_str = str(user.id)
    q = register_listener(user_id_str)
    
    try:
        # Establish connection heartbeat
        yield "comment: connection established\n\n"
        
        while True:
            try:
                # Block thread until data is placed in queue (timeout to send pings)
                data_str = q.get(timeout=25)
                yield f"data: {data_str}\n\n"
            except queue.Empty:
                # Send comment ping to maintain active client state
                yield "comment: heartbeat\n\n"
    except GeneratorExit:
        logger.info("SSE client stream exited cleanly for user: %s", user.email)
    except Exception as exc:
        logger.info("SSE client stream disconnected for user %s: %s", user.email, str(exc))
    finally:
        unregister_listener(user_id_str, q)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@renderer_classes([ServerSentEventRenderer])
def notification_stream_view(request):
    """
    GET: Server-Sent Events (SSE) stream endpoint.
    Feeds StreamingHttpResponse data chunks.
    """
    response = StreamingHttpResponse(
        event_stream_generator(request.user),
        content_type="text/event-stream"
    )
    
    # Configure headers to bypass buffer layers (Nginx X-Accel-Buffering)
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def notification_broadcast_view(request):
    """
    POST: Broadcast a system announcement to all registered users.
    Restricted to admin operator accounts.
    """
    from apps.authentication.models import User
    from apps.notifications.services import send_notification
    from common.exceptions import BadRequest

    title = request.data.get("title")
    message = request.data.get("message")
    type_str = request.data.get("type", "System")

    if not title or not message:
        raise BadRequest("Title and message are required for broadcast alerts.")

    try:
        from common.utils import log_user_activity
        users = User.objects()
        for user in users:
            send_notification(user, type_str, title, message)
        log_user_activity(request.user, "admin", "notification_sent", f"Broadcasted system announcement: '{title}'", "success")
        logger.info("Successfully broadcasted announcement '%s' to %d users.", title, len(users))
    except Exception as exc:
        logger.exception("Failed to dispatch system broadcast: %s", str(exc))
        return Response({"success": False, "error": {"message": "Broadcast failure."}}, status=500)

    return Response({"success": True}, status=status.HTTP_201_CREATED)
