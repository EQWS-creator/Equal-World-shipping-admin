# Equal World Shipping — Admin Live Chat

The customer website's Live Chat connects to this separate Admin Control Center through the secured Supabase Edge Function.

### Admin
- Open **Messages** to see customer conversations.
- Each customer has a separate conversation.
- Reply as support.
- The inbox refreshes automatically.

### Backend
The dashboard uses the existing `equal-world-api-v2` actions for admin chat sessions, messages, and replies. Keep admin authorization, visitor-token validation, database RLS, and CORS restrictions enforced by the backend.

No private Supabase service-role key belongs in this frontend application.
