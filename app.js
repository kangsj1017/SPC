const SAMPLE_SIZE = 20;
const ITEM_COUNT = 50;
const MODELS = ["#57-3", "#57-4", "#58-1"];
const TYPES = ["1st", "2nd", "3rd"];

const modelSelect = document.getElementById("modelSelect");
const typeSelect = document.getElementById("typeSelect");
const chartItemSelect = document.getElementById("chartItemSelect");
const specTbody = document.getElementById("specTbody");
const saveAllBtn = document.getElementById("saveAllBtn");
const regenBtn = document.getElementById("regenBtn");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const status = document.getElementById("status");
const chartTitle = document.getElementById("chartTitle");

let chart;
const store = buildStore();

function buildStore() {
  const obj = {};
  MODELS.forEach((model, mi) => {
    obj[model] = {};
    TYPES.forEach((type, ti) => {
      obj[model][type] = [];
      for (let i = 1; i <= ITEM_COUNT; i += 1) {
        const cl = round(0.12 + mi * 0.008 + ti * 0.004 + i * 0.0005);
        const row = {
          itemName: `관리항목 ${String(i).padStart(2, "0")}`,
          usl: round(cl + 0.05),
          lsl: round(cl - 0.05),
          ucl: round(cl + 0.03),
          cl,
          lcl: round(cl - 0.03)
        };
        row.samples = createSamples(row);
        obj[model][type].push(row);
      }
    });
  });
  return obj;
}

function round(v) {
  return Number(v.toFixed(3));
}

function createSamples(spec) {
  const sigma = Math.max(0.001, (spec.ucl - spec.cl) / 3);
  return Array.from({ length: SAMPLE_SIZE }, (_, i) => {
    const wave = Math.sin((i / (SAMPLE_SIZE - 1)) * Math.PI * 2) * sigma * 0.7;
    const noise = (Math.random() - 0.5) * sigma;
    const raw = spec.cl + wave + noise;
    const limited = Math.min(spec.usl - 0.001, Math.max(spec.lsl + 0.001, raw));
    return round(limited);
  });
}

function bindBasicSelects() {
  modelSelect.innerHTML = MODELS.map((m) => `<option value="${m}">${m}</option>`).join("");
  typeSelect.innerHTML = TYPES.map((t) => `<option value="${t}">${t}</option>`).join("");
}

function getItems() {
  return store[modelSelect.value][typeSelect.value];
}

function renderChartItemSelect() {
  const items = getItems();
  chartItemSelect.innerHTML = items
    .map((row, idx) => `<option value="${idx}">${row.itemName}</option>`)
    .join("");
}

function renderSpecTable() {
  const items = getItems();
  specTbody.innerHTML = items
    .map(
      (row, idx) => `
      <tr data-index="${idx}">
        <td>${row.itemName}</td>
        <td><input data-key="usl" type="number" step="0.001" value="${row.usl}"></td>
        <td><input data-key="lsl" type="number" step="0.001" value="${row.lsl}"></td>
        <td><input data-key="ucl" type="number" step="0.001" value="${row.ucl}"></td>
        <td><input data-key="cl" type="number" step="0.001" value="${row.cl}"></td>
        <td><input data-key="lcl" type="number" step="0.001" value="${row.lcl}"></td>
      </tr>
    `
    )
    .join("");
  highlightActiveRow(Number(chartItemSelect.value || 0));
}

function validateRule(spec) {
  return spec.usl > spec.ucl && spec.ucl >= spec.cl && spec.cl >= spec.lcl && spec.lcl > spec.lsl;
}

function extractTableRowSpec(tr) {
  const values = {};
  tr.querySelectorAll("input").forEach((input) => {
    values[input.dataset.key] = Number(input.value);
  });
  return values;
}

function saveTableToStore() {
  const items = getItems();
  const rows = [...specTbody.querySelectorAll("tr")];

  for (const tr of rows) {
    const idx = Number(tr.dataset.index);
    const next = extractTableRowSpec(tr);

    if (Object.values(next).some((v) => !Number.isFinite(v))) {
      setStatus(`숫자값 오류: ${items[idx].itemName}`);
      return false;
    }

    if (!validateRule(next)) {
      setStatus(`기준식 오류: ${items[idx].itemName} (USL > UCL ≥ CL ≥ LCL > LSL)`);
      return false;
    }

    items[idx].usl = round(next.usl);
    items[idx].lsl = round(next.lsl);
    items[idx].ucl = round(next.ucl);
    items[idx].cl = round(next.cl);
    items[idx].lcl = round(next.lcl);
  }

  setStatus(`저장 완료: ${modelSelect.value}/${typeSelect.value}의 50개 관리항목 SPEC`);
  return true;
}

