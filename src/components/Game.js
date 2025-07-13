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

  const updatePlayerName = (index, newName) => {
    const updatedNames = [...playerNames];
    updatedNames[index] = newName.trim();
    setPlayerNames(updatedNames);
  };

  const getPlayerDisplayName = (index) => {
    return playerNames[index] || `Player ${index + 1}`;
  };

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
        <div className='player-selection'>
          <label>
            Number of Players:
            <select
              value={numberOfPlayers}
              onChange={(e) => setNumberOfPlayers(parseInt(e.target.value))}
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
                <input
                  type='text'
                  placeholder={`Player ${index + 1}`}
                  value={playerNames[index]}
                  onChange={(e) => updatePlayerName(index, e.target.value)}
                  className='player-name-input'
                  maxLength={20}
                />
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
            <div className='player-indicator'>
              <div
                className='player-color'
                style={{ backgroundColor: PLAYER_COLORS[currentPlayer] }}
              ></div>
              <span>{getPlayerDisplayName(currentPlayer)}</span>
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
                    }`}
                  >
                    <div
                      className='player-color'
                      style={{ backgroundColor: PLAYER_COLORS[index] }}
                    ></div>
                    <div className='player-info'>
                      <span className='player-name'>
                        {getPlayerDisplayName(index)}
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
