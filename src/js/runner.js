
document.getElementById('increaseATemperature').addEventListener('click', () => increaseTemperature(0));
document.getElementById('increaseBTemperature').addEventListener('click', () => increaseTemperature(1));
document.getElementById('increaseCTemperature').addEventListener('click', () => increaseTemperature(2));
document.getElementById('decreaseATemperature').addEventListener('click', () => decreaseTemperature(0));
document.getElementById('decreaseBTemperature').addEventListener('click', () => decreaseTemperature(1));
document.getElementById('decreaseCTemperature').addEventListener('click', () => decreaseTemperature(2));
canvas.addEventListener('mousedown', handleMouseDown);

document.getElementById('block-a-select').addEventListener('change', handleMaterialSelectionForBlockA);
document.getElementById('block-b-select').addEventListener('change', handleMaterialSelectionForBlockB);
document.getElementById('block-c-select').addEventListener('change', handleMaterialSelectionForBlockC);
document.getElementById('massA').addEventListener('input', updateMassFromInputs);
document.getElementById('massB').addEventListener('input', updateMassFromInputs);
document.getElementById('massC').addEventListener('input', updateMassFromInputs);
document.getElementById('exportGraphButton').addEventListener('click', exportGraphAsJPEG);

const pauseButton = document.querySelector('.pause-button');
const restartButton = document.querySelector('.restart-button');

pauseButton.addEventListener('click', function () {
  if (!isSimulationRunning && chartFrozen) {
    releaseEquilibriumPause();
  }
  isSimulationRunning = !isSimulationRunning;
  lastUpdateTime = Date.now();
  if (!isSimulationRunning) {
    pauseTimerOnly();
    pauseChartOnly();
  } else {
    updateSimulationContactState();
  }
  pauseButton.textContent = isSimulationRunning ? 'Pausa' : 'Play';
});

restartButton.addEventListener('click', function () { resetSimulation(); });

let timerInterval;
let startTime;
let pausedTime = 0;
let isRunning = false;
let lapCounter = 1;

function startTimer() {
  if (isRunning || !isSimulationRunning || !simulationContactActive || chartFrozen) return;
  startTime = Date.now() - pausedTime;
  timerInterval = setInterval(updateTimer, 10);
  isRunning = true;
}

function pauseTimerOnly() {
  if (!isRunning) return;
  clearInterval(timerInterval);
  pausedTime = Date.now() - startTime;
  isRunning = false;
}

function pauseTimer() { pauseTimerOnly(); }

function resetTimer() {
  clearInterval(timerInterval);
  pausedTime = 0;
  isRunning = false;
  lapCounter = 1;
  updateTimeDisplay(0);
  clearTimeList();
  location.reload();
}

function saveTime() {
  const elapsed = isRunning ? Date.now() - startTime : pausedTime;
  if (!elapsed && elapsed !== 0) return;
  const formattedTime = formatTime(elapsed);
  const timeList = document.getElementById('timeList');
  const listItem = document.createElement('li');
  listItem.textContent = `Tempo ${lapCounter}: ${formattedTime}`;
  timeList.appendChild(listItem);
  lapCounter++;
}

function clearTimeList() { document.getElementById('timeList').innerHTML = ''; }
function formatTime(time) {
  const centiseconds = Math.floor((time % 1000) / 10);
  const seconds = Math.floor((time / 1000) % 60);
  const minutes = Math.floor((time / (1000 * 60)) % 60);
  return `${padTime(minutes)} m : ${padTime(seconds)} s : ${padTime(centiseconds)}`;
}
function padTime(value) { return value < 10 ? '0' + value : value; }
function updateTimer() { updateTimeDisplay(Date.now() - startTime); }
function updateTimeDisplay(time) { document.getElementById('timer').textContent = formatTime(time); }

updateExchangeRate();
updateMassFromInputs();
updateSimulationContactState();
drawBlocks();
drawEmptyChart();
runSimulation();
