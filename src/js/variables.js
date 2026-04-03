let initialX, initialY;
let selectedBlockIndex = -1;
let isSimulationRunning = true;
let lastUpdateTime = Date.now();

const blockWidth = 100;
const blockHeight = 100;
const HEAT_RATE_EPSILON = 1e-3;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const blocks = [
  { x: 75, y: 60, color: '#ff6666', temperature: 0, label: 'A', material: 'ice', mass: 1000 },
  { x: 275, y: 60, color: '#00bfff', temperature: 60, label: 'B', material: 'water', mass: 1000 },
  { x: 475, y: 60, color: '#28f200', temperature: 20, label: 'C', material: 'glass', mass: 1000 }
];
const initialBlockStates = blocks.map(block => ({ ...block }));

const exchangeRateSlider = document.getElementById('exchangeRateSlider');
const exchangeRateDisplay = document.getElementById('exchangeRateDisplay');
const exchangeRateValues = [60, 120, 240, 500, 1000];
const initialExchangeRateIndex = 2;
exchangeRateSlider.value = initialExchangeRateIndex;
let temperatureExchangeRate = exchangeRateValues[initialExchangeRateIndex];

const chartAxesCanvas = document.getElementById('temperatureAxes');
const chartAxesCtx = chartAxesCanvas.getContext('2d');
const chartCanvas = document.getElementById('temperaturePlot');
const chartCtx = chartCanvas.getContext('2d');
const chartWrapper = document.getElementById('chartScrollWrapper');
const chartPadding = { left: 60, right: 28, top: 28, bottom: 42 };
const plotArea = { left: chartPadding.left, top: chartPadding.top, width: 650 - chartPadding.left - chartPadding.right, height: 280 - chartPadding.top - chartPadding.bottom };
const plotHeight = plotArea.height;
const pixelsPerSecond = 28;
let chartStarted = false;
let chartFrozen = false;
let chartStartTime = null;
let chartElapsedMs = 0;
let chartResumeTimestamp = null;
let equilibriumMarkerTime = null;
let equilibriumMarkerTemps = null;
let equilibriumMarkerIndexes = [];
let lastVisibleChartIndexes = [];
const temperatureHistory = [
  { label: 'A', color: '#ff6666', data: [] },
  { label: 'B', color: '#00bfff', data: [] },
  { label: 'C', color: '#28f200', data: [] }
];

let simulationContactActive = false;
let currentContactPairs = [];
let totalHeatJoules = 0;
let lastHeatRateJoules = 0;
const JOULE_TO_CAL = 1 / 4.184;
let equilibriumSaved = false;

const materialIcons = {};
Object.keys(materialProperties).forEach(key => {
  const img = new Image();
  img.src = `./image-icons/materials/${key}.png`;
  materialIcons[key] = img;
});
