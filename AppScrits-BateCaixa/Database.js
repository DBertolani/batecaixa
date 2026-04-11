// ============================================================
// ARQUIVO: Database.js  — BateCaixa Backend
// Substitua o conteúdo completo deste arquivo
// ============================================================

function abrirPlanilhaBateCaixa(email) {
  const emailNorm = email.toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
  const cache = CacheService.getScriptCache();
  const cachedId = cache.get("planilha_id_" + emailNorm);
  
  if (cachedId) {
    try {
      return SpreadsheetApp.openById(cachedId);
    } catch (e) {
      cache.remove("planilha_id_" + emailNorm);
    }
  }

  const nomePlanilha = "BATECAIXA_DADOS_" + emailNorm;
  const pasta = DriveApp.getFolderById(ID_PASTA_DADOS);
  const arquivos = pasta.getFilesByName(nomePlanilha);
  
  let planilha;
  if (arquivos.hasNext()) {
    planilha = SpreadsheetApp.open(arquivos.next());
  } else {
    planilha = SpreadsheetApp.create(nomePlanilha);
    DriveApp.getFileById(planilha.getId()).moveTo(pasta);
    inicializarPlanilha(planilha);
  }
  
  if (planilha) {
    cache.put("planilha_id_" + emailNorm, planilha.getId(), 21600); // 6 horas
  }
  return planilha;
}

function garantirAbas(planilha) {
  const abasNecessarias = [
    // ⚠️ NomeOperador adicionado como coluna 15 em Vendas_Diarias
    { nome: "Vendas_Diarias",    cabecalho: ["Data","DataISO","Periodo","Dinheiro","PIX","Debito","Credito","Total","Obs","Modo","RegistradoPor","Cliente","Descricao","FormaPag","NomeOperador"] },
    { nome: "Compras_Estoque",   cabecalho: ["Data","DataISO","Fornecedor","Descricao","Valor","LinkNota","MimeType","Obs","NomeOperador"] },
    { nome: "Configuracoes",     cabecalho: ["Chave","Valor"] },
    { nome: "Clientes_Loja",     cabecalho: ["Nome","Telefone","Obs","DataCadastro"] },
    { nome: "Fornecedores_Loja", cabecalho: ["Nome","Telefone","Produto","Obs","DataCadastro"] }
  ];
  abasNecessarias.forEach(cfg => {
    let aba = planilha.getSheetByName(cfg.nome);
    if (!aba) {
      aba = planilha.insertSheet(cfg.nome);
      aba.appendRow(cfg.cabecalho);
      aba.getRange(1,1,1,cfg.cabecalho.length).setBackground("#1565C0").setFontColor("#ffffff").setFontWeight("bold");
      aba.setFrozenRows(1);
    }
  });
}

function inicializarPlanilha(planilha) {
  try {
    const padrao = planilha.getSheetByName("Planilha1") || planilha.getSheetByName("Sheet1");
    if (padrao && planilha.getNumSheets() > 1) planilha.deleteSheet(padrao);
  } catch {}
  garantirAbas(planilha);
}

function carregarDadosDashboard(email) {
  try {
    const planilha = abrirPlanilhaBateCaixa(email);
    const abaV     = planilha.getSheetByName("Vendas_Diarias");
    const abaC     = planilha.getSheetByName("Compras_Estoque");
    const abaCfg   = planilha.getSheetByName("Configuracoes");

    const hoje     = Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd");
    const mesAtual = hoje.substring(0, 7);

    let receitaHoje = 0, receitaMes = 0;
    let receitaIndividualMes = 0, receitaFechamentoMes = 0;

    if (abaV && abaV.getLastRow() > 1) {
      abaV.getRange(2, 1, abaV.getLastRow()-1, 15).getValues().forEach(v => {
        const dataISO = toDataISO(v[1]);
        const total   = parseFloat(v[7])||0;
        const modo    = String(v[9]||"individual").toLowerCase();
        if (dataISO === hoje)             receitaHoje += total;
        if (dataISO.startsWith(mesAtual)) {
          receitaMes += total;
          if (modo === "fechamento") receitaFechamentoMes += total;
          else                       receitaIndividualMes  += total;
        }
      });
    }

    let comprasMes = 0;
    if (abaC && abaC.getLastRow() > 1) {
      abaC.getRange(2, 1, abaC.getLastRow()-1, 8).getValues().forEach(c => {
        if (toDataISO(c[1]).startsWith(mesAtual)) comprasMes += parseFloat(c[4])||0;
      });
    }

    const configs = {};
    if (abaCfg && abaCfg.getLastRow() > 1) {
      abaCfg.getRange(2, 1, abaCfg.getLastRow()-1, 2).getValues().forEach(r => { configs[r[0]] = r[1]; });
    }

    return {
      receitaHoje:          receitaHoje.toFixed(2),
      receitaMes:           receitaMes.toFixed(2),
      comprasMes:           comprasMes.toFixed(2),
      receitaIndividualMes: receitaIndividualMes.toFixed(2),
      receitaFechamentoMes: receitaFechamentoMes.toFixed(2),
      nomeLoja:             configs["nomeLoja"]        || "",
      metaMensal:           configs["metaMensal"]      || "",
      cidade:               configs["cidade"]          || "",
      ramo:                 configs["ramo"]            || "",
      nomeProprietario:     configs["nomeProprietario"]|| "",
      estiloVendas:         configs["estiloVendas"]    || "individual"
    };
  } catch (err) {
    return { receitaHoje:"0.00", receitaMes:"0.00", comprasMes:"0.00",
             receitaIndividualMes:"0.00", receitaFechamentoMes:"0.00",
             nomeLoja:"", erro: err.message };
  }
}

function buscarNomeLoja(emailDono) {
  try {
    const planilha = abrirPlanilhaBateCaixa(emailDono);
    const abaCfg   = planilha.getSheetByName("Configuracoes");
    if (abaCfg && abaCfg.getLastRow() > 1) {
      const rows = abaCfg.getRange(2,1,abaCfg.getLastRow()-1,2).getValues();
      for (const r of rows) { if (r[0] === "nomeLoja") return r[1]; }
    }
    return "";
  } catch { return ""; }
}

// Rode esta função UMA VEZ no editor do Apps Script se precisar adicionar abas
// que estão faltando em planilhas de clientes já existentes.
function migrarPlanilhasExistentes() {
  const pasta = DriveApp.getFolderById(ID_PASTA_DADOS);
  const arquivos = pasta.getFiles();
  let count = 0;
  while (arquivos.hasNext()) {
    const f = arquivos.next();
    if (f.getName().startsWith("BATECAIXA_DADOS_")) {
      try { garantirAbas(SpreadsheetApp.open(f)); count++; console.log("✅", f.getName()); }
      catch(e) { console.log("❌", f.getName(), e.message); }
    }
  }
  console.log("Total migradas:", count);
}

// ⚠️ Para planilhas de clientes JÁ EXISTENTES:
// A coluna NomeOperador (coluna O) não existe ainda.
// Execute migrarPlanilhasExistentes() UMA VEZ para adicionar o cabeçalho.
// Ou adicione manualmente: abra a planilha → aba Vendas_Diarias → clique na coluna O → digite "NomeOperador".