
function updateMassFromInputs() {
  const inputs = [document.getElementById('massA'), document.getElementById('massB'), document.getElementById('massC')];
  inputs.forEach((input, index) => {
    const value = Number(input.value);
    blocks[index].mass = Number.isFinite(value) && value > 0 ? value : 1000;
    if (!Number.isFinite(value) || value <= 0) input.value = 1000;
  });
}

function drawMaterialIcon(block) {
  const icon = materialIcons[block.material];
  if (!icon || !icon.complete) return;
  const framePadding = 8;
  const iconPadding = 14;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(block.x + framePadding / 2, block.y + framePadding / 2, blockWidth - framePadding, blockHeight - framePadding);
  ctx.drawImage(icon, block.x + iconPadding, block.y + iconPadding, blockWidth - iconPadding * 2, blockHeight - iconPadding * 2);
  ctx.restore();
}

function drawBlocks() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  blocks.forEach(block => {
    ctx.save();
    ctx.fillStyle = 'rgba(10,10,10,0.96)';
    ctx.fillRect(block.x, block.y, blockWidth, blockHeight);
    ctx.lineWidth = 3;
    ctx.strokeStyle = block.color;
    ctx.strokeRect(block.x, block.y, blockWidth, blockHeight);
    drawMaterialIcon(block);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(block.label, block.x + 8, block.y + 20);
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#f0f0f0';
    ctx.fillText(`Temp: ${block.temperature.toFixed(1)} °C`, block.x - 2, block.y - 7);
    ctx.fillText(`m = ${Math.round(block.mass)} g`, block.x + 5, block.y + blockHeight + 18);
    ctx.fillText(materialProperties[block.material].name, block.x + 5, block.y + blockHeight + 36);
    ctx.restore();
  });
}

let equilibriumReached = false;

function blocksAreInContact(block1, block2) {
  return block1.x < block2.x + blockWidth && block1.x + blockWidth > block2.x && block1.y < block2.y + blockHeight && block1.y + blockHeight > block2.y;
}

function getContactPairs() {
  const pairs = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      if (blocksAreInContact(blocks[i], blocks[j])) pairs.push([i, j]);
    }
  }
  return pairs;
}

function updateSimulationContactState() {
  currentContactPairs = getContactPairs();
  simulationContactActive = currentContactPairs.length > 0;
  if (simulationContactActive && isSimulationRunning && !chartFrozen) {
    startTimer();
    startChartIfNeeded();
  } else {
    pauseTimerOnly();
    pauseChartOnly();
    lastHeatRateJoules = 0;
  }
  updateHeatCalculator();
}

function startChartIfNeeded() {
  if (!chartStarted) {
    chartStarted = true;
    chartFrozen = false;
    chartStartTime = Date.now();
    chartElapsedMs = 0;
    chartResumeTimestamp = Date.now();
    resetTemperatureHistory();
  } else if (!chartFrozen) {
    if (chartResumeTimestamp === null) chartResumeTimestamp = Date.now();
    ensureCurrentStatePoint();
  }
}

function getActiveContactBlockIndexes() {
  return [...new Set(currentContactPairs.flat())].sort((a, b) => a - b);
}

function getVisibleChartSeriesIndexes() {
  const activeIndexes = getActiveContactBlockIndexes();
  if (activeIndexes.length) {
    lastVisibleChartIndexes = [...activeIndexes];
    return activeIndexes;
  }
  if (equilibriumMarkerIndexes.length) return [...equilibriumMarkerIndexes];
  if (lastVisibleChartIndexes.length) return [...lastVisibleChartIndexes];
  return [];
}

function getLegendContactThermalData(index) {
  const activePoints = temperatureHistory[index].data.filter(point => point.active !== false);
  const initialTemp = activePoints.length ? activePoints[0].temperature : blocks[index].temperature;
  const finalTemp = activePoints.length ? activePoints[activePoints.length - 1].temperature : blocks[index].temperature;
  const deltaTemp = finalTemp - initialTemp;
  const deltaSign = deltaTemp > 0 ? '+' : '';

  return {
    initialTemp,
    finalTemp,
    deltaTemp,
    deltaSign,
    baseLabel: `Bloco ${blocks[index].label} - ${materialProperties[blocks[index].material].name} - ${Math.round(blocks[index].mass)} g`,
    deltaLabel: `Ti ${initialTemp.toFixed(1)} °C | Tf ${finalTemp.toFixed(1)} °C | ΔT ${deltaSign}${deltaTemp.toFixed(1)} °C`
  };
}

function ensureCurrentStatePoint() {
  const activeIndexes = new Set(getActiveContactBlockIndexes());
  temperatureHistory.forEach((series, index) => {
    if (!series.data.length) {
      series.data.push({
        time: getElapsedChartSeconds(),
        temperature: blocks[index].temperature,
        active: activeIndexes.has(index)
      });
    }
  });
}

