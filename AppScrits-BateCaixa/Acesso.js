// ============================================================
// ARQUIVO: Acesso.js — BateCaixa Backend
// Substitua o conteúdo completo deste arquivo
// ============================================================

function verificarAcessoSaaS(email, incluirDados = false) {
  try {
    const ss    = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
    const aba   = ss.getSheetByName("Clientes");
    const dados = aba.getDataRange().getValues();
    const hoje  = new Date(); 
    hoje.setHours(0,0,0,0);
 
    for (let i = 1; i < dados.length; i++) {
      const linha = dados[i];
      if ((linha[0]||"").toLowerCase().trim() !== email) continue;

      const status        = (linha[2]||"").toString();
      const vencimento    = new Date(linha[3]);
      const perfilNegocio = toStr(linha[4] || "varejo-padrao");  // <-- Coluna E: Perfil de Negócio
      const planoId       = toStr(linha[5] || "");  // <-- Coluna F: ID do plano contratado
      vencimento.setHours(0,0,0,0);
 
      // =======================================================================
      // NOVO: Buscar nível do plano na Config_Planos
      // =======================================================================
      let nivelPlano = "Básico";
      if (planoId) {
        try {
          const planos = buscarPlanosAtivos();
          const planoEncontrado = planos.find(p => p.id === planoId);
          if (planoEncontrado && planoEncontrado.nivel) {
            nivelPlano = planoEncontrado.nivel;
          }
        } catch (e) {
          console.error("Erro ao buscar nível do plano:", e);
        }
      }
 
      // ========================================================================
      // NOVO: Diferenciação entre "Suspenso" e "Vencido"
      // ========================================================================
      
      // BLOQUEIO TOTAL: Status "Suspenso"
      if (status === "Suspenso") {
        return {
          liberado: false,
          email,
          motivo: "Acesso suspenso. Fale com o suporte.",
          isReadOnly: false,  // <-- Bloqueio total, nem leitura
          nivelPlano,        // <-- NOVO: incluir nível do plano
          perfilNegocio      // <-- NOVO: incluir perfil de negócio
        };
      }
 
      // MODO READ-ONLY: Status "Ativo" MAS com vencimento no passado
      const isVencido = vencimento < hoje;
      if (isVencido) {
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        const trialExpiraAmanha = (vencimento.getTime() === amanha.getTime());
 
        return {
          liberado: true,  // <-- LIBERADO para leitura!
          email,
          papel: "dono",
          isMembro: false,
          isReadOnly: true,  // <-- FLAG CRÍTICA: modo leitura ativado
          vencidoEm: Utilities.formatDate(vencimento, "America/Sao_Paulo", "dd/MM/yyyy"),
          trialExpiraAmanha: false,  // Trial expira → vai direto pra modo read-only
          dadosIniciais: incluirDados ? carregarDadosDashboard(email) : undefined,
          nivelPlano,        // <-- NOVO: incluir nível do plano
          perfilNegocio      // <-- NOVO: incluir perfil de negócio
        };
      }
 
      // STATUS "Ativo" E Ainda no período de validade
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      const trialExpiraAmanha = (vencimento.getTime() === amanha.getTime());
 
      // Log de acesso do usuário
      const detalhesLog = `Usuário [${email}] acessou - Perfil: ${perfilNegocio}`;
      registrarEvento(email, "ACESSO_USUARIO", "SUCESSO", detalhesLog);

      return { 
        liberado: true,
        email,
        papel: "dono",
        isMembro: false,
        isReadOnly: false,  // <-- Acesso normal, escrita permitida
        trialExpiraAmanha,
        dadosIniciais: incluirDados ? carregarDadosDashboard(email) : undefined,
        nivelPlano,        // <-- NOVO: incluir nível do plano
        perfilNegocio      // <-- NOVO: incluir perfil de negócio
      };
    }
 
    // Cliente não encontrado = novo
    return { 
      liberado: false, 
      isNovo: true, 
      email,
      isReadOnly: false,
      nivelPlano: "Básico",        // <-- NOVO: padrão para novos clientes
      perfilNegocio: "varejo-padrao"  // <-- NOVO: padrão para novos clientes
    };
  } catch (err) {
    return { 
      liberado: false, 
      motivo: "Erro interno: " + err.message,
      isReadOnly: false,
      nivelPlano: "Básico",        // <-- NOVO: padrão em caso de erro
      perfilNegocio: "varejo-padrao"  // <-- NOVO: padrão em caso de erro
    };
  }
}
 
