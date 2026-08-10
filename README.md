# JobTrack

A responsive SaaS-style job application tracker built by Kenneth Morgan using HTML, CSS, and JavaScript.

## Live Demo

`https://kennethknowsit.github.io/job-application-tracker/`

## Features

- Glassmorphism dashboard
- Add, edit, delete, search, and filter applications
- Application status chart
- Monthly application analytics
- Interview and follow-up calendar
- Upcoming reminder panel
- Company initials-based logos
- Light and dark themes
- CSV export
- Local resume storage with IndexedDB
- Demo data for portfolio visitors
- Responsive design
- Browser persistence with localStorage

## Privacy

Applications and resume files stay inside the visitor's browser. This static version does not send data to GitHub or an external server.

## Project Structure

```text
job-application-tracker/
├── index.html
├── style.css
├── script.js
└── README.md
```

## Run Locally

Open `index.html` directly or use the Live Server extension in Visual Studio Code.

## Deploy to GitHub Pages

1. Upload the four project files to the repository root.
2. Open repository Settings.
3. Select Pages.
4. Choose **Deploy from a branch**.
5. Select `main` and `/ (root)`.
6. Save.

## Future Full-Stack Phase

- React component architecture
- Node.js and Express REST API
- MongoDB or PostgreSQL
- Secure user authentication
- Cloud file storage
- Multi-device synchronization
- Password reset and account management
- Automated email reminders

## Company autocomplete

JobTrack includes a custom company-name autocomplete. The built-in suggestion database lives in `companies.js
- `job_titles.js` - built-in job-title autocomplete database`, organized by employer category so it is easy to review or edit. The autocomplete also learns company names from applications saved in the browser.

Autocomplete controls:
- Start typing to filter company names.
- Use the mouse to select a suggestion.
- Use Up/Down Arrow keys to move through suggestions.
- Press Enter to select the highlighted company.
- Press Escape to close the suggestion list.

You can still type and save a company that is not in the built-in list.


## Job title autocomplete
JobTrack now includes a separate `job_titles.js` database with hundreds of common job titles. The custom autocomplete supports mouse selection, Up/Down arrow keys, Enter, and Escape. Titles from applications you save are learned automatically, so custom titles are suggested later too.

## Required fields
Every form field marked with `*` must be completed before an application can be saved. JobTrack highlights the first missing required field and displays a reminder message in the form.

## JobTrack 2.0 UI polish

The interface now includes a more refined SaaS-style visual system with clearer hierarchy, improved dashboard cards, more polished application cards, stronger form focus states, cleaner analytics panels, smoother interactions, improved modal presentation, and additional responsive refinements for tablet and mobile screens. These changes are presentation-focused and preserve the existing JobTrack functionality and browser-stored data.
