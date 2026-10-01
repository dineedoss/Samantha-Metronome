# Samantha Metronome

A programmable browser metronome that automatically changes tempo and time signature at measure boundaries.

## Features

- Programmable sections with measures, BPM, and time signature
- Automatic tempo and meter changes
- Accurate browser audio scheduling with Web Audio API
- Accent on beat 1
- Live beat, measure, section, and progress display
- Start / pause / resume / reset
- Previous / next section controls
- 1-measure count-in
- Volume control
- Optional whole-program loop
- Saves the practice program in browser local storage
- Responsive layout for phones, tablets, and desktops
- No backend, database, login, or API keys required

## Cloudflare

This is a static site. For Cloudflare Pages, deploy the repository with no build command and use the repository root as the output directory.

For Cloudflare Workers Static Assets, the same files can be served as static assets.
