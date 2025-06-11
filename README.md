# SATE (Speech Analysis Tool and Evaluator) - React Application

A modern React-based speech analysis tool for speech therapists and language professionals. This application provides real-time speech analysis, transcript visualization, and comprehensive issue tracking.

## Features

### 🎙️ Audio Recording & Playback
- **Real-time recording** with WebRTC API
- **Audio file import** (MP3, WAV, M4A)
- **Interactive audio controls** with seek, play/pause, volume control
- **Word-level synchronization** with audio timeline

### 📝 Transcript Analysis
- **Single view mode** - Traditional conversation flow
- **Parallel view mode** - Side-by-side speaker comparison
- **Word-level timestamps** - Click any word to jump to audio position
- **Real-time highlighting** - Current word follows audio playback

### 🔍 Speech Issue Detection
- **Filler words** (um, uh, like) - Highlighted in orange
- **Repetitions** - Word/phrase repetitions in yellow
- **Pauses** - Speech pauses with duration in blue
- **Mispronunciations** - Incorrect pronunciations in purple
- **Grammar issues** - Morpheme omissions/errors in green

### 📊 Analysis Dashboard
- **Issue overview** with counts and statistics
- **Performance metrics** (fluency score, clarity score)
- **Filter system** to focus on specific issue types
- **Color-coded legend** for easy identification

### 🎯 Interactive Features
- **Click-to-seek** - Click any word to jump to that audio position
- **Issue highlighting** - Hover effects and detailed tooltips
- **Recording modals** - Professional recording interface
- **File upload** - Drag-and-drop audio file import

### 👥 Multi-Speaker Support
- **Examiner vs Child** - Distinct styling for different speakers
- **Speaker separation** - Clear visual distinction in parallel view
- **Role-based UI** - Different colors and layouts per speaker type

## Technology Stack

- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** components
- **Lucide React** icons
- **Web Audio API** for recording
- **Socket.IO Client** for real-time features

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sate-react
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   ├── ui/                 # shadcn/ui base components
│   ├── AudioControls.tsx   # Audio playback controls
│   ├── ConversationView.tsx # Single conversation view
│   ├── ParallelConversationView.tsx # Parallel speaker view
│   ├── LeftSidebar.tsx     # Recording & file management
│   ├── RightSidebar.tsx    # Analysis dashboard
│   ├── Layout.tsx          # Main layout component
│   └── MainContent.tsx     # Content area with view toggles
├── data/
│   └── transcriptData.ts   # Sample transcript with issues
└── App.tsx                 # Root application component
```

## Audio Files

Place audio files in the `public/sound/` directory. The default sample file is `673_clip.wav`.

## Development Features

### Recording Functionality
- Real-time microphone access
- Recording timer with pause/resume
- Audio blob generation for processing

### File Upload
- Drag-and-drop interface
- File type validation
- Processing status indicators

### Responsive Design
- Mobile-friendly layout
- Collapsible sidebars
- Touch-friendly controls

## Data Format

The application expects transcript data in the following format:

```typescript
interface Segment {
  start: number;           // Start time in seconds
  end: number;            // End time in seconds
  text: string;           // Full text of segment
  speaker: 'Examiner' | 'Child';
  words: Word[];          // Individual words with timestamps
  pauses: Issue[];        // Detected pauses
  repetitions: Issue[];   // Word repetitions
  fillerwords: Issue[];   // Filler words (um, uh)
  mispronunciation: Issue[]; // Pronunciation errors
}
```

## Browser Support

- Chrome 60+ (recommended)
- Firefox 55+
- Safari 11+
- Edge 79+

WebRTC recording requires HTTPS in production environments.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Original SATE demo for feature specifications
- shadcn/ui for component library
- Tailwind CSS for styling system
- React team for the excellent framework
