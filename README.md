# TrackWeed

A progressive web app for tracking cannabis consumption with time-based analytics and visual feedback.

## Features

- **Session Tracking** - Log consumption sessions with timestamps
- **Multiple Methods** - Support for different consumption methods (Dab Pen, Bong, Joint)
- **Visual Analytics** - Color-coded entries based on time intervals between sessions
- **Data Management** - Export and import functionality for backup and restoration
- **Offline Support** - Works offline as a Progressive Web App
- **Customizable Thresholds** - Configure time intervals for visual feedback
- **Historical Entries** - Add missed sessions from the past
- **Entry Management** - Delete individual entries with confirmation dialog

## Installation

### Web Browser
Open `index.html` directly in any modern web browser. Data is stored locally using localStorage.

### Progressive Web App
The app can be installed as a PWA for offline access:
1. Open the app in Chrome or Edge
2. Click the install button in the address bar
3. The app will be available as a standalone application

## Configuration

Customize the time-based color thresholds in the settings:

| Threshold | Default | Description |
|-----------|---------|-------------|
| Red | 5 hours | Sessions closer than this appear in red |
| Yellow | 9 hours | Sessions within this range appear in yellow |
| Green | 9 hours | Sessions beyond this time appear in green |

## Project Structure

```
TrackWeed/
├── index.html      # Main application structure
├── styles.css      # Styling and theming
├── script.js       # Core application logic
├── manifest.json   # PWA configuration
├── sw.js          # Service worker for offline support
└── icon.png       # Application icon
```

## Privacy

All data is stored locally in your browser. No information is sent to external servers.

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with PWA support
