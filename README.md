# Privatizace - Strategic Chain Reaction Game

A modern React-based implementation of the classic chain reaction game where players compete to dominate a 10x10 grid through strategic dot placement and explosive chain reactions.

## 🎮 Game Rules

### Objective

Be the last player standing by eliminating all opponents through strategic dot placement and chain reactions.

### How to Play

1. **Setup**: Choose 2-4 players, each assigned a unique color
2. **Turn-based**: Players take turns placing dots on the grid
3. **Dot Placement**:
   - Place dots in empty cells or your own cells
   - Cannot place dots in opponents' occupied cells
   - Can place dots in your own "empty" cells (marked with colored circles)
4. **Chain Reactions**:
   - When a cell reaches its maximum capacity (equal to orthogonal neighbors), it explodes
   - Dots spread to adjacent cells, converting enemy dots to your color
   - The original cell becomes an "empty" cell marked with your color
5. **Victory**: Win by being the only player with dots remaining on the board

### Cell Capacity

- Corner cells: 2 dots maximum
- Edge cells: 3 dots maximum
- Center cells: 4 dots maximum

## 🚀 Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone or download the project
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Game

```bash
npm start
```

The game will open in your browser at `http://localhost:3000`

## 🎨 Features

- **Modern UI**: Beautiful glass-morphism design with smooth animations
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Visual Feedback**: Smooth animations for dot placement and explosions
- **Player Management**: Support for 2-4 players with distinct colors
- **Game States**: Proper game setup, turn management, and victory conditions
- **Chain Reactions**: Automatic handling of complex chain reaction sequences

## 🎯 Game Strategy Tips

1. **Control the Center**: Center cells have more neighbors, making them powerful explosion points
2. **Chain Setup**: Plan multi-step chain reactions to maximize territorial gains
3. **Defensive Play**: Sometimes it's better to block opponents rather than expand
4. **Timing**: Wait for the right moment to trigger large chain reactions
5. **Empty Cells**: Use your "empty" cells strategically - they're safe from opponents

## 🛠️ Technical Details

### Built With

- **React 18**: Modern functional components with hooks
- **CSS3**: Advanced styling with backdrop-filter and animations
- **ES6+**: Modern JavaScript features

### Project Structure

```
src/
├── components/
│   ├── Game.js       # Main game logic and state management
│   ├── Grid.js       # 10x10 grid component
│   ├── Cell.js       # Individual cell component
│   └── *.css         # Component-specific styling
├── App.js            # Main application component
├── index.js          # React entry point
└── *.css             # Global styling
```

### Key Algorithms

- **Explosion Detection**: Checks cell capacity vs. neighbor count
- **Chain Reaction Processing**: Iterative explosion handling until stable
- **Victory Condition**: Real-time player elimination detection
- **Move Validation**: Ensures legal moves per game rules

## 🎪 Screenshots

The game features:

- Elegant setup screen with player selection
- Real-time turn indicator
- Animated dot placement and explosions
- Victory screen with play again option
- Responsive design for all screen sizes

## 📝 Development

### Available Scripts

- `npm start` - Runs the development server
- `npm run build` - Builds for production
- `npm test` - Runs tests (when available)

### Customization

You can easily customize:

- Player colors in `Game.js` (`PLAYER_COLORS` array)
- Grid size by changing `GRID_SIZE` constant
- Animation timings in CSS files
- Visual themes by modifying color schemes

## 🐛 Known Issues

None currently known. Please report any bugs or issues!

## 🤝 Contributing

Feel free to contribute by:

1. Reporting bugs
2. Suggesting new features
3. Submitting pull requests
4. Improving documentation

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

Inspired by the classic "Chain Reaction" game concept, reimagined with modern web technologies and beautiful design.

---

**Enjoy playing Privatizace! 🎉**