function pauseChartOnly() {
  if (chartResumeTimestamp !== null) {
    chartElapsedMs += Date.now() - chartResumeTimestamp;
    chartResumeTimestamp = null;
  }
}

function getElapsedChartSeconds() {
  if (!chartStarted) return 0;
  const runningElapsed = chartResumeTimestamp !== null ? Date.now() - chartResumeTimestamp : 0;
  return (chartElapsedMs + runningElapsed) / 1000;
}

function appendTemperatureHistoryPoint(force = false) {
  if (!chartStarted || !chartStartTime) return false;
  const elapsedSeconds = getElapsedChartSeconds();
  const last = temperatureHistory[0].data[temperatureHistory[0].data.length - 1];
  const shouldAppend = force || !last || elapsedSeconds - last.time >= 0.08 || temperatureHistory.some((series, index) => Math.abs((series.data[series.data.length - 1]?.temperature ?? blocks[index].temperature) - blocks[index].temperature) > 0.02);
  if (!shouldAppend) return false;
  const activeIndexes = new Set(getActiveContactBlockIndexes());
  temperatureHistory.forEach((series, index) => series.data.push({
    time: elapsedSeconds,
    temperature: blocks[index].temperature,
    active: activeIndexes.has(index)
  }));
  const plotWidth = Math.max(plotArea.width, Math.ceil(Math.max(10, elapsedSeconds) * pixelsPerSecond));
  chartCanvas.width = plotWidth;
  chartCanvas.height = plotHeight;
  if (chartWrapper) chartWrapper.scrollLeft = chartWrapper.scrollWidth;
  return true;
}

function stopAtEquilibrium() {
  if (equilibriumSaved) return;
  equilibriumSaved = true;
  appendTemperatureHistoryPoint(true);
  chartFrozen = true;
  pauseChartOnly();
  equilibriumMarkerIndexes = getActiveContactBlockIndexes();
  equilibriumMarkerTime = temperatureHistory[0].data.length ? temperatureHistory[0].data[temperatureHistory[0].data.length - 1].time : getElapsedChartSeconds();
  equilibriumMarkerTemps = blocks.map(b => b.temperature);
  saveTime();
  pauseTimerOnly();
  isSimulationRunning = false;
  const pauseButton = document.querySelector('.pause-button');
  if (pauseButton) pauseButton.textContent = 'Play';
}

function formatEnergy(value, unitBase) {
  const absValue = Math.abs(value);
  let scaled = value;
  let unit = unitBase;
  if (absValue >= 1000000) {
    scaled = value / 1000000;
    unit = 'M' + unitBase;
  } else if (absValue >= 1000) {
    scaled = value / 1000;
    unit = 'K' + unitBase;
  }
  return `${scaled.toFixed(2)} ${unit}`;
}

function getPairLabel(pair) {
  return `Blocos ${blocks[pair[0]].label} e ${blocks[pair[1]].label}`;
}

function updateHeatCalculator() {
  const contactLabel = document.getElementById('heatContactLabel');
  const totalJ = document.getElementById('heatTotalJ');
  const totalCal = document.getElementById('heatTotalCal');
  const rateJ = document.getElementById('heatRateJ');
  const rateCal = document.getElementById('heatRateCal');
  if (!contactLabel) return;
  if (!currentContactPairs.length) contactLabel.textContent = 'Sem contato';
  else if (currentContactPairs.length === 3) contactLabel.textContent = 'Blocos A, B e C';
  else contactLabel.textContent = currentContactPairs.map(getPairLabel).join(' | ');
  totalJ.textContent = formatEnergy(totalHeatJoules, 'J');
  totalCal.textContent = formatEnergy(totalHeatJoules * JOULE_TO_CAL, 'cal');
  rateJ.textContent = `${formatEnergy(lastHeatRateJoules, 'J')}/s`;
  rateCal.textContent = `${formatEnergy(lastHeatRateJoules * JOULE_TO_CAL, 'cal')}/s`;
}

function getMassKg(block) { return block.mass / 1000; }
function getSpecificHeatJ(blockOrMaterial) {
  const material = typeof blockOrMaterial === 'string' ? blockOrMaterial : blockOrMaterial.material;
  return materialProperties[material].specificHeat * 1000;
}
function getLatentHeatJ(material) { return materialProperties[material].latentHeat * 1000; }
function isWaterFamily(material) { return material === 'ice' || material === 'water' || material === 'watervapour'; }