// ============================================================
// FUNÇÃO AUXILIAR: _verificarVencimento()
// Use esta função NO INÍCIO de toda rota de ESCRITA
// ============================================================
 
function _verificarVencimento(email) {
  try {
    const ss    = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
    const aba   = ss.getSheetByName("Clientes");
    const dados = aba.getDataRange().getValues();
    const hoje  = new Date();
    hoje.setHours(0,0,0,0);
 
    for (let i = 1; i < dados.length; i++) {
      const linha = dados[i];
      if ((linha[0]||"").toLowerCase().trim() !== email) continue;
 
      const status     = (linha[2]||"").toString();
      const vencimento = new Date(linha[3]);
      vencimento.setHours(0,0,0,0);
 
      // Retorna true se liberado para escrita, false caso contrário
      if (status === "Suspenso") return false;
      if (vencimento < hoje) return false;  // Vencido → sem escrita
      
      return true;  // Ativo e no período → pode escrever
    }
    return false;
  } catch (err) {
    return false;
  }
}

function ativarTesteGratis(email, nome) {
  try {
    const ss  = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
    const aba = ss.getSheetByName("Clientes");
    const venc = new Date();
    venc.setDate(venc.getDate() + 7);
    const vencStr = Utilities.formatDate(venc, "America/Sao_Paulo", "yyyy-MM-dd");
    // NOVO: Trial dá acesso a TODAS as funcionalidades (Premium) por 7 dias
    aba.appendRow([email, nome, "Ativo", vencStr, "Trial 7 Dias", "mensal_premium"]);
    abrirPlanilhaBateCaixa(email);
    const dadosIniciais = carregarDadosDashboard(email);
    return { liberado: true, dadosIniciais };
  } catch (err) {
    return { liberado: false, mensagem: err.message };
  }
}

function buscarTodosClientes() {
  const ss    = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
  const aba   = ss.getSheetByName("Clientes");
  const dados = aba.getDataRange().getValues();
  return dados.slice(1).map(l => ({ email:l[0], nome:l[1], status:l[2], vencimento:l[3], plano:l[4] }));
}

function alterarStatusCliente(emailAlvo, novoStatus) {
  try {
    const ss    = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
    const aba   = ss.getSheetByName("Clientes");
    const dados = aba.getDataRange().getValues();
    const alvo  = (emailAlvo||"").toLowerCase().trim();
    for (let i = 1; i < dados.length; i++) {
      if ((dados[i][0]||"").toLowerCase().trim() !== alvo) continue;
      aba.getRange(i+1, 3).setValue(novoStatus);
      if (novoStatus === "Ativo") {
        const novo = new Date(); novo.setDate(novo.getDate() + 30);
        aba.getRange(i+1, 4).setValue(Utilities.formatDate(novo, "America/Sao_Paulo", "yyyy-MM-dd"));
      }
      registrarEvento(emailAlvo, "alterarStatus→"+novoStatus, "admin");
      return { status: "Sucesso" };
    }
    return { status: "Erro", mensagem: "Cliente não encontrado." };
  } catch (err) {
    return { status: "Erro", mensagem: err.message };
  }
}

function salvarFeedback(dados) {
  try {
    const ss  = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
    const aba = ss.getSheetByName("Feedbacks");
    // Colunas: Data | Email | Preco | Vital | Sugestao
    aba.appendRow([new Date(), dados?.email||"anônimo", dados?.preco||"", dados?.vital||"", dados?.sugestao||""]);
    return { status: "Sucesso" };
  } catch (err) {
    return { status: "Erro", mensagem: err.message };
  }
}

