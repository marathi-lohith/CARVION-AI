from django.urls import path
from apps.chatbot.views import (
    chat_session_view, send_message_view, 
    clear_conversation_view, user_context_peek_view,
    list_sessions_view, create_session_view,
    rename_session_view, delete_session_view,
    delete_all_sessions_view
)

urlpatterns = [
    path("", chat_session_view, name="chat_session"),
    path("message/", send_message_view, name="send_message"),
    path("clear/", clear_conversation_view, name="clear_conversation"),
    path("peek/", user_context_peek_view, name="peek_context"),
    path("sessions/", list_sessions_view, name="list_sessions"),
    path("sessions/create/", create_session_view, name="create_session"),
    path("sessions/<str:session_id>/rename/", rename_session_view, name="rename_session"),
    path("sessions/<str:session_id>/delete/", delete_session_view, name="delete_session"),
    path("sessions/delete-all/", delete_all_sessions_view, name="delete_all_sessions"),
]
