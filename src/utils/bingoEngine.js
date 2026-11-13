/**
 * 5x5 聖誕賓果核心規則與 12 條連線判定引擎
 * - 5 條橫向連線 (Rows 0..4)
 * - 5 條直向連線 (Cols 0..4)
 * - 2 條斜向連線 (Diagonals)
 * 共 12 條可能連線
 */

export const BINGO_LINES = [
  // 5 條橫向連線
  { id: 'row-0', name: '第 1 橫列', indices: [0, 1, 2, 3, 4], type: 'row' },
  { id: 'row-1', name: '第 2 橫列', indices: [5, 6, 7, 8, 9], type: 'row' },
  { id: 'row-2', name: '第 3 橫列', indices: [10, 11, 12, 13, 14], type: 'row' },
  { id: 'row-3', name: '第 4 橫列', indices: [15, 16, 17, 18, 19], type: 'row' },
  { id: 'row-4', name: '第 5 橫列', indices: [20, 21, 22, 23, 24], type: 'row' },
  // 5 條直向連線
  { id: 'col-0', name: 'B 直欄', indices: [0, 5, 10, 15, 20], type: 'col' },
  { id: 'col-1', name: 'I 直欄', indices: [1, 6, 11, 16, 21], type: 'col' },
  { id: 'col-2', name: 'N 直欄', indices: [2, 7, 12, 17, 22], type: 'col' },
  { id: 'col-3', name: 'G 直欄', indices: [3, 8, 13, 18, 23], type: 'col' },
  { id: 'col-4', name: 'O 直欄', indices: [4, 9, 14, 19, 24], type: 'col' },
  // 2 條斜向連線
  { id: 'diag-main', name: '左上右下斜線', indices: [0, 6, 12, 18, 24], type: 'diag' },
  { id: 'diag-anti', name: '右上左下斜線', indices: [4, 8, 12, 16, 20], type: 'diag' }
];

export const FREE_INDEX = 12;

/**
 * 根據長度 25 的布林陣列 markedCells，計算目前已完成的連線清單與構成連線的格子索引集合
 * @param {boolean[]} markedCells 長度 25 的標記狀態陣列 (index 12 恆為 true)
 */
export function evaluateBingoCard(markedCells) {
  const completedLines = [];
  const winningCellIndices = new Set();
  const almostLines = []; // 聽牌 (差 1 格連線)

  for (const line of BINGO_LINES) {
    let count = 0;
    let missingIdx = -1;
    for (const idx of line.indices) {
      if (idx === FREE_INDEX || markedCells[idx]) {
        count++;
      } else {
        missingIdx = idx;
      }
    }
    if (count === 5) {
      completedLines.push(line);
      line.indices.forEach((i) => winningCellIndices.add(i));
    } else if (count === 4 && missingIdx !== -1) {
      almostLines.push({ line, missingIdx });
    }
  }

  return {
    lineCount: completedLines.length,
    completedLines,
    winningCellIndices,
    almostLines
  };
}

/**
 * 供主持人端「工作人員 3 秒驗獎器」使用：
 * 傳入指定卡片與主持人實際已開出的號碼陣列 drawnNumbers，計算官方有效連線數
 */
export function verifyCardAgainstDrawnNumbers(card, drawnNumbers) {
  const drawnSet = new Set(drawnNumbers);
  const officialMarked = card.grid.map((val, idx) =>
    idx === FREE_INDEX || val === 'FREE' ? true : drawnSet.has(Number(val))
  );
  const evaluation = evaluateBingoCard(officialMarked);
  return {
    officialMarked,
    ...evaluation
  };
}

// 相容別名匯出
export const evaluateBingoLines = evaluateBingoCard;
export const verifyCardWithDrawnNumbers = verifyCardAgainstDrawnNumbers;

