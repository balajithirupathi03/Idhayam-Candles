"use strict";

const STORE = 'idhayamBilling_v1';

const sampleProducts = [
  ...document.getElementById('defaultProducts').content.querySelectorAll('[data-product-name]')
].map(el => ({
  name: el.dataset.productName,
  alias: el.dataset.alias || '',
  price: Number(el.dataset.defaultPrice) || 0
}));

const defaults = {
  businessName: 'Idhayam Candles',
  businessPhone: '',
  businessAddress: '',
  products: sampleProducts,
  history: [],
  nextInvoice: 1
};

const $ = id => document.getElementById(id);

let state = loadState();
let lastImageBlob = null;
let lastImageName = '';

/* STORAGE */

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || '{}');
    const products = Array.isArray(saved.products) ? saved.products : sampleProducts;

    return {
      ...defaults,
      ...saved,
      products: products.map(p => ({
        name: String(p.name || 'Product'),
        alias: String(p.alias || ''),
        price: Number(p.price) || 0
      })),
      history: Array.isArray(saved.history) ? saved.history : [],
      nextInvoice: Math.max(1, Number(saved.nextInvoice) || 1)
    };
  } catch {
    return {
      ...defaults,
      products: sampleProducts.map(p => ({ ...p })),
      history: []
    };
  }
}

function saveState() {
  localStorage.setItem(STORE, JSON.stringify(state));
}

/* COMMON HELPERS */

function money(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function dateISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);
}

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2400);
}

