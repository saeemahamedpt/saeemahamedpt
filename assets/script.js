
console.log("[AI Widget] JS loaded");

const toggle = document.querySelector('#mode-toggle');
toggle?.addEventListener('click', () => {
  document.documentElement.classList.toggle('light');
  const mode = document.documentElement.classList.contains('light') ? 'Light' : 'Dark';
  toggle.textContent = mode + ' mode';
});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = document.querySelector(id);
    if(target){
      e.preventDefault();
      target.scrollIntoView({behavior:'smooth'});
    }
  })
});

// new changes begin 


(() => {
  // 👉 Set your Azure Function endpoint (include the function key: ?code=XXXX)
  const FUNCTION_URL = "https://<your-functions-app>.azurewebsites.net/api/invoice-extract-docint?code=<YOUR_FUNCTION_KEY>";

  const el = {
    employeeId: document.getElementById("employeeId"),
    requestNumber: document.getElementById("requestNumber"),
    fileInput: document.getElementById("fileInput"),
    invokeBtn: document.getElementById("invokeBtn"),
    statusText: document.getElementById("statusText"),
    resultContainer: document.getElementById("resultContainer"),
    feeTableBody: document.querySelector("#feeTable tbody"),
    schoolName: document.getElementById("schoolName"),
    dependentName: document.getElementById("dependentName"),
    currency: document.getElementById("currency"),
    totalFee: document.getElementById("totalFee"),
    deviationBanner: document.getElementById("deviationBanner"),
    calcTotalApp: document.getElementById("calcTotalApp"),
    difference: document.getElementById("difference"),
    authBlock: document.getElementById("authBlock"),
    rawJson: document.getElementById("rawJson"),
  };

  // Helper: base64 encode the uploaded file via FileReader
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("File reading failed"));
      reader.onload = () => {
        const dataUrl = reader.result; // e.g. "data:application/pdf;base64,AAAA..."
        const base64 = String(dataUrl).split(",")[1] || "";
        resolve(base64);
      };
      reader.readAsDataURL(file);
    });
  }

  // Simple RequestNumber default
  function defaultRequestNumber() {
    const now = new Date();
    return `REQ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
  }

  async function invokeAssistant() {
    try {
      el.statusText.textContent = "";
      el.resultContainer.hidden = true;

      const employeeID = (el.employeeId.value || "").trim();
      const requestNumber = (el.requestNumber.value || "").trim() || defaultRequestNumber();
      const file = el.fileInput.files?.[0];

      if (!employeeID) {
        el.statusText.textContent = "Please enter Employee ID.";
        return;
      }
      if (!file) {
        el.statusText.textContent = "Please select a file to upload.";
        return;
      }

      el.invokeBtn.disabled = true;
      el.statusText.textContent = "Reading file & invoking AI…";

      const fileBase64 = await fileToBase64(file);
      const payload = {
        EmployeeID: employeeID,
        RequestNumber: requestNumber,
        fileName: file.name || "invoice.pdf",
        fileBase64
      };

      const resp = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error(`HTTP ${resp.status}: ${errText || "Server error"}`);
      }

      const json = await resp.json();
      // Expect: { status:'success', result: <TARGET_SCHEMA object>, ... }
      if (json.status !== "success") {
        throw new Error(json.message || "Unexpected response format");
      }

      renderResult(json.result);
      el.statusText.textContent = "Done.";
      el.resultContainer.hidden = false;
    } catch (err) {
      console.error(err);
      el.statusText.textContent = `Error: ${err.message || err}`;
    } finally {
      el.invokeBtn.disabled = false;
    }
  }

  function renderResult(result) {
    // Top-level fields
    el.schoolName.textContent = result["School Name"] ?? "";
    el.dependentName.textContent = result["Dependents Name"] ?? "";
    el.currency.textContent = result["Currency"] ?? "";
    el.totalFee.textContent = formatAmount(result["Total Fee"], result["Currency"]);

    // Fee Items table
    const items = Array.isArray(result["Fee Items"]) ? result["Fee Items"] : [];
    el.feeTableBody.innerHTML = "";
    items.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(item["Item Name"] ?? "")}</td>
        <td style="text-align:right">${formatAmount(item["Item Amount"], result["Currency"])}</td>
        <td>${escapeHtml(item["ExcludeFlag"] ?? "")}</td>
      `;
      el.feeTableBody.appendChild(tr);
    });

    // Deviation banner
    const dev = result["Deviation"] || {};
    if (dev["HasDeviation"]) {
      el.deviationBanner.hidden = false;
      el.calcTotalApp.textContent = formatAmount(dev["CalculatedTotalFeeApp"], result["Currency"]);
      el.difference.textContent = formatAmount(dev["Difference"], result["Currency"]);
    } else {
      el.deviationBanner.hidden = true;
      el.calcTotalApp.textContent = "";
      el.difference.textContent = "";
    }

    // Authenticity (optional pretty print)
    const auth = result["Authenticity"] || {};
    el.authBlock.textContent = JSON.stringify(auth, null, 2);

    // Raw JSON
    el.rawJson.textContent = JSON.stringify(result, null, 2);
  }

  function formatAmount(value, currency) {
    const n = Number(value ?? 0);
    const code = (currency || "").toUpperCase();
    // Simple formatting; you can replace with Intl.NumberFormat for locale-specific
    return `${n.toFixed(2)} ${code || ""}`.trim();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Wire up button
  document.getElementById("invokeBtn").addEventListener("click", invokeAssistant);
})();
