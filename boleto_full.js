// boleto_full.js
// Renderiza carnê em A4 com 3 blocos por página usando /mnt/data/boleto_bg_page_1.png
// Recebe via postMessage: { type: 'render-parcelas'|'render-carnet', payload: { baseDados, qtd } }

(function(){
  window.addEventListener('message', (e)=>{
    if(!e.data) return;
    const type = e.data.type;
    const payload = e.data.payload || {};
    if(type === 'render-parcelas' || type === 'render-carnet'){
      const base = payload.baseDados || payload;
      const qtd = Number(payload.qtd || payload.qtd === 0 ? payload.qtd : (payload || {}).qtd) || (payload.qtd||1);
      renderParcels(base, qtd);
    }
  });

  function renderParcels(baseDados, qtd){
    const perPage = 3;
    const sheetsContainer = document.getElementById('sheets');
    sheetsContainer.innerHTML = '';
    const pages = Math.ceil(qtd / perPage);
    let index = 0;
    const generated = [];

    for(let p=0;p<pages;p++){
      const sheet = document.createElement('div');
      sheet.className = 'sheet';

      for(let b=0;b<perPage && index < qtd;b++, index++){
        const block = document.createElement('div');
        block.className = 'block';

        const parcelaNum = index + 1;
        const venc = computeVencimento(baseDados.vencimento, index);
        const valor = computeValorParcela(baseDados.valor, qtd);
        const nosso = gerarNossoNumero(baseDados.prefixo || '', parcelaNum);
        const linha = gerarLinhaDigitavel(nosso, baseDados, venc, valor);
        const barras = gerarCodigoBarras(linha);

        const fLinha = makeField('field f-linha-digitavel', linha);
        const fNome  = makeField('field f-nome', baseDados.pagadorNome || '');
        const fCpf   = makeField('field f-cpf', baseDados.pagadorDoc || '');
        const fEnd   = makeField('field f-end', baseDados.pagadorEndereco || '');
        const fVenc  = makeField('field f-venc', venc);
        const fValor = makeField('field f-valor', valor);
        const fBarras = makeField('field f-codbarras', barras);

        block.appendChild(fLinha);
        block.appendChild(fNome);
        block.appendChild(fCpf);
        block.appendChild(fEnd);
        block.appendChild(fVenc);
        block.appendChild(fValor);
        block.appendChild(fBarras);

        sheet.appendChild(block);

        generated.push({
          parcela: parcelaNum,
          pagadorNome: baseDados.pagadorNome,
          pagadorDoc: baseDados.pagadorDoc,
          endereco: baseDados.pagadorEndereco,
          vencimento: venc,
          valor: valor,
          nossoNumero: nosso,
          linhaDigitavel: linha,
          codigoBarras: barras,
          status: 'Aberto'
        });
      }

      sheetsContainer.appendChild(sheet);
    }

    try{
      window.opener && window.opener.postMessage({ type: 'generated-boletos', payload: generated }, '*');
    }catch(e){ console.warn('postMessage failed', e); }
  }

  function makeField(cls, text){
    const d = document.createElement('div');
    d.className = cls;
    d.textContent = text;
    return d;
  }

  function computeVencimento(baseISOorStr, idx){
    const d = new Date(baseISOorStr);
    d.setMonth(d.getMonth() + idx);
    return d.toLocaleDateString('pt-BR');
  }

  function computeValorParcela(valorStr, qtd){
    const v = parseFloat(String(valorStr||'0').replace(/[^0-9,.-]/g,'').replace(',','.')) || 0;
    const parc = (v / qtd);
    return 'R$ ' + parc.toFixed(2).replace('.',',');
  }

  function gerarNossoNumero(prefix, idx){
    const rnd = String(Math.floor(100000 + Math.random()*899999));
    return (prefix||'') + String(idx).padStart(3,'0') + rnd;
  }

  function gerarLinhaDigitavel(nosso, base, venc, valor){
    const bank = (base.bankCode || '748').toString().padStart(3,'0');
    const currency = (base.currency || '9').toString().padStart(1,'0');
    const factor = fatorVencimento(venc).toString().padStart(4,'0');
    const valueNum = String((parseFloat(String(base.valor||'0').replace(/[^0-9,.-]/g,'').replace(',','.'))*100)||0).padStart(10,'0');
    const nossoRaw = String(nosso).replace(/\D/g,'').padStart(10,'0').slice(0,10);
    const raw = bank + currency + factor + valueNum + nossoRaw;
    const dv = mod11(raw);
    return raw.slice(0,5)+'.'+raw.slice(5,10)+' '+raw.slice(10,15)+'.'+raw.slice(15,21)+' '+dv;
  }

  function gerarCodigoBarras(linha){
    return linha.replace(/\D/g,'').padEnd(44,'0').slice(0,44);
  }

  function fatorVencimento(vencStr){
    try{
      const base = new Date(1997,9,7);
      const d = new Date(vencStr.split('/').reverse().join('-'));
      const diff = Math.floor((d - base) / (1000*60*60*24));
      return diff > 0 ? diff : 0;
    }catch(e){ return 0; }
  }

  function mod11(num){
    const arr = String(num).split('').reverse();
    let factor = 2, sum = 0;
    for(const c of arr){ sum += Number(c) * factor; factor = (factor === 9 ? 2 : factor + 1); }
    const r = sum % 11; const dv = 11 - r;
    if(dv === 0 || dv === 10 || dv === 11) return 1;
    return dv;
  }

  window.renderParcels = (base,q) => renderParcels(base,q);
})();