// ── Item 1: Cria aba Config_Planos na Planilha Motor ─────────────────────────
// Execute MANUALMENTE no editor do Apps Script UMA VEZ: Executar → verificarPlanilhaMotor
function verificarPlanilhaMotor() {
  const ss  = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
  let aba   = ss.getSheetByName("Config_Planos");
  if (!aba) {
    aba = ss.insertSheet("Config_Planos");
    const header = ["ID_Plano","Nome","Valor","Nivel","Descricao","Destaque","Cor","CorBorda","BgCard","Status"];
    aba.appendRow(header);
    aba.getRange(1,1,1,header.length).setBackground("#1565C0").setFontColor("#fff").setFontWeight("bold");
    aba.setFrozenRows(1);
    // Planos padrão pré-preenchidos (coluna D agora é Nivel)
    aba.appendRow(["mensal_basico",   "Plano Mensal Básico",   19.90, "Básico", "Cobrança mensal automática. Cancele quando quiser.", "Mais Popular",  "#1565C0","#1565C0","#E3F2FD","Ativo"]);
    aba.appendRow(["mensal_premium",  "Plano Mensal Premium",  29.90, "Premium", "Controle completo com fechamento de caixa, compras e relatórios.", "Completo", "#7B1FA2","#9C27B0","#F3E5F5","Ativo"]);
    aba.appendRow(["trimestral_basico", "Trimestral Básico",  54.90, "Básico", "Renovação a cada 3 meses.", "Economize 8%", "#1565C0","#1565C0","#E3F2FD","Ativo"]);
    aba.appendRow(["trimestral_premium","Trimestral Premium",  82.90, "Premium", "Todos os recursos premium por 3 meses.", "Economize 8%", "#7B1FA2","#9C27B0","#F3E5F5","Ativo"]);
    console.log("✅ Aba Config_Planos criada.");
  }
  return "OK";
}

// ── Item 1: Retorna planos com Status=Ativo da Planilha Motor ─────────────────
function buscarPlanosAtivos() {
  try {
    const ss  = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
    const aba = ss.getSheetByName("Config_Planos");
    if (!aba || aba.getLastRow() <= 1) return [];
    
    // Colunas reais da planilha (15 colunas):
    // A: ID_Plano | B: Nome | C: Perfil | D: Preço | E: Status | F: Descricao | G: Período | H: Trial | I: Recursos | J: Limites | K: Nivel | L: Destaque | M: Cor | N: CorBorda | O: BgCard
    const rawData = aba.getRange(2, 1, aba.getLastRow()-1, 15).getValues();
    console.log("Dados brutos da planilha:", rawData);
    
    const result = rawData
      .filter(r => {
        const status = toStr(r[4]).toLowerCase();
        const idValido = r[0];
        console.log(`Filtrando linha: ID=${r[0]}, Status=${r[4]}, StatusLower=${status}, IDValido=${idValido}`);
        return status === "ativo" && idValido;
      }) // Coluna E: Status
      .map(r => {
        const precoBruto = r[3];
        // Converter preço do formato brasileiro (vírgula) para número
        let precoConvertido = 0;
        if (precoBruto) {
          const precoStr = toStr(precoBruto).replace(/[R$\s]/g, '').replace(',', '.');
          precoConvertido = parseFloat(precoStr) || 0;
        }
        console.log(`Processando plano: ID=${r[0]}, Nome=${r[1]}, PreçoBruto=${precoBruto}, PreçoConvertido=${precoConvertido}`);
        
        return {
          id:        toStr(r[0]),    // Coluna A: ID_Plano
          nome:      toStr(r[1]),    // Coluna B: Nome
          perfil:    toStr(r[2]),    // Coluna C: Perfil
          preco:     precoConvertido, // Coluna D: Preço
          status:    toStr(r[4]),    // Coluna E: Status
          descricao: toStr(r[5]),    // Coluna F: Descricao
          periodo:   toStr(r[6]),    // Coluna G: Período
          trial:     parseInt(r[7]) || 0, // Coluna H: Trial
          recursos:  toStr(r[8]),    // Coluna I: Recursos
          limites:   toStr(r[9]),    // Coluna J: Limites
          nivel:     toStr(r[10]) || "Básico", // Coluna K: Nivel
          destaque:  toStr(r[11]),   // Coluna L: Destaque
          cor:       toStr(r[12]) || "#1565C0", // Coluna M: Cor
          corBorda:  toStr(r[13]) || "#1565C0", // Coluna N: CorBorda
          bgCard:    toStr(r[14]) || "#E3F2FD"  // Coluna O: BgCard
        };
      });
    
    console.log("Planos finais retornados:", result);
    return result;
  } catch (err) {
    console.error("buscarPlanosAtivos:", err.message);
    return [];
  }
}