function invoiceDatePart(date) {
  const d = new Date((date || dateISO()) + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${day}-${month}-${d.getFullYear()}`;
}

function nextInvoice(date = $('billDate')?.value || dateISO()) {
  return `IC-${invoiceDatePart(date)}-${String(state.nextInvoice).padStart(4, '0')}`;
}

function refreshInvoice() {
  $('invoiceNo').value = nextInvoice();
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

/* PRODUCT SEARCH */

function normalize(s) {
  return String(s || '').toLowerCase().trim();
}

function productMatches(product, query) {
  if (!query) return true;
  const q = normalize(query);
  return normalize(product.name).includes(q) ||
    normalize(product.alias).includes(q);
}

function filterProducts(query) {
  return state.products
    .map((p, i) => ({ ...p, index: i }))
    .filter(p => productMatches(p, query));
}

/* PRODUCT PICKER */

function addItem(productIndex = null) {
  if (!state.products.length) {
    toast('Add products in Products & settings first.');
    return;
  }

  const row = document.createElement('div');
  row.className = 'item-row';

  // A normal new row starts empty. History rows can pass a product index.
  const idx = productIndex !== null && state.products[productIndex]
    ? productIndex
    : -1;
  const product = idx >= 0 ? state.products[idx] : null;

  row.innerHTML = `
    <label class="product-picker-wrap field-product">Product
      <div class="product-picker">
        <input class="product-search" type="text" autocomplete="off"
          placeholder="Search name or alias…"
          value="${esc(product?.name || '')}"
          data-index="${idx >= 0 ? idx : ''}">
        <div class="product-dropdown" hidden></div>
      </div>
    </label>

    <label class="field-unit">Unit
      <select class="qty-type">
        <option value="pcs">Pieces</option>
        <option value="case">Case (30 Pieces)</option>
      </select>
    </label>

    <label class="field-qty">Quantity
      <input class="qty" type="number" min="1" step="1" value="1">
    </label>

    <label class="field-rate">Rate / Piece (₹)
      <input class="rate" type="number" min="0" step="0.01"
        value="${Number(product?.price || 0)}">
    </label>

    <div class="amount field-amount">₹0.00</div>
    <button class="remove-btn field-remove" type="button" title="Remove item">×</button>
  `;

  $('items').appendChild(row);

  const searchInput = row.querySelector('.product-search');
  const dropdown = row.querySelector('.product-dropdown');
  const rateInput = row.querySelector('.rate');

  let activeIndex = -1;
  let currentMatches = [];

  function updateActiveOption() {
    const options = dropdown.querySelectorAll('.product-option[data-index]');
    options.forEach((option, index) => {
      option.classList.toggle('active', index === activeIndex);
      if (index === activeIndex) option.scrollIntoView({ block: 'nearest' });
    });
  }

  function renderDropdown(query) {
    currentMatches = filterProducts(query);
    activeIndex = currentMatches.length ? 0 : -1;

    if (!currentMatches.length) {
      dropdown.innerHTML = '<div class="product-option empty">No match</div>';
      dropdown.hidden = false;
      return;
    }

    dropdown.innerHTML = currentMatches.map((p, index) => `
      <button type="button"
        class="product-option ${index === 0 ? 'active' : ''}"
        data-index="${p.index}">
        <span class="pname">${esc(p.name)}</span>
        ${p.alias ? `<span class="palias">${esc(p.alias)}</span>` : ''}
      </button>
    `).join('');

    dropdown.hidden = false;

    dropdown.querySelectorAll('.product-option[data-index]').forEach(btn => {
      btn.addEventListener('mousedown', e => {
        e.preventDefault();
        selectProduct(Number(btn.dataset.index));
      });
    });
  }

  function selectProduct(i) {
    const p = state.products[i];
    if (!p) return;

    searchInput.value = p.name;
    searchInput.dataset.index = String(i);
    rateInput.value = Number(p.price) || 0;
    dropdown.hidden = true;
    activeIndex = -1;
    calculate();
  }

  searchInput.addEventListener('focus', () => {
    renderDropdown(searchInput.value);
  });

  searchInput.addEventListener('input', () => {
    searchInput.dataset.index = '';
    renderDropdown(searchInput.value);
  });

  searchInput.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();

      if (dropdown.hidden) {
        renderDropdown(searchInput.value);
      } else if (currentMatches.length) {
        activeIndex = Math.min(activeIndex + 1, currentMatches.length - 1);
        updateActiveOption();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();

      if (dropdown.hidden) {
        renderDropdown(searchInput.value);
        activeIndex = currentMatches.length - 1;
        updateActiveOption();
      } else if (currentMatches.length) {
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActiveOption();
      }
    } else if (e.key === 'Enter') {
      if (!dropdown.hidden && activeIndex >= 0) {
        e.preventDefault();
        const selected = currentMatches[activeIndex];
        if (selected) selectProduct(selected.index);
      }
    } else if (e.key === 'Tab') {
      if (!dropdown.hidden && activeIndex >= 0) {
        const selected = currentMatches[activeIndex];
        if (selected) selectProduct(selected.index);
        // Do not preventDefault: normal Tab navigation continues.
      }
    } else if (e.key === 'Escape') {
      dropdown.hidden = true;
      activeIndex = -1;
    }
  });

  searchInput.addEventListener('blur', () => {
    setTimeout(() => {
      dropdown.hidden = true;
      activeIndex = -1;
    }, 150);
  });

  row.querySelectorAll('input, select').forEach(x => {
    x.addEventListener('input', calculate);
    x.addEventListener('change', calculate);
  });

  row.querySelector('.remove-btn').addEventListener('click', () => {
    row.remove();
    calculate();
  });

  calculate();
}

/* BILL CALCULATION */

function calculate() {
  let qty = 0;
  let total = 0;

  document.querySelectorAll('.item-row').forEach(r => {
    const entered = Math.max(0, Number(r.querySelector('.qty').value) || 0);
    const unit = r.querySelector('.qty-type').value;
    const pieces = entered * (unit === 'case' ? 30 : 1);
    const rate = Math.max(0, Number(r.querySelector('.rate').value) || 0);
    const amount = pieces * rate;

    qty += pieces;
    total += amount;
    r.querySelector('.amount').textContent = money(amount);
  });

  $('grandTotal').textContent = money(total);
  return { qty, total };
}

function getBill() {
  const items = [...document.querySelectorAll('.item-row')].map(r => {
    const search = r.querySelector('.product-search');
    const idx = search.dataset.index !== '' ? Number(search.dataset.index) : -1;
    const p = idx >= 0 ? state.products[idx] : null;
    const name = p?.name || search.value.trim() || 'Product';
    const qty = Number(r.querySelector('.qty').value) || 0;
    const qtyType = r.querySelector('.qty-type').value;
    const pieces = qty * (qtyType === 'case' ? 30 : 1);
    const rate = Number(r.querySelector('.rate').value) || 0;

    return { name, qty, qtyType, pieces, rate, amount: pieces * rate };
  }).filter(x => x.qty > 0);

  return {
    invoice: $('invoiceNo').value,
    date: $('billDate').value,
    customer: $('customerName').value.trim(),
    items,
    qty: items.reduce((a, x) => a + x.pieces, 0),
    total: items.reduce((a, x) => a + x.amount, 0)
  };
}

/* CANVAS TEXT FITTING */

function fitText(ctx, text, maxWidth, startSize, minSize, fontWeight = 'bold') {
  let size = startSize;
  do {
    ctx.font = `${fontWeight} ${size}px "Noto Sans Tamil", "Latha", "Nirmala UI", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth || size <= minSize) break;
    size--;
  } while (size >= minSize);
  return size;
}

