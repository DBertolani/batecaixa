// ============================================================
// ARQUIVO: Configuracoes.js  — BateCaixa Backend
// Substitua o conteúdo completo deste arquivo
// ============================================================

function salvarConfiguracoes(dados, email) {
  try {
    // Tarefa 2: Trava de Segurança Backend (Modo Leitura)
    const acesso = verificarAcessoSaaS(email);
    if (!acesso.liberado) {
      return { status: "Erro", mensagem: "🚫 Sistema em MODO LEITURA. Renove sua assinatura para alterar configurações." };
    }

    const planilha  = abrirPlanilhaBateCaixa(email);
    const aba       = planilha.getSheetByName("Configuracoes");
    const existente = aba.getLastRow() > 1 ? aba.getRange(2,1,aba.getLastRow()-1,2).getValues() : [];

    Object.entries(dados||{}).forEach(([chave, valor]) => {
      if (!chave) return;
      const idx = existente.findIndex(r => r[0] === chave);
      if (idx >= 0) {
        aba.getRange(idx+2, 2).setValue(valor);
      } else {
        aba.appendRow([chave, valor]);
        existente.push([chave, valor]);
      }
    });
    return { status: "Sucesso" };
  } catch (err) { return { status: "Erro", mensagem: err.message }; }
}

function buscarConfiguracoes(email) {
  try {
    const planilha = abrirPlanilhaBateCaixa(email);
    const aba      = planilha.getSheetByName("Configuracoes");
    const configs  = {};
    if (aba && aba.getLastRow() > 1)
      aba.getRange(2,1,aba.getLastRow()-1,2).getValues().forEach(r => { configs[r[0]] = r[1]; });
    return configs;
  } catch { return {}; }
}

// ══════════════════════════════════════════════════════════════
// CLIENTES DA LOJA
// ══════════════════════════════════════════════════════════════

function salvarCliente(dados, email) {
  try {
    const planilha = abrirPlanilhaBateCaixa(email);
    let aba = planilha.getSheetByName("Clientes_Loja");
    if (!aba) { garantirAbas(planilha); aba = planilha.getSheetByName("Clientes_Loja"); }
    aba.appendRow([dados.nome||"", dados.telefone||"", dados.obs||"", new Date()]);
    return { status: "Sucesso" };
  } catch (err) { return { status: "Erro", mensagem: err.message }; }
}

function editarCliente(linha, dadosObj, email) {
  try {
    const planilha = abrirPlanilhaBateCaixa(email);
    const aba      = planilha.getSheetByName("Clientes_Loja");
    const l        = parseInt(linha);
    const dataOrig = aba.getRange(l, 4).getValue(); // mantém DataCadastro original
    aba.getRange(l, 1, 1, 4).setValues([[dadosObj.nome||"", dadosObj.telefone||"", dadosObj.obs||"", dataOrig]]);
    return { status: "Sucesso" };
  } catch (err) { return { status: "Erro", mensagem: err.message }; }
}

function buscarClientes(email) {
  try {
    const planilha = abrirPlanilhaBateCaixa(email);
    const aba      = planilha.getSheetByName("Clientes_Loja");
    if (!aba || aba.getLastRow() <= 1) return [];
    return aba.getRange(2,1,aba.getLastRow()-1,4).getValues()
      .map((r,i) => ({ linha:i+2, nome:toStr(r[0]), telefone:toStr(r[1]), obs:toStr(r[2]) }))
      .filter(c => c.nome);
  } catch { return []; }
}

function excluirCliente(linha, email) {
  try {
    abrirPlanilhaBateCaixa(email).getSheetByName("Clientes_Loja").deleteRow(parseInt(linha));
    return { status: "Sucesso" };
  } catch (err) { return { status: "Erro", mensagem: err.message }; }
}

// ══════════════════════════════════════════════════════════════
// FORNECEDORES DA LOJA
// ══════════════════════════════════════════════════════════════

function salvarFornecedor(dados, email) {
  try {
    const planilha = abrirPlanilhaBateCaixa(email);
    let aba = planilha.getSheetByName("Fornecedores_Loja");
    if (!aba) { garantirAbas(planilha); aba = planilha.getSheetByName("Fornecedores_Loja"); }
    aba.appendRow([dados.nome||"", dados.telefone||"", dados.produto||"", dados.obs||"", new Date()]);
    return { status: "Sucesso" };
  } catch (err) { return { status: "Erro", mensagem: err.message }; }
}

function editarFornecedor(linha, dadosObj, email) {
  try {
    const planilha = abrirPlanilhaBateCaixa(email);
    const aba      = planilha.getSheetByName("Fornecedores_Loja");
    const l        = parseInt(linha);
    const dataOrig = aba.getRange(l, 5).getValue(); // mantém DataCadastro original
    aba.getRange(l, 1, 1, 5).setValues([[dadosObj.nome||"", dadosObj.telefone||"", dadosObj.produto||"", dadosObj.obs||"", dataOrig]]);
    return { status: "Sucesso" };
  } catch (err) { return { status: "Erro", mensagem: err.message }; }
}

function buscarFornecedores(email) {
  try {
    const planilha = abrirPlanilhaBateCaixa(email);
    const aba      = planilha.getSheetByName("Fornecedores_Loja");
    if (!aba || aba.getLastRow() <= 1) return [];
    return aba.getRange(2,1,aba.getLastRow()-1,5).getValues()
      .map((r,i) => ({ linha:i+2, nome:toStr(r[0]), telefone:toStr(r[1]), produto:toStr(r[2]), obs:toStr(r[3]) }))
      .filter(f => f.nome);
  } catch { return []; }
}

function buscarFornecedoresNomes(email) { return buscarFornecedores(email).map(f => f.nome); }

function excluirFornecedor(linha, email) {
  try {
    abrirPlanilhaBateCaixa(email).getSheetByName("Fornecedores_Loja").deleteRow(parseInt(linha));
    return { status: "Sucesso" };
  } catch (err) { return { status: "Erro", mensagem: err.message }; }
}