/**
 * Função para ajustar plano de usuário via Painel Admin
 * Atualiza colunas: C=Status, D=Vencimento, E=Perfil, F=ID_Plano
 */
function ajustarPlanoUsuario(dados) {
  try {
    console.log("=== ajustarPlanoUsuario INICIADO ===");
    console.log("Dados recebidos:", JSON.stringify(dados, null, 2));
    
    const uid = dados.uid; // Email do usuário
    const perfilNegocio = dados.perfilNegocio; // ID do perfil (ex: varejo-premium)
    const vencimento = dados.vencimento; // Data em YYYY-MM-DD
    
    // Obter email do admin que está fazendo a alteração
    const emailDono = Session.getActiveUser().getEmail() || EMAIL_MASTER;
    console.log("Admin executando ação:", emailDono);
    
    console.log("Parâmetros extraídos - Email:", uid, "Perfil:", perfilNegocio, "Vencimento:", vencimento);
    
    // Validação
    if (!uid || !perfilNegocio || !vencimento) {
      console.log("ERRO: Parâmetros obrigatórios ausentes");
      return { status: "Erro", mensagem: "Parâmetros obrigatórios ausentes" };
    }
    
    // Obter planilha e aba Clientes
    const spreadsheet = SpreadsheetApp.openById(ID_PLANILHA_MOTOR);
    const sheet = spreadsheet.getSheetByName("Clientes");
    if (!sheet) {
      return { status: "Erro", mensagem: "Aba Clientes não encontrada" };
    }
    
    // Obter dados da aba Clientes
    const data = sheet.getDataRange().getValues();
    
    // Estrutura da planilha:
    // A=Email(0), B=Nome(1), C=Status(2), D=Vencimento(3), E=Perfil(4), F=ID_Plano(5)
    const emailIndex = 0;
    const statusIndex = 2;
    const vencimentoIndex = 3;
    const perfilIndex = 4;
    const planoIdIndex = 5;
    
    // Buscar usuário pelo email (coluna A)
    let userRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      if ((data[i][emailIndex] || "").toLowerCase().trim() === uid.toLowerCase().trim()) {
        userRow = i;
        break;
      }
    }
    
    if (userRow === -1) {
      return { status: "Erro", mensagem: "Usuário não encontrado na aba Clientes" };
    }
    
    // Atualizar dados usando estrutura correta
    const rowNum = userRow + 1;
    
    // 1. Atualizar Status (coluna C) para 'Ativo'
    sheet.getRange(rowNum, statusIndex + 1).setValue("Ativo");
    console.log(`Status atualizado para: Ativo`);
    
    // 2. Atualizar Vencimento (coluna D)
    sheet.getRange(rowNum, vencimentoIndex + 1).setValue(vencimento);
    console.log(`Vencimento atualizado: ${vencimento}`);
    
    // 3. Atualizar Perfil (coluna E) com o ID do perfil
    sheet.getRange(rowNum, perfilIndex + 1).setValue(perfilNegocio);
    console.log(`Perfil atualizado: ${perfilNegocio}`);
    
    // 4. Mapear ID_Plano para Perfil usando Config_Planos (mapeamento dinâmico)
    const configSheet = spreadsheet.getSheetByName("Config_Planos");
    if (!configSheet) {
      return { status: "Erro", mensagem: "Aba Config_Planos não encontrada" };
    }
    
    const configData = configSheet.getDataRange().getValues();
    let planoId = null;
    let periodo = "mensal"; // padrão
    let diasTrial = 0;
    
    // Procurar ID_Plano correspondente ao perfilNegocio
    // Estrutura: A=ID_Plano(0)|B=Nome(1)|C=Perfil(2)|D=Preco(3)|E=Status(4)|F=Descricao(5)|G=Periodo(6)|H=Trial(7)
    for (let i = 1; i < configData.length; i++) {
      const linha = configData[i];
      const perfilNaLinha = toStr(linha[2] || ""); // Coluna C: Perfil
      const statusNaLinha = toStr(linha[4] || "").toLowerCase(); // Coluna E: Status
      
      if (perfilNaLinha === perfilNegocio && statusNaLinha === "ativo") {
        planoId = toStr(linha[0] || ""); // Coluna A: ID_Plano
        periodo = toStr(linha[6] || "mensal"); // Coluna G: Período
        diasTrial = parseInt(linha[7] || "0"); // Coluna H: Trial
        console.log(`Plano encontrado: ID=${planoId}, Perfil=${perfilNaLinha}, Status=${statusNaLinha}`);
        break;
      }
    }
    
    if (!planoId) {
      return { status: "Erro", mensagem: "ID_Plano não encontrado para o perfil: " + perfilNegocio };
    }
    
    sheet.getRange(rowNum, planoIdIndex + 1).setValue(planoId);
    console.log(`ID_Plano atualizado: ${planoId} (Período: ${periodo})`);
    
    // 5. Calcular vencimento baseado no período (se vencimento não fornecido)
    if (!vencimento || vencimento === "") {
      const hoje = new Date();
      const diasAdicionar = periodo === "trimestral" ? 90 : 
                           periodo === "anual" ? 365 : 
                           periodo === "semestral" ? 180 : 30;
      
      if (planoId.includes("trial") && diasTrial > 0) {
        // Para trials, usar dias da coluna Trial
        hoje.setDate(hoje.getDate() + diasTrial);
      } else {
        // Para planos normais, usar período
        hoje.setDate(hoje.getDate() + diasAdicionar);
      }
      
      vencimento = Utilities.formatDate(hoje, "America/Sao_Paulo", "yyyy-MM-dd");
      sheet.getRange(rowNum, vencimentoIndex + 1).setValue(vencimento);
      console.log(`Vencimento calculado: ${vencimento} (${periodo})`);
    }
    
    // Log de auditoria completo
    console.log(`Plano ajustado com sucesso - Email: ${uid}`);
    console.log(`- Status: Ativo`);
    console.log(`- Vencimento: ${vencimento}`);
    console.log(`- Perfil: ${perfilNegocio}`);
    console.log(`- ID_Plano: ${planoId}`);
    
    // Log detalhado da alteração
    const detalhesLog = `Admin [${emailDono}] alterou plano de [${uid}] para [${perfilNegocio}] com vencimento em [${vencimento}]`;
    registrarEvento(emailDono, "AJUSTE_PLANO", "SUCESSO", detalhesLog);
    
    return { 
      status: "Sucesso", 
      mensagem: "Plano ajustado com sucesso",
      dados: { 
        usuario: uid,
        perfilNegocio: perfilNegocio,
        planoId: planoId,
        vencimento: vencimento
      }
    };
    
  } catch (error) {
    console.error('Erro em ajustarPlanoUsuario:', error);
    return { status: "Erro", mensagem: "Erro interno: " + error.toString() };
  }
}

