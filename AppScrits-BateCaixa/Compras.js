/* ==================================================================================
   ARQUIVO: Compras.js — FIX: usa toDataISO() em buscarCompras e gerarRelatorio
================================================================================== */



// =========================================================
// FUNÇÕES AUXILIARES PARA COMPRAS E ESTOQUE
// =========================================================

function _parseValorBR(valor) {
  if (valor === null || valor === undefined) return 0;
  if (typeof valor === "number") return valor;
  const s = String(valor).trim();
  if (!s) return 0;
  
  // Remove símbolos e mantém apenas números + separadores decimais
  let v = s.replace(/[^0-9.,-]/g, "");
  // Se vier "1.234,56" -> "1234.56"
  if (v.includes(",") && v.includes(".")) v = v.replace(/\./g, "").replace(",", ".");
  else if (v.includes(",")) v = v.replace(",", ".");
  
  // Se ainda sobrar mais de um ponto, considera o último como decimal
  const parts = v.split(".");
  if (parts.length > 2) v = parts.slice(0, -1).join("") + "." + parts[parts.length - 1];
  
  const num = parseFloat(v);
  return isNaN(num) ? 0 : num;
}

function _salvarNotasArray(notas, email) {
  const urls = [];
  const mimeTypes = [];
  (notas || []).forEach((n, idx) => {
    if (!n) return;
    const base64 = n.base64 || n.notaBase64 || "";
    const mimeType = n.mimeType || n.notaMimeType || "";
    const nome = n.nome || n.notaNome || ("nota" + (idx + 1));
    if (!base64 || !mimeType) return;
    
    // Chama a função que já existe no seu sistema para salvar no Drive
    const url = salvarArquivoNota(base64, mimeType, nome, email);
    urls.push(url);
    mimeTypes.push(mimeType);
  });
  return { urls, mimeTypes };
}

// =========================================================
// FUNÇÕES PRINCIPAIS DE COMPRAS
// =========================================================

function salvarCompra(dados, email) {
  try {
    // Tarefa 2: Trava de Segurança Backend (Modo Leitura)
    const acesso = verificarAcessoSaaS(email);
    if (!acesso.liberado) {
      return { status: "Erro", mensagem: "🚫 Sistema em MODO LEITURA. Renove sua assinatura para registrar compras." };
    }

    const planilha = abrirPlanilhaBateCaixa(email);
    const aba      = planilha.getSheetByName("Compras_Estoque");

    const dataStr = dados.data || Utilities.formatDate(new Date(),"America/Sao_Paulo","yyyy-MM-dd");
    const dataBR  = formatarDataBR(dataStr);

    let linkNota = "";
    let mimeTypeCol = "";

    // Suporte novo: dados.notas (array) — até 3 arquivos
    let urls = [];
    let mimeTypes = [];
    if (Array.isArray(dados.notas) && dados.notas.length) {
      const resultado = _salvarNotasArray(dados.notas, email);
      urls = resultado.urls;
      mimeTypes = resultado.mimeTypes;
    } else if (dados.notaBase64 && dados.notaMimeType) {
      // Compatibilidade com upload antigo (1 arquivo)
      try {
        urls = [salvarArquivoNota(dados.notaBase64, dados.notaMimeType, dados.notaNome || "nota", email)];
        mimeTypes = [dados.notaMimeType];
      } catch (e) {
        console.log("Upload nota falhou:", e.message);
      }
    }

    if (urls.length) {
      linkNota = JSON.stringify(urls);
      mimeTypeCol = JSON.stringify(mimeTypes);
    }

    aba.appendRow([
      dataBR, 
      dataStr,
      dados.fornecedor || "",
      dados.descricao || "",
      _parseValorBR(dados.valor || "0"),
      linkNota,
      mimeTypeCol,
      dados.obs || "",
      dados.nomeOperador || "" // Tarefa 3: nomeOperador adicionado na coluna 9
    ]);

    return { status: "Sucesso" };
  } catch (err) {
    return { status: "Erro", mensagem: err.message };
  }
}

function salvarArquivoNota(base64, mimeType, nomeArquivo, email) {
  const emailSlug = email.replace(/[^a-z0-9]/gi,"_").toLowerCase();
  const nomePasta = "Notas_" + emailSlug;

  const pastaRaiz = DriveApp.getFolderById(ID_PASTA_NOTAS);
  const existing  = pastaRaiz.getFoldersByName(nomePasta);
  const subPasta  = existing.hasNext() ? existing.next() : pastaRaiz.createFolder(nomePasta);

  const bytes   = Utilities.base64Decode(base64);
  const blob    = Utilities.newBlob(bytes, mimeType, nomeArquivo);
  const arquivo = subPasta.createFile(blob);
  arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return arquivo.getUrl();
}

