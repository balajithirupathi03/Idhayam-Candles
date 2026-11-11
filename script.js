const STORE='idhayamBilling_v1';

const sampleProducts=[
  ...document.getElementById('defaultProducts').content.querySelectorAll('[data-product-name]')
].map(el=>({
  type:el.dataset.productType||el.dataset.productName,
  name:el.dataset.productName,
  price:Number(el.dataset.defaultPrice)||0
}));

const defaults={
  businessName:'Idhayam Candles',
  businessPhone:'',
  businessAddress:'',
  products:sampleProducts,
  history:[],
  nextInvoice:1
};

const $=id=>document.getElementById(id);

let state=loadState();
let lastImageBlob=null;
let lastImageName='';

function loadState(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORE)||'{}');
    const products=Array.isArray(saved.products)?saved.products:sampleProducts;

    return {
      ...defaults,
      ...saved,
      products:products.map(p=>({
        type:String(p.type||p.category||p.name||'Other'),
        name:String(p.name||'Product'),
        price:Number(p.price)||0
      }))
    };
  }catch{
    return {
      ...defaults,
      products:sampleProducts.map(p=>({...p}))
    };
  }
}

function saveState(){
  localStorage.setItem(STORE,JSON.stringify(state));
}

function money(n){
  return '₹'+Number(n||0).toLocaleString('en-IN',{
    minimumFractionDigits:2,
    maximumFractionDigits:2
  });
}

function dateISO(){
  const d=new Date();
  return new Date(d.getTime()-d.getTimezoneOffset()*60000)
    .toISOString().slice(0,10);
}

function toast(msg){
  const el=$('toast');
  el.textContent=msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2400);
}

function invoiceDatePart(date){
  const d=new Date((date||dateISO())+'T00:00:00');
  const day=String(d.getDate()).padStart(2,'0');
  const month=d.toLocaleDateString('en-US',{month:'short'});
  return `${day}-${month}-${d.getFullYear()}`;
}

function nextInvoice(date=$('billDate')?.value||dateISO()){
  return `IC-${invoiceDatePart(date)}-${String(state.nextInvoice).padStart(4,'0')}`;
}

function refreshInvoice(){
  $('invoiceNo').value=nextInvoice();
}