function getBlockEnthalpy(block) {
  const m = getMassKg(block);
  const cpIce = getSpecificHeatJ('ice');
  const cpWater = getSpecificHeatJ('water');
  const cpVapour = getSpecificHeatJ('watervapour');
  const lf = getLatentHeatJ('ice');
  const lv = getLatentHeatJ('water');

  if (block.material === 'ice') return -m * lf + m * cpIce * block.temperature;
  if (block.material === 'water') return m * cpWater * block.temperature;
  if (block.material === 'watervapour') return m * cpWater * 100 + m * lv + m * cpVapour * (block.temperature - 100);
  return m * getSpecificHeatJ(block) * block.temperature;
}

function getBlockEnthalpyAtTemperature(block, targetTemperature) {
  const m = getMassKg(block);
  if (isWaterFamily(block.material)) {
    const cpIce = getSpecificHeatJ('ice');
    const cpWater = getSpecificHeatJ('water');
    const cpVapour = getSpecificHeatJ('watervapour');
    const lf = getLatentHeatJ('ice');
    const lv = getLatentHeatJ('water');

    if (targetTemperature <= 0) return -m * lf + m * cpIce * targetTemperature;
    if (targetTemperature < 100) return m * cpWater * targetTemperature;
    return m * cpWater * 100 + m * lv + m * cpVapour * (targetTemperature - 100);
  }

  return m * getSpecificHeatJ(block.material) * targetTemperature;
}

function setBlockStateFromEnthalpy(blockIndex, enthalpy) {
  const block = blocks[blockIndex];
  const m = getMassKg(block);
  if (isWaterFamily(block.material)) {
    const cpIce = getSpecificHeatJ('ice');
    const cpWater = getSpecificHeatJ('water');
    const cpVapour = getSpecificHeatJ('watervapour');
    const lf = getLatentHeatJ('ice');
    const lv = getLatentHeatJ('water');
    const iceThreshold = -m * lf;
    const vapourThreshold = m * cpWater * 100 + m * lv;

    if (enthalpy < iceThreshold) {
      block.material = 'ice';
      block.temperature = (enthalpy + m * lf) / (m * cpIce);
    } else if (enthalpy < 0) {
      block.material = 'ice';
      block.temperature = 0;
    } else if (enthalpy < m * cpWater * 100) {
      block.material = 'water';
      block.temperature = enthalpy / (m * cpWater);
    } else if (enthalpy < vapourThreshold) {
      block.material = 'water';
      block.temperature = 100;
    } else {
      block.material = 'watervapour';
      block.temperature = 100 + (enthalpy - vapourThreshold) / (m * cpVapour);
    }
  } else {
    block.temperature = enthalpy / (m * getSpecificHeatJ(block));
  }

  const props = materialProperties[block.material];
  block.temperature = Math.max(props.minTemperature, Math.min(props.maxTemperature, block.temperature));
  block.specificHeat = props.specificHeat;
  block.latentHeat = props.latentHeat;
  syncSelectToMaterial(blockIndex, block.material);
}

function syncBlockThermalProperties(blockIndex) {
  const block = blocks[blockIndex];
  const props = materialProperties[block.material];
  block.temperature = Math.max(props.minTemperature, Math.min(props.maxTemperature, block.temperature));
  block.specificHeat = props.specificHeat;
  block.latentHeat = props.latentHeat;
  syncSelectToMaterial(blockIndex, block.material);
}

function normalizeWaterPhase(blockIndex) {
  const block = blocks[blockIndex];
  if (block.material === 'ice' && block.temperature > 0) {
    block.material = 'water';
  } else if (block.material === 'water' && block.temperature >= 100) {
    block.material = 'watervapour';
  } else if (block.material === 'watervapour' && block.temperature < 100) {
    block.material = 'water';
  } else if (block.material === 'water' && block.temperature < 0) {
    block.material = 'ice';
  }

  syncBlockThermalProperties(blockIndex);
}

function normalizeContactPhases() {
  const contactIndexes = new Set(currentContactPairs.flat());
  contactIndexes.forEach(index => normalizeWaterPhase(index));
}

function applyHeatToBlock(blockIndex, heatJoules) {
  if (!Number.isFinite(heatJoules) || Math.abs(heatJoules) < 1e-9) return;

  const block = blocks[blockIndex];
  let remainingHeat = heatJoules;
  let guard = 0;

  while (Math.abs(remainingHeat) > 1e-9 && guard < 8) {
    guard += 1;
    const material = block.material;
    const massKg = getMassKg(block);
    const specificHeat = getSpecificHeatJ(material);

    if (!isWaterFamily(material)) {
      block.temperature += remainingHeat / (massKg * specificHeat);
      remainingHeat = 0;
      break;
    }

    if (material === 'ice') {
      if (remainingHeat > 0 && block.temperature < 0) {
        const heatToZero = massKg * specificHeat * (0 - block.temperature);
        if (remainingHeat < heatToZero) {
          block.temperature += remainingHeat / (massKg * specificHeat);
          remainingHeat = 0;
        } else {
          block.temperature = 0;
          remainingHeat -= heatToZero;
          block.material = 'water';
          syncBlockThermalProperties(blockIndex);
        }
        continue;
      }

      if (remainingHeat > 0 && block.temperature >= 0) {
        block.material = 'water';
        syncBlockThermalProperties(blockIndex);
        continue;
      }

      block.temperature += remainingHeat / (massKg * specificHeat);
      remainingHeat = 0;
      break;
    }

    if (material === 'water') {
      if (remainingHeat < 0 && block.temperature > 0) {
        const heatToZero = massKg * specificHeat * block.temperature;
        if (Math.abs(remainingHeat) < heatToZero) {
          block.temperature += remainingHeat / (massKg * specificHeat);
          remainingHeat = 0;
        } else {
          block.temperature = 0;
          remainingHeat += heatToZero;
          block.material = 'ice';
          syncBlockThermalProperties(blockIndex);
        }
        continue;
      }

      if (remainingHeat < 0 && block.temperature <= 0) {
        block.material = 'ice';
        syncBlockThermalProperties(blockIndex);
        continue;
      }

      if (remainingHeat > 0 && block.temperature < 100) {
        const heatToBoil = massKg * specificHeat * (100 - block.temperature);
        if (remainingHeat < heatToBoil) {
          block.temperature += remainingHeat / (massKg * specificHeat);
          remainingHeat = 0;
        } else {
          block.temperature = 100;
          remainingHeat -= heatToBoil;
          block.material = 'watervapour';
          syncBlockThermalProperties(blockIndex);
        }
        continue;
      }

      if (remainingHeat > 0 && block.temperature >= 100) {
        block.material = 'watervapour';
        syncBlockThermalProperties(blockIndex);
        continue;
      }

      block.temperature += remainingHeat / (massKg * specificHeat);
      remainingHeat = 0;
      break;
    }

    if (material === 'watervapour') {
      if (remainingHeat < 0 && block.temperature > 100) {
        const heatToHundred = massKg * specificHeat * (block.temperature - 100);
        if (Math.abs(remainingHeat) < heatToHundred) {
          block.temperature += remainingHeat / (massKg * specificHeat);
          remainingHeat = 0;
        } else {
          block.temperature = 100;
          remainingHeat += heatToHundred;
          block.material = 'water';
          syncBlockThermalProperties(blockIndex);
        }
        continue;
      }

      if (remainingHeat < 0 && block.temperature <= 100) {
        block.material = 'water';
        syncBlockThermalProperties(blockIndex);
        continue;
      }

      block.temperature += remainingHeat / (massKg * specificHeat);
      remainingHeat = 0;
      break;
    }
  }

  normalizeWaterPhase(blockIndex);
}

function transferHeatBetweenBlocks(i, j, deltaSeconds) {
  const block1 = blocks[i];
  const block2 = blocks[j];
  const tempDiff = block1.temperature - block2.temperature;
  if (Math.abs(tempDiff) < 1e-6) return 0;

  const conductance = temperatureExchangeRate;
  const idealQ = conductance * Math.abs(tempDiff) * deltaSeconds;
  if (idealQ <= 0) return 0;

  const capacity1 = getMassKg(block1) * getSpecificHeatJ(block1);
  const capacity2 = getMassKg(block2) * getSpecificHeatJ(block2);
  const convergenceLimit = Math.abs(tempDiff) / ((1 / capacity1) + (1 / capacity2));
  const transferable = Math.max(0, Math.min(idealQ, convergenceLimit));
  if (transferable <= 0) return 0;

  if (tempDiff > 0) {
    applyHeatToBlock(i, -transferable);
    applyHeatToBlock(j, transferable);
  } else {
    applyHeatToBlock(i, transferable);
    applyHeatToBlock(j, -transferable);
  }

  return transferable;
}

function equalizeTemperature() {
  const currentTime = Date.now();
  const deltaSeconds = Math.max(0, (currentTime - lastUpdateTime) / 1000);
  updateMassFromInputs();
  updateSimulationContactState();
  if (!simulationContactActive || chartFrozen || !isSimulationRunning) {
    lastUpdateTime = currentTime;
    return;
  }

  let totalHeatThisFrame = 0;
  currentContactPairs.forEach(([i, j]) => {
    totalHeatThisFrame += transferHeatBetweenBlocks(i, j, deltaSeconds);
  });
  normalizeContactPhases();

  totalHeatJoules += totalHeatThisFrame;
  lastHeatRateJoules = totalHeatThisFrame / Math.max(deltaSeconds, 0.0001);
  if (Math.abs(lastHeatRateJoules) < HEAT_RATE_EPSILON) lastHeatRateJoules = 0;
  updateHeatCalculator();

  if (simulationContactActive && lastHeatRateJoules === 0 && !equilibriumReached) {
    showEquilibriumMessage();
    equilibriumReached = true;
    stopAtEquilibrium();
  }

  lastUpdateTime = currentTime;
}

