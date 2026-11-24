# artificial-we.github.io

Website for **Artificial We: Designing Multi-Principal AI Delegation in Human-AI Collectives**, a CHI 2027 workshop.

Plain HTML, CSS and JavaScript, no build step. Changes go live a minute or two after you push to `main`.

## Files

- `index.html`: all page content (About, Call for papers, Dates, Program, Accepted papers, Organizers, FAQ, Contact)
- `style.css`: layout and typography (Archivo from Google Fonts)
- `field.js`: the canvas animations, built from three marks:
  - **WE** (red badge) = a principal: a person or a collective such as a household, team, or community.
  - **A** = an agent. Big A's are direct delegates; each split into four smaller A's is one more level of sub-delegation.
  - **H** = a human called back in: where mandates overlap, agents escalate instead of deciding alone.
  - Hero: a mosaic of agent tiles that keeps merging and splitting (a quadtree, four levels). Each principal's mandate morphs between diamond, circle and square. While hovering, the cursor becomes a WE with its own mandate. Clicking the field scrolls down to the content.
  - Bands between sections: two waves of agents pass through each other; where they meet, H.
  - Animations pause when off screen and show a still frame for visitors who prefer reduced motion.
- `photos/`: organizer photos, shown in their original colours.
- `favicon.svg`: tab icon
- `.nojekyll`: tells GitHub Pages to serve the files as they are

## Colour key

- Red `#e8432a`: people (WE principals, H escalation)
- Blue `#2b3bf0`: agents (A)

## Still to fill in

Search `index.html` for `TODO`:

- Submission link (the "Submit" buttons and the "Submission link" line)
- Contact email

Also check the notification date (25 Feb 2027) against CHI's early registration deadline once it is published.

## Accepted papers

After notification, replace the note in the `#papers` section with a table (Title, Authors, PDF link) and put the PDFs in a `papers/` folder.

## Preview locally

```
python3 -m http.server 8000
```

then open http://localhost:8000.