/**
* Função para teste direto no Apps Script
*/
function testarAjustarPlano() {
console.log("=== INICIANDO TESTE DIRETO ===");
  
const teste = {
uid: "danilobertolani.remotework@gmail.com", // Email real do usuário
perfilNegocio: "varejo-premium",
vencimento: "2026-12-31"
};
  
console.log("Dados de teste:", JSON.stringify(teste, null, 2));
  
try {
const resultado = ajustarPlanoUsuario(teste);
console.log("Resultado da função:", JSON.stringify(resultado, null, 2));
  
if (resultado.status === "Sucesso") {
console.log("SUCESSO: Plano ajustado");
} else {
console.log("ERRO:", resultado.mensagem);
}
} catch (error) {
console.error("ERRO NA EXECUÇÃO:", error.toString());
}
}

/**
* Função para verificar se Web App está funcionando
*/
function testarWebApp() {
console.log("=== TESTANDO WEB APP ===");
  
// Simular chamada do Roteador
const payload = {
acao: "ajustarPlanoUsuario",
email: "danilobertolani@gmail.com", // EMAIL_MASTER
dados: {
uid: "danilobertolani.remotework@gmail.com",
perfilNegocio: "varejo-premium", 
vencimento: "2026-12-31"
}
};
  
console.log("Payload simulado:", JSON.stringify(payload, null, 2));
  
// Verificar se case existe no Roteador
console.log("EMAIL_MASTER:", EMAIL_MASTER);
console.log("Email normalizado:", payload.email.toLowerCase());
console.log("É admin?", payload.email.toLowerCase() === EMAIL_MASTER.toLowerCase());
}