function showEquilibriumMessage() {
  const message = document.getElementById('equilibriumMessage');
  if (!message) return;
  message.textContent = 'Equilíbrio Térmico Alcançado';
  message.classList.remove('hidden');
}

function releaseEquilibriumPause() {
  equilibriumReached = false;
  equilibriumSaved = false;
  chartFrozen = false;
  equilibriumMarkerTime = null;
  equilibriumMarkerTemps = null;
  equilibriumMarkerIndexes = [];
  const message = document.getElementById('equilibriumMessage');
  if (message) message.classList.add('hidden');
  if (chartStarted && simulationContactActive) chartResumeTimestamp = Date.now();
  lastUpdateTime = Date.now();
}

function syncSelectToMaterial(blockIndex, material) {
  const ids = ['block-a-select', 'block-b-select', 'block-c-select'];
  const select = document.getElementById(ids[blockIndex]);
  if (select) select.value = material;
}

function increaseTemperature(blockIndex) {
  const block = blocks[blockIndex];
  block.temperature += 10;
  normalizeWaterPhase(blockIndex);
  drawBlocks();
}

function decreaseTemperature(blockIndex) {
  const block = blocks[blockIndex];
  block.temperature -= 10;
  if (block.temperature < -273.15) block.temperature = -273.15;
  normalizeWaterPhase(blockIndex);
  drawBlocks();
}

function handleMouseDown(event) {
  const mouseX = event.clientX - canvas.getBoundingClientRect().left;
  const mouseY = event.clientY - canvas.getBoundingClientRect().top;
  blocks.forEach((block, index) => {
    if (mouseX >= block.x && mouseX <= block.x + blockWidth && mouseY >= block.y && mouseY <= block.y + blockHeight) {
      selectedBlockIndex = index;
      initialX = mouseX - block.x;
      initialY = mouseY - block.y;
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseup', handleMouseUp);
    }
  });
}

function handleMouseMove(event) {
  const mouseX = event.clientX - canvas.getBoundingClientRect().left;
  const mouseY = event.clientY - canvas.getBoundingClientRect().top;
  if (selectedBlockIndex !== -1) {
    const block = blocks[selectedBlockIndex];
    block.x = mouseX - initialX;
    block.y = mouseY - initialY;
    drawBlocks();
  }
}

function handleMouseUp() {
  canvas.removeEventListener('mousemove', handleMouseMove);
  canvas.removeEventListener('mouseup', handleMouseUp);
  selectedBlockIndex = -1;
  updateSimulationContactState();
}

function changeMaterial(blockIndex, material, currentBlock) {
  blocks[blockIndex].material = material;
  blocks[blockIndex].specificHeat = materialProperties[material].specificHeat;
  blocks[blockIndex].latentHeat = materialProperties[material].latentHeat;
  blocks[blockIndex].temperature = currentBlock.temperature;
  syncSelectToMaterial(blockIndex, material);
}

function setupInitialMaterialConditions(blockIndex, material) {
  blocks[blockIndex].material = material;
  blocks[blockIndex].specificHeat = materialProperties[material].specificHeat;
  blocks[blockIndex].latentHeat = materialProperties[material].latentHeat;
  blocks[blockIndex].temperature = materialProperties[material].averageTemperature;
  equilibriumReached = false;
  equilibriumSaved = false;
  chartFrozen = false;
  equilibriumMarkerTime = null;
  equilibriumMarkerTemps = null;
  equilibriumMarkerIndexes = [];
  lastVisibleChartIndexes = [];
  totalHeatJoules = 0;
  lastHeatRateJoules = 0;
  document.getElementById('equilibriumMessage').classList.add('hidden');
  syncBlockThermalProperties(blockIndex);
  updateHeatCalculator();
  const pauseButton = document.querySelector('.pause-button');
  if (pauseButton) pauseButton.textContent = 'Pausa';
  isSimulationRunning = true;
  drawBlocks();
}

