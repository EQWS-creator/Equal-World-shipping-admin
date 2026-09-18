# Equal World Shipping — Admin Control Center

This package is the completely separate administrator application for Equal World Shipping.

## Included
- Dedicated admin login
- Shipment management
- Shipment tracking events and locations
- Customer Live Chat / Messages inbox
- Admin replies to customer conversations
- Notifications
- Admin invitations
- Responsive admin interface

## Separation
This application is intentionally separate from the customer website. It does not contain the customer homepage, customer authentication pages, or customer-facing site scripts.

Admin authentication is independent of shipment tracking. Administrators do not enter a shipment tracking code to access the Control Center.

## Deployment
Create a separate GitHub repository, for example:
`EQWS-creator/Equal-World-shipping-admin`

Then deploy that repository separately with GitHub Pages or another hosting provider.

Do not expose Supabase service-role credentials in the frontend. The dashboard communicates with the secured `equal-world-api-v2` Edge Function.
