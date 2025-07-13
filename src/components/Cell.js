import React from "react";
import "./Cell.css";

const Cell = ({
  row,
  col,
  cell,
  onClick,
  playerColors,
  animatingCells,
  playerNames,
  getPlayerDisplayName,
}) => {
  const { dots, owner, isEmpty } = cell;

  // Calculate the cell's appearance based on its state
  const getCellClass = () => {
    let classes = ["cell"];

    if (owner !== null) {
      classes.push("owned");
    }

    if (isEmpty) {
      classes.push("empty");
    }

    if (animatingCells.has(`${row}-${col}`)) {
      classes.push("animating");
    }

    return classes.join(" ");
  };

  // Get the cell's background color
  const getCellStyle = () => {
    if (owner !== null) {
      return {
        backgroundColor: isEmpty ? "transparent" : playerColors[owner],
        borderColor: playerColors[owner],
        borderWidth: isEmpty ? "3px" : "2px",
        borderStyle: "solid",
      };
    }
    return {};
  };

  // Render dots based on count
  const renderDots = () => {
    if (isEmpty) {
      // Show empty circle for claimed empty cells
      return (
        <div
          className='empty-dot'
          style={{ borderColor: playerColors[owner] }}
        />
      );
    }

    if (dots === 0) return null;

    const dotElements = [];
    for (let i = 0; i < dots; i++) {
      dotElements.push(
        <div
          key={i}
          className='dot'
          style={{
            backgroundColor: owner !== null ? "#fff" : "#666",
            animationDelay: `${i * 0.1}s`,
          }}
        />
      );
    }

    return <div className='dots-container'>{dotElements}</div>;
  };

  return (
    <div
      className={getCellClass()}
      style={getCellStyle()}
      onClick={onClick}
      title={`Cell (${row}, ${col}) - Dots: ${dots}, Owner: ${
        owner !== null ? getPlayerDisplayName(owner) : "None"
      }`}
    >
      {renderDots()}
    </div>
  );
};

export default Cell;