function renderChart() {
  const idx = Number(chartItemSelect.value);
  const row = getItems()[idx];
  chartTitle.textContent = `${row.itemName} (${modelSelect.value} / ${typeSelect.value})`;

  const data = {
    labels: Array.from({ length: SAMPLE_SIZE }, (_, i) => `Sample ${i + 1}`),
    datasets: [
      {
        label: row.itemName,
        data: row.samples,
        borderColor: "#345dff",
        backgroundColor: "#345dff",
        pointRadius: 4,
        tension: 0.2
      },
      { label: "USL", data: new Array(SAMPLE_SIZE).fill(row.usl), borderColor: "#ff4b4b", borderDash: [6, 4], pointRadius: 0 },
      { label: "LSL", data: new Array(SAMPLE_SIZE).fill(row.lsl), borderColor: "#ff4b4b", borderDash: [6, 4], pointRadius: 0 },
      { label: "UCL", data: new Array(SAMPLE_SIZE).fill(row.ucl), borderColor: "#7b7b7b", borderDash: [2, 3], pointRadius: 0 },
      { label: "CL", data: new Array(SAMPLE_SIZE).fill(row.cl), borderColor: "#2aaf57", borderWidth: 2, pointRadius: 0 },
      { label: "LCL", data: new Array(SAMPLE_SIZE).fill(row.lcl), borderColor: "#7b7b7b", borderDash: [2, 3], pointRadius: 0 }
    ]
  };

  if (chart) {
    chart.data = data;
    chart.update();
    return;
  }

  chart = new Chart(document.getElementById("spcChart"), {
    type: "line",
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: {
        x: { ticks: { maxRotation: 45, minRotation: 45 } },
        y: { grid: { color: "#d0d0d0" } }
      }
    }
  });
}

function setStatus(msg) {
  status.textContent = msg;
}

function highlightActiveRow(index) {
  specTbody.querySelectorAll("tr").forEach((tr) => {
    tr.classList.toggle("active-row", Number(tr.dataset.index) === index);
  });
}

function refreshAll() {
  renderChartItemSelect();
  renderSpecTable();
  renderChart();
}

modelSelect.addEventListener("change", refreshAll);
typeSelect.addEventListener("change", refreshAll);

chartItemSelect.addEventListener("change", () => {
  highlightActiveRow(Number(chartItemSelect.value));
  renderChart();
});

specTbody.addEventListener("click", (e) => {
  const tr = e.target.closest("tr");
  if (!tr) return;
  chartItemSelect.value = tr.dataset.index;
  highlightActiveRow(Number(tr.dataset.index));
  renderChart();
});

saveAllBtn.addEventListener("click", () => {
  if (!saveTableToStore()) return;
  renderSpecTable();
  renderChart();
});

regenBtn.addEventListener("click", () => {
  if (!saveTableToStore()) return;
  const idx = Number(chartItemSelect.value);
  const row = getItems()[idx];
  row.samples = createSamples(row);
  renderChart();
  setStatus(`${row.itemName} 샘플 20개 재생성 완료`);
});

exportBtn.addEventListener("click", () => {
  if (!saveTableToStore()) return;
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "spc-specs.json";
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus("SPEC JSON 내보내기 완료");
});

importInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text());
    MODELS.forEach((m) => {
      TYPES.forEach((t) => {
        const list = parsed?.[m]?.[t];
        if (!Array.isArray(list) || list.length !== ITEM_COUNT) return;
        store[m][t] = list.map((item, idx) => {
          const fallback = store[m][t][idx];
          const merged = {
            itemName: item.itemName || fallback.itemName,
            usl: Number(item.usl),
            lsl: Number(item.lsl),
            ucl: Number(item.ucl),
            cl: Number(item.cl),
            lcl: Number(item.lcl)
          };
          if (!validateRule(merged)) {
            return fallback;
          }
          return {
            ...merged,
            samples: Array.isArray(item.samples) && item.samples.length === SAMPLE_SIZE
              ? item.samples.map((v) => Number(v))
              : createSamples(merged)
          };
        });
      });
    });

    refreshAll();
    setStatus("SPEC 불러오기 완료");
  } catch (err) {
    setStatus(`불러오기 실패: ${err.message}`);
  } finally {
    importInput.value = "";
  }
});

bindBasicSelects();
refreshAll();
setStatus(`초기화 완료: 샘플 ${SAMPLE_SIZE}개 / 관리항목 ${ITEM_COUNT}개`);
