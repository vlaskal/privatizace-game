import React from "react";
import "./Grid.css";
import Cell from "./Cell";

const Grid = ({
  grid,
  onCellClick,
  playerColors,
  animatingCells,
  playerNames,
  getPlayerDisplayName,
  gridSize,
}) => {
  const getGridClass = () => {
    let className = "grid";
    if (gridSize === 16) className += " grid-16";
    else if (gridSize === 20) className += " grid-20";
    return className;
  };

  return (
    <div className='grid-container'>
      <div className={getGridClass()}>
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className='grid-row'>
            {row.map((cell, colIndex) => (
              <Cell
                key={`${rowIndex}-${colIndex}`}
                row={rowIndex}
                col={colIndex}
                cell={cell}
                onClick={() => onCellClick(rowIndex, colIndex)}
                playerColors={playerColors}
                animatingCells={animatingCells}
                playerNames={playerNames}
                getPlayerDisplayName={getPlayerDisplayName}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Grid;
