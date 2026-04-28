const SAMPLE_SIZE = 20;
const ITEM_COUNT = 50;
const MODELS = ["#57-3", "#57-4", "#58-1"];
const TYPES = ["1st", "2nd", "3rd"];

const modelSelect = document.getElementById("modelSelect");
const typeSelect = document.getElementById("typeSelect");
const itemSelect = document.getElementById("itemSelect");
const uslInput = document.getElementById("uslInput");
const lslInput = document.getElementById("lslInput");
const uclInput = document.getElementById("uclInput");
const clInput = document.getElementById("clInput");
const lclInput = document.getElementById("lclInput");
const saveSpecBtn = document.getElementById("saveSpecBtn");
const regenBtn = document.getElementById("regenBtn");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const statusMsg = document.getElementById("statusMsg");

let chart;
const store = buildInitialStore();

function buildInitialStore() {
  const data = {};
  MODELS.forEach((model, modelIdx) => {
    data[model] = {};
    TYPES.forEach((type, typeIdx) => {
      data[model][type] = [];
      for (let i = 1; i <= ITEM_COUNT; i += 1) {
        const base = 0.12 + modelIdx * 0.006 + typeIdx * 0.003 + i * 0.0003;
        const spec = {
          itemName: `관리항목 ${String(i).padStart(2, "0")}`,
          usl: round(base + 0.05),
          lsl: round(base - 0.05),
          ucl: round(base + 0.03),
          cl: round(base),
          lcl: round(base - 0.03)
        };
        data[model][type].push({ ...spec, samples: generateSamples(spec) });
      }
    });
  });
  return data;
}

function round(v) {
  return Number(v.toFixed(3));
}

function generateSamples(spec) {
  const points = [];
  const sigma = (spec.ucl - spec.cl) / 3 || 0.003;
  for (let i = 0; i < SAMPLE_SIZE; i += 1) {
    const wave = Math.sin((i / SAMPLE_SIZE) * Math.PI * 2) * sigma * 0.6;
    const jitter = (Math.random() - 0.5) * sigma * 0.8;
    let value = spec.cl + wave + jitter;
    value = Math.max(spec.lsl + 0.0005, Math.min(spec.usl - 0.0005, value));
    points.push(round(value));
  }

  points[0] = round(Math.min(spec.usl - 0.001, spec.ucl + sigma * 1.7));
  points[1] = round(Math.max(spec.lsl + 0.001, spec.cl + sigma * 0.8));
  return points;
}

function bindSelect(selectEl, values) {
  selectEl.innerHTML = "";
  values.forEach((val) => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val;
    selectEl.appendChild(opt);
  });
}

function getCurrentEntry() {
  const model = modelSelect.value;
  const type = typeSelect.value;
  const idx = Number(itemSelect.value);
  return store[model][type][idx];
}

function renderSpecFields(entry) {
  uslInput.value = entry.usl;
  lslInput.value = entry.lsl;
  uclInput.value = entry.ucl;
  clInput.value = entry.cl;
  lclInput.value = entry.lcl;
}

function chartLine(value, size = SAMPLE_SIZE) {
  return new Array(size).fill(value);
}

function renderChart(entry) {
  const labels = Array.from({ length: SAMPLE_SIZE }, (_, i) => `Lot ${i + 1}`);
  const data = {
    labels,
    datasets: [
      {
        label: entry.itemName,
        data: entry.samples,
        borderColor: "#2f61ff",
        backgroundColor: "#2f61ff",
        tension: 0.2,
        pointRadius: 4,
        pointHoverRadius: 5
      },
      { label: "USL", data: chartLine(entry.usl), borderColor: "#ef4a4a", borderDash: [5, 4], pointRadius: 0 },
      { label: "LSL", data: chartLine(entry.lsl), borderColor: "#ef4a4a", borderDash: [5, 4], pointRadius: 0 },
      { label: "UCL", data: chartLine(entry.ucl), borderColor: "#8f8f8f", borderDash: [2, 3], pointRadius: 0 },
      { label: "CL", data: chartLine(entry.cl), borderColor: "#2ca24a", borderWidth: 2, pointRadius: 0 },
      { label: "LCL", data: chartLine(entry.lcl), borderColor: "#8f8f8f", borderDash: [2, 3], pointRadius: 0 }
    ]
  };

  if (chart) {
    chart.data = data;
    chart.options.plugins.title.text = `${entry.itemName} (${modelSelect.value}/${typeSelect.value})`;
    chart.update();
    return;
  }

  chart = new Chart(document.getElementById("spcChart"), {
    type: "line",
    data,
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        title: {
          display: true,
          text: `${entry.itemName} (${modelSelect.value}/${typeSelect.value})`,
          align: "start",
          color: "#666",
          font: { size: 24, weight: "normal" }
        }
      },
      scales: {
        y: {
          grid: { color: "#d0d0d0" },
          ticks: { color: "#444" }
        },
        x: {
          ticks: { maxRotation: 55, minRotation: 55, autoSkip: false, font: { size: 10 } }
        }
      }
    }
  });
}

