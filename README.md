# Equal World Shipping Company

Updated GitHub Pages frontend with live shipment tracking and customer live chat.

## Connected backend
Supabase Edge Function:
`https://ypedqbffumjwccqmgauo.supabase.co/functions/v1/equal-world-api-v2`

The frontend uses the public API endpoint only. Supabase service-role/secret keys are not included in this project.

## Live chat
Visitors click the floating 💬 button, enter their name and email, and can send messages. The page checks for new support replies every 5 seconds.

The existing Supabase backend stores chat sessions and messages.

## Tracking
The tracking form now reads shipment records from the Supabase backend rather than the old demo JavaScript object.

Demo tracking code currently seeded in the database:
`SWC123456789`

## Third-party links
- Google Maps links open location searches in Google Maps.
- Telegram opens the company's Telegram contact.
- Email uses a mailto link.

## Deployment
This project remains compatible with GitHub Pages because the frontend is plain HTML/CSS/JavaScript.

Important: before treating the chat as production-grade, secure the visitor chat session with a signed visitor token on the backend and restrict CORS to the deployed site origin. Resend remains in development mode until a verified sending domain/address is configured.