function editarCompra(linha, dados, email) {
  try {
    // Tarefa 2: Trava de Segurança Backend (Modo Leitura)
    const acesso = verificarAcessoSaaS(email);
    if (!acesso.liberado) {
      return { status: "Erro", mensagem: "🚫 Sistema em MODO LEITURA. Renove sua assinatura para editar compras." };
    }

    const planilha  = abrirPlanilhaBateCaixa(email);
    const aba       = planilha.getSheetByName("Compras_Estoque");
    const l         = parseInt(linha);
    const dataStr   = dados.data || "";
    const dataBR    = formatarDataBR(dataStr);
    const existente = aba.getRange(l, 6).getValue(); // LinkNota atual
    const existenteMime = aba.getRange(l, 7).getValue(); // MimeType atual
    const nomeOpOriginal = aba.getRange(l, 9).getValue(); // Tarefa 3: preserva nomeOperador na coluna 9

    let linkNota = existente;
    let mimeTypeCol = existenteMime;

    // Se vierem novas notas (array) — substitui link/mime
    if (Array.isArray(dados.notas) && dados.notas.length) {
      const r = _salvarNotasArray(dados.notas, email);
      linkNota = r.urls.length ? JSON.stringify(r.urls) : "";
      mimeTypeCol = JSON.stringify(r.mimeTypes || []);
    } else if (dados.notaBase64 && dados.notaMimeType) {
      // Compatibilidade com upload antigo (1 arquivo)
      const url = salvarArquivoNota(dados.notaBase64, dados.notaMimeType, dados.notaNome || "nota", email);
      linkNota = JSON.stringify([url]);
      mimeTypeCol = JSON.stringify([dados.notaMimeType]);
    }

    aba.getRange(l, 1, 1, 9).setValues([[
      dataBR, 
      dataStr,
      dados.fornecedor || "",
      dados.descricao || "",
      _parseValorBR(dados.valor || "0"),
      linkNota,
      mimeTypeCol,
      dados.obs || "",
      dados.nomeOperador || nomeOpOriginal || ""
    ]]);

    return { status: "Sucesso" };
  } catch (err) {
    return { status: "Erro", mensagem: err.message };
  }
}

function excluirCompra(linha, email) {
  try {
    // Tarefa 2: Trava de Segurança Backend (Modo Leitura)
    const acesso = verificarAcessoSaaS(email);
    if (!acesso.liberado) {
      return { status: "Erro", mensagem: "🚫 Sistema em MODO LEITURA. Renove sua assinatura para excluir compras." };
    }

    const planilha = abrirPlanilhaBateCaixa(email);
    planilha.getSheetByName("Compras_Estoque").deleteRow(parseInt(linha));
    return { status: "Sucesso" };
  } catch (err) {
    return { status: "Erro", mensagem: err.message };
  }
}

function buscarCompras(email, filtros) {
  try {
    const planilha = abrirPlanilhaBateCaixa(email);
    const aba      = planilha.getSheetByName("Compras_Estoque");
    if (aba.getLastRow() <= 1) return [];

    const dados = aba.getRange(2, 1, aba.getLastRow()-1, 8).getValues();
    const mes   = filtros?.mes || "";

    return dados
      .map((c, i) => ({
        linha:      i+2,
        data:       toStr(c[0]),
        // FIX: converte Date object para string ISO
        dataISO:    toDataISO(c[1]),
        fornecedor: toStr(c[2]),
        descricao:  toStr(c[3]),
        valor:      c[4],
        linkNota:   toStr(c[5]),
        mimeType:   toStr(c[6]),
        obs:        toStr(c[7])
      }))
      .filter(c => !mes || c.dataISO.startsWith(mes))
      .sort((a, b) => b.dataISO.localeCompare(a.dataISO));
  } catch { return []; }
}

function gerarRelatorio(email, filtros) {
  try {
    const planilha = abrirPlanilhaBateCaixa(email);
    const abaV     = planilha.getSheetByName("Vendas_Diarias");
    const abaC     = planilha.getSheetByName("Compras_Estoque");
    const mes      = filtros?.mes || Utilities.formatDate(new Date(),"America/Sao_Paulo","yyyy-MM");

    let receita=0, totalDinheiro=0, totalPix=0, totalDebito=0, totalCredito=0;
    let vendas = [];

    if (abaV.getLastRow() > 1) {
      abaV.getRange(2, 1, abaV.getLastRow()-1, 14).getValues()
        .forEach((v, i) => {
          // FIX: usa toDataISO() para comparação correta
          if (!toDataISO(v[1]).startsWith(mes)) return;
          const tot = parseFloat(v[7])||0;
          receita       += tot;
          totalDinheiro += parseFloat(v[3])||0;
          totalPix      += parseFloat(v[4])||0;
          totalDebito   += parseFloat(v[5])||0;
          totalCredito  += parseFloat(v[6])||0;
          vendas.push({
            linha:   i+2,
            dataISO: toDataISO(v[1]),
            data:    toStr(v[0]),
            periodo: toStr(v[2]),
            total:   tot,
            modo:    toStr(v[9]),
            cliente: toStr(v[11])
          });
        });
    }

    let compras = 0;
    if (abaC.getLastRow() > 1) {
      abaC.getRange(2, 1, abaC.getLastRow()-1, 8).getValues()
        .forEach(c => {
          if (toDataISO(c[1]).startsWith(mes)) compras += parseFloat(c[4])||0;
        });
    }

    return { receita, compras, totalDinheiro, totalPix, totalDebito, totalCredito, vendas };
  } catch (err) {
    return { receita:0, compras:0, totalDinheiro:0, totalPix:0, totalDebito:0, totalCredito:0, vendas:[], erro: err.message };
  }
}