function esc(s){
  return String(s??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}

function productTypes(){
  return [...new Set(state.products.map(p=>p.type).filter(Boolean))];
}

function typeOptions(selected=''){
  return productTypes().map(t=>
    `<option value="${esc(t)}" ${t===selected?'selected':''}>${esc(t)}</option>`
  ).join('');
}

function productsForType(type){
  return state.products
    .map((p,i)=>({...p,index:i}))
    .filter(p=>p.type===type);
}

function productOptions(type,selectedIndex=null){
  return productsForType(type).map(p=>
    `<option value="${p.index}" ${p.index===selectedIndex?'selected':''}>${esc(p.name)}</option>`
  ).join('');
}

function addItem(typeValue=null,productIndex=null){
  if(!state.products.length){
    toast('Add products in Products & settings first.');
    return;
  }

  const row=document.createElement('div');
  row.className='item-row';

  const firstType=typeValue||state.products[0].type;
  const options=productsForType(firstType);

  const firstProduct=
    productIndex!==null&&state.products[productIndex]?.type===firstType
      ?productIndex
      :(options[0]?.index??0);

  row.innerHTML=`
    <label>Product type
      <select class="product-type">${typeOptions(firstType)}</select>
    </label>

    <label>Product
      <select class="product-select">${productOptions(firstType,firstProduct)}</select>
    </label>

    <label>Unit
      <select class="qty-type">
        <option value="pcs">Pieces</option>
        <option value="case">Case (30 Pieces)</option>
      </select>
    </label>

    <label>Quantity
      <input class="qty" type="number" min="1" step="1" value="1">
    </label>

    <label>Rate / Piece (₹)
      <input class="rate" type="number" min="0" step="0.01"
        value="${Number(state.products[firstProduct]?.price||0)}">
    </label>

    <div class="amount">₹0.00</div>
    <button class="remove-btn" type="button" title="Remove item">×</button>
  `;

  $('items').appendChild(row);

  const typeSelect=row.querySelector('.product-type');
  const productSelect=row.querySelector('.product-select');

  typeSelect.addEventListener('change',()=>{
    const matching=productsForType(typeSelect.value);

    productSelect.innerHTML=productOptions(
      typeSelect.value,
      matching[0]?.index??null
    );

    row.querySelector('.rate').value=matching[0]?.price||0;
    calculate();
  });

  productSelect.addEventListener('change',()=>{
    row.querySelector('.rate').value=
      state.products[Number(productSelect.value)]?.price||0;
    calculate();
  });

  row.querySelectorAll('input,select').forEach(x=>
    x.addEventListener('input',calculate)
  );

  row.querySelector('.remove-btn').addEventListener('click',()=>{
    row.remove();
    calculate();
  });

  calculate();
}

function calculate(){
  let qty=0;
  let total=0;

  document.querySelectorAll('.item-row').forEach(r=>{
    const entered=Math.max(0,Number(r.querySelector('.qty').value)||0);
    const unit=r.querySelector('.qty-type').value;
    const pieces=entered*(unit==='case'?30:1);
    const rate=Math.max(0,Number(r.querySelector('.rate').value)||0);
    const amount=pieces*rate;

    qty+=pieces;
    total+=amount;

    r.querySelector('.amount').textContent=money(amount);
  });

  $('grandTotal').textContent=money(total);

  return {qty,total};
}

function getBill(){
  const items=[...document.querySelectorAll('.item-row')].map(r=>{
    const p=state.products[Number(r.querySelector('.product-select').value)];
    const qty=Number(r.querySelector('.qty').value)||0;
    const qtyType=r.querySelector('.qty-type').value;
    const pieces=qty*(qtyType==='case'?30:1);
    const rate=Number(r.querySelector('.rate').value)||0;

    return {
      type:p?.type||'',
      name:p?.name||'Product',
      qty,
      qtyType,
      pieces,
      rate,
      amount:pieces*rate
    };
  }).filter(x=>x.qty>0);

  return {
    invoice:$('invoiceNo').value,
    date:$('billDate').value,
    customer:$('customerName').value.trim(),
    items,
    qty:items.reduce((a,x)=>a+x.pieces,0),
    total:items.reduce((a,x)=>a+x.amount,0)
  };
}

function fitText(ctx,text,maxWidth,startSize,minSize,fontWeight='bold'){
  let size=startSize;

  do{
    ctx.font=`${fontWeight} ${size}px Arial`;

    if(ctx.measureText(text).width<=maxWidth||size<=minSize){
      break;
    }

    size--;
  }while(size>minSize);

  return size;
}


function drawBill(bill) {
  const scale = 2;
  const w = 900;
  const pad = 58;
  const lineH = 56;
  const tableY = 245;
  const footerH = 150;
  const h = tableY + 42 + Math.max(1, bill.items.length) * lineH + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;

  const c = canvas.getContext('2d');
  c.scale(scale, scale);

  // Background
  c.fillStyle = '#fffdfa';
  c.fillRect(0, 0, w, h);

  c.fillStyle = '#6b2d20';
  c.fillRect(0, 0, w, 14);

  // Centered business header
  c.textAlign = 'center';

  c.fillStyle = '#6b2d20';
  c.font = 'bold 18px Arial';
  c.fillText('ஸ்ரீ பச்சை பெருமாள் ஐய்யனார் துணை', w / 2, 55);

  c.fillStyle = '#351b18';
  c.font = 'bold 34px Georgia';
  c.fillText(state.businessName || 'Idhayam Candles', w / 2, 100);

  c.fillStyle = '#796f68';
  c.font = '14px Arial';
  c.fillText('MANUFACTURING  •  WHOLESALE', w / 2, 128);

  c.textAlign = 'left';

  // Invoice details
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

  c.fillStyle = '#796f68';
  c.font = '15px Arial';
  const customer = (bill.customer || 'Walk-in Customer').toUpperCase();
  c.fillText('BILL TO: ' + customer, pad, y);

  c.textAlign = 'right';
  c.fillText(
    'Date: ' + new Date(bill.date + 'T00:00:00').toLocaleDateString('en-IN'),
    w - pad,
    y
  );

  c.textAlign = 'left';
  y += 40;

  // Divider
  c.strokeStyle = '#eadfd4';
  c.beginPath();
  c.moveTo(pad, y);
  c.lineTo(w - pad, y);
  c.stroke();

  // Customer details
  // y += 35;

  // c.fillStyle = '#796f68';
  // c.font = '13px Arial';
  // c.textAlign = 'left';
  // c.fillText('BILL TO', pad, y);

  // // Customer name
  // y += 31;

  // const customer = bill.customer || 'Walk-in Customer';

  // c.fillStyle = '#2c2420';
  // fitText(c, customer, w - 2 * pad, 22, 10, 'bold');
  // c.textAlign = 'left';
  // c.fillText(customer, pad, y);

  // Business address on a separate line
  const address = String(state.businessAddress || '').trim();

  if (address) {
    y += 25;

    c.fillStyle = '#796f68';
    fitText(c, address, w - 2 * pad, 13, 9, 'normal');
    c.textAlign = 'left';
    c.fillText(address, pad, y);
  }

  // Product table
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

  // Product rows
  bill.items.forEach(it => {
    c.fillStyle = '#2c2420';
    c.font = '15px Arial';
    c.textAlign = 'left';
    c.fillText(String(it.name).slice(0, 38), pad + 12, y + 29);

    c.textAlign = 'right';

    c.fillText(
      it.qtyType === 'case'
        ? `${it.qty} Case (${it.pieces} pcs)`
        : `${it.qty} Pieces`,
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

  // Grand total - label and amount on the same line
  y += 35;

  c.textAlign = 'left';
  c.fillStyle = '#796f68';
  c.font = 'bold 18px Arial';
  c.fillText('GRAND TOTAL', w - 350, y);

  c.textAlign = 'right';
  c.fillStyle = '#6b2d20';
  c.font = 'bold 26px Georgia';
  c.fillText(money(bill.total), w - pad, y);

  c.textAlign = 'left';
  y += 55;

  // Footer divider
  c.textAlign = 'left';
  y += 105;

  c.strokeStyle = '#eadfd4';
  c.beginPath();
  c.moveTo(pad, y);
  c.lineTo(w - pad, y);
  c.stroke();

  // Footer
  y += 48;

  c.textAlign = 'center';
  c.fillStyle = '#351b18';
  c.font = 'bold 21px Georgia';
  c.fillText('Thank you for your business!', w / 2, y);

  c.fillStyle = '#796f68';
  c.font = '13px Arial';
  c.fillText(
    state.businessPhone
      ? 'Contact: ' + state.businessPhone
      : 'Idhayam Candles',
    w / 2,
    y + 26
  );

  // Bottom border
  c.textAlign = 'left';
  c.fillStyle = '#6b2d20';
  c.fillRect(0, h - 12, w, 12);

  return canvas;
}


async function canvasBlob(canvas){
  return new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
}

async function generateBill(){
  const bill=getBill();

  if(!bill.items.length){
    toast('Add at least one product and quantity.');
    return;
  }

  if(!bill.customer){
    toast('Please enter the customer name.');
    $('customerName').focus();
    return;
  }

  const canvas=drawBill(bill);

  lastImageBlob=await canvasBlob(canvas);
  lastImageName=bill.invoice+'.png';

  $('billPreview').src=URL.createObjectURL(lastImageBlob);
  $('outputPanel').hidden=false;

  state.history.unshift({
    ...bill,
    createdAt:new Date().toISOString()
  });

  state.nextInvoice++;

  saveState();
  renderHistory();
  updateStats();

  $('outputPanel').scrollIntoView({
    behavior:'smooth',
    block:'start'
  });

  toast('Bill image generated and bill saved on this device.');
}

async function shareBill(){
  if(!lastImageBlob){
    toast('Generate a bill image first.');
    return;
  }

  const file=new File(
    [lastImageBlob],
    lastImageName,
    {type:'image/png'}
  );

  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{
      await navigator.share({
        files:[file],
        title:'Idhayam Candles bill',
        text:'Invoice from Idhayam Candles'
      });
      return;
    }catch(e){
      if(e.name==='AbortError')return;
    }
  }

  downloadBill();

  window.open(
    'https://wa.me/?text='+encodeURIComponent(
      'Hello, please find your Idhayam Candles bill attached.'
    ),
    '_blank',
    'noopener'
  );

  $('shareHint').textContent=
    'Your PNG was downloaded. In WhatsApp, choose the customer chat and attach the downloaded image.';

  toast('Image downloaded. Attach it in WhatsApp.');
}

function downloadBill(){
  if(!lastImageBlob)return;

  const a=document.createElement('a');
  a.href=URL.createObjectURL(lastImageBlob);
  a.download=lastImageName;
  a.click();

  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}

function renderHistory(){
  const h=$('history');

  $('historyCount').textContent=state.history.length+' bills';

  if(!state.history.length){
    h.innerHTML='<p class="empty">No bills yet. Your completed bills will appear here.</p>';
    return;
  }

  h.innerHTML=state.history.slice(0,50).map((b,i)=>`
    <div class="history-item">
      <div>
        <b>${esc(b.invoice)} · ${esc(b.customer)}</b>
        <small>
          ${new Date(b.date+'T00:00:00').toLocaleDateString('en-IN')}
          · ${b.items.length} item(s)
        </small>
        <br>
        <button data-rebill="${i}">Load bill</button>
      </div>
      <strong>${money(b.total)}</strong>
    </div>
  `).join('');

  h.querySelectorAll('[data-rebill]').forEach(btn=>
    btn.addEventListener('click',()=>{
      loadHistoryBill(Number(btn.dataset.rebill));
    })
  );
}

function loadHistoryBill(i){
  const b=state.history[i];
  if(!b)return;

  $('customerName').value=b.customer;
  $('billDate').value=b.date;
  $('invoiceNo').value=b.invoice;
  $('items').innerHTML='';

  b.items.forEach(it=>{
    let idx=state.products.findIndex(p=>p.name===it.name);

    if(idx<0){
      state.products.push({
        type:it.type||'Other',
        name:it.name,
        price:it.rate
      });

      idx=state.products.length-1;
    }

    addItem(state.products[idx].type,idx);

    const r=$('items').lastElementChild;

    r.querySelector('.qty').value=it.qty;
    r.querySelector('.qty-type').value=it.qtyType||'pcs';
    r.querySelector('.rate').value=it.rate;
  });

  calculate();
  toast('Previous bill loaded.');
}

function updateStats(){
  const today=dateISO();
  const bills=state.history.filter(x=>x.date===today);

  $('todayCount').textContent=bills.length;

  $('todaySales').textContent=money(
    bills.reduce((a,x)=>a+x.total,0)
  );
}

function openSettings(){
  $('businessName').value=state.businessName;
  $('businessPhone').value=state.businessPhone;
  $('businessAddress').value=state.businessAddress;

  renderProductEditor();
  $('settingsDialog').showModal();
}

function renderProductEditor(){
  const el=$('productEditor');

  el.innerHTML=state.products.map((p,i)=>`
    <div class="product-edit-row">
      <input aria-label="Product type" class="ptype"
        value="${esc(p.type)}" maxlength="60" placeholder="Product type">

      <input aria-label="Product name" class="pname"
        value="${esc(p.name)}" maxlength="60" placeholder="Product name">

      <input aria-label="Default price" class="pprice"
        type="number" min="0" step="0.01" value="${Number(p.price)||0}">

      <button type="button" class="remove-btn"
        data-remove-product="${i}">×</button>
    </div>
  `).join('');

  el.querySelectorAll('[data-remove-product]').forEach(b=>
    b.addEventListener('click',()=>{
      state.products.splice(Number(b.dataset.removeProduct),1);
      renderProductEditor();
    })
  );
}

function addProductEditorRow(){
  const row=document.createElement('div');
  row.className='product-edit-row';

  row.innerHTML=`
    <input class="ptype" aria-label="Product type"
      placeholder="Product type" maxlength="60">

    <input class="pname" aria-label="Product name"
      placeholder="Product name" maxlength="60">

    <input class="pprice" aria-label="Default price"
      type="number" min="0" step="0.01" value="0">

    <button type="button" class="remove-btn">×</button>
  `;

  row.querySelector('button').addEventListener('click',()=>row.remove());

  $('productEditor').appendChild(row);
}

function saveSettings(){
  const types=[...$('productEditor').querySelectorAll('.ptype')];
  const names=[...$('productEditor').querySelectorAll('.pname')];
  const prices=[...$('productEditor').querySelectorAll('.pprice')];

  const products=names.map((n,i)=>({
    type:types[i].value.trim()||'Other',
    name:n.value.trim(),
    price:Math.max(0,Number(prices[i].value)||0)
  })).filter(p=>p.name);

  if(!products.length){
    toast('Please keep at least one product.');
    return;
  }

  state.businessName=$('businessName').value.trim()||'Idhayam Candles';
  state.businessPhone=$('businessPhone').value.trim();
  state.businessAddress=$('businessAddress').value.trim();
  state.products=products;

  saveState();

  $('settingsDialog').close();
  $('items').innerHTML='';

  addItem();

  toast('Business details and products saved.');
}

function clearBill(){
  if(!confirm('Clear the current bill?'))return;

  $('customerName').value='';
  $('billDate').value=dateISO();

  refreshInvoice();

  $('items').innerHTML='';
  addItem();

  $('outputPanel').hidden=true;
  lastImageBlob=null;
}

function init(){
  $('billDate').value=dateISO();
  refreshInvoice();

  if(!state.products.length){
    state.products=sampleProducts.map(p=>({...p}));
    saveState();
  }

  addItem();
  renderHistory();
  updateStats();

  $('billDate').addEventListener('change',refreshInvoice);
  $('settingsBtn').addEventListener('click',openSettings);
  $('addRowBtn').addEventListener('click',()=>addItem());
  $('generateBtn').addEventListener('click',generateBill);
  $('clearBtn').addEventListener('click',clearBill);
  $('shareBtn').addEventListener('click',shareBill);
  $('downloadBtn').addEventListener('click',downloadBill);

  $('refreshHistory').addEventListener('click',()=>{
    renderHistory();
    updateStats();
  });

  $('saveSettingsBtn').addEventListener('click',saveSettings);
  $('addProductBtn').addEventListener('click',addProductEditorRow);

  $('resetProductsBtn').addEventListener('click',()=>{
    if(confirm('Restore the sample product list? This replaces your current product list.')){
      state.products=sampleProducts.map(p=>({...p}));
      renderProductEditor();
    }
  });

  $('clearHistoryBtn').addEventListener('click',()=>{
    if(confirm('Permanently clear all saved bill history on this device?')){
      state.history=[];
      saveState();
      renderHistory();
      updateStats();
      toast('Bill history cleared.');
    }
  });
}

init();
