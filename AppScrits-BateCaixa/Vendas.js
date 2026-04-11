// ============================================================
// ARQUIVO: Vendas.js  — BateCaixa Backend
// Substitua o conteúdo completo deste arquivo
// ============================================================

function salvarVenda(dados, email) {
  try {
    const emailAlvo = dados?.emailDono || email;
    
    // Tarefa 2: Trava de Segurança Backend (Modo Leitura)
    const acesso = verificarAcessoSaaS(emailAlvo);
    if (!acesso.liberado) {
      return { status: "Erro", mensagem: "🚫 Sistema em MODO LEITURA. Renove sua assinatura para fazer novos lançamentos." };
    }

    const planilha  = abrirPlanilhaBateCaixa(emailAlvo);
    const aba       = planilha.getSheetByName("Vendas_Diarias");

    const dataStr  = dados.data || Utilities.formatDate(new Date(),"America/Sao_Paulo","yyyy-MM-dd");
    const dataBR   = formatarDataBR(dataStr);
    const dinheiro = parseFloat(dados.dinheiro||0);
    const pix      = parseFloat(dados.pix    ||0);
    const debito   = parseFloat(dados.debito ||0);
    const credito  = parseFloat(dados.credito||0);
    const total    = parseFloat(dados.total  ||(dinheiro+pix+debito+credito));
    const modo     = dados.modo||"individual";

    // ── Antifraude para fechamento ────────────────────────────────────────────
    if (modo === "fechamento") {
      const totalIndividual = _somarIndividualDia(aba, dataStr);
      if (total < totalIndividual) {
        return {
          status: "Erro",
          mensagem: `🚫 Trava antifraude: o fechamento (${_fmt(total)}) não pode ser menor que as vendas individuais já registradas hoje (${_fmt(totalIndividual)}). Corrija o valor ou exclua vendas duplicadas.`
        };
      }
      // Modo "ambos": grava apenas a diferença para não duplicar
      const estiloVendas = _buscarConfig(planilha, "estiloVendas");
      if (estiloVendas === "ambos" && totalIndividual > 0) {
        const diferenca = total - totalIndividual;
        if (diferenca <= 0) {
          return { status: "Erro", mensagem: `As vendas individuais (${_fmt(totalIndividual)}) já cobrem o valor do fechamento (${_fmt(total)}). Nada a registrar.` };
        }
        const fator = diferenca / total;
        aba.appendRow([
          dataBR, dataStr, dados.periodo||"Fechamento",
          Math.round(dinheiro*fator*100)/100,
          Math.round(pix*fator*100)/100,
          Math.round(debito*fator*100)/100,
          Math.round(credito*fator*100)/100,
          Math.round(diferenca*100)/100,
          (dados.obs||"")+" [Diferença após individuais]",
          modo,
          dados.registradoPor||email,
          dados.cliente||"",
          dados.descricao||"",
          dados.formaPag||"",
          dados.nomeOperador||""
        ]);
        registrarEvento(email, "salvarVenda(fechamento-diferença)", "Sucesso→"+diferenca);
        return { status: "Sucesso", diferenca: diferenca.toFixed(2), totalIndividual: totalIndividual.toFixed(2) };
      }
    }

    aba.appendRow([
      dataBR, dataStr,
      dados.periodo||"Venda Individual",
      dinheiro, pix, debito, credito, total,
      dados.obs||"",
      modo,
      dados.registradoPor||email,
      dados.cliente||"",
      dados.descricao||"",
      dados.formaPag||"",
      dados.nomeOperador||""  // coluna 15
    ]);

    // Auto-cadastro de cliente (se veio nome e não existe ainda)
    if (dados.cliente && dados.cliente.trim()) {
      _autoCadastrarClienteBackend(dados.cliente.trim(), emailAlvo);
    }

    registrarEvento(email, "salvarVenda", "Sucesso→"+total);
    return { status: "Sucesso" };
  } catch (err) {
    return { status: "Erro", mensagem: err.message };
  }
}

function editarVenda(linha, dados, email) {
  try {
    const emailAlvo = dados?.emailDono || email;

    // Tarefa 2: Trava de Segurança Backend (Modo Leitura)
    const acesso = verificarAcessoSaaS(emailAlvo);
    if (!acesso.liberado) {
      return { status: "Erro", mensagem: "🚫 Sistema em MODO LEITURA. Renove sua assinatura para editar lançamentos." };
    }

    const planilha  = abrirPlanilhaBateCaixa(emailAlvo);
    const aba       = planilha.getSheetByName("Vendas_Diarias");
    const l         = parseInt(linha);
    const dataBR    = formatarDataBR(dados.data||"");
    const dinheiro  = parseFloat(dados.dinheiro||0);
    const pix       = parseFloat(dados.pix    ||0);
    const debito    = parseFloat(dados.debito ||0);
    const credito   = parseFloat(dados.credito||0);
    const total     = parseFloat(dados.total  ||(dinheiro+pix+debito+credito));
    // Preserva nomeOperador original se não vier na edição
    const nomeOpOriginal = aba.getRange(l, 15).getValue();

    aba.getRange(l, 1, 1, 15).setValues([[
      dataBR, dados.data||"",
      dados.periodo||"Venda Individual",
      dinheiro, pix, debito, credito, total,
      dados.obs||"",
      dados.modo||"individual",
      dados.registradoPor||email,
      dados.cliente||"",
      dados.descricao||"",
      dados.formaPag||"",
      dados.nomeOperador||nomeOpOriginal||""
    ]]);
    return { status: "Sucesso" };
  } catch (err) {
    return { status: "Erro", mensagem: err.message };
  }
}

