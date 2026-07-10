# Woven Mining Website

Static marketing website for Woven Mining, deployed on Cloudflare Pages.

## Structure

- `index.html`, `about.html`, `services.html`, `terms-of-use.html` — main pages
- `blog/` — blog index and posts
- `portal/login/` — client portal login
- `css/styles.css` — site styles
- `js/` — site scripts (`main.js`, `hero-canvas.js`)
- `functions/api/contact.js` — Cloudflare Pages Function for contact form email

## Development

This is a static site with no build step. Open `index.html` directly in a browser, or serve the directory with any static file server, e.g.:

```bash
python3 -m http.server
```

## Contact form deployment

The contact form posts to `/api/contact`, which is handled by the Pages Function in
`functions/api/contact.js`. Configure the following in the Cloudflare Pages project
under **Settings → Functions → Bindings** and environment variables:

- Add an **Email Routing** binding named `SEND_EMAIL`.
- Set `CONTACT_SENDER` to a verified sender address on `wovenmining.ca`.
- Set `CONTACT_RECIPIENT` to `thomas@wovenmining.ca` (the function uses this value as
  its destination).

Email Routing must be enabled for the domain, and the sender/domain must satisfy
Cloudflare's email sending requirements. Deploy the project through the existing
Pages integration; the `functions/` directory is detected automatically.

The endpoint validates all fields, checks the production origin, limits requests
per client address, and rejects the hidden honeypot field. Verify after deployment
with a real submission, invalid input, honeypot submission, rate-limit response,
and delivery to `thomas@wovenmining.ca`. Logs for rejected requests and email
failures are available in the Pages Functions logs.
