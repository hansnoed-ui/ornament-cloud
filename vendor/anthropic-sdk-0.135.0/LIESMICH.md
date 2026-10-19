# Anthropic TypeScript SDK 0.135.0, für den Browser gebündelt

Offizielles SDK von Anthropic (`@anthropic-ai/sdk`, MIT-Lizenz in `LICENSE`), für die Redaktion von «Social Media» (`social-media/redaktion/`):
Dort liest Claude die Bildschirmfotos. Die Website lädt nichts von CDNs, darum liegt das SDK hier, als ein ES-Modul gebündelt:

    npm i @anthropic-ai/sdk@0.135.0
    echo 'export { default, Anthropic } from "@anthropic-ai/sdk";' > entry.mjs
    bun build entry.mjs --target=browser --format=esm --minify --outfile=anthropic.js

Nur die Redaktion lädt diese Datei; die öffentlichen Seiten nicht.
