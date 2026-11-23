# ❌⭕ Tic Tac Toe Game

Tic Tac Toe is a classic two-player strategy game built using modern web technologies. Players take turns marking **X** and **O** on a 3×3 grid, with the objective of placing three of their symbols in a horizontal, vertical, or diagonal line before their opponent.

---

## ✨ Features

- ❌ Two-player gameplay
- ⭕ Interactive 3×3 game board
- 🏆 Automatic winner detection
- 🤝 Draw detection
- 🔄 Restart game functionality
- 📱 Responsive design
- ⚡ Fast and lightweight application

---

## 🛠️ Technologies Used

- HTML5
- CSS3
- JavaScript (ES6)

---

## 📂 Project Structure

```text
Tic_Tac_Toe/
│
├── index.html
├── style.css
├── script.js
└── README.md
```

---

## 🚀 Installation

Clone the repository

```bash
git clone <repository-url>
```

Navigate to the project folder

```bash
cd Tic_Tac_Toe
```

Open the application

- Open `index.html` in your browser
- OR use Live Server in Visual Studio Code

---

## ▶️ How to Play

1. Player X starts the game.
2. Players take turns placing their symbols.
3. The first player to align three symbols horizontally, vertically, or diagonally wins.
4. If all cells are filled without a winner, the game ends in a draw.
5. Click the restart button to play again.

---

## 🔮 Future Enhancements

- Single-player mode with AI
- Difficulty levels
- Scoreboard
- Sound effects
- Animations
- Online multiplayer
- Dark mode

---

## 🧪 Interaction Regression & Mutation Testing

### Baseline Navigation
The application features two primary screens managed by `switchScreen()` in `script.js`:
- `#menuScreen`: Initial view containing `#btnStart` (Challenge AI).
- `#gameScreen`: Active gameplay screen containing `#btnBack`, scoreboard, turn indicators, and the game board.

Clicking `#btnStart` adds the `.active` class to `#gameScreen` and removes it from `#menuScreen`. Clicking `#btnBack` reverses the transition, resetting active game state and bringing the player back to `#menuScreen`.

### Mutation Testing Methodology
To guard against plausible UI regressions (such as accidental removal of event listeners, broken CSS class toggles, or event propagation blocks), mutation testing is performed in automated tests:
1. **Baseline Test**: Verifies smooth transition from `#menuScreen` to `#gameScreen` on clicking `#btnStart`, and back to `#menuScreen` on clicking `#btnBack`.
2. **Mutation Verification**: A deliberate mutation (e.g. cloning `#btnBack` to strip its event listeners, or removing the active class toggle) is introduced into the test page fixture.
3. **Regression Detection**: The test asserts that the mutated fixture fails the transition check, confirming that the test suite is capable of catching regressions.

### Running the Regression Test
Run the Playwright test suite locally:
```bash
node tests/course/r60-t030.mjs
```

---


## 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Push your branch.
5. Open a Pull Request.

---

## 📄 License

This project is part of the **100 Days 100 Web Projects** repository and is intended for educational purposes.