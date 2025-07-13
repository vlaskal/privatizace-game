import React, { useState, useCallback, useEffect } from "react";
import "./Game.css";
import Grid from "./Grid";

const PLAYER_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A"];
const GRID_SIZE_OPTIONS = [
  { value: 10, label: "10x10 (Classic)" },
  { value: 16, label: "16x16 (Large)" },
  { value: 20, label: "20x20 (Huge)" },
];

// Calculate max dots for a cell based on its neighbors
const getMaxDots = (row, col, gridSize) => {
  let neighbors = 0;
  if (row > 0) neighbors++; // top
  if (row < gridSize - 1) neighbors++; // bottom
  if (col > 0) neighbors++; // left
  if (col < gridSize - 1) neighbors++; // right
  return neighbors;
};

// Get neighbor coordinates
const getNeighbors = (row, col, gridSize) => {
  const neighbors = [];
  if (row > 0) neighbors.push([row - 1, col]); // top
  if (row < gridSize - 1) neighbors.push([row + 1, col]); // bottom
  if (col > 0) neighbors.push([row, col - 1]); // left
  if (col < gridSize - 1) neighbors.push([row, col + 1]); // right
  return neighbors;
};

const Game = () => {
  const [numberOfPlayers, setNumberOfPlayers] = useState(2);
  const [gridSize, setGridSize] = useState(10);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameMode, setGameMode] = useState("multiplayer"); // "multiplayer" or "ai"
  const [aiDifficulty, setAiDifficulty] = useState("medium"); // "easy", "medium", "hard"
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [playerNames, setPlayerNames] = useState(["", "", "", ""]);
  const [grid, setGrid] = useState(() => {
    // Initialize grid with empty cells
    return Array(10)
      .fill(null)
      .map(() =>
        Array(10)
          .fill(null)
          .map(() => ({
            dots: 0,
            owner: null,
            isEmpty: false, // true when cell is marked as empty dot
          }))
      );
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingCells, setAnimatingCells] = useState(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [totalMoves, setTotalMoves] = useState(0);
  const [eliminatedPlayers, setEliminatedPlayers] = useState(new Set());
  const [playersWhoHadTurn, setPlayersWhoHadTurn] = useState(new Set());

  // Update grid when grid size changes
  useEffect(() => {
    if (!gameStarted) {
      setGrid(
        Array(gridSize)
          .fill(null)
          .map(() =>
            Array(gridSize)
              .fill(null)
              .map(() => ({
                dots: 0,
                owner: null,
                isEmpty: false,
              }))
          )
      );
    }
  }, [gridSize, gameStarted]);

  // AI Move Handler will be defined after all functions

  const updatePlayerName = (index, newName) => {
    const updatedNames = [...playerNames];
    updatedNames[index] = newName.trim();
    setPlayerNames(updatedNames);
  };

  const getPlayerDisplayName = (index) => {
    if (gameMode === "ai" && index > 0) {
      return `AI ${index} (${aiDifficulty})`;
    }
    return playerNames[index] || `Player ${index + 1}`;
  };

  const isAiPlayer = useCallback(
    (index) => {
      return gameMode === "ai" && index > 0;
    },
    [gameMode]
  );

  // AI Logic Functions
  const getValidMoves = useCallback(
    (grid, playerId) => {
      const validMoves = [];

      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const cell = grid[row][col];

          // Can place dot if:
          // 1. Cell is empty (no owner)
          // 2. Cell belongs to this player
          // 3. Cell is an empty circle belonging to this player
          if (
            cell.owner === null ||
            cell.owner === playerId ||
            (cell.isEmpty && cell.owner === playerId)
          ) {
            validMoves.push({ row, col });
          }
        }
      }

      return validMoves;
    },
    [gridSize]
  );

  const evaluateMove = useCallback(
    (grid, move, playerId) => {
      const { row, col } = move;
      const maxDots = getMaxDots(row, col, gridSize);
      const currentDots = grid[row][col].dots;

      let score = 0;

      // Prefer moves that won't immediately explode
      if (currentDots + 1 < maxDots) {
        score += 10;
      }

      // Prefer cells with more neighbors (more potential for chain reactions)
      score += maxDots * 2;

      // Prefer cells that are close to explosion (but not immediate)
      if (currentDots + 1 === maxDots - 1) {
        score += 5;
      }

      // Avoid placing in corners initially (fewer neighbors)
      if (maxDots === 2) {
        score -= 3;
      }

      return score;
    },
    [gridSize]
  );

  const evaluateStrategicValue = useCallback(
    (grid, move, playerId) => {
      const { row, col } = move;
      let strategicScore = 0;

      // Look for opponent cells that are close to exploding
      const neighbors = getNeighbors(row, col, gridSize);
      for (const [nRow, nCol] of neighbors) {
        const neighborCell = grid[nRow][nCol];
        if (neighborCell.owner !== null && neighborCell.owner !== playerId) {
          const neighborMaxDots = getMaxDots(nRow, nCol, gridSize);

          // If neighbor is close to exploding, this move might trigger it
          if (neighborCell.dots >= neighborMaxDots - 1) {
            strategicScore += 8;
          }
        }
      }

      // Prefer moves that build up strategic positions
      const currentDots = grid[row][col].dots;
      const maxDots = getMaxDots(row, col, gridSize);

      if (currentDots + 1 === maxDots - 1) {
        strategicScore += 6; // Building up for future explosion
      }

      return strategicScore;
    },
    [gridSize]
  );

  const evaluateWinningMove = useCallback(
    (grid, move, playerId) => {
      const { row, col } = move;
      let winningScore = 0;

      // Simulate this move and check if it leads to capturing opponent cells
      const testGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
      testGrid[row][col] = {
        dots: testGrid[row][col].dots + 1,
        owner: playerId,
        isEmpty: false,
      };

      // Check if this move would cause explosions that capture opponent cells
      const neighbors = getNeighbors(row, col, gridSize);
      const currentDots = testGrid[row][col].dots;
      const maxDots = getMaxDots(row, col, gridSize);

      if (currentDots >= maxDots) {
        // This move will cause an explosion
        let opponentCellsCaptured = 0;

        neighbors.forEach(([nRow, nCol]) => {
          const neighborCell = testGrid[nRow][nCol];
          if (neighborCell.owner !== playerId) {
            opponentCellsCaptured++;
            if (neighborCell.owner !== null) {
              winningScore += 15; // Capturing opponent cell is very valuable
            }
          }
        });

        // Bonus for moves that capture many opponent cells
        if (opponentCellsCaptured >= 2) {
          winningScore += 25;
        }

        // Look for chain reaction potential
        neighbors.forEach(([nRow, nCol]) => {
          const neighborMaxDots = getMaxDots(nRow, nCol, gridSize);
          const neighborAfterMove = testGrid[nRow][nCol].dots + 1;

          if (neighborAfterMove >= neighborMaxDots) {
            // This neighbor will also explode, creating a chain reaction
            winningScore += 20;
          }
        });
      }

      // Prefer taking opponent cells even without immediate explosion
      const currentCell = grid[row][col];
      if (currentCell.owner !== null && currentCell.owner !== playerId) {
        winningScore += 10; // Taking opponent cell is good
      }

      return winningScore;
    },
    [gridSize]
  );

  const getAiMove = useCallback(
    (grid, playerId, difficulty) => {
      const validMoves = getValidMoves(grid, playerId);

      if (validMoves.length === 0) {
        return null;
      }

      switch (difficulty) {
        case "easy":
          // Random move
          return validMoves[Math.floor(Math.random() * validMoves.length)];

        case "medium":
          // Aggressive strategy: prioritize winning moves
          const mediumScoredMoves = validMoves.map((move) => ({
            ...move,
            score:
              evaluateMove(grid, move, playerId) +
              evaluateWinningMove(grid, move, playerId) +
              evaluateStrategicValue(grid, move, playerId),
          }));

          mediumScoredMoves.sort((a, b) => b.score - a.score);

          // If there's a clearly winning move (score > 20), take it
          if (mediumScoredMoves[0].score > 20) {
            return mediumScoredMoves[0];
          }

          // Otherwise pick from top 3 moves with some randomness
          const topMediumMoves = mediumScoredMoves.slice(
            0,
            Math.min(3, mediumScoredMoves.length)
          );
          return topMediumMoves[
            Math.floor(Math.random() * topMediumMoves.length)
          ];

        case "hard":
          // Very aggressive strategy: prioritize winning and capturing opponent cells
          const hardScoredMoves = validMoves.map((move) => ({
            ...move,
            score:
              evaluateMove(grid, move, playerId) +
              evaluateWinningMove(grid, move, playerId) * 2 + // Double weight for winning moves
              evaluateStrategicValue(grid, move, playerId),
          }));

          hardScoredMoves.sort((a, b) => b.score - a.score);

          // Always take the best move if it's a winning move (score > 30)
          if (hardScoredMoves[0].score > 30) {
            return hardScoredMoves[0];
          }

          // 80% chance to take the best move, 20% chance for top 2
          if (Math.random() < 0.8) {
            return hardScoredMoves[0];
          } else {
            const topHardMoves = hardScoredMoves.slice(
              0,
              Math.min(2, hardScoredMoves.length)
            );
            return topHardMoves[
              Math.floor(Math.random() * topHardMoves.length)
            ];
          }

        default:
          return validMoves[Math.floor(Math.random() * validMoves.length)];
      }
    },
    [getValidMoves, evaluateMove, evaluateWinningMove, evaluateStrategicValue]
  );

  const startGame = () => {
    setGameStarted(true);
    setCurrentPlayer(0);
    setGameOver(false);
    setWinner(null);
    setTotalMoves(0);
    setEliminatedPlayers(new Set());
    setPlayersWhoHadTurn(new Set());
    // Reset grid
    setGrid(
      Array(gridSize)
        .fill(null)
        .map(() =>
          Array(gridSize)
            .fill(null)
            .map(() => ({
              dots: 0,
              owner: null,
              isEmpty: false,
            }))
        )
    );
  };

  const getPlayerDots = useCallback(
    (grid) => {
      const playerDots = {};

      // Initialize all players with 0 dots
      for (let i = 0; i < numberOfPlayers; i++) {
        playerDots[i] = 0;
      }

      // Count dots owned by each player
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const cell = grid[row][col];
          if (cell.owner !== null && cell.dots > 0) {
            playerDots[cell.owner] = (playerDots[cell.owner] || 0) + cell.dots;
          }
        }
      }

      return playerDots;
    },
    [numberOfPlayers, gridSize]
  );

  const getNextActivePlayer = useCallback(
    (currentPlayer, eliminatedPlayers, numberOfPlayers) => {
      let nextPlayer = (currentPlayer + 1) % numberOfPlayers;
      let attempts = 0;

      // Skip eliminated players
      while (eliminatedPlayers.has(nextPlayer) && attempts < numberOfPlayers) {
        nextPlayer = (nextPlayer + 1) % numberOfPlayers;
        attempts++;
      }

      return nextPlayer;
    },
    []
  );

  const updatePlayerElimination = useCallback(
    (newGrid, playersWhoHadTurn, eliminatedPlayers) => {
      const playerDots = getPlayerDots(newGrid);
      const newEliminatedPlayers = new Set(eliminatedPlayers);

      // Check each player who has had at least one turn
      for (let playerId = 0; playerId < numberOfPlayers; playerId++) {
        if (
          playersWhoHadTurn.has(playerId) &&
          !eliminatedPlayers.has(playerId) &&
          playerDots[playerId] === 0
        ) {
          newEliminatedPlayers.add(playerId);
        }
      }

      return newEliminatedPlayers;
    },
    [getPlayerDots, numberOfPlayers]
  );

  const checkWinner = useCallback(
    (newGrid, moves, players, eliminatedPlayers, playersWhoHadTurn) => {
      const playerDots = getPlayerDots(newGrid);
      let totalDots = 0;

      // Count total dots
      Object.values(playerDots).forEach((dots) => (totalDots += dots));

      // Only check for winner after all players have had at least one turn
      if (moves >= players && totalDots > 0) {
        // Count active players (not eliminated)
        const activePlayers = [];
        for (let i = 0; i < numberOfPlayers; i++) {
          if (!eliminatedPlayers.has(i)) {
            activePlayers.push(i);
          }
        }

        // Check if only one active player remains
        if (activePlayers.length === 1) {
          setWinner(activePlayers[0]);
          setGameOver(true);
          return true;
        }

        // Alternative check: only one player has dots
        const playersWithDots = Object.keys(playerDots).filter(
          (player) => playerDots[player] > 0
        );
        if (playersWithDots.length === 1) {
          setWinner(parseInt(playersWithDots[0]));
          setGameOver(true);
          return true;
        }
      }
      return false;
    },
    [getPlayerDots, numberOfPlayers]
  );

  const handleExplosions = useCallback(
    (initialGrid) => {
      let newGrid = initialGrid.map((row) => row.map((cell) => ({ ...cell })));
      let hasExplosions = true;
      const allAnimatingCells = new Set();

      while (hasExplosions) {
        hasExplosions = false;
        const explosions = [];

        // Check if there's only one player left with dots - stop explosions
        const playerDots = getPlayerDots(newGrid);
        const playersWithDots = Object.keys(playerDots).filter(
          (player) => playerDots[player] > 0
        );

        if (playersWithDots.length <= 1) {
          // Stop explosions if only one or no players have dots
          break;
        }

        // Find all cells that should explode
        for (let row = 0; row < gridSize; row++) {
          for (let col = 0; col < gridSize; col++) {
            const cell = newGrid[row][col];
            const maxDots = getMaxDots(row, col, gridSize);

            if (cell.dots >= maxDots) {
              explosions.push({ row, col, owner: cell.owner });
              hasExplosions = true;
              allAnimatingCells.add(`${row}-${col}`);
            }
          }
        }

        // Process explosions
        for (const explosion of explosions) {
          const { row, col, owner } = explosion;
          const neighbors = getNeighbors(row, col, gridSize);

          // Reset exploding cell to empty state
          newGrid[row][col] = {
            dots: 0,
            owner: owner,
            isEmpty: true,
          };

          // Add dots to neighbors
          neighbors.forEach(([neighborRow, neighborCol]) => {
            const neighborCell = newGrid[neighborRow][neighborCol];

            newGrid[neighborRow][neighborCol] = {
              dots: neighborCell.dots + 1,
              owner: owner,
              isEmpty: false,
            };

            // Mark neighbor cells as animating too
            allAnimatingCells.add(`${neighborRow}-${neighborCol}`);
          });
        }
      }

      // Set the animating cells
      setAnimatingCells(allAnimatingCells);

      return newGrid;
    },
    [getPlayerDots, gridSize]
  );

  const handleCellClick = useCallback(
    (row, col) => {
      if (!gameStarted || isAnimating || gameOver) return;

      // Note: AI moves are allowed through, human clicks during AI turn are handled by UI

      const cell = grid[row][col];

      // Check if move is valid
      if (cell.isEmpty && cell.owner !== currentPlayer) {
        // Can't place on other player's empty cell
        return;
      }

      if (
        cell.owner !== null &&
        cell.owner !== currentPlayer &&
        !cell.isEmpty
      ) {
        // Can't place on other player's occupied cell
        return;
      }

      setIsAnimating(true);

      // Create new grid with the move
      const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

      // Add dot to clicked cell
      newGrid[row][col] = {
        dots: cell.dots + 1,
        owner: currentPlayer,
        isEmpty: false,
      };

      // Mark the clicked cell as animating
      setAnimatingCells(new Set([`${row}-${col}`]));

      // Handle explosions
      const finalGrid = handleExplosions(newGrid);

      setGrid(finalGrid);

      // Check for winner
      setTimeout(() => {
        const newMoves = totalMoves + 1;
        setTotalMoves(newMoves);

        // Track that this player has had a turn
        const newPlayersWhoHadTurn = new Set(playersWhoHadTurn);
        newPlayersWhoHadTurn.add(currentPlayer);
        setPlayersWhoHadTurn(newPlayersWhoHadTurn);

        // Update player elimination based on current grid state
        const newEliminatedPlayers = updatePlayerElimination(
          finalGrid,
          newPlayersWhoHadTurn,
          eliminatedPlayers
        );
        setEliminatedPlayers(newEliminatedPlayers);

        // Check for winner with updated elimination data
        if (
          !checkWinner(
            finalGrid,
            newMoves,
            numberOfPlayers,
            newEliminatedPlayers,
            newPlayersWhoHadTurn
          )
        ) {
          // Move to next active player (skip eliminated players)
          const nextPlayer = getNextActivePlayer(
            currentPlayer,
            newEliminatedPlayers,
            numberOfPlayers
          );
          setCurrentPlayer(nextPlayer);
        }
        setIsAnimating(false);
        setAnimatingCells(new Set()); // Clear animating cells
      }, 500);
    },
    [
      grid,
      currentPlayer,
      gameStarted,
      isAnimating,
      gameOver,
      numberOfPlayers,
      totalMoves,
      handleExplosions,
      checkWinner,
      eliminatedPlayers,
      playersWhoHadTurn,
      updatePlayerElimination,
      getNextActivePlayer,
    ]
  );

  // AI Move Handler - moved here after all functions are defined
  useEffect(() => {
    if (!gameStarted || isAnimating || gameOver) return;

    if (isAiPlayer(currentPlayer)) {
      // Schedule AI move with delay
      const timeout = setTimeout(() => {
        const aiMove = getAiMove(grid, currentPlayer, aiDifficulty);

        if (aiMove) {
          // Simply call the existing handleCellClick function
          handleCellClick(aiMove.row, aiMove.col);
        }
      }, 1000 + Math.random() * 500);

      // Cleanup timeout on unmount or when dependencies change
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [
    currentPlayer,
    gameStarted,
    isAnimating,
    gameOver,
    grid,
    aiDifficulty,
    isAiPlayer,
    getAiMove,
    handleCellClick,
  ]);

  const resetGame = () => {
    setGameStarted(false);
    setCurrentPlayer(0);
    setGameOver(false);
    setWinner(null);
    setTotalMoves(0);
    setEliminatedPlayers(new Set());
    setPlayersWhoHadTurn(new Set());
    setPlayerNames(["", "", "", ""]);
    setGridSize(10);
    setGameMode("multiplayer");
    setAiDifficulty("medium");
    setNumberOfPlayers(2);
    setGrid(
      Array(10)
        .fill(null)
        .map(() =>
          Array(10)
            .fill(null)
            .map(() => ({
              dots: 0,
              owner: null,
              isEmpty: false,
            }))
        )
    );
  };

  if (!gameStarted) {
    return (
      <div className='game-setup'>
        <h2>Game Setup</h2>

        <div className='game-mode-selection'>
          <label>
            Game Mode:
            <select
              value={gameMode}
              onChange={(e) => {
                setGameMode(e.target.value);
                if (e.target.value === "ai") {
                  setNumberOfPlayers(2); // AI mode defaults to 1 human vs 1 AI
                }
              }}
            >
              <option value='multiplayer'>Human vs Human</option>
              <option value='ai'>Human vs AI</option>
            </select>
          </label>
        </div>

        {gameMode === "ai" && (
          <div className='ai-difficulty-selection'>
            <label>
              AI Difficulty:
              <select
                value={aiDifficulty}
                onChange={(e) => setAiDifficulty(e.target.value)}
              >
                <option value='easy'>Easy</option>
                <option value='medium'>Medium</option>
                <option value='hard'>Hard</option>
              </select>
            </label>
          </div>
        )}

        <div className='player-selection'>
          <label>
            Number of Players:
            <select
              value={numberOfPlayers}
              onChange={(e) => setNumberOfPlayers(parseInt(e.target.value))}
              disabled={gameMode === "ai"}
            >
              <option value={2}>2 Players</option>
              <option value={3}>3 Players</option>
              <option value={4}>4 Players</option>
            </select>
          </label>
        </div>
        <div className='grid-size-selection'>
          <label>
            Grid Size:
            <select
              value={gridSize}
              onChange={(e) => setGridSize(parseInt(e.target.value))}
            >
              {GRID_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className='player-colors'>
          {Array(numberOfPlayers)
            .fill(null)
            .map((_, index) => (
              <div key={index} className='player-preview'>
                <div
                  className='color-circle'
                  style={{ backgroundColor: PLAYER_COLORS[index] }}
                ></div>
                {isAiPlayer(index) ? (
                  <div className='ai-player-label'>
                    <span>AI Player {index}</span>
                    <span className='ai-difficulty-badge'>{aiDifficulty}</span>
                  </div>
                ) : (
                  <input
                    type='text'
                    placeholder={`Player ${index + 1}`}
                    value={playerNames[index]}
                    onChange={(e) => updatePlayerName(index, e.target.value)}
                    className='player-name-input'
                    maxLength={20}
                  />
                )}
              </div>
            ))}
        </div>
        <button className='start-button' onClick={startGame}>
          Start Game
        </button>
      </div>
    );
  }

  return (
    <div className='game-container'>
      <div className='game-sidebar'>
        <div className='game-title'>
          <h1>Privatizace</h1>
          <p>Strategic Chain Reaction Game</p>
        </div>

        <div className='game-info'>
          <div className='current-player'>
            <h3>Current Player:</h3>
            <div
              className={`player-indicator ${
                isAiPlayer(currentPlayer) ? "ai-turn" : ""
              }`}
            >
              <div
                className='player-color'
                style={{ backgroundColor: PLAYER_COLORS[currentPlayer] }}
              ></div>
              <span>{getPlayerDisplayName(currentPlayer)}</span>
              {isAiPlayer(currentPlayer) && (
                <div className='ai-thinking-indicator'>
                  <span>🤖</span>
                </div>
              )}
            </div>
          </div>

          <div className='players-list'>
            {Array(numberOfPlayers)
              .fill(null)
              .map((_, index) => {
                const playerDots = getPlayerDots(grid);
                const isEliminated = eliminatedPlayers.has(index);
                const isActive = index === currentPlayer;
                return (
                  <div
                    key={index}
                    className={`player-item ${isActive ? "active" : ""} ${
                      isEliminated ? "eliminated" : ""
                    } ${isAiPlayer(index) ? "ai-player" : ""}`}
                  >
                    <div
                      className='player-color'
                      style={{ backgroundColor: PLAYER_COLORS[index] }}
                    ></div>
                    <div className='player-info'>
                      <span className='player-name'>
                        {getPlayerDisplayName(index)}
                        {isAiPlayer(index) && (
                          <span className='ai-icon'>🤖</span>
                        )}
                      </span>
                      <span className='player-dots'>
                        {isEliminated
                          ? "ELIMINATED"
                          : `Dots: ${playerDots[index]}`}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className='game-controls'>
          <button className='reset-button' onClick={resetGame}>
            New Game
          </button>
        </div>
      </div>

      <div className='game-board'>
        <Grid
          grid={grid}
          onCellClick={handleCellClick}
          playerColors={PLAYER_COLORS}
          animatingCells={animatingCells}
          playerNames={playerNames}
          getPlayerDisplayName={getPlayerDisplayName}
          gridSize={gridSize}
        />
      </div>

      {gameOver && (
        <div className='game-over'>
          <h2>Game Over!</h2>
          <p>
            <span style={{ color: PLAYER_COLORS[winner] }}>
              {getPlayerDisplayName(winner)}
            </span>{" "}
            wins!
          </p>
          <button onClick={resetGame}>Play Again</button>
        </div>
      )}
    </div>
  );
};

export default Game;
