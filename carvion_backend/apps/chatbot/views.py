import datetime
import logging
from bson import ObjectId
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.chatbot.models import ChatSession
from apps.chatbot.serializers import ChatSessionSerializer, MessageSendSerializer
from apps.chatbot.services import query_gemini_advisor, compile_user_context
from common.exceptions import BadRequest, NotFound

logger = logging.getLogger("carvion.api")

def get_or_create_session(user, session_id=None) -> ChatSession:
    """Helper to retrieve or initialize a user chat session document."""
    if session_id:
        try:
            if ObjectId.is_valid(session_id):
                session = ChatSession.objects(id=session_id, user=user).first()
                if session:
                    return session
        except Exception as e:
            logger.warning(f"Error finding session by id {session_id}: {e}")

    # Fallback to the user's latest session, or create one if none exists
    session = ChatSession.objects(user=user).order_by("-updated_at").first()
    if not session:
        session = ChatSession(user=user)
        session.save()
    return session


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chat_session_view(request):
    """GET: Retrieve a career counselor chat session by ID or the active one."""
    session_id = request.query_params.get("session_id")
    session = get_or_create_session(request.user, session_id)
    serializer = ChatSessionSerializer(session)
    return Response({
        "success": True,
        "data": serializer.data
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_message_view(request):
    """
    POST: Dispatches a message to the Career Counselor.
    Appends the message, triggers Gemini with context injection, and registers responses.
    """
    serializer = MessageSendSerializer(data=request.data)
    if not serializer.is_valid():
        raise BadRequest("Invalid message payload text.")

    user_text = serializer.validated_data["text"]
    session_id = serializer.validated_data.get("session_id")
    session = get_or_create_session(request.user, session_id)

    # 1. Append User Message
    user_msg = {
        "sender": "user",
        "text": user_text,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    session.messages.append(user_msg)

    # 2. Query Gemini with history and context
    bot_reply_text = query_gemini_advisor(
        request.user,
        user_text,
        session.messages[:-1]  # Exclude current user message to avoid duplicate injection
    )

    # 3. Append Bot Message
    bot_msg = {
        "sender": "bot",
        "text": bot_reply_text,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    session.messages.append(bot_msg)

    # 4. Save Session state & auto-rename title from first prompt if title is default
    session.updated_at = datetime.datetime.utcnow()
    if session.title == "New Conversation" and len(session.messages) <= 2:
        session.title = user_text[:30] + ("..." if len(user_text) > 30 else "")
    session.save()
    from common.utils import log_user_activity
    log_user_activity(request.user, "chatbot", "career_assistant_conversation", f"Sent message to AI Career Assistant: '{user_text[:50]}'")
    return Response({
        "success": True,
        "data": {
            "user_message": user_msg,
            "bot_message": bot_msg,
            "session_id": str(session.id)
        }
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_sessions_view(request):
    """GET: List all chat sessions for the authenticated user."""
    sessions = ChatSession.objects(user=request.user).order_by("-updated_at")
    serializer = ChatSessionSerializer(sessions, many=True)
    return Response({
        "success": True,
        "data": serializer.data
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_session_view(request):
    """POST: Create a brand new chat session."""
    title = request.data.get("title", "New Conversation")
    session = ChatSession(user=request.user, title=title)
    session.save()
    serializer = ChatSessionSerializer(session)
    return Response({
        "success": True,
        "data": serializer.data
    }, status=status.HTTP_201_CREATED)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def rename_session_view(request, session_id):
    """PUT: Rename an existing chat session."""
    try:
        if not ObjectId.is_valid(session_id):
            raise BadRequest("Invalid session ID.")
        session = ChatSession.objects(id=session_id, user=request.user).first()
        if not session:
            raise NotFound("Chat session not found.")
        
        title = request.data.get("title")
        if not title:
            raise BadRequest("Title is required.")
            
        session.title = title
        session.updated_at = datetime.datetime.utcnow()
        session.save()
        
        return Response({
            "success": True,
            "message": "Session renamed successfully.",
            "data": ChatSessionSerializer(session).data
        })
    except (BadRequest, NotFound) as e:
        raise e
    except Exception as e:
        logger.exception("Failed to rename session")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_session_view(request, session_id):
    """DELETE: Delete an individual chat session."""
    try:
        if not ObjectId.is_valid(session_id):
            raise BadRequest("Invalid session ID.")
        session = ChatSession.objects(id=session_id, user=request.user).first()
        if not session:
            raise NotFound("Chat session not found.")
            
        session.delete()
        return Response({
            "success": True,
            "message": "Session deleted successfully."
        })
    except (BadRequest, NotFound) as e:
        raise e
    except Exception as e:
        logger.exception("Failed to delete session")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_all_sessions_view(request):
    """DELETE: Delete all chat sessions for the user."""
    try:
        ChatSession.objects(user=request.user).delete()
        return Response({
            "success": True,
            "message": "All chat sessions deleted successfully."
        })
    except Exception as e:
        logger.exception("Failed to delete all sessions")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def clear_conversation_view(request):
    """POST: Flushes the conversation transcript history from the session document."""
    session_id = request.data.get("session_id") or request.query_params.get("session_id")
    session = get_or_create_session(request.user, session_id)
    session.messages = []
    session.updated_at = datetime.datetime.utcnow()
    session.save()
    return Response({"success": True})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_context_peek_view(request):
    """GET: Exposes raw compiled context payload (useful for testing parameters)."""
    context = compile_user_context(request.user)
    return Response({
        "success": True,
        "data": {
            "compiled_context": context
        }
    })