function resetSimulation() {
  blocks.forEach((block, index) => {
    Object.assign(block, { ...initialBlockStates[index] });
    syncBlockThermalProperties(index);
  });

  document.getElementById('massA').value = initialBlockStates[0].mass;
  document.getElementById('massB').value = initialBlockStates[1].mass;
  document.getElementById('massC').value = initialBlockStates[2].mass;
  exchangeRateSlider.value = initialExchangeRateIndex;
  updateExchangeRate();

  totalHeatJoules = 0;
  lastHeatRateJoules = 0;
  equilibriumReached = false;
  equilibriumSaved = false;
  simulationContactActive = false;
  currentContactPairs = [];
  chartStarted = false;
  chartFrozen = false;
  chartStartTime = null;
  chartElapsedMs = 0;
  chartResumeTimestamp = null;
  equilibriumMarkerTime = null;
  equilibriumMarkerTemps = null;
  equilibriumMarkerIndexes = [];
  lastVisibleChartIndexes = [];
  resetTemperatureHistory();
  drawEmptyChart();

  clearInterval(timerInterval);
  pausedTime = 0;
  isRunning = false;
  lapCounter = 1;
  updateTimeDisplay(0);
  clearTimeList();

  const message = document.getElementById('equilibriumMessage');
  if (message) message.classList.add('hidden');

  isSimulationRunning = true;
  lastUpdateTime = Date.now();
  const pauseButton = document.querySelector('.pause-button');
  if (pauseButton) pauseButton.textContent = 'Pausa';

  updateMassFromInputs();
  updateSimulationContactState();
  drawBlocks();
  updateHeatCalculator();
}

function handleMaterialSelectionForBlockA(event) { setupInitialMaterialConditions(0, event.target.value); }
function handleMaterialSelectionForBlockB(event) { setupInitialMaterialConditions(1, event.target.value); }
function handleMaterialSelectionForBlockC(event) { setupInitialMaterialConditions(2, event.target.value); }

function updateExchangeRate() { temperatureExchangeRate = exchangeRateValues[exchangeRateSlider.value]; }

function recordTemperatureHistory() {
  if (!chartStarted || chartFrozen || !chartStartTime || !simulationContactActive || !isSimulationRunning) return;
  appendTemperatureHistoryPoint(false);
}

function getChartBounds() {
  const visibleIndexes = getVisibleChartSeriesIndexes();
  const allPoints = visibleIndexes.flatMap(index => temperatureHistory[index].data.filter(point => point.active !== false));
  let minTemp = allPoints.length ? Math.min(...allPoints.map(p => p.temperature)) : -10;
  let maxTemp = allPoints.length ? Math.max(...allPoints.map(p => p.temperature)) : 110;
  if (equilibriumMarkerTemps && equilibriumMarkerIndexes.length) {
    const markerTemps = equilibriumMarkerIndexes.map(index => equilibriumMarkerTemps[index]);
    if (markerTemps.length) {
      minTemp = Math.min(minTemp, ...markerTemps);
      maxTemp = Math.max(maxTemp, ...markerTemps);
    }
  }
  minTemp = Math.min(-10, minTemp - 5);
  maxTemp = Math.max(110, maxTemp + 5);
  if (maxTemp - minTemp < 20) { minTemp -= 10; maxTemp += 10; }
  const maxTime = Math.max(10, ...allPoints.map(p => p.time), equilibriumMarkerTime ?? 0, chartStarted && chartStartTime ? getElapsedChartSeconds() : 0);
  return { minTemp, maxTemp, maxTime };
}

function drawAxesLayer() {
  const w = chartAxesCanvas.width;
  const h = chartAxesCanvas.height;
  const padLeft = chartPadding.left;
  const padRight = chartPadding.right;
  const padTop = chartPadding.top;
  const padBottom = chartPadding.bottom;
  const plotW = plotArea.width;
  const plotH = plotArea.height;
  const { minTemp, maxTemp, maxTime } = getChartBounds();

  chartAxesCtx.clearRect(0, 0, w, h);
  chartAxesCtx.fillStyle = '#101010';
  chartAxesCtx.fillRect(0, 0, w, h);
  chartAxesCtx.strokeStyle = '#f0f0f0';
  chartAxesCtx.lineWidth = 1.5;
  chartAxesCtx.beginPath();
  chartAxesCtx.moveTo(padLeft, padTop);
  chartAxesCtx.lineTo(padLeft, h - padBottom);
  chartAxesCtx.lineTo(w - padRight, h - padBottom);
  chartAxesCtx.stroke();

  chartAxesCtx.fillStyle = '#f0f0f0';
  chartAxesCtx.font = '12px Roboto, Arial';
  chartAxesCtx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const temp = maxTemp - ((maxTemp - minTemp) / 5) * i;
    const y = padTop + (plotH / 5) * i + 4;
    chartAxesCtx.fillText(`${temp.toFixed(0)}`, padLeft - 8, y);
  }

  const xGridSpacing = Math.max(1, Math.ceil(maxTime / 8));
  chartAxesCtx.textAlign = 'center';
  for (let t = 0; t <= maxTime + 0.001; t += xGridSpacing) {
    const x = padLeft + (t / maxTime) * plotW;
    chartAxesCtx.fillText(`${t.toFixed(0)}`, x, h - padBottom + 18);
  }

  chartAxesCtx.save();
  chartAxesCtx.translate(18, h / 2);
  chartAxesCtx.rotate(-Math.PI / 2);
  chartAxesCtx.fillText('Temperatura (ºC)', 0, 0);
  chartAxesCtx.restore();
  chartAxesCtx.fillText('Tempo (s)', w / 2, h - 10);

  const visibleIndexes = getVisibleChartSeriesIndexes();
  visibleIndexes.forEach((index, legendPosition) => {
    const series = temperatureHistory[index];
    const legendData = getLegendContactThermalData(index);
    const legendX = padLeft + legendPosition * 195;
    chartAxesCtx.fillStyle = series.color;
    chartAxesCtx.fillRect(legendX, 6, 18, 6);
    chartAxesCtx.fillStyle = '#f0f0f0';
    chartAxesCtx.textAlign = 'left';
    chartAxesCtx.font = '11px Roboto, Arial';
    chartAxesCtx.fillText(legendData.baseLabel, legendX + 24, 12);
    chartAxesCtx.font = '10px Roboto, Arial';
    chartAxesCtx.fillText(legendData.deltaLabel, legendX + 24, 24);
  });

  if (!chartStarted) {
    chartAxesCtx.fillStyle = 'rgba(240,240,240,0.8)';
    chartAxesCtx.font = '13px Roboto, Arial';
    chartAxesCtx.textAlign = 'center';
    chartAxesCtx.fillText('O gráfico começa quando os blocos entram em contato.', padLeft + plotW / 2, padTop + 18);
  }
}