/* GENERATE BILL IMAGE */

function drawBill(bill) {
  const scale = 2;
  const w = 900;
  const pad = 58;
  const lineH = 56;
  const tableY = 300;
  const footerSpace = 245;
  const h = tableY + 42 + Math.max(1, bill.items.length) * lineH + footerSpace;

  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;

  const c = canvas.getContext('2d');
  c.scale(scale, scale);

  const centerX = w / 2;
  const maxWidth = w - (pad * 2);

  c.fillStyle = '#fffdfa';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#6b2d20';
  c.fillRect(0, 0, w, 14);

  const tamilText = 'ஸ்ரீ பச்சை பெருமாள் ஐய்யனார் துணை';
  c.font = '20px "Noto Sans Tamil", "Latha", "Nirmala UI", sans-serif';
  c.fillStyle = '#6b2d20';
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  const tamilWidth = c.measureText(tamilText).width;
  c.fillText(tamilText, (w - tamilWidth) / 2, 55);

  c.textAlign = 'center';
  const businessName = state.businessName || 'Idhayam Candles';
  const businessSize = fitText(c, businessName, maxWidth, 34, 18, 'bold');
  c.font = `bold ${businessSize}px Georgia, serif`;
  c.fillStyle = '#351b18';
  c.fillText(businessName, centerX, 100, maxWidth);

  const subtitle = 'MANUFACTURING  •  WHOLESALE';
  const subtitleSize = fitText(c, subtitle, maxWidth, 14, 10, 'normal');
  c.font = `normal ${subtitleSize}px Arial, sans-serif`;
  c.fillStyle = '#796f68';
  c.fillText(subtitle, centerX, 128, maxWidth);

  c.textAlign = 'left';
  let y = 170;
  c.fillStyle = '#351b18';
  c.font = 'bold 25px Georgia';
  c.fillText('INVOICE', pad, y);

  c.textAlign = 'right';
  c.fillStyle = '#6b2d20';
  c.font = 'bold 21px Arial';
  c.fillText(bill.invoice, w - pad, y);

  c.textAlign = 'left';
  y += 35;

  const customer = (bill.customer || 'Walk-in Customer').toUpperCase();
  const billToText = 'BILL TO: ' + customer;
  const customerSize = fitText(c, billToText, 520, 15, 10, 'normal');
  c.font = `normal ${customerSize}px Arial, sans-serif`;
  c.fillStyle = '#796f68';
  c.textAlign = 'left';
  c.fillText(billToText, pad, y, 520);

  c.textAlign = 'right';
  c.font = '15px Arial';
  c.fillText(
    'Date: ' + new Date(bill.date + 'T00:00:00').toLocaleDateString('en-IN'),
    w - pad,
    y
  );

  c.textAlign = 'left';
  y += 40;
  c.strokeStyle = '#eadfd4';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(pad, y);
  c.lineTo(w - pad, y);
  c.stroke();

  const address = String(state.businessAddress || '').trim();
  if (address) {
    y += 25;
    const addressSize = fitText(c, address, maxWidth, 13, 9, 'normal');
    c.font = `normal ${addressSize}px Arial, sans-serif`;
    c.fillStyle = '#796f68';
    c.textAlign = 'left';
    c.fillText(address, pad, y, maxWidth);
  }

  y = tableY;
  c.fillStyle = '#f5eee6';
  c.fillRect(pad, y, w - 2 * pad, 42);
  c.fillStyle = '#6b2d20';
  c.font = 'bold 13px Arial';
  c.textAlign = 'left';
  c.fillText('PRODUCT', pad + 12, y + 27);

  c.textAlign = 'right';
  c.fillText('QTY', w - 340, y + 27);
  c.fillText('RATE', w - 215, y + 27);
  c.fillText('AMOUNT', w - pad - 12, y + 27);

  c.textAlign = 'left';
  y += 42;

  bill.items.forEach(it => {
    c.fillStyle = '#2c2420';
    c.font = '15px Arial';
    c.textAlign = 'left';
    c.fillText(String(it.name).slice(0, 38), pad + 12, y + 29);

    c.textAlign = 'right';
    c.fillText(
      it.qtyType === 'case' ? `${it.qty} Case (${it.pieces} pcs)` : `${it.qty} Pieces`,
      w - 340,
      y + 29
    );
    c.fillText(money(it.rate), w - 215, y + 29);

    c.font = 'bold 15px Arial';
    c.fillText(money(it.amount), w - pad - 12, y + 29);

    c.strokeStyle = '#eee6df';
    c.beginPath();
    c.moveTo(pad, y + lineH);
    c.lineTo(w - pad, y + lineH);
    c.stroke();
    y += lineH;
  });

  y += 28;
  c.fillStyle = '#351b18';
  c.font = 'bold 20px Georgia';
  c.textAlign = 'left';
  c.fillText('TOTAL', pad, y + 8);

  c.textAlign = 'right';
  c.font = 'bold 24px Arial';
  c.fillStyle = '#6b2d20';
  c.fillText(money(bill.total), w - pad, y + 8);

  y += 50;
  c.strokeStyle = '#eadfd4';
  c.beginPath();
  c.moveTo(pad, y);
  c.lineTo(w - pad, y);
  c.stroke();

  y += 36;
  c.textAlign = 'center';
  c.fillStyle = '#796f68';
  c.font = '13px Arial';
  c.fillText('Thank you for your business', centerX, y);

  if (state.businessPhone) {
    y += 22;
    c.fillText('Phone: ' + state.businessPhone, centerX, y);
  }

  y += 28;
  c.fillStyle = '#b5a89c';
  c.font = '11px Arial';
  c.fillText('Invoice • Generated by Idhayam Candles billing', centerX, y);

  return canvas;
}

