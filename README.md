# Weed Use Tracker

A simple web application for tracking cannabis usage with time-based analytics.

## File Structure

The application has been organized into separate files for better maintainability:

- **`index.html`** - Main HTML structure and layout
- **`styles.css`** - All CSS styles and theming
- **`script.js`** - JavaScript functionality and application logic
- **`weed_use.html`** - Original monolithic file (can be removed)

## Features

- Track smoking sessions with timestamps
- Different smoking methods (Dab Pen, Bong, Joint)
- Time-based color coding (red/yellow/green thresholds)
- Export/import functionality for data backup
- Configuration for threshold settings
- Add missed sessions from the past
- Delete individual entries with confirmation

## Usage

Simply open `index.html` in a web browser. The application stores data locally in your browser's localStorage.

## Configuration

You can configure the color thresholds:
- **Red threshold**: Hours below which entries show in red
- **Yellow threshold**: Hours below which entries show in yellow  
- **Green threshold**: Hours above which entries show in green

The default values are 5, 9, and 9 hours respectively.