function drawPlotLayer() {
  const w = chartCanvas.width;
  const h = chartCanvas.height;
  const { minTemp, maxTemp, maxTime } = getChartBounds();
  chartCtx.clearRect(0, 0, w, h);
  chartCtx.fillStyle = '#101010';
  chartCtx.fillRect(0, 0, w, h);
  chartCtx.strokeStyle = 'rgba(255,255,255,0.12)';
  chartCtx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = (h / 5) * i;
    chartCtx.beginPath(); chartCtx.moveTo(0, y); chartCtx.lineTo(w, y); chartCtx.stroke();
  }
  const xGridSpacing = Math.max(1, Math.ceil(maxTime / 8));
  for (let t = 0; t <= maxTime + 0.001; t += xGridSpacing) {
    const x = (t / maxTime) * w;
    chartCtx.beginPath(); chartCtx.moveTo(x, 0); chartCtx.lineTo(x, h); chartCtx.stroke();
  }
  getVisibleChartSeriesIndexes().forEach(index => {
    const series = temperatureHistory[index];
    const points = series.data;
    if (!points.length) return;
    chartCtx.strokeStyle = series.color;
    chartCtx.lineWidth = 2.6;

    let segmentStarted = false;
    let segmentPointCount = 0;
    let lastActivePoint = null;

    points.forEach(point => {
      if (point.active === false) {
        if (segmentStarted) {
          if (segmentPointCount === 1 && lastActivePoint) {
            const singleX = (lastActivePoint.time / maxTime) * w;
            const singleY = ((maxTemp - lastActivePoint.temperature) / (maxTemp - minTemp)) * h;
            chartCtx.lineTo(singleX + 0.01, singleY);
          }
          chartCtx.stroke();
        }
        segmentStarted = false;
        segmentPointCount = 0;
        lastActivePoint = null;
        return;
      }

      const x = (point.time / maxTime) * w;
      const y = ((maxTemp - point.temperature) / (maxTemp - minTemp)) * h;
      if (!segmentStarted) {
        chartCtx.beginPath();
        chartCtx.moveTo(x, y);
        segmentStarted = true;
        segmentPointCount = 1;
      } else {
        chartCtx.lineTo(x, y);
        segmentPointCount += 1;
      }
      lastActivePoint = point;
    });

    if (segmentStarted) {
      if (segmentPointCount === 1 && lastActivePoint) {
        const singleX = (lastActivePoint.time / maxTime) * w;
        const singleY = ((maxTemp - lastActivePoint.temperature) / (maxTemp - minTemp)) * h;
        chartCtx.lineTo(singleX + 0.01, singleY);
      }
      chartCtx.stroke();
    }
  });
  if (equilibriumMarkerTime !== null && equilibriumMarkerTemps && equilibriumMarkerIndexes.length) {
    equilibriumMarkerIndexes.forEach(index => {
      const temp = equilibriumMarkerTemps[index];
      const x = (equilibriumMarkerTime / maxTime) * w;
      const y = ((maxTemp - temp) / (maxTemp - minTemp)) * h;
      const size = 7;
      chartCtx.strokeStyle = temperatureHistory[index].color;
      chartCtx.lineWidth = 2.4;
      chartCtx.beginPath();
      chartCtx.moveTo(x - size, y - size);
      chartCtx.lineTo(x + size, y + size);
      chartCtx.moveTo(x + size, y - size);
      chartCtx.lineTo(x - size, y + size);
      chartCtx.stroke();
    });
  }
}