function darBaixaVenda(linha, email) {
  try {
    // Tarefa 2: Trava de Segurança Backend (Modo Leitura)
    const acesso = verificarAcessoSaaS(email);
    if (!acesso.liberado) {
      return { status: "Erro", mensagem: "🚫 Sistema em MODO LEITURA. Renove sua assinatura para dar baixa." };
    }

    const planilha = abrirPlanilhaBateCaixa(email);
    const aba = planilha.getSheetByName("Vendas_Diarias");
    const l = parseInt(linha);
    if (!l || isNaN(l)) return { status: "Erro", mensagem: "Linha inválida." };
    // Coluna 14: FormaPag (reaproveitada como Status: Pago/Pendente)
    aba.getRange(l, 14).setValue("Pago");
    return { status: "Sucesso" };
  } catch (err) {
    return { status: "Erro", mensagem: err.message };
  }
}

function excluirVenda(linha, email) {
  try {
    // Tarefa 2: Trava de Segurança Backend (Modo Leitura)
    const acesso = verificarAcessoSaaS(email);
    if (!acesso.liberado) {
      return { status: "Erro", mensagem: "🚫 Sistema em MODO LEITURA. Renove sua assinatura para excluir lançamentos." };
    }

    const planilha = abrirPlanilhaBateCaixa(email);
    planilha.getSheetByName("Vendas_Diarias").deleteRow(parseInt(linha));
    return { status: "Sucesso" };
  } catch (err) {
    return { status: "Erro", mensagem: err.message };
  }
}

function buscarVendas(email, filtros) {
  try {
    const planilha = abrirPlanilhaBateCaixa(email);
    const aba      = planilha.getSheetByName("Vendas_Diarias");
    if (aba.getLastRow() <= 1) return [];

    const dados   = aba.getRange(2, 1, aba.getLastRow()-1, 15).getValues();
    const mes     = filtros?.mes     || "";
    const dataIni = filtros?.dataIni || "";
    const dataFim = filtros?.dataFim || "";

    return dados
      .map((v, i) => ({
        linha:         i+2,
        data:          toStr(v[0]),
        dataISO:       toDataISO(v[1]),
        periodo:       toStr(v[2]),
        dinheiro:      v[3], pix: v[4], debito: v[5], credito: v[6], total: v[7],
        obs:           toStr(v[8]),
        modo:          toStr(v[9]),
        registradoPor: toStr(v[10]),
        cliente:       toStr(v[11]),
        descricao:     toStr(v[12]),
        formaPag:      toStr(v[13]),
        nomeOperador:  toStr(v[14])
      }))
      .filter(v => {
        if (mes     && !v.dataISO.startsWith(mes)) return false;
        if (dataIni && v.dataISO < dataIni)        return false;
        if (dataFim && v.dataISO > dataFim)        return false;
        return true;
      })
      .sort((a, b) => b.dataISO.localeCompare(a.dataISO));
  } catch { return []; }
}

// ── Antifraude: retorna o total de vendas individuais em um dia específico ────
function buscarTotalIndividualDia(email, data) {
  try {
    const planilha = abrirPlanilhaBateCaixa(email);
    const aba      = planilha.getSheetByName("Vendas_Diarias");
    const dataAlvo = data || Utilities.formatDate(new Date(),"America/Sao_Paulo","yyyy-MM-dd");
    return { total: _somarIndividualDia(aba, dataAlvo).toFixed(2) };
  } catch { return { total: "0.00" }; }
}

// ── Funções auxiliares internas ───────────────────────────────────────────────
function _somarIndividualDia(aba, dataAlvo) {
  if (aba.getLastRow() <= 1) return 0;
  return aba.getRange(2,1,aba.getLastRow()-1,10).getValues()
    .reduce((acc, v) => {
      if (toDataISO(v[1]) === dataAlvo && String(v[9]||"").toLowerCase() === "individual")
        acc += parseFloat(v[7])||0;
      return acc;
    }, 0);
}

function _fmt(n) {
  return "R$ " + Number(n).toFixed(2).replace(".",",").replace(/(\d)(?=(\d{3})+(?!\d))/g,"$1.");
}

function _buscarConfig(planilha, chave) {
  try {
    const aba = planilha.getSheetByName("Configuracoes");
    if (!aba || aba.getLastRow() <= 1) return "";
    const rows = aba.getRange(2,1,aba.getLastRow()-1,2).getValues();
    for (const r of rows) { if (r[0] === chave) return toStr(r[1]); }
    return "";
  } catch { return ""; }
}

// ── Auto-cadastro invisível de cliente no backend ─────────────────────────────
function _autoCadastrarClienteBackend(nomeCliente, email) {
  try {
    const planilha = abrirPlanilhaBateCaixa(email);
    let aba = planilha.getSheetByName("Clientes_Loja");
    if (!aba) return; // não cria a aba se não existir, deixa silencioso
    if (aba.getLastRow() > 1) {
      const existentes = aba.getRange(2,1,aba.getLastRow()-1,1).getValues().flat().map(n => toStr(n).toLowerCase().trim());
      if (existentes.includes(nomeCliente.toLowerCase().trim())) return;
    }
    aba.appendRow([nomeCliente, "", "", new Date()]);
  } catch {} // silencioso
}