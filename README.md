# EIRepo v2 prototype

- Updated navigation: Home, CC, PC, Tools, Tests, Extras, About.
- CC and PC each have a landing/search page and Books, Past Papers, Notes/Self-study pages.
- Main dropdowns plus persistent secondary navigation inside CC/PC.
- Muted earth palette; desktop-first responsive layout.
- Global search page, section-specific search forms, Extras reference-browsing mockup.
- `data/resources.json` demonstrates a shared catalogue with curriculum/type tags.

To test: extract the ZIP and open `index.html`. Copy your Englo WebM into `assets/englo-wave.webm`. The video is muted, inline and looping; the SVG fallback appears on video load failure.

Search forms currently demonstrate the information architecture and pass query parameters; they do not yet show live matches from the JSON catalogue. That's the next development step. For Cloudflare Pages, deploy the folder as a static site with no build command.