function populateItems() {
  const items = store[modelSelect.value][typeSelect.value];
  itemSelect.innerHTML = "";
  items.forEach((item, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = item.itemName;
    itemSelect.appendChild(opt);
  });
}

function refreshAll() {
  const entry = getCurrentEntry();
  renderSpecFields(entry);
  renderChart(entry);
}

function validateSpec(spec) {
  const required = ["usl", "lsl", "ucl", "cl", "lcl"];
  for (const key of required) {
    if (!Number.isFinite(spec[key])) {
      return `${key.toUpperCase()} 값이 유효하지 않습니다.`;
    }
  }
  if (!(spec.usl > spec.ucl && spec.ucl >= spec.cl && spec.cl >= spec.lcl && spec.lcl > spec.lsl)) {
    return "기준은 USL > UCL ≥ CL ≥ LCL > LSL 을 만족해야 합니다.";
  }
  return "";
}

function setStatus(message) {
  statusMsg.textContent = message;
}

modelSelect.addEventListener("change", () => {
  populateItems();
  refreshAll();
});

typeSelect.addEventListener("change", () => {
  populateItems();
  refreshAll();
});

itemSelect.addEventListener("change", refreshAll);

saveSpecBtn.addEventListener("click", () => {
  const entry = getCurrentEntry();
  const nextSpec = {
    usl: Number(uslInput.value),
    lsl: Number(lslInput.value),
    ucl: Number(uclInput.value),
    cl: Number(clInput.value),
    lcl: Number(lclInput.value)
  };
  const err = validateSpec(nextSpec);
  if (err) {
    setStatus(err);
    return;
  }
  Object.assign(entry, nextSpec);
  entry.samples = generateSamples(entry);
  renderChart(entry);
  setStatus(`${entry.itemName} SPEC이 저장되었습니다.`);
});

regenBtn.addEventListener("click", () => {
  const entry = getCurrentEntry();
  entry.samples = generateSamples(entry);
  renderChart(entry);
  setStatus(`${entry.itemName} 샘플(${SAMPLE_SIZE}개)을 재생성했습니다.`);
});

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "spc-specs.json";
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus("SPEC JSON을 내보냈습니다.");
});

importInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    MODELS.forEach((model) => {
      TYPES.forEach((type) => {
        if (Array.isArray(parsed?.[model]?.[type]) && parsed[model][type].length === ITEM_COUNT) {
          store[model][type] = parsed[model][type].map((item, idx) => {
            const fallback = store[model][type][idx];
            return {
              itemName: item.itemName || fallback.itemName,
              usl: Number(item.usl),
              lsl: Number(item.lsl),
              ucl: Number(item.ucl),
              cl: Number(item.cl),
              lcl: Number(item.lcl),
              samples: Array.isArray(item.samples) && item.samples.length === SAMPLE_SIZE
                ? item.samples.map((v) => Number(v))
                : generateSamples(item)
            };
          });
        }
      });
    });
    populateItems();
    refreshAll();
    setStatus("SPEC JSON 불러오기를 완료했습니다.");
  } catch (e) {
    setStatus(`불러오기 실패: ${e.message}`);
  } finally {
    importInput.value = "";
  }
});

function init() {
  bindSelect(modelSelect, MODELS);
  bindSelect(typeSelect, TYPES);
  populateItems();
  refreshAll();
  setStatus(`초기 데이터: 모델 ${MODELS.length}개 × Type ${TYPES.length}개 × 항목 ${ITEM_COUNT}개`);
}

init();