function drawTemperatureChart() {
  drawAxesLayer();
  drawPlotLayer();
}

function drawEmptyChart() { drawTemperatureChart(); }

function resetTemperatureHistory() {
  const activeIndexes = new Set(getActiveContactBlockIndexes());
  temperatureHistory.forEach(series => { series.data = []; });
  chartCanvas.width = plotArea.width;
  chartCanvas.height = plotArea.height;
  if (chartWrapper) chartWrapper.scrollLeft = 0;
  if (chartStarted && chartStartTime) {
    temperatureHistory.forEach((series, index) => series.data.push({
      time: 0,
      temperature: blocks[index].temperature,
      active: activeIndexes.has(index)
    }));
  }
}

function exportGraphAsJPEG() {
  const { maxTime } = getChartBounds();
  const exportWidth = chartPadding.left + chartCanvas.width + chartPadding.right;
  const exportHeight = 390;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;
  const ectx = exportCanvas.getContext('2d');
  ectx.fillStyle = '#101010';
  ectx.fillRect(0, 0, exportWidth, exportHeight);
  ectx.drawImage(chartCanvas, chartPadding.left, chartPadding.top);

  ectx.strokeStyle = '#f0f0f0';
  ectx.lineWidth = 1.5;
  ectx.beginPath();
  ectx.moveTo(chartPadding.left, chartPadding.top);
  ectx.lineTo(chartPadding.left, chartPadding.top + chartCanvas.height);
  ectx.lineTo(chartPadding.left + chartCanvas.width, chartPadding.top + chartCanvas.height);
  ectx.stroke();

  const { minTemp, maxTemp } = getChartBounds();
  ectx.fillStyle = '#f0f0f0';
  ectx.font = '12px Arial';
  ectx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const temp = maxTemp - ((maxTemp - minTemp) / 5) * i;
    const y = chartPadding.top + (chartCanvas.height / 5) * i + 4;
    ectx.fillText(`${temp.toFixed(0)}`, chartPadding.left - 8, y);
  }
  ectx.textAlign = 'center';
  const xGridSpacing = Math.max(1, Math.ceil(maxTime / 8));
  for (let t = 0; t <= maxTime + 0.001; t += xGridSpacing) {
    const x = chartPadding.left + (t / maxTime) * chartCanvas.width;
    ectx.fillText(`${t.toFixed(0)}`, x, chartPadding.top + chartCanvas.height + 18);
  }
  ectx.save();
  ectx.translate(20, chartPadding.top + chartCanvas.height / 2);
  ectx.rotate(-Math.PI / 2);
  ectx.fillText('Temperatura (ºC)', 0, 0);
  ectx.restore();
  ectx.fillText('Tempo (s)', chartPadding.left + chartCanvas.width / 2, chartPadding.top + chartCanvas.height + 36);

  getVisibleChartSeriesIndexes().forEach((index, legendPosition) => {
    const series = temperatureHistory[index];
    const legendData = getLegendContactThermalData(index);
    const legendX = chartPadding.left + legendPosition * 205;
    ectx.fillStyle = series.color;
    ectx.fillRect(legendX, 6, 18, 6);
    ectx.fillStyle = '#f0f0f0';
    ectx.textAlign = 'left';
    ectx.font = '11px Arial';
    ectx.fillText(legendData.baseLabel, legendX + 24, 12);
    ectx.font = '10px Arial';
    ectx.fillText(legendData.deltaLabel, legendX + 24, 24);
  });

  const metaY = chartPadding.top + chartCanvas.height + 70;
  ectx.textAlign = 'left';
  ectx.font = '13px Arial';
  ectx.fillText(`Contato: ${document.getElementById('heatContactLabel').textContent}`, chartPadding.left, metaY);
  ectx.fillText(`Q total: ${document.getElementById('heatTotalJ').textContent} | ${document.getElementById('heatTotalCal').textContent}`, chartPadding.left, metaY + 22);

  const link = document.createElement('a');
  link.href = exportCanvas.toDataURL('image/jpeg', 0.95);
  link.download = 'grafico-lei-zero-termodinamica.jpg';
  link.click();
}

function runSimulation() {
  if (isSimulationRunning) {
    equalizeTemperature();
    recordTemperatureHistory();
  } else {
    updateSimulationContactState();
  }
  drawBlocks();
  drawTemperatureChart();
  requestAnimationFrame(runSimulation);
}