async function generateBill() {
  const bill = getBill();

  if (!bill.items.length) {
    toast('Add at least one product with quantity.');
    return;
  }

  const canvas = drawBill(bill);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

  if (!blob) {
    toast('Could not generate bill image. Please try again.');
    return;
  }

  lastImageBlob = blob;
  lastImageName = `${bill.invoice}.png`;

  const url = URL.createObjectURL(blob);
  $('billPreview').src = url;
  $('outputPanel').hidden = false;

  state.history.unshift({ ...bill, createdAt: Date.now() });
  if (state.history.length > 50) state.history = state.history.slice(0, 50);

  state.nextInvoice += 1;
  saveState();
  refreshInvoice();
  renderHistory();
  updateStats();

  toast('Bill image ready.');
  $('outputPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function shareBill() {
  if (!lastImageBlob) {
    toast('Generate a bill first.');
    return;
  }

  const file = new File([lastImageBlob], lastImageName, { type: 'image/png' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Invoice',
        text: 'Idhayam Candles invoice'
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  downloadBill();
}

function downloadBill() {
  if (!lastImageBlob) {
    toast('Generate a bill first.');
    return;
  }

  const a = document.createElement('a');
  const url = URL.createObjectURL(lastImageBlob);
  a.href = url;
  a.download = lastImageName || 'invoice.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* HISTORY */

function renderHistory() {
  const list = $('history');
  const bills = state.history || [];

  $('historyCount').textContent = bills.length + (bills.length === 1 ? ' bill' : ' bills');

  if (!bills.length) {
    list.innerHTML = '<p class="empty">No bills yet. Your completed bills will appear here.</p>';
    return;
  }

  list.innerHTML = bills.slice(0, 12).map((b, i) => `
    <button type="button" class="history-item" data-history="${i}">
      <div>
        <strong>${esc(b.invoice)}</strong>
        <span>${esc(b.customer || 'Walk-in')} · ${esc(b.date)}</span>
      </div>
      <b>${money(b.total)}</b>
    </button>
  `).join('');

  list.querySelectorAll('[data-history]').forEach(btn => {
    btn.addEventListener('click', () => loadHistoryBill(Number(btn.dataset.history)));
  });
}

function loadHistoryBill(i) {
  const bill = state.history[i];
  if (!bill) return;

  $('customerName').value = bill.customer || '';
  $('billDate').value = bill.date || dateISO();
  refreshInvoice();
  $('items').innerHTML = '';

  (bill.items || []).forEach(it => {
    let idx = state.products.findIndex(p => p.name === it.name);

    if (idx < 0) {
      state.products.push({
        name: it.name,
        alias: '',
        price: it.rate
      });
      idx = state.products.length - 1;
      saveState();
    }

    addItem(idx);

    const row = $('items').lastElementChild;
    row.querySelector('.qty').value = it.qty;
    row.querySelector('.qty-type').value = it.qtyType || 'pcs';
    row.querySelector('.rate').value = it.rate;
  });

  calculate();
  toast('Previous bill loaded.');
}

/* DASHBOARD STATISTICS */

function updateStats() {
  const today = dateISO();
  const bills = state.history.filter(x => x.date === today);

  $('todayCount').textContent = bills.length;
  $('todaySales').textContent = money(bills.reduce((a, x) => a + x.total, 0));
}

/* SETTINGS */

function openSettings() {
  $('businessName').value = state.businessName;
  $('businessPhone').value = state.businessPhone;
  $('businessAddress').value = state.businessAddress;
  renderProductEditor();
  $('settingsDialog').showModal();
}

function renderProductEditor() {
  const el = $('productEditor');

  el.innerHTML = state.products.map((p, i) => `
    <div class="product-edit-row">
      <input aria-label="Product name" class="pname"
        value="${esc(p.name)}" maxlength="60" placeholder="Product name">
      <input aria-label="Search alias" class="palias"
        value="${esc(p.alias || '')}" maxlength="80" placeholder="Alias (e.g. avatra)">
      <input aria-label="Default price" class="pprice"
        type="number" min="0" step="0.01" value="${Number(p.price) || 0}">
      <button type="button" class="remove-btn"
        data-remove-product="${i}">×</button>
    </div>
  `).join('');

  el.querySelectorAll('[data-remove-product]').forEach(b => {
    b.addEventListener('click', () => {
      state.products.splice(Number(b.dataset.removeProduct), 1);
      renderProductEditor();
    });
  });
}

function addProductEditorRow() {
  const row = document.createElement('div');
  row.className = 'product-edit-row';

  row.innerHTML = `
    <input class="pname" aria-label="Product name"
      placeholder="Product name" maxlength="60">
    <input class="palias" aria-label="Search alias"
      placeholder="Alias (e.g. avatra)" maxlength="80">
    <input class="pprice" aria-label="Default price"
      type="number" min="0" step="0.01" value="0">
    <button type="button" class="remove-btn" aria-label="Remove product">×</button>
  `;

  row.querySelector('button').addEventListener('click', () => row.remove());
  $('productEditor').appendChild(row);
}

function saveSettings() {
  const names = [...document.querySelectorAll('#productEditor .pname')];
  const aliases = [...document.querySelectorAll('#productEditor .palias')];
  const prices = [...document.querySelectorAll('#productEditor .pprice')];

  const products = names.map((n, i) => ({
    name: n.value.trim(),
    alias: (aliases[i]?.value || '').trim(),
    price: Math.max(0, Number(prices[i]?.value) || 0)
  })).filter(p => p.name);

  if (!products.length) {
    toast('Please keep at least one product.');
    return;
  }

  state.businessName = $('businessName').value.trim() || 'Idhayam Candles';
  state.businessPhone = $('businessPhone').value.trim();
  state.businessAddress = $('businessAddress').value.trim();

  // Keep the current invoice intact. Re-map selected product rows by name,
  // because product indexes may change when products are added or removed.
  const selectedNames = new Map();

  document.querySelectorAll('.item-row').forEach(row => {
    const search = row.querySelector('.product-search');
    if (search.dataset.index !== '') {
      const oldIndex = Number(search.dataset.index);
      const oldProduct = state.products[oldIndex];
      if (oldProduct) selectedNames.set(search, oldProduct.name);
    }
  });

  state.products = products;

  document.querySelectorAll('.item-row .product-search').forEach(search => {
    if (!selectedNames.has(search)) return;

    const selectedName = selectedNames.get(search);
    const newIndex = state.products.findIndex(p => p.name === selectedName);
    search.dataset.index = newIndex >= 0 ? String(newIndex) : '';

    // If the product was removed, retain its displayed name and entered rate.
  });

  saveState();
  $('settingsDialog').close();
  calculate();
  toast('Business details and products saved.');
}

/* CLEAR BILL */

function clearBill() {
  if (!confirm('Clear the current bill?')) return;

  $('customerName').value = '';
  $('billDate').value = dateISO();
  refreshInvoice();
  $('items').innerHTML = '';
  addItem();

  $('outputPanel').hidden = true;
  lastImageBlob = null;
  lastImageName = '';
}

/* INITIALIZATION */

function init() {
  $('billDate').value = dateISO();
  refreshInvoice();

  if (!state.products.length) {
    state.products = sampleProducts.map(p => ({ ...p }));
    saveState();
  }

  addItem();
  renderHistory();
  updateStats();

  $('billDate').addEventListener('change', refreshInvoice);
  $('settingsBtn').addEventListener('click', openSettings);
  $('addRowBtn').addEventListener('click', () => addItem());
  $('generateBtn').addEventListener('click', generateBill);
  $('clearBtn').addEventListener('click', clearBill);
  $('shareBtn').addEventListener('click', shareBill);
  $('downloadBtn').addEventListener('click', downloadBill);

  $('refreshHistory').addEventListener('click', () => {
    renderHistory();
    updateStats();
  });

  $('saveSettingsBtn').addEventListener('click', saveSettings);
  $('addProductBtn').addEventListener('click', addProductEditorRow);
  $('closeSettingsBtn')?.addEventListener('click', () => $('settingsDialog').close());

  $('resetProductsBtn').addEventListener('click', () => {
    if (confirm('Restore the sample product list? This replaces your current product list.')) {
      state.products = sampleProducts.map(p => ({ ...p }));
      renderProductEditor();
    }
  });

  $('clearHistoryBtn').addEventListener('click', () => {
    if (confirm('Permanently clear all saved bill history on this device?')) {
      state.history = [];
      saveState();
      renderHistory();
      updateStats();
      toast('Bill history cleared.');
    }
  });
}

init();
