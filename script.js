// ============================================================
// BATECAIXA — script.js v2.1
// Correções: redirect Configurações, OTP membros, setas tabs
// ============================================================

//const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyw3sz8O-AETBNbiL0XFbd5wLfZ2CDTfL0boBjI3iwo0_3LEOqBvTYXaWz7yPaN19Cg/exec"; // Script de testes
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxtBrjCiodjSgu9_tFDf6yYnD5F19U31vvMih4ikjXas4QML8-L1ZleooEgwDG4d64qmg/exec"; // Script oficial
const GOOGLE_CLIENT_ID = "750339852793-0dd6fm9l55bs9une7l60pl7pj9s2rakj.apps.googleusercontent.com";
const WHATSAPP_SUPORTE = "5527996962395";
const EMAIL_ADMIN = "danilobertolani@gmail.com";

// ============================================================
// SEGURANÇA INICIAL - Apenas ajustes visuais, não esconder elementos
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  // O CSS no head já controla visibilidade, aqui apenas ajustamos detalhes
  console.log("DOMContentLoaded - CSS já aplicado pelo head");
});

// ============================================================
// VARIÁVEIS GLOBAIS
// ============================================================
var historicoGlobal = [];
var historicoFiltrado = [];
var comprasGlobal = [];
var configuracoesGlobais = {};
var dadosRelatorioGlobal = {};
var confirmacaoResolve = null;

// ============================================================
// FASE 11: REDE DE SEGURANÇA - FUNÇÕES DE UX E STANDBY
// ============================================================

/**
 * Exibe aviso padronizado para funcionalidades em desenvolvimento
 * @param {string} nomeFuncionalidade - Nome do recurso que está em desenvolvimento
 */
function mostrarAvisoEmDesenvolvimento(nomeFuncionalidade) {
  const nome = nomeFuncionalidade || 'Esta funcionalidade';
  mostrarToast(`🚧 ${nome} em desenvolvimento. Novidades em breve!`, 'aviso');
  console.log(`[STANDBY] Usuário tentou acessar: ${nome}`);
}

// Expor função globalmente para uso em onclick no HTML
window.mostrarAvisoEmDesenvolvimento = mostrarAvisoEmDesenvolvimento;

// Tratamento global de erros do Firebase para evitar warnings no console
window.addEventListener('error', function(event) {
  // Silenciar erros específicos do Firebase que não afetam a funcionalidade
  const errorMessage = event.message;
  if (errorMessage && (
    errorMessage.includes('Cross-Origin-Opener-Policy') ||
    errorMessage.includes('Receiving end does not exist') ||
    errorMessage.includes('all-frames.js') ||
    errorMessage.includes('popup.ts')
  )) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

window.addEventListener('unhandledrejection', function(event) {
  // Silenciar rejeições não tratadas do Firebase
  const errorMessage = event.reason?.message || event.reason;
  if (errorMessage && (
    errorMessage.includes('Cross-Origin-Opener-Policy') ||
    errorMessage.includes('Receiving end does not exist') ||
    errorMessage.includes('all-frames.js') ||
    errorMessage.includes('popup.ts')
  )) {
    event.preventDefault();
    return false;
  }
});

console.log("Variáveis globais inicializadas. configuracoesGlobais:", configuracoesGlobais);
// Para Compras/Estoque: suporta até 3 arquivos (imagem/PDF).
// - null = edição sem alteração do comprovante (preserva o que já existe no backend)
// - []   = sem comprovante para novo registro
var _notasSelecionadas = [];
var graficoInstance = null; // ← Adicionando variável que estava faltando
var adminClientesGlobal = [];
var membrosGlobal = [];
var clientesGlobal = [];
var fornecedoresGlobal = [];
var produtosGlobal = [];
var sessaoPapel = "dono";
var sessaoEmailDono = "";
var sessaoIsMembro = false;
var perfilNegocioAtual = "varejo-padrao";
var modoVendaAtual = "individual";

// FASE 11.8: Recuperar perfil de teste do Admin do cache (prioridade máxima)
(function() {
  const cachedPerfil = localStorage.getItem('perfilAdminTeste');
  if (cachedPerfil) {
    perfilNegocioAtual = cachedPerfil;
    console.log('[ADMIN CACHE] Perfil restaurado do cache:', cachedPerfil);
  }
})();



// ============================================================
// CONFIGURAÇÕES — HELPERS FIREBASE (Módulo B)
// ============================================================

// Busca configs do documento raiz lojas/{uid} no Firestore
async function _buscarConfigsFirestore() {
  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  if (!uid) return {};
  try {
    const snap = await window.firebaseGetDoc(
      window.firebaseDoc(window.firebaseDb, "lojas", uid)
    );
    let configs;
    if (!snap.exists()) {
      // FALLBACK: cria configurações padrão se não existirem
      const defaults = {
        nomeLoja: "Minha Loja",
        cidade: "",
        ramo: "",
        nomeProprietario: "",
        metaMensal: "",
        estiloVendas: "individual"
      };
      await _salvarConfigsFirestore(defaults);
      configs = defaults;
    } else {
      const d = snap.data();
      configs = {
        nomeLoja: d.nomeLoja || "Minha Loja",
        cidade: d.cidade || "",
        ramo: d.ramo || "",
        nomeProprietario: d.nomeProprietario || d.nome || "",
        metaMensal: d.metaMensal || "",
        estiloVendas: d.estiloVendas || "individual"
      };
    }
    
    // ATUALIZA VARIÁVEL GLOBAL E APLICA VISUAIS
    Object.assign(configuracoesGlobais, configs);
    aplicarConfigsVisuais();
    
    return configs;
  } catch (err) {
    console.warn("_buscarConfigsFirestore:", err);
    // FALLBACK: retorna valores padrão em caso de erro
    return {
      nomeLoja: "Minha Loja",
      cidade: "",
      ramo: "",
      nomeProprietario: "",
      metaMensal: "",
      estiloVendas: "individual"
    };
  }
}

// Aplica configurações visuais (nome da loja, cores, etc.)
function aplicarConfigsVisuais() {
  console.log("Aplicando configurações visuais...", configuracoesGlobais);
  
  // Atualiza nome da loja no dashboard
  const dashEl = document.getElementById("nome-loja-dash");
  console.log("Elemento dashboard:", dashEl, "Nome da loja:", configuracoesGlobais.nomeLoja);
  if (dashEl && configuracoesGlobais.nomeLoja) {
    dashEl.innerText = configuracoesGlobais.nomeLoja;
    console.log("Nome da loja atualizado no dashboard:", configuracoesGlobais.nomeLoja);
  } else {
    console.warn("Elemento dashboard não encontrado ou nome da loja vazio");
  }
  
  // Atualiza nome da loja na confirmação de membro (se existir)
  const membroEl = document.getElementById("membro-nome-loja-confirmado");
  if (membroEl && configuracoesGlobais.nomeLoja) {
    membroEl.innerText = configuracoesGlobais.nomeLoja;
    console.log("Nome da loja atualizado na confirmação de membro");
  }
  
  // Aplica outras configurações visuais se necessário
  // Ex: cores, temas, etc. (pode ser expandido depois)
}

// Exporta funções para escopo global (para uso no firebase-config.js)
window._buscarConfigsFirestore = _buscarConfigsFirestore;
window.aplicarConfigsVisuais = aplicarConfigsVisuais;
window.carregarDashboard = carregarDashboard;

// Expor funções de migração para escopo global (usadas pelo firebase-config.js)
window.executarMigracaoSilenciosa = executarMigracaoSilenciosa;
window.verificarFlagMigracaoSheets = verificarFlagMigracaoSheets;
window.migrarDadosPlanilhaParaFirebase = migrarDadosPlanilhaParaFirebase;
window.marcarMigracaoConcluida = marcarMigracaoConcluida;

// Listener para evento customizado de autenticação
window.addEventListener('usuarioAutenticado', async (event) => {
    console.log("[AUTH] Evento usuarioAutenticado recebido:", event.detail);
    
    try {
        const user = event.detail;
        if (!user) return;
        
        // Verificar se já está no dashboard
        const telaDashboard = document.getElementById("tela-dashboard");
        if (telaDashboard && telaDashboard.classList.contains("ativa")) {
            console.log("[AUTH] Usuário já está no dashboard");
            return;
        }
        
        console.log("[AUTH] Carregando usuário...");
        
        localStorage.setItem("user_email", user.email);
        localStorage.setItem("user_uid", user.uid);
        
        // Carregar configurações e nome
        await window._buscarConfigsFirestore();
        
        let nomeCompleto = "Vendedor";
        if (window.configuracoesGlobais?.nomeProprietario) {
            nomeCompleto = window.configuracoesGlobais.nomeProprietario;
        } else if (user.displayName) {
            nomeCompleto = user.displayName;
        }
        
        localStorage.setItem("user_name", nomeCompleto);
        localStorage.setItem("nomeOperador", nomeCompleto);
        
        // FASE 12.10: Aguardar migração silenciosa antes de continuar login (evita race condition)
        if (user.uid && user.email && typeof executarMigracaoSilenciosa === 'function') {
            console.log("[AUTH] Iniciando verificação de migração e aguardando conclusão...");
            try {
                const resultadoMigracao = await executarMigracaoSilenciosa(user.email, user.uid);
                console.log("[AUTH] Migração concluída:", resultadoMigracao);
            } catch (err) {
                console.error("[AUTH] Erro na migração:", err);
                // Continua com login mesmo se a migração falhar
            }
        }
        
        // Chamar handleLogin para validar e ir para dashboard
        await handleLogin(user.email);
        
    } catch (err) {
        console.error("[AUTH] Erro:", err);
    }
});

// Salva campos no documento raiz lojas/{uid} sem sobrescrever outros dados
async function _salvarConfigsFirestore(dados) {
  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  if (!uid) throw new Error("Sessão expirada");
  await window.firebaseSetDoc(
    window.firebaseDoc(window.firebaseDb, "lojas", uid),
    dados,
    { merge: true }
  );
}
// ============================================================
// SINCRONIZAÇÃO AUTOMÁTICA SHEETS → FIREBASE (Migração Gradual)
// ============================================================

// Verifica se usuário tem dados no Google Sheets mas ainda não migrou para Firebase
async function verificarDadosPendentesSheets(email) {
  const jaSincronizou = localStorage.getItem(`sincronizacao_concluida_${email}`);
  if (jaSincronizou) {
    console.log("[SYNC] Sincronização já realizada anteriormente para:", email);
    return { temDadosSheets: false, dados: null };
  }

  try {
    console.log("[SYNC] Verificando dados no Sheets para:", email);
    const res = await chamarGoogle("carregarDashboard");
    
    if (res?.dados) {
      const dados = res.dados;
      const temVendas = parseFloat(dados.receitaMes || 0) > 0 || parseFloat(dados.receitaHoje || 0) > 0;
      
      console.log("[SYNC] Dados do Sheets:", { 
        receitaMes: dados.receitaMes, 
        receitaHoje: dados.receitaHoje,
        temVendas 
      });
      
      return { temDadosSheets: temVendas, dados: dados };
    }
    
    return { temDadosSheets: false, dados: null };
  } catch (err) {
    console.error("[SYNC] Erro ao verificar dados no Sheets:", err);
    return { temDadosSheets: false, dados: null, erro: err.message };
  }
}

// Sincroniza vendas do Sheets para o Firebase
async function sincronizarSheetsParaFirebase(email) {
  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  if (!uid) {
    console.error("[SYNC] UID não disponível para sincronização");
    return { sucesso: false, erro: "UID não disponível" };
  }

  try {
    console.log("[SYNC] Iniciando sincronização para:", email);
    mostrarToast("📂 Sincronizando dados antigos...", "aviso");

    // Busca TODAS as vendas do Sheets (sem filtro de mês)
    const resVendas = await chamarGoogle("buscarVendas", { mes: "" });
    const vendasSheets = resVendas?.vendas || [];
    
    console.log(`[SYNC] Encontradas ${vendasSheets.length} vendas no Sheets`);

    if (vendasSheets.length === 0) {
      console.log("[SYNC] Nenhuma venda encontrada no Sheets");
      localStorage.setItem(`sincronizacao_concluida_${email}`, new Date().toISOString());
      return { sucesso: true, vendasMigradas: 0 };
    }

    // Verifica vendas existentes no Firebase para evitar duplicatas
    const vendasRef = window.firebaseCollection(window.firebaseDb, "lojas", uid, "vendas");
    const snapshotExistentes = await window.firebaseGetDocs(vendasRef);
    const vendasExistentes = new Set();
    
    snapshotExistentes.docs.forEach(doc => {
      const v = doc.data();
      // Chave única: data + total + descrição + formaPag
      const chave = `${v.data}_${v.total}_${v.descricao || ''}_${v.formaPag}`;
      vendasExistentes.add(chave);
    });

    console.log(`[SYNC] ${vendasExistentes.size} vendas já existem no Firebase`);

    let migradas = 0;
    let duplicadas = 0;
    let erros = 0;

    // Processa cada venda do Sheets
    for (const venda of vendasSheets) {
      try {
        // Cria chave única para verificar duplicata
        const chaveVenda = `${venda.data}_${venda.total}_${venda.descricao || ''}_${venda.formaPag}`;
        
        if (vendasExistentes.has(chaveVenda)) {
          duplicadas++;
          continue; // Pula se já existe
        }

        // Prepara dados no formato do Firebase
        const dadosFirebase = {
          data: venda.dataISO || venda.data,
          total: parseFloat(venda.total) || 0,
          dinheiro: parseFloat(venda.dinheiro) || 0,
          pix: parseFloat(venda.pix) || 0,
          debito: parseFloat(venda.debito) || 0,
          credito: parseFloat(venda.credito) || 0,
          formaPag: venda.formaPag || "Dinheiro",
          modo: venda.modo || "individual",
          cliente: venda.cliente || "",
          descricao: venda.descricao || "",
          obs: venda.obs || "",
          registradoPor: venda.registradoPor || localStorage.getItem("nomeOperador") || "Sistema",
          migradoDoSheets: true,
          dataMigracao: new Date().toISOString()
        };

        // Salva no Firebase
        await window.firebaseAddDoc(
          window.firebaseCollection(window.firebaseDb, "lojas", uid, "vendas"),
          dadosFirebase
        );
        
        migradas++;
      } catch (errVenda) {
        console.error("[SYNC] Erro ao migrar venda:", venda, errVenda);
        erros++;
      }
    }

    console.log(`[SYNC] Resumo: ${migradas} migradas, ${duplicadas} duplicadas, ${erros} erros`);

    // Atualiza dashboard no Firebase
    await atualizarDashboardFirebase();

    // Marca como sincronizado
    localStorage.setItem(`sincronizacao_concluida_${email}`, new Date().toISOString());
    
    mostrarToast(`✅ ${migradas} vendas sincronizadas!`, "sucesso");
    
    return { 
      sucesso: true, 
      vendasMigradas: migradas, 
      duplicadas, 
      erros 
    };

  } catch (err) {
    console.error("[SYNC] Erro na sincronização:", err);
    mostrarToast("❌ Erro ao sincronizar dados", "erro");
    return { sucesso: false, erro: err.message };
  }
}

// Função principal chamada no login para verificar e sincronizar
async function verificarESincronizarDadosAntigos(email) {
  try {
    const { temDadosSheets, dados } = await verificarDadosPendentesSheets(email);
    
    if (temDadosSheets) {
      console.log("[SYNC] Dados antigos detectados no Sheets, iniciando migração...");
      await sincronizarSheetsParaFirebase(email);
    } else {
      console.log("[SYNC] Nenhum dado antigo pendente ou já sincronizado");
    }
  } catch (err) {
    console.error("[SYNC] Erro no processo de verificação/sincronização:", err);
    // Não bloqueia o login em caso de erro
  }
}

// ============================================================
// FASE 10: MIGRAÇÃO SILENCIOSA COM FLAG NO FIREBASE
// ============================================================

/**
 * Verifica se o usuário precisa migrar dados do Sheets para o Firebase
 * Lê a flag migradoSheets no documento de configurações do usuário
 * @param {string} uid - UID do usuário no Firebase
 * @returns {Promise<{precisaMigrar: boolean, flagExiste: boolean}>}
 */
async function verificarFlagMigracaoSheets(uid) {
  try {
    console.log("[MIGRAÇÃO] Verificando flag migradoSheets para UID:", uid);
    
    const configRef = window.firebaseDoc(window.firebaseDb, "lojas", uid);
    const configSnap = await window.firebaseGetDoc(configRef);
    
    if (!configSnap.exists()) {
      console.log("[MIGRAÇÃO] Configurações não existem. Precisa migrar.");
      return { precisaMigrar: true, flagExiste: false };
    }
    
    const configData = configSnap.data();
    const migradoSheets = configData.migradoSheets;
    
    if (migradoSheets === true) {
      console.log("[MIGRAÇÃO] Flag migradoSheets já marcada como true. Pulando migração.");
      return { precisaMigrar: false, flagExiste: true };
    }
    
    console.log("[MIGRAÇÃO] Flag migradoSheets é false ou não existe. Precisa migrar.");
    return { precisaMigrar: true, flagExiste: true };
    
  } catch (err) {
    console.error("[MIGRAÇÃO] Erro ao verificar flag:", err);
    // Em caso de erro, assume que precisa migrar para garantir consistência
    return { precisaMigrar: true, flagExiste: false };
  }
}

/**
 * Executa a migração de dados da planilha Google Sheets para o Firebase
 * @deprecated FASE 12.6: Esta função está obsoleta. Use migrarDadosLegadosSilencioso para Migração REAL.
 * Migra dados da planilha do Google Sheets para o Firebase (SIMULAÇÃO - não usar mais)
 * @param {string} email - Email do usuário logado
 * @returns {Promise<{sucesso: boolean, clientes: number, produtos: number, vendas: number}>}
 */
async function migrarDadosPlanilhaParaFirebase(email) {
  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  
  if (!uid) {
    console.error("[MIGRAÇÃO] UID não disponível para migração");
    return { sucesso: false, erro: "UID não disponível" };
  }
  
  console.log(`[MIGRAÇÃO] Iniciando migração para: ${email} (UID: ${uid})`);
  
  try {
    // ==========================================
    // FASE 11 TODO: Implementar chamadas reais para API Google Apps Script
    // ==========================================
    
    // SIMULAÇÃO: Busca de Clientes
    console.log("[MIGRAÇÃO] 📋 Buscando clientes da planilha...");
    // TODO: const resClientes = await chamarGoogle("buscarClientes");
    await new Promise(r => setTimeout(r, 500)); // Simula delay
    const clientesMock = []; // TODO: resClientes?.clientes || []
    console.log(`[MIGRAÇÃO] Encontrados ${clientesMock.length} clientes`);
    
    // SIMULAÇÃO: Busca de Produtos
    console.log("[MIGRAÇÃO] 📦 Buscando produtos da planilha...");
    // TODO: const resProdutos = await chamarGoogle("buscarProdutos");
    await new Promise(r => setTimeout(r, 500)); // Simula delay
    const produtosMock = []; // TODO: resProdutos?.produtos || []
    console.log(`[MIGRAÇÃO] Encontrados ${produtosMock.length} produtos`);
    
    // SIMULAÇÃO: Busca de Histórico de Vendas
    console.log("[MIGRAÇÃO] 💰 Buscando histórico de vendas...");
    // TODO: const resVendas = await chamarGoogle("buscarVendas", { mes: "" });
    await new Promise(r => setTimeout(r, 1000)); // Simula delay maior
    const vendasMock = []; // TODO: resVendas?.vendas || []
    console.log(`[MIGRAÇÃO] Encontradas ${vendasMock.length} vendas`);
    
    // ==========================================
    // FASE 11 TODO: Salvar dados nas coleções do Firebase
    // ==========================================
    
    // Salvar Clientes
    if (clientesMock.length > 0) {
      console.log("[MIGRAÇÃO] Salvando clientes em /lojas/{uid}/clientes...");
      // TODO: Implementar loop para salvar cada cliente via salvarClienteHub ou batch
    }
    
    // Salvar Produtos
    if (produtosMock.length > 0) {
      console.log("[MIGRAÇÃO] Salvando produtos em /lojas/{uid}/produtos...");
      // TODO: Implementar loop para salvar cada produto via salvarProdutoHub ou batch
    }
    
    // Salvar Vendas
    if (vendasMock.length > 0) {
      console.log("[MIGRAÇÃO] Salvando vendas em /lojas/{uid}/vendas...");
      // TODO: Implementar loop para salvar cada venda
    }
    
    console.log("[MIGRAÇÃO] ⚠️ ATENÇÃO: Esta função está obsoleta. Use migrarDadosLegadosSilencioso para Migração REAL.");
    
    return {
      sucesso: true,
      clientes: clientesMock.length,
      produtos: produtosMock.length,
      vendas: vendasMock.length
    };
    
  } catch (err) {
    console.error("[MIGRAÇÃO] Erro durante migração:", err);
    throw err; // Propaga erro para ser tratado pelo chamador
  }
}

/**
 * Marca a migração como concluída no Firebase
 * Atualiza o documento de configurações com a flag migradoSheets = true
 * @param {string} uid - UID do usuário no Firebase
 */
async function marcarMigracaoConcluida(uid) {
  try {
    console.log("[MIGRAÇÃO] Marcando migração como concluída...");
    
    const configRef = window.firebaseDoc(window.firebaseDb, "lojas", uid);
    const dadosMigracao = {
      migradoSheets: true,
      dataMigracao: new Date().toISOString(),
      versaoMigracao: "1.0",
      origem: "Google Sheets"
    };
    
    await window.firebaseSetDoc(configRef, dadosMigracao, { merge: true });
    
    console.log("[MIGRAÇÃO] Flag migradoSheets salva com sucesso!");
    console.log("[MIGRAÇÃO] Data:", dadosMigracao.dataMigracao);
    
  } catch (err) {
    console.error("[MIGRAÇÃO] Erro ao salvar flag de migração:", err);
    throw err;
  }
}

/**
 * Orquestrador da migração silenciosa
 * Verifica flag -> Executa migração -> Marca como concluída -> Recarrega dados
 * Roda em segundo plano (não bloqueia o fluxo principal)
 * @param {string} email - Email do usuário logado
 * @param {string} uid - UID do usuário no Firebase
 */
async function executarMigracaoSilenciosa(email, uid) {
  console.log("[MIGRAÇÃO] ==========================================");
  console.log("[MIGRAÇÃO] INICIANDO VERIFICAÇÃO DE MIGRAÇÃO");
  console.log("[MIGRAÇÃO] Usuário:", email);
  console.log("[MIGRAÇÃO] ==========================================");
  
  try {
    // ETAPA 1: Verificar se precisa migrar
    const { precisaMigrar } = await verificarFlagMigracaoSheets(uid);
    
    if (!precisaMigrar) {
      console.log("[MIGRAÇÃO] ✅ Migração não necessária. Fluxo normal.");
      return { executada: false, motivo: "já_migrado" };
    }
    
    // ETAPA 2: Mostrar feedback ao usuário
    mostrarToast("📂 Sincronizando seus dados antigos...", "aviso");
    
    // ETAPA 3: Executar migração REAL (FASE 12.6)
    const resultado = await migrarDadosLegadosSilencioso(email, uid);
    
    if (!resultado.sucesso) {
      throw new Error("Falha na migração de dados");
    }
    
    // ETAPA 4: Marcar como concluída
    await marcarMigracaoConcluida(uid);
    
    // ETAPA 5: Feedback de sucesso
    mostrarToast(`✅ Dados sincronizados! (${resultado.vendas} vendas, ${resultado.clientes} clientes, ${resultado.produtos} produtos)`, "sucesso");
    
    // ETAPA 6: Recarregamento Forçado do Dashboard (FASE 12.10)
    console.log("[MIGRAÇÃO] Forçando recarregamento do Dashboard após migração...");
    
    // Limpar cache global de histórico para garantir dados frescos
    if (typeof historicoGlobal !== 'undefined') {
        console.log("[MIGRAÇÃO] Limpando cache de historicoGlobal...");
        historicoGlobal = [];
    }
    
    // Forçar recarregamento do Dashboard com dados frescos do Firebase
    const mesAtualStr = mesAtual();
    await atualizarDashboardFirebase(mesAtualStr);
    console.log("[MIGRAÇÃO] Dashboard atualizado com dados migrados.");
    
    // Recarregar histórico também para garantir consistência
    if (typeof buscarHistorico === 'function') {
        console.log("[MIGRAÇÃO] Recarregando histórico...");
        await buscarHistorico();
    }
    
    // Recarregar sugestões se for perfil varejo
    if (perfilNegocioAtual !== 'servicos' && typeof carregarSugestoesFormularioVarejo === 'function') {
      await carregarSugestoesFormularioVarejo();
    }
    
    console.log("[MIGRAÇÃO] ✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO");
    console.log("[MIGRAÇÃO] ==========================================");
    
    return { 
      executada: true, 
      clientes: resultado.clientes,
      produtos: resultado.produtos,
      vendas: resultado.vendas
    };
    
  } catch (err) {
    console.error("[MIGRAÇÃO] ❌ ERRO NA MIGRAÇÃO:", err);
    mostrarToast("⚠️ Erro na sincronização. Tente novamente mais tarde.", "erro");
    
    // Não propagamos o erro para não quebrar o fluxo do usuário
    // A migração pode ser tentada novamente no próximo login
    return { executada: false, erro: err.message };
  }
}


// ============================================================
// CONTROLE DE ACESSO POR PLANO (Básico vs Premium)
// ============================================================

// Armazena nível do plano no login
function salvarNivelPlano(res) {
  const nivel = res?.nivelPlano || "Básico";
  localStorage.setItem("plano_nivel", nivel);
  console.log("[PLANO] Nível do plano:", nivel);
  return nivel;
}

// Verifica se funcionalidade está disponível no plano atual
function verificarAcessoFuncionalidade(funcionalidade) {
  const nivel = localStorage.getItem("plano_nivel") || "Básico";
  
  // Funcionalidades restritas ao Plano Premium
  const restricoesPremium = [
    "fechamento",      // Fechamento de caixa
    "fornecedores",    // Cadastro de fornecedores
    "compras",         // Controle de compras
    "relatorios",      // Relatórios avançados
    "membros"          // Múltiplos usuários/funcionários
  ];
  
  // Se for Premium, tem acesso a tudo
  if (nivel === "Premium") return true;
  
  // Se for Básico, verifica se a funcionalidade é restrita
  const temAcesso = !restricoesPremium.includes(funcionalidade);
  
  if (!temAcesso) {
    console.log(`[PLANO] Acesso negado: ${funcionalidade} requer Premium`);
  }
  
  return temAcesso;
}

// Mostra toast de upgrade quando usuário tenta acessar função Premium
function mostrarToastUpgrade(funcionalidade) {
  const nomes = {
    "fechamento": "Fechamento de Caixa",
    "fornecedores": "Cadastro de Fornecedores",
    "compras": "Controle de Compras",
    "relatorios": "Relatórios Avançados",
    "membros": "Múltiplos Usuários"
  };
  
  const nome = nomes[funcionalidade] || funcionalidade;
  mostrarToast(`🔒 ${nome} disponível no Plano Premium. Toque para ver planos.`, "aviso");
  
  // Opcional: abrir modal de planos após 2 segundos
  setTimeout(() => {
    if (confirm(`Deseja fazer upgrade para o Plano Premium e ter acesso a ${nome}?`)) {
      abrirModalPlanos();
    }
  }, 2000);
}

// Aplica restrições visuais baseadas no plano
function aplicarRestricoesPlano() {
  const nivel = localStorage.getItem("plano_nivel") || "Básico";
  
  if (nivel === "Premium") {
    // Premium: mostra tudo, não aplica restrições
    console.log("[PLANO] Acesso Premium - todas as funcionalidades liberadas");
    return;
  }
  
  // Plano Básico: aplica restrições
  console.log("[PLANO] Acesso Básico - aplicando restrições");
  
  // 1. Esconder menu de Compras
  const menuCompras = document.getElementById("menu-compras");
  if (menuCompras) menuCompras.style.display = "none";
  
  // 2. Esconder menu de Relatórios
  const menuRelatorios = document.getElementById("menu-relatorios");
  if (menuRelatorios) menuRelatorios.style.display = "none";
  
  // 3. Esconder botão de Fechar Caixa no dashboard
  const btnFecharCaixa = document.getElementById("btn-fechar-caixa");
  if (btnFecharCaixa) btnFecharCaixa.style.display = "none";
  
  // 4. Na tela de Configurações, esconder abas Premium
  // (será tratado ao abrir a tela de configurações)
}



var telaAtual = "secao-home";

function mostrarTela(idTela) {
  telaAtual = idTela;

  // 1. Gerenciar o Overlay de Loading
  const loading = document.getElementById("tela-loading");
  if (idTela === "tela-loading") {
    if (loading) {
      loading.style.display = "flex";
      loading.style.pointerEvents = "all";
    }
    return;
  } else {
    if (loading) {
      loading.style.display = "none";
      loading.style.pointerEvents = "none";
    }
  }

  // 2. Se estiver mostrando o dashboard, remover classe tem-sessao
  if (idTela === "tela-dashboard") {
    document.documentElement.classList.remove('tem-sessao');
  }

  // 3. Esconder todas as telas (secao-app, tela-*, secao-*)
  const telas = document.querySelectorAll(".secao-app, [id^='tela-'], [id^='secao-']");
  telas.forEach(t => {
    t.classList.remove("ativa");
    t.style.display = "none";
    t.style.zIndex = "";
  });

  // 4. Mostrar apenas a tela solicitada
  const el = document.getElementById(idTela);
  if (el) {
    el.classList.add("ativa");
    
    // Define o display correto
    const flexTelas = ["secao-home", "secao-login", "tela-trial", "tela-bloqueio", "secao-membro-email"];
    el.style.display = flexTelas.includes(idTela) ? "flex" : "block";
    
    // Garante que a tela ativa esteja no topo
    el.style.zIndex = "1";
    
    // Scroll para o topo
    window.scrollTo(0, 0);
  } else {
    console.error("Tela não encontrada:", idTela);
  }

  // 5. Força loading invisível e sem interação (duplicação de segurança)
  if (loading && idTela !== "tela-loading") {
    loading.style.display = "none";
    loading.style.pointerEvents = "none";
  }
}

// ============================================================
// BACKEND
// ============================================================
async function chamarGoogle(acao, dadosExtras) {
  // Para membros, usa o email do DONO (dados são da loja do dono)
  let email = localStorage.getItem("user_email") || "";
  if (sessaoIsMembro && sessaoEmailDono) {
    email = sessaoEmailDono;
  }
  
  // DEBUG - Dedo-duro
  console.log('--- DEBUG BATECAIXA ---', { acao, email, dadosExtras });
  
  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ acao: acao, email: email, dados: dadosExtras })
    });
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { console.error("Resposta não-JSON:", text); throw new Error("Resposta inválida"); }
  } catch (err) {
    console.error("Erro:", acao, err);
    // Só mostra toast para erros de rede/parse (não para erros de negócio que já têm mensagem)
    if (err.message && err.message.includes("inválida")) {
      mostrarToast("❌ Resposta inválida do servidor. Verifique o Apps Script.", "erro");
    } else if (!err.message || err.message === "Failed to fetch") {
      mostrarToast("❌ Sem conexão com o servidor.", "erro");
    }
    throw err;
  }
}

// ============================================================
// UTILITÁRIOS
// ============================================================
function formatarMoeda(el) {
  let v = el.value.replace(/\D/g, "");
  if (!v) { el.value = ""; return; }
  v = (parseInt(v, 10) / 100).toFixed(2).replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  el.value = v;
}
function converterFloat(s) {
  if (!s && s !== 0) return 0;
  if (typeof s === "number") return s;
  let v = String(s).replace(/[R$\s]/g, "").trim();
  if (!v) return 0;
  if (v.includes(",") && v.includes(".")) v = v.replace(/\./g, "").replace(",", ".");
  else if (v.includes(",")) v = v.replace(",", ".");
  return parseFloat(v) || 0;
}
function formatarBRL(v) { return "R$ " + (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
// dataHoje: NUNCA usa toISOString() — ele converte para UTC e quebra em GMT-3.
// Extrai ano/mês/dia diretamente do objeto Date local do dispositivo.
function dataHoje() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function mesAtual() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function formatarDataBR(d) { if (!d) return ""; try { return new Date(d + "T12:00:00").toLocaleDateString("pt-BR"); } catch { return d; } }
function resetarBotao(id, txt) { const b = document.getElementById(id); if (b) { b.disabled = false; b.innerText = txt; b.style.opacity = "1"; } }

// ============================================================
// AUTENTICAÇÃO — DONO (Google OAuth)
// ============================================================
function mostrarTelaLogin() {
  mostrarTela("secao-login");
}

// Função de login com Firebase - tratamento de erros melhorado
async function solicitarLogin() {
  try {
    // Verificação simplificada - se já tem usuário autenticado, usar fluxo normal
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      console.log("Usuário já autenticado, redirecionando...");
      await handleLogin(window.firebaseAuth.currentUser.email);
      return;
    }
    
    // Verificar se Firebase auth está disponível de forma simples
    if (!window.firebaseAuth || typeof window.firebaseSignIn !== 'function') {
      console.log("Firebase auth não disponível, aguardando...");
      mostrarToast("⚠️ Preparando Firebase...", "aviso");
      
      // Tentar aguardar um pouco mais
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar novamente
      if (!window.firebaseAuth || typeof window.firebaseSignIn !== 'function') {
        mostrarToast("❌ Firebase não disponível. Recarregue a página.", "erro");
        return;
      }
    }
    
    const provider = window.firebaseProvider;
    provider.addScope('email');
    
    // Adicionar tratamento para erros comuns do Firebase
    const result = await window.firebaseSignIn(window.firebaseAuth, provider);
    
    // Tratar resultado silenciosamente para evitar erros no console
    if (result && result.user) {
      console.log("Login realizado com sucesso:", result.user.email);
    }

    if (!result.user.email) throw new Error("Email não obtido");

    localStorage.setItem("google_access_token", result.user.accessToken || "firebase_token_ativo");
    localStorage.setItem("user_email", result.user.email);
    localStorage.setItem("user_uid", result.user.uid);   // fallback para salvarVenda se currentUser não estiver pronto

    // PRIORIZAR: 1) Nome da configuração, 2) Nome do Firebase, 3) "Vendedor"
    let nomeCompleto = "Vendedor";
    let primeiroNome = "Vendedor";
    
    // Carregar configurações primeiro para pegar o nome da loja
    await window._buscarConfigsFirestore();
    
    // Usar nome da configuração da loja se disponível
    if (window.configuracoesGlobais && window.configuracoesGlobais.nomeProprietario) {
        nomeCompleto = window.configuracoesGlobais.nomeProprietario;
        primeiroNome = nomeCompleto ? nomeCompleto.split(" ")[0] : nomeCompleto;
        console.log("Login: Usando nome da configuração da loja:", nomeCompleto);
    } else if (result.user.displayName) {
        // Fallback para nome do Firebase
        nomeCompleto = result.user.displayName;
        primeiroNome = nomeCompleto ? nomeCompleto.split(" ")[0] : "Vendedor";
        console.log("Login: Usando nome do Firebase:", nomeCompleto);
    }
    
    localStorage.setItem("user_name", nomeCompleto);
    localStorage.setItem("nomeOperador", primeiroNome);

    // ---> NOVO: SALVANDO O LOJISTA NO FIREBASE FIRESTORE <---
    if (window.firebaseDb && window.firebaseDoc && window.firebaseSetDoc) {
      const lojaRef = window.firebaseDoc(window.firebaseDb, "lojas", result.user.uid);
      await window.firebaseSetDoc(lojaRef, {
        email: result.user.email,
        nome: result.user.displayName || "Vendedor",
        ultimoLogin: new Date().toISOString()
      }, { merge: true }); // merge: true impede de apagar outros dados que colocaremos no futuro
    }
    // --------------------------------------------------------

    // NÃO chamar handleLogin aqui - o evento usuarioAutenticado já vai cuidar disso
    console.log("Login: Aguardando evento usuarioAutenticado...");

  } catch (error) {
    // Ignorar erros comuns do Firebase que não afetam a funcionalidade
    if (error.code === 'popup-closed-by-user' || 
        error.code === 'popup-blocked' ||
        error.message?.includes('Cross-Origin-Opener-Policy') ||
        error.message?.includes('Receiving end does not exist')) {
      console.log("Login cancelado ou bloqueado pelo usuário");
      return;
    }
    
    // Mostrar apenas erros relevantes
    if (error.code !== 'auth/popup-closed-by-user') {
      console.error("Erro no login Firebase:", error);
      mostrarToast("❌ Erro no login. Tente novamente.", "erro");
    }
  }
}

async function handleLogin(email) {
  console.log("handleLogin iniciado - email:", email);
  const nome = localStorage.getItem("user_name") || "Vendedor";
  const sp = document.getElementById("nome-loading");
  if (sp) sp.innerText = nome;
  
  mostrarTela("tela-loading");
  localStorage.setItem("user_email", email);
  
  // Verificar se já temos uma validação recente para evitar chamadas duplicadas
  const ultimaValidacao = localStorage.getItem("ultimaValidacaoAcesso");
  const agora = new Date().getTime();
  const emailSalvo = localStorage.getItem("user_email");
  
  // Se já validamos nos últimos 5 minutos e é o mesmo email, usar cache
  if (ultimaValidacao && emailSalvo === email && (agora - parseInt(ultimaValidacao)) < 300000) {
    console.log("Usando validação em cache - evitando chamada duplicada");
    const dadosCache = localStorage.getItem("dadosAcessoCache");
    if (dadosCache) {
      try {
        const res = JSON.parse(dadosCache);
        validarPortaria(res);
        return;
      } catch (e) {
        console.warn("Cache inválido, fazendo nova chamada");
      }
    }
  }
  
  try {
    console.log("Chamando chamarGoogle('verificarAcesso')...");
    const res = await chamarGoogle("verificarAcesso");
    console.log("Resposta do verificarAcesso:", res);
    
    // Salvar em cache para evitar chamadas futuras
    localStorage.setItem("ultimaValidacaoAcesso", agora.toString());
    localStorage.setItem("dadosAcessoCache", JSON.stringify(res));
    
    validarPortaria(res);
  } catch (err) {
    console.error("Erro no handleLogin:", err);
    document.getElementById("tela-loading").style.display = "none";
    mostrarToast("Erro ao fazer login. Tente novamente.", "erro");
  }
}

async function validarPortaria(res) {
  // Manter loading visível até dashboard carregar completamente
  console.log("Validando portaria - loading mantido...");

  // Busca configurações do Firebase
  try {
    await _buscarConfigsFirestore();
  } catch (err) {
    console.warn("Erro ao sincronizar configs:", err);
  }

  if (res?.isReadOnly === true) {
    console.log("🔒 Modo read-only detectado.");
    localStorage.setItem("modoReadOnly", "true");
    localStorage.setItem("vencidoEm", res.vencidoEm || "");
    montarDashboard(res.dadosIniciais || {}, true);
    setTimeout(() => {
      mostrarToast("🔒 Sua assinatura expirou. Você está no modo leitura.", "aviso");
    }, 800);
    desabilitarBotoesEscrita();
    return;
  }

  // Carregar clientes e produtos assincronamente (sem await para não travar a tela)
  try { carregarClientes(); } catch (err) { console.warn("Erro carregar clientes:", err); }
  try { buscarProdutos(); } catch (err) { console.warn("Erro buscar produtos:", err); }

  // FORÇAR SINCRONIZAÇÃO: Prioridade absoluta para dados do servidor
  // FASE 12.4: Blindagem Absoluta do Admin VIP - bloquear QUALQUER sobrescrita quando admin tem perfilAdminTeste
  const userEmail = localStorage.getItem("user_email");
  const perfilAdminTeste = localStorage.getItem('perfilAdminTeste');

  // TRAVA ABSOLUTA DO ADMIN: Se for admin e tiver perfil de teste, NÃO permite sobrescrita
  if (userEmail === EMAIL_ADMIN && perfilAdminTeste) {
    perfilNegocioAtual = perfilAdminTeste;
    localStorage.setItem("perfilNegocio", perfilNegocioAtual);
    console.log('[ADMIN VIP] TRAVA ABSOLUTA: Bloqueando servidor e forçando cache de teste:', perfilNegocioAtual);
    console.log('[ADMIN VIP] Servidor retornou:', res.perfilNegocio, '- IGNORADO');
  } else {
    // Fluxo normal para usuários não-admin ou admin sem perfil de teste
    if (res.perfilNegocio) {
      perfilNegocioAtual = res.perfilNegocio;
      console.log("Perfil sincronizado do servidor:", perfilNegocioAtual);
    } else {
      // Fallback apenas se servidor não tiver perfil
      const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
      if (uid) {
        try {
          const snap = await window.firebaseGetDoc(window.firebaseDoc(window.firebaseDb, "lojas", uid));
          if (snap.exists() && snap.data().perfilNegocio) {
            perfilNegocioAtual = snap.data().perfilNegocio;
            console.log("Perfil carregado do Firebase (fallback):", perfilNegocioAtual);
          } else {
            const perfilSalvo = localStorage.getItem("perfilNegocio");
            if (perfilSalvo) {
              perfilNegocioAtual = perfilSalvo;
              console.log("Perfil carregado do localStorage (fallback):", perfilNegocioAtual);
            }
          }
        } catch (err) {
          console.warn("Erro ao carregar perfil do Firebase:", err);
          const perfilSalvo = localStorage.getItem("perfilNegocio");
          if (perfilSalvo) {
            perfilNegocioAtual = perfilSalvo;
          }
        }
      }
    }
    localStorage.setItem("perfilNegocio", perfilNegocioAtual);
  }
  
  // Aplicar perfil com dados sincronizados
  aplicarPerfilNegocio();

  if (res?.liberado === false && res?.isReadOnly !== true) {
    const emailEl = document.getElementById("email-bloqueado");
    const motivoEl = document.getElementById("motivo-bloqueio");
    if (emailEl) emailEl.innerText = res?.email || localStorage.getItem("user_email") || "";
    if (motivoEl) motivoEl.innerText = res?.motivo || "Acesso bloqueado.";
    mostrarTela("tela-bloqueio");
    return;
  }

  if (res?.liberado) {
    localStorage.setItem("modoReadOnly", "false");
    if (res.trialExpiraAmanha) {
      document.getElementById("banner-trial").style.display = "block";
    }
    
    // Sincronização automática
    const email = localStorage.getItem("user_email") || "";
    if (email) {
      try {
        await verificarESincronizarDadosAntigos(email);
      } catch (syncErr) {
        console.warn("[SYNC] Erro na sincronização:", syncErr);
      }
    }
    
    // Controle de plano
    try { salvarNivelPlano(res); } catch (err) { console.warn("Erro salvar nível plano:", err); }
    
    // Carregar configurações de planos (15 colunas)
    try { carregarPlanosConfig(); } catch (err) { console.warn("Erro carregar planos config:", err); }
    
    // Montar dashboard
    try { montarDashboard(res.dadosIniciais || {}, true); } catch (err) { console.warn("Erro montar dashboard:", err); }
    try { aplicarRestricoesPlano(); } catch (err) { console.warn("Erro aplicar restrições:", err); }
    
    // Gatilho: sincronização automática de perfil (sem loading)
    setTimeout(() => {
      sincronizarPerfilSilencioso();
    }, 1000);
    
    // Remover loading apenas após aplicarPerfilNegocio() ter sido executado
    setTimeout(() => {
      document.getElementById("tela-loading").style.display = "none";
      console.log("Dashboard carregado e perfil aplicado - loading removido");
    }, 200);
    
    return;
  }

  if (res?.isNovo) {
    mostrarTela("tela-trial");
    return;
  }

  // Se não caiu em nenhuma condição acima, vai para home
  mostrarTela("secao-home");
}

function desabilitarBotoesEscrita() {
    // Encontra todos os botões que modificam dados e desabilita
    const seletores = [
      "#btn-salvar-venda",
      "#btn-salvar-compra",
      "#btn-add-membro",
      "#btn-add-cliente",
      "#btn-add-fornecedor",
      "#btn-salvar-config-loja",
      "#btn-salvar-meta",
      "#btn-salvar-estilo",
      "#btn-instalar-app",
      ".btn-acao.btn-editar",
      ".btn-acao.btn-excluir"
    ];

    seletores.forEach(seletor => {
      const elementos = document.querySelectorAll(seletor);
      elementos.forEach(el => {
        if (el) {
          el.disabled = true;
          el.style.opacity = "0.5";
          el.style.cursor = "not-allowed";
          el.title = "🔒 Sua assinatura expirou. Modo leitura ativado.";
        }
      });
    });

    // Desabilita todos os inputs de formulário que podem escrever dados
    const formularios = [
      "#form-venda",
      "#form-compra",
      "#form-add-membro",
      "#form-add-cliente",
      "#form-add-fornecedor",
      "#form-config-loja",
      "#form-config-estilo",
      "#form-config-meta"
    ];

    formularios.forEach(seletor => {
      const form = document.querySelector(seletor);
      if (form) {
        const inputs = form.querySelectorAll("input, select, textarea, button[type='submit']");
        inputs.forEach(el => {
          el.disabled = true;
          el.style.opacity = "0.6";
        });
      }
    });

    // Adiciona overlay visual suave em cima de seções críticas (opcional)
    const telas = [
      "#menu-dono",
      "#tela-lancar-vendas",
      "#tela-compras",
      "#content-loja",
      "#content-meta",
      "#content-membros",
      "#content-clientes",
      "#content-fornecedores"
    ];

    telas.forEach(seletor => {
      const el = document.querySelector(seletor);
      if (el && localStorage.getItem("modoReadOnly") === "true") {
        el.style.pointerEvents = "none";
        el.style.opacity = "0.7";
      }
    });
  }

// ============================================================
// AUTENTICAÇÃO — MEMBRO (e-mail + código OTP)
// ============================================================
var _membroEmailPendente = "";

// Item 2: verifica e-mail no backend ANTES de enviar código
async function verificarEmailMembro(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-verificar-email");
  const orig = btn.innerText;
  btn.disabled = true; btn.innerText = "⏳ Verificando..."; btn.style.opacity = ".7";
  const email = document.getElementById("membro-email-input").value.toLowerCase().trim();
  try {
    const res = await chamarGoogle("verificarMembroExiste", { emailMembro: email });
    if (res?.existe) {
      _membroEmailPendente = email;
      // Preenche tela de confirmação
      const nlEl = document.getElementById("membro-nome-loja-confirmado");
      const paEl = document.getElementById("membro-papel-confirmado");
      const emEl = document.getElementById("membro-email-confirmado-exibido");
      if (nlEl) nlEl.innerText = "🏪 " + (res.nomeLoja || "Loja");
      if (paEl) paEl.innerText = "Papel: " + (res.papel || "Funcionário");
      if (emEl) emEl.innerText = email;
      mostrarTela("tela-membro-confirmado");
    } else {
      mostrarToast("❌ " + (res?.mensagem || "E-mail não autorizado."), "erro");
    }
  } catch { mostrarToast("❌ Erro de conexão.", "erro"); }
  finally { resetarBotao("btn-verificar-email", orig); }
}

// Item 2: envia o código APENAS depois da confirmação visual
async function enviarCodigoAposConfirmacao() {
  const btn = document.getElementById("btn-enviar-codigo-confirmado");
  const orig = btn.innerText;
  btn.disabled = true; btn.innerText = "⏳ Enviando..."; btn.style.opacity = ".7";
  try {
    const res = await chamarGoogle("solicitarAcessoMembro", { emailMembro: _membroEmailPendente });
    if (res?.status === "Sucesso") {
      const exEl = document.getElementById("membro-email-exibido");
      if (exEl) exEl.innerText = _membroEmailPendente;
      document.getElementById("membro-codigo-input").value = "";
      mostrarToast("📬 Código enviado! Verifique seu e-mail.", "sucesso");
      mostrarTela("tela-membro-codigo");
    } else {
      mostrarToast("❌ " + (res?.mensagem || "Erro ao enviar código."), "erro");
    }
  } catch { mostrarToast("❌ Erro de conexão.", "erro"); }
  finally { resetarBotao("btn-enviar-codigo-confirmado", orig); }
}

// Chamado MANUALMENTE pelo botão "Enviar novo código" (não automático)
async function solicitarCodigoMembro() {
  const btn = document.getElementById("btn-solicitar-codigo");
  const orig = btn.innerText;
  btn.disabled = true; btn.innerText = "⏳ Enviando..."; btn.style.opacity = ".7";
  if (!_membroEmailPendente) {
    mostrarToast("⚠️ Volte e informe seu e-mail primeiro.", "aviso");
    resetarBotao("btn-solicitar-codigo", orig); return;
  }
  try {
    const res = await chamarGoogle("solicitarAcessoMembro", { emailMembro: _membroEmailPendente });
    if (res?.status === "Sucesso") {
      mostrarToast("📬 Novo código enviado! Verifique seu e-mail.", "sucesso");
      const info = document.getElementById("info-codigo");
      if (info) info.innerText = "⏱️ Novo código enviado. Válido por 10 minutos.";
    } else {
      mostrarToast("❌ " + (res?.mensagem || "E-mail não encontrado como membro."), "erro");
    }
  } catch { mostrarToast("❌ Erro de conexão.", "erro"); }
  finally { resetarBotao("btn-solicitar-codigo", orig); }
}

async function validarCodigoMembro(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-validar-codigo");
  const orig = btn.innerText;
  btn.disabled = true; btn.innerText = "⏳ Validando..."; btn.style.opacity = ".7";
  const codigo = document.getElementById("membro-codigo-input").value.trim();
  if (codigo.length !== 6) {
    mostrarToast("⚠️ O código tem 6 dígitos.", "aviso");
    resetarBotao("btn-validar-codigo", orig); return;
  }
  try {
    const res = await chamarGoogle("validarCodigoMembro", { emailMembro: _membroEmailPendente, codigo });
    if (res?.liberado) {
      // FIX: salva TODOS os dados de sessão no localStorage para auto-login
      localStorage.setItem("user_email", _membroEmailPendente);
      localStorage.setItem("user_name", res.nome || _membroEmailPendente.split("@")[0]);
      localStorage.setItem("membro_sessao_dia", dataHoje());
      localStorage.setItem("membro_sessao_validada", "1");
      localStorage.setItem("membro_email_dono", res.emailDono || "");
      localStorage.setItem("membro_papel", res.papel || "Vendedor");
      localStorage.setItem("membro_nome_loja", res.nomeLoja || "");
      localStorage.setItem("nomeOperador", res.nomeOperador || res.nome || _membroEmailPendente.split("@")[0]); // Item 3
      localStorage.setItem("membro_permissao_venda", res.permissaoVenda || "individual"); // Item 2
      sessaoPapel = res.papel || "Vendedor";
      sessaoEmailDono = res.emailDono || "";
      sessaoIsMembro = true;
      atualizarHeaderOperador(); // Item 3
      mostrarToast("✅ Acesso liberado! Bem-vindo!", "sucesso");
      montarDashboard(res.dadosIniciais || {}, true);
    } else {
      mostrarToast("❌ " + (res?.mensagem || "Código inválido ou expirado."), "erro");
    }
  } catch { mostrarToast("❌ Erro de conexão.", "erro"); }
  finally { resetarBotao("btn-validar-codigo", orig); }
}

// Verifica se a sessão de membro ainda é válida (mesmo dia)
function verificarSessaoMembroValida() {
  const validada = localStorage.getItem("membro_sessao_validada");
  const dia = localStorage.getItem("membro_sessao_dia");
  return validada === "1" && dia === dataHoje();
}

// ============================================================
// DASHBOARD
// ============================================================
function montarDashboard(dados, navegar) {
  // CORREÇÃO: Prioriza o nome do Firebase (configuracoesGlobais) sobre o nome da planilha (dados)
  const nomeLojaReal = configuracoesGlobais.nomeLoja || (dados && dados.nomeLoja) || "Minha Loja";

  if (dados) {
    const s = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    
    s("receita-hoje", formatarBRL(dados.receitaHoje || 0));
    s("receita-mes", formatarBRL(dados.receitaMes || 0));
    s("compras-mes", formatarBRL(dados.comprasMes || 0));

    // Cartões separados por modo
    const siEl = document.getElementById("card-vendas-ind"); 
    if (siEl) siEl.style.display = dados.receitaIndividualMes > 0 ? "block" : "none";
    
    const sfEl = document.getElementById("card-fechamentos"); 
    if (sfEl) sfEl.style.display = dados.receitaFechamentoMes > 0 ? "block" : "none";
    
    s("receita-individual-mes", formatarBRL(dados.receitaIndividualMes || 0));
    s("receita-fechamento-mes", formatarBRL(dados.receitaFechamentoMes || 0));

    // CORREÇÃO: Aplica o nome real (Firebase) no Dashboard
    const nEl = document.getElementById("nome-loja-dash");
    if (nEl) nEl.innerText = nomeLojaReal;

    const meta = converterFloat(configuracoesGlobais.metaMensal || dados.metaMensal || 0);
    const bC = document.getElementById("barra-meta-container");
    if (bC && meta > 0) {
      const pct = Math.min(Math.round((converterFloat(dados.receitaMes || 0) / meta) * 100), 100);
      bC.style.display = "block";
      setTimeout(() => { 
        const b = document.getElementById("barra-meta-progresso"); 
        if (b) b.style.width = pct + "%"; 
      }, 100);
      const pe = document.getElementById("meta-percentual"); if (pe) pe.innerText = pct + "%";
      const mv = document.getElementById("meta-valor"); if (mv) mv.innerText = formatarBRL(meta);
    } else if (bC) { bC.style.display = "none"; }

    // Sincroniza o cache global
    Object.assign(configuracoesGlobais, { 
        nomeLoja: nomeLojaReal, 
        metaMensal: configuracoesGlobais.metaMensal || dados.metaMensal || "", 
        cidade: configuracoesGlobais.cidade || dados.cidade || "", 
        ramo: configuracoesGlobais.ramo || dados.ramo || "" 
    });
  }

  // Menus conforme papel
  ["menu-dono", "menu-vendedor", "menu-gerente"].forEach(id => { 
    const el = document.getElementById(id); if (el) el.style.display = "none"; 
  });

  const bmEl = document.getElementById("banner-membro");
  if (sessaoIsMembro) {
    if (bmEl) bmEl.style.display = "block";
    const pEl = document.getElementById("papel-membro"); if (pEl) pEl.innerText = sessaoPapel;
    
    // CORREÇÃO: Nome da loja no banner de membro
    const lEl = document.getElementById("loja-membro"); 
    if (lEl) lEl.innerText = nomeLojaReal;

    if (sessaoPapel === "Vendedor") { 
        const m = document.getElementById("menu-vendedor"); if (m) m.style.display = "block"; 
    } else if (sessaoPapel === "Gerente") { 
        const m = document.getElementById("menu-gerente"); if (m) m.style.display = "block"; 
    } else { 
        const m = document.getElementById("menu-dono"); if (m) m.style.display = "block"; 
    }
  } else {
    const m = document.getElementById("menu-dono"); if (m) m.style.display = "block";
  }

  const emailLogado = localStorage.getItem("user_email") || "";
  const btnAdm = document.getElementById("btn-admin");
  if (btnAdm) btnAdm.style.display = (emailLogado.toLowerCase() === EMAIL_ADMIN.toLowerCase()) ? "block" : "none";

  atualizarHeaderOperador(); 
  
  // INDICADOR VISUAL DO PLANO: Adicionar badge do plano no dashboard
  const nivelPlano = localStorage.getItem("plano_nivel") || "Básico";
  const planoBadge = document.getElementById("plano-badge");
  if (planoBadge) {
    planoBadge.innerText = nivelPlano;
    planoBadge.className = "plano-badge " + (nivelPlano === "Premium" ? "badge-premium" : "badge-basico");
    planoBadge.style.display = "inline-block";
  }
  
  if (navegar) mostrarTela("tela-dashboard");
  
  atualizarDashboardFirebase();
  
  // Garantir que o loading seja removido apenas no final
  document.getElementById("tela-loading").style.display = "none";
  console.log("Dashboard carregado completamente - loading removido");
}

// ============================================================
// DASHBOARD — CONTABILIZAÇÃO FIREBASE
// ============================================================

// FASE 12.13: Funções globais de conversão para evitar hoisting issues
function converterParaNumeroRobusto(val) {
  if (typeof val === 'number') return val;
  const str = String(val || "0");
  // Remove separadores de milhar e converte vírgula para ponto
  const limpo = str.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

function converterParaNumero(val) {
  if (typeof val === 'number') return val;
  const num = parseFloat(String(val || "0").replace(/[.,]/g, (match) => match === ',' ? '.' : ''));
  return isNaN(num) ? 0 : num;
}

async function atualizarDashboardFirebase(mesSelecionado = null) {
  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  if (!uid) return;

  try {
    const hoje = dataHoje();
    // Usa o mês selecionado ou o mês atual como padrão
    const mesStr = mesSelecionado || mesAtual();
    const [ano, mes] = mesStr.split("-");
    const dataIni = `${ano}-${mes}-01`;
    const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
    const dataFim = `${ano}-${mes}-${String(ultimoDia).padStart(2, "0")}`;

    const vendasRef = window.firebaseCollection(window.firebaseDb, "lojas", uid, "vendas");
    const q = window.firebaseQuery(
      vendasRef,
      window.firebaseWhere("data", ">=", dataIni),
      window.firebaseWhere("data", "<=", dataFim)
    );
    const snapshot = await window.firebaseGetDocs(q);
    const vendas = snapshot.docs.map(d => d.data());

    // FASE 12.12: Query dedicada para buscar pendentes globais (todos os meses)
    let totalPendentesGlobais = 0;
    try {
      const qPendentes = window.firebaseQuery(
        vendasRef,
        window.firebaseWhere("formaPag", "==", "pendente")
      );
      const snapshotPendentes = await window.firebaseGetDocs(qPendentes);
      const vendasPendentes = snapshotPendentes.docs.map(d => d.data());
      
      vendasPendentes.forEach(v => {
        const val = converterParaNumeroRobusto(v.total || v.valorTotal || 0);
        totalPendentesGlobais += val;
      });
      
      console.log("[PENDENTES GLOBAIS] Total a receber (todos os meses):", totalPendentesGlobais);
    } catch (err) {
      console.warn("[PENDENTES GLOBAIS] Erro ao buscar pendentes globais:", err);
    }


    // Agrupa vendas por dia para lógica precisa
    const vendasPorDia = {};
    let totalFiados = 0;
    let totalLucroLiquido = 0; // FASE 11.12: Lucro Líquido acumulado

    vendas.forEach(v => {
      // FASE 12.7: Usa conversão robusta para valores
      const val = converterParaNumeroRobusto(v.total || v.valorTotal || 0);
      const dataVenda = String(v.data || v.dataISO || "").substring(0, 10);
      // FASE 12.7: Normaliza formaPag para lowercase antes de comparar
      const formaPagNormalizado = String(v.formaPag || v.status || "pago").trim().toLowerCase();
      const isPendente = formaPagNormalizado === "pendente";
      const isInd = (v.modo || "individual") === "individual";

      if (!vendasPorDia[dataVenda]) {
        vendasPorDia[dataVenda] = { individuais: 0, fechamentos: 0, fiados: 0 };
      }

      if (isInd) {
        vendasPorDia[dataVenda].individuais += val;
      } else {
        vendasPorDia[dataVenda].fechamentos += val;
      }

      if (isPendente) {
        vendasPorDia[dataVenda].fiados += val;
        totalFiados += val;
      }
      
      // FASE 11.12: Acumular lucro líquido (se disponível no documento)
      const lucroLiquido = converterFloat(v.lucroLiquido || 0);
      if (lucroLiquido > 0) {
        totalLucroLiquido += lucroLiquido;
      }
    });

    // Aplica lógica ultra-precisa por dia
    const estilo = configuracoesGlobais.estiloVendas || "individual";
    console.log("Vendas por dia:", vendasPorDia);
    console.log("Estilo de vendas:", estilo);
    
    let displayHoje = 0;
    let displayMes = 0;

    if (estilo === "individual") {
      // Individual: ignora COMPLETAMENTE fechamentos
      console.log("Modo INDIVIDUAL - ignorando fechamentos");
      Object.keys(vendasPorDia).forEach(data => {
        displayMes += vendasPorDia[data].individuais;
        if (data === hoje) displayHoje += vendasPorDia[data].individuais;
      });
    } else if (estilo === "fechamento") {
      // Fechamento: ignora COMPLETAMENTE individuais
      console.log("Modo FECHAMENTO - ignorando individuais");
      Object.keys(vendasPorDia).forEach(data => {
        displayMes += vendasPorDia[data].fechamentos;
        if (data === hoje) displayHoje += vendasPorDia[data].fechamentos;
      });
    } else {
      // Ambos: LÓGICA POR DIA - se tem fechamento no dia, ignora individuais daquele dia
      console.log("Modo AMBOS - lógica por dia");
      Object.keys(vendasPorDia).forEach(data => {
        const dia = vendasPorDia[data];
        const valorDia = dia.fechamentos > 0 ? dia.fechamentos : dia.individuais;
        console.log(`Dia ${data}: individuais=${dia.individuais}, fechamentos=${dia.fechamentos}, usando=${valorDia}`);
        
        displayMes += valorDia;
        if (data === hoje) displayHoje += valorDia;
      });
    }

    console.log("Valores finais - Hoje:", displayHoje, "Mês:", displayMes);

    // Injeta os valores corrigidos nos cards principais
    const s = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };

    s("receita-hoje", formatarBRL(displayHoje));
    s("receita-mes", formatarBRL(displayMes));
    // FASE 12.12: Usar pendentes globais (todos os meses) em vez de apenas mês atual
    s("fiados-mes", formatarBRL(totalPendentesGlobais));
    // FASE 11.12: Mostrar Lucro Líquido no Dashboard
    s("rel-lucro", formatarBRL(totalLucroLiquido));

    // Calcula subtotais para detalhes
    let hojeIndividuais = 0;
    let hojeFechamentos = 0;
    let mesIndividuais = 0;
    let mesFechamentos = 0;

    Object.keys(vendasPorDia).forEach(data => {
      const dia = vendasPorDia[data];
      mesIndividuais += dia.individuais;
      mesFechamentos += dia.fechamentos;
      
      if (data === hoje) {
        hojeIndividuais = dia.individuais;
        hojeFechamentos = dia.fechamentos;
      }
    });

    // Injeta detalhes no Dashboard
    s("hoje-detalhe", `Vendas: ${formatarBRL(hojeIndividuais)} | Fechamento: ${formatarBRL(hojeFechamentos)}`);
    s("mes-detalhe", `Individuais: ${formatarBRL(mesIndividuais)} | Fechamentos: ${formatarBRL(mesFechamentos)}`);

    // Mantém os cards menores para conferência detalhada (agora ocultos no HTML)
    const totalIndividuais = Object.values(vendasPorDia).reduce((sum, dia) => sum + dia.individuais, 0);
    const totalFechamentos = Object.values(vendasPorDia).reduce((sum, dia) => sum + dia.fechamentos, 0);

    const siEl = document.getElementById("card-vendas-ind");
    const sfEl = document.getElementById("card-fechamentos");
    
    // Lógica de exibição conforme modo de vendas (mantida para compatibilidade)
    if (estilo === "individual") {
      // Modo Individual: esconde card de fechamentos
      if (siEl) siEl.style.display = totalIndividuais > 0 ? "flex" : "none";
      if (sfEl) sfEl.style.display = "none";
    } else if (estilo === "fechamento") {
      // Modo Fechamento: esconde card de individuais
      if (siEl) siEl.style.display = "none";
      if (sfEl) sfEl.style.display = totalFechamentos > 0 ? "flex" : "none";
    } else {
      // Modo Ambos: mostra ambos os cards
      if (siEl) siEl.style.display = totalIndividuais > 0 ? "flex" : "none";
      if (sfEl) sfEl.style.display = totalFechamentos > 0 ? "flex" : "none";
    }

    s("receita-individual-mes", formatarBRL(totalIndividuais));
    s("receita-fechamento-mes", formatarBRL(totalFechamentos));

    // Barra de meta baseada no valor corrigido
    const meta = converterFloat(configuracoesGlobais.metaMensal || 0);
    const bC = document.getElementById("barra-meta-container");
    if (bC && meta > 0) {
      const pct = Math.min(Math.round((displayMes / meta) * 100), 100);
      bC.style.display = "block";
      const b = document.getElementById("barra-meta-progresso");
      if (b) b.style.width = pct + "%";
      const pe = document.getElementById("meta-percentual"); if (pe) pe.innerText = pct + "%";
      const mv = document.getElementById("meta-valor"); if (mv) mv.innerText = formatarBRL(meta);
    }
  } catch (err) {
    console.warn("Erro ao atualizar dashboard:", err);
  }
}

// Item 3 + Item 1: atualiza nome do operador no header (suporta novo e antigo ID)
function atualizarHeaderOperador() {
  const nome = localStorage.getItem("nomeOperador") || "Operador";
  const el1 = document.getElementById("header-operador-nome");  // ID antigo
  const el2 = document.getElementById("dash-nome-operador");     // ID novo (Item 1)
  if (el1) el1.innerText = nome;
  if (el2) el2.innerText = nome; // Nome completo no header
}

// Item 3: modal/seletor de operador (para dono e sócios)
function abrirSeletorOperador() {
  if (sessaoIsMembro) { mostrarToast("Você entrou como: " + (localStorage.getItem("nomeOperador") || ""), "aviso"); return; }
  const atual = localStorage.getItem("nomeOperador") || "";
  const novo = prompt("Quem está operando o caixa agora?\n(Deixe em branco para cancelar)", atual);
  if (novo === null) return; // cancelou
  const nome = novo.trim() || atual;
  if (nome) { localStorage.setItem("nomeOperador", nome); atualizarHeaderOperador(); mostrarToast("✅ Operador: " + nome, "sucesso"); }
}

async function carregarDashboard() {
  if (telaAtual === "tela-dashboard") {
    // Preencher o seletor de mês se estiver vazio
    preencherSeletorMesDashboard();
    // Pegar o mês selecionado ou usar o atual
    const mesSelecionado = document.getElementById("dash-mes-seletor")?.value || mesAtual();
    await atualizarDashboardFirebase(mesSelecionado);
  }
}

function voltarDashboard() {
  mostrarTela("tela-dashboard");
  carregarDashboard();
  if (localStorage.getItem("modoReadOnly") === "true") {
    desabilitarBotoesEscrita();
  }
}

// ============================================================
// SELETOR DE MÊS NO DASHBOARD - NAVEGAÇÃO POR SETAS
// ============================================================

// Mês atual sendo visualizado (null = mês atual)
let _mesDashboardAtual = null;

// Navegar para mês anterior/próximo (delta = -1 ou +1)
function navegarMes(delta) {
  const hoje = new Date();
  let ano, mes;
  
  if (_mesDashboardAtual) {
    [ano, mes] = _mesDashboardAtual.split("-").map(Number);
  } else {
    ano = hoje.getFullYear();
    mes = hoje.getMonth() + 1;
  }
  
  // Calcular novo mês
  let novoMes = mes + delta;
  let novoAno = ano;
  
  if (novoMes > 12) {
    novoMes = 1;
    novoAno++;
  } else if (novoMes < 1) {
    novoMes = 12;
    novoAno--;
  }
  
  _mesDashboardAtual = `${novoAno}-${String(novoMes).padStart(2, "0")}`;
  
  // Atualizar display e dados
  _atualizarDisplayMes();
  atualizarDashboardFirebase(_mesDashboardAtual);
}

// Voltar para o mês atual
function voltarMesAtual() {
  _mesDashboardAtual = null;
  _atualizarDisplayMes();
  atualizarDashboardFirebase(null);
}

// Atualizar o texto do mês no display
function _atualizarDisplayMes() {
  const display = document.getElementById("dash-mes-display");
  const btnHoje = document.getElementById("btn-hoje-mes");
  if (!display) return;
  
  const hoje = new Date();
  let ano, mes;
  
  if (_mesDashboardAtual) {
    [ano, mes] = _mesDashboardAtual.split("-").map(Number);
  } else {
    ano = hoje.getFullYear();
    mes = hoje.getMonth() + 1;
  }
  
  const data = new Date(ano, mes - 1, 1);
  const nomeMes = data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  display.textContent = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
  
  // Mostrar botão "Hoje" se não estiver no mês atual
  const mesAtualStr = mesAtual();
  const estaNoMesAtual = _mesDashboardAtual === null || _mesDashboardAtual === mesAtualStr;
  if (btnHoje) {
    btnHoje.style.display = estaNoMesAtual ? "none" : "inline-block";
  }
}

// Chamado quando carrega o dashboard
function preencherSeletorMesDashboard() {
  // Apenas atualiza o display inicial
  _atualizarDisplayMes();
}

// ============================================================
// MODO DUPLO DE VENDAS
// ============================================================
function alternarModoVenda(modo) {
  modoVendaAtual = modo;
  const vendaModoEl = document.getElementById("venda-modo");
  if (vendaModoEl) vendaModoEl.value = modo;
  
  const btnInd = document.getElementById("btn-modo-individual");
  if (btnInd) btnInd.className = "modo-btn" + (modo === "individual" ? " active" : "");
  
  const btnFech = document.getElementById("btn-modo-fechamento");
  if (btnFech) btnFech.className = "modo-btn" + (modo === "fechamento" ? " active" : "");
  
  const camposInd = document.getElementById("campos-individual");
  if (camposInd) camposInd.style.display = modo === "individual" ? "block" : "none";
  
  const camposFech = document.getElementById("campos-fechamento");
  if (camposFech) camposFech.style.display = modo === "fechamento" ? "block" : "none";
  
  const desc = document.getElementById("descricao-modo");
  if (desc) {
    desc.innerText = modo === "individual"
      ? "Lance cada venda separada. Ideal para e-commerce, serviços e lojas que atendem um cliente por vez."
      : "Feche os totais do período. Ideal para feirantes, food trucks e lojas que somam o caixa ao fim do dia.";
  }
  
  const titulo = document.getElementById("titulo-form-venda");
  if (titulo && titulo.innerText !== "Editar Lançamento") {
    // Usar terminologia InterpretePro para perfil servicos
    if (perfilNegocioAtual === "servicos") {
      titulo.innerText = "Lançamento de Serviços";
    } else {
      titulo.innerText = modo === "individual" ? "Lançar Venda" : "Fechamento do Dia";
    }
  }
}

function abrirLancarVendas(linha = "", dados = null) {
  resetarBotao("btn-salvar-venda", "💾 Salvar Lançamento");
  document.getElementById("form-venda").reset();
  document.getElementById("venda-docId-edicao").value = linha;
  
  // Definir data de hoje
  const hoje = dataHoje();
  document.getElementById("vd-data").value = hoje;
  
  // Sincronizar data no campo do perfil servicos (se existir)
  const dataServico = document.getElementById("vd-data-servico");
  if (dataServico) dataServico.value = hoje;
  
  // Reset da quantidade
  const qtdEl = document.getElementById("vd-quantidade");
  if (qtdEl) qtdEl.value = "1";
  
  // Carregar produtos para autocomplete se ainda não foram carregados
  if (produtosGlobal.length === 0) {
    buscarProdutos().then(() => preencherAutocompleteProdutos());
  } else {
    preencherAutocompleteProdutos();
  }
  
  // Verificação de existência do elemento antes de acessar
  const totalPreviewEl = document.getElementById("vd-total-preview");
  if (totalPreviewEl) totalPreviewEl.innerText = "R$ 0,00";
  
  // Força modo individual e oculta toggle permanentemente
  const toggleEl = document.getElementById("modo-toggle-wrapper");
  if (toggleEl) toggleEl.style.display = "none";
  modoVendaAtual = 'individual';
  
  // Travas de funcionamento por perfil
  const abaVendaIndividual = document.getElementById("aba-venda-individual");
  const abaFechamento = document.getElementById("aba-fechamento");
  const radioServico = document.querySelector('input[name="tipo-item"][value="servico"]');
  const radioProduto = document.querySelector('input[name="tipo-item"][value="produto"]');
  const blocoTipoLancamento = document.getElementById("bloco-tipo-lancamento");
  
  // FASE 11.8: Garantir que bloco-tipo-lancamento NUNCA apareça para perfis lojistas
  if (blocoTipoLancamento && !perfilNegocioAtual?.includes('servicos')) {
    blocoTipoLancamento.style.display = "none";
    console.log('[PERFIL] Bloco tipo lançamento ocultado para:', perfilNegocioAtual);
  }
  
  // Resetar tipo de lançamento para 'Produto' (padrão)
  if (radioProduto) radioProduto.checked = true;
  alternarTipoItemVenda();
  
  if (perfilNegocioAtual === "varejo-rapido") {
    // Forçar apenas aba de Fechamento de Caixa
    if (abaVendaIndividual) abaVendaIndividual.style.display = "none";
    if (abaFechamento) abaFechamento.style.display = "block";
    if (blocoTipoLancamento) blocoTipoLancamento.style.display = "none";
    modoVendaAtual = 'fechamento';
    alternarModoVenda('fechamento');
  } else if (perfilNegocioAtual === "varejo-padrao") {
    // Plano padrão: apenas vendas de balcão (Produto), sem serviços
    if (abaVendaIndividual) abaVendaIndividual.style.display = "block";
    if (abaFechamento) abaFechamento.style.display = "block";
    if (blocoTipoLancamento) blocoTipoLancamento.style.display = "none";
    // FASE 11.9: Garantir que bloco-venda-produto seja exibido
    const blocoVendaProduto = document.getElementById("bloco-venda-produto");
    if (blocoVendaProduto) blocoVendaProduto.style.display = "block";
    // Garantir que campos de valor unitário/total sejam exibidos
    const inputValorIndividual = document.getElementById("vd-valor-individual");
    if (inputValorIndividual) inputValorIndividual.parentElement.style.display = "block";
    const inputValorTotal = document.getElementById("vd-valor");
    if (inputValorTotal) inputValorTotal.parentElement.style.display = "block";
    // Garantir que status/forma de pagamento sejam exibidos
    const containerFormaPagamento = document.getElementById("container-forma-pagamento-varejo");
    if (containerFormaPagamento) containerFormaPagamento.style.display = "block";
    modoVendaAtual = 'individual';
    alternarModoVenda('individual');
    
    // Esconder opção de Serviço e forçar Produto
    if (radioServico) {
      radioServico.disabled = true;
      radioServico.checked = false;
      // Esconder o radio button e label se existirem
      const servicoLabel = document.querySelector('label[for="tipo-servico"]') || 
                           radioServico.parentElement;
      if (servicoLabel) servicoLabel.style.display = "none";
    }
    if (radioProduto) {
      radioProduto.disabled = false;
      radioProduto.checked = true;
      // Garantir que o radio de produto esteja visível
      const produtoLabel = document.querySelector('label[for="tipo-produto"]') || 
                          radioProduto.parentElement;
      if (produtoLabel) produtoLabel.style.display = "block";
    }
    alternarTipoItemVenda();
    console.log("Modo Padrão: Apenas vendas de produtos (sem serviços)");
  } else if (perfilNegocioAtual === "varejo-premium") {
    // Forçar Venda Individual com baixa de estoque
    if (abaVendaIndividual) abaVendaIndividual.style.display = "block";
    if (abaFechamento) abaFechamento.style.display = "block";
    if (blocoTipoLancamento) blocoTipoLancamento.style.display = "none";
    modoVendaAtual = 'individual';
    alternarModoVenda('individual');
    
    // Garantir que ambas opções (Produto/Serviço) estejam disponíveis no Premium
    if (radioServico) {
      radioServico.disabled = false;
      const servicoLabel = document.querySelector('label[for="tipo-servico"]') || 
                           radioServico.parentElement;
      if (servicoLabel) servicoLabel.style.display = "block";
    }
    if (radioProduto) {
      radioProduto.disabled = false;
      const produtoLabel = document.querySelector('label[for="tipo-produto"]') || 
                          radioProduto.parentElement;
      if (produtoLabel) produtoLabel.style.display = "block";
    }
    
    // Garantir que estoque será baixado
    console.log("Modo Premium: Baixa de estoque ativa para vendas");
  } else if (perfilNegocioAtual === "servicos") {
    // Perfil Serviços: apenas Venda Individual, esconder Fechamento, forçar Serviço
    if (abaVendaIndividual) abaVendaIndividual.style.display = "block";
    if (abaFechamento) abaFechamento.style.display = "none";
    // FASE 11.9: Esconder blocos de varejo no perfil serviços
    if (blocoTipoLancamento) blocoTipoLancamento.style.display = "none";
    const blocoVendaProduto = document.getElementById("bloco-venda-produto");
    if (blocoVendaProduto) blocoVendaProduto.style.display = "none";
    // FASE 11.10: Limpeza radical - esconder container-valor-total-varejo com !important
    const containerValorTotalVarejo = document.getElementById("container-valor-total-varejo");
    if (containerValorTotalVarejo) containerValorTotalVarejo.style.setProperty("display", "none", "important");
    // Esconder campos de valor unitário/total de varejo
    const inputValorIndividual = document.getElementById("vd-valor-individual");
    if (inputValorIndividual) inputValorIndividual.parentElement.style.display = "none";
    const inputValorTotal = document.getElementById("vd-valor");
    if (inputValorTotal) inputValorTotal.parentElement.style.display = "none";
    modoVendaAtual = 'individual';
    alternarModoVenda('individual');
    
    // Forçar Serviço e desabilitar Produto
    if (radioServico) {
      radioServico.checked = true;
      radioServico.disabled = true;
      const servicoLabel = document.querySelector('label[for="tipo-servico"]') || 
                           radioServico.parentElement;
      if (servicoLabel) servicoLabel.style.display = "block";
    }
    if (radioProduto) {
      radioProduto.checked = false;
      radioProduto.disabled = true;
      const produtoLabel = document.querySelector('label[for="tipo-produto"]') || 
                          radioProduto.parentElement;
      if (produtoLabel) produtoLabel.style.display = "none";
    }
    alternarTipoItemVenda();
    console.log("Modo Serviços: Apenas lançamento de serviços");
    
    // Aplicar modo individual para garantir campos visíveis
    modoVendaAtual = 'individual';
    alternarModoVenda('individual');
  } else {
    // Perfil não reconhecido: mostrar tudo
    if (abaVendaIndividual) abaVendaIndividual.style.display = "block";
    if (abaFechamento) abaFechamento.style.display = "block";
    modoVendaAtual = 'individual';
    alternarModoVenda('individual');
    
    // Habilitar ambas opções
    if (radioServico) {
      radioServico.disabled = false;
      const servicoLabel = document.querySelector('label[for="tipo-servico"]') || 
                           radioServico.parentElement;
      if (servicoLabel) servicoLabel.style.display = "block";
    }
    if (radioProduto) {
      radioProduto.disabled = false;
      const produtoLabel = document.querySelector('label[for="tipo-produto"]') || 
                          radioProduto.parentElement;
      if (produtoLabel) produtoLabel.style.display = "block";
    }
  }
  
  if (linha && dados) {
    const tituloEl = document.getElementById("titulo-form-venda");
    if (tituloEl) tituloEl.innerText = "Editar Lançamento";
    const vendaModoEl = document.getElementById("venda-modo");
    if (vendaModoEl) vendaModoEl.value = "individual";
    // Item 2: garante que a data (pode vir como Date object) seja string ISO
    const dataVal = dados.dataISO ? String(dados.dataISO).substring(0, 10) : dataHoje();
    document.getElementById("vd-data").value = dataVal;

    // Status de recebimento (Pago/Pendente) via coluna FormaPag (coluna 14)
    const stSel = document.getElementById("v-status");
    if (stSel) {
      const st = String(dados.formaPag || "").trim();
      stSel.value = st === "Pendente" ? "Pendente" : "Pago";
    }

    // Item 2: total pode ser número — converte para moeda formatada
    // Usar valorUnitario se existir, senão usar total ou valor
    const valorNum = converterFloat(dados.valorUnitario || (dados.quantidade && dados.quantidade > 1 ? dados.total / dados.quantidade : dados.total || dados.valor || 0));
    if (valorNum) document.getElementById("vd-valor-individual").value = valorNum.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (dados.cliente) document.getElementById("vd-cliente").value = dados.cliente;
    if (dados.descricao) document.getElementById("vd-descricao").value = dados.descricao;
    if (dados.obs) document.getElementById("vd-obs").value = dados.obs;
    
    // Preencher campos específicos de serviço (perfil servicos)
    if (perfilNegocioAtual === 'servicos') {
      console.log("[EDITAR SERVICO] Preenchendo campos de serviço:", dados);
      
      // Descrição do serviço
      const descServico = document.getElementById("vd-descricao-servico");
      if (descServico && dados.descricao) descServico.value = dados.descricao;
      
      // Executante
      const execServico = document.getElementById("vd-executante");
      if (execServico && dados.executante) execServico.value = dados.executante;
      
      // Cliente/Empresa Final
      const cliFinal = document.getElementById("vd-cliente-final");
      if (cliFinal && dados.cliente) cliFinal.value = dados.cliente;
      
      // Data do serviço
      const dataServInput = document.getElementById("vd-data-servico");
      if (dataServInput && dados.dataServico) {
        dataServInput.value = String(dados.dataServico).substring(0, 10);
      } else if (dataServInput && dados.dataISO) {
        dataServInput.value = String(dados.dataISO).substring(0, 10);
      }
      
      // Tipo de contratação
      if (dados.tipoContratacao) {
        const radioParticular = document.querySelector('input[name="tipo-contratacao"][value="particular"]');
        const radioAgencia = document.querySelector('input[name="tipo-contratacao"][value="agencia"]');
        if (dados.tipoContratacao === "agencia" && radioAgencia) {
          radioAgencia.checked = true;
          // Mostrar campo de agência
          const containerAgencia = document.getElementById("container-agencia");
          if (containerAgencia) containerAgencia.style.display = "block";
          // Preencher nome da agência
          const nomeAgenciaInput = document.getElementById("vd-nome-agencia");
          if (nomeAgenciaInput && dados.nomeAgencia) {
            nomeAgenciaInput.value = dados.nomeAgencia;
            // Trigger para preencher valor da agência
            onAgenciaChange();
          }
        } else if (radioParticular) {
          radioParticular.checked = true;
          // Esconder campo de agência
          const containerAgencia = document.getElementById("container-agencia");
          if (containerAgencia) containerAgencia.style.display = "none";
        }
        // Atualizar visibilidade
        onTipoContratacaoChange();
      }
      
      // Modelo de cobrança
      if (dados.modeloCobranca) {
        const radioPorHora = document.querySelector('input[name="modelo-cobranca"][value="por-hora"]');
        const radioValorFixo = document.querySelector('input[name="modelo-cobranca"][value="valor-fixo"]');
        if (dados.modeloCobranca === "valor-fixo" && radioValorFixo) {
          radioValorFixo.checked = true;
        } else if (radioPorHora) {
          radioPorHora.checked = true;
        }
        // Atualizar visibilidade dos campos
        onModeloCobrancaChange();
      }
      
      // Horários (se por hora)
      if (dados.horarioInicio) {
        const horaInicio = document.getElementById("vd-horario-inicio");
        if (horaInicio) horaInicio.value = dados.horarioInicio;
      }
      if (dados.horarioFim) {
        const horaFim = document.getElementById("vd-horario-fim");
        if (horaFim) horaFim.value = dados.horarioFim;
      }
      
      // Valor/Hora
      const valorHora = document.getElementById("vd-valor-hora");
      if (valorHora && (dados.valor || dados.total)) {
        const val = converterFloat(dados.valor || dados.total || 0);
        // Se for por hora, calcular valor/hora dividindo pelas horas
        if (dados.modeloCobranca === "por-hora" && dados.horasTrabalhadas) {
          const horas = parseFloat(dados.horasTrabalhadas) || 1;
          const valorPorHora = val / horas;
          valorHora.value = valorPorHora.toFixed(2).replace('.', ',');
        } else {
          valorHora.value = val.toFixed(2).replace('.', ',');
        }
      }
      
      // Custo/Gasto
      const custo = document.getElementById("vd-custo-associado");
      // Custo não está salvo nos dados, mas podemos calcular se tivermos subtotal
      
      // Status de recebimento
      const statusServico = document.getElementById("v-status-servico");
      if (statusServico && dados.formaPag) {
        statusServico.value = dados.formaPag === "Pendente" ? "Pendente" : "Pago";
        onStatusServicoChange(); // Atualizar visibilidade da forma de pagamento
      }
      
      // Forma de pagamento
      if (dados.formaPag === "Pago") {
        const metodoPag = dados.dinheiro > 0 ? "dinheiro" : 
                         dados.pix > 0 ? "pix" : 
                         dados.debito > 0 ? "debito" : 
                         dados.credito > 0 ? "credito" : "dinheiro";
        const radioPag = document.querySelector(`input[name="forma-pag-servico"][value="${metodoPag}"]`);
        if (radioPag) radioPag.checked = true;
      }
      
      // Observações
      const obsServico = document.getElementById("vd-obs-servico");
      if (obsServico && dados.obs) obsServico.value = dados.obs;
      
      // Recalcular subtotal
      setTimeout(() => {
        if (typeof calcularSubtotalServico === 'function') {
          calcularSubtotalServico();
        }
      }, 100);
      
      console.log("[EDITAR SERVICO] Campos preenchidos");
    }
  } else {
    document.getElementById("titulo-form-venda").innerText = "Lançar Venda";
  }
  
  // ============================================================
  // INICIALIZAÇÃO FINAL PARA PERFIL SERVIÇOS (InterpretePro)
  // Deve ser a ÚLTIMA coisa executada na função
  // ============================================================
  if (perfilNegocioAtual === 'servicos') {
    console.log("[SERVICOS] Aplicando configurações finais do perfil...");
    
    const tituloVenda = document.getElementById('titulo-form-venda');
    if (tituloVenda) {
      tituloVenda.innerText = 'Lançamento de Serviços';
      console.log("[SERVICOS] Título definido:", tituloVenda.innerText);
    }
    
    // Garantir que o botão voltar esteja visível e funcional
    const btnVoltar = document.querySelector('.btn-voltar-topo');
    if (btnVoltar) {
      btnVoltar.style.display = 'flex';
      btnVoltar.onclick = voltarDashboard;
    }
    
    // Forçar a exibição do bloco de serviços e esconder o de produtos
    const bProd = document.getElementById('bloco-venda-produto');
    const bServ = document.getElementById('bloco-venda-servico');
    if (bProd) bProd.style.display = 'none';
    if (bServ) {
      bServ.style.display = 'block';
      bServ.classList.remove('esconder-elemento');
      console.log("[SERVICOS] Bloco servico exibido");
    }
    
    // Garantir que campos-individual esteja visível (bloco servico está dentro dele)
    const camposInd = document.getElementById('campos-individual');
    if (camposInd) camposInd.style.display = 'block';
    
    // Esconder elementos de varejo específicos (esconder elementos individuais, não pais)
    const campoValor = document.getElementById('vd-valor-individual');
    if (campoValor) {
      campoValor.style.display = 'none'; // Esconder input
      const labelValor = campoValor.previousElementSibling;
      if (labelValor && labelValor.tagName === 'LABEL') labelValor.style.display = 'none';
    }
    
    const campoCliente = document.getElementById('vd-cliente');
    if (campoCliente) {
      campoCliente.style.display = 'none'; // Esconder input
      const labelCliente = campoCliente.previousElementSibling;
      if (labelCliente && labelCliente.tagName === 'LABEL') labelCliente.style.display = 'none';
    }
    
    // Para quantidade: esconder o grid container que tem produto + qtd
    const blocoProduto = document.getElementById('bloco-venda-produto');
    if (blocoProduto) blocoProduto.style.display = 'none';
    
    // Esconder seletor de tipo de lançamento (container específico)
    const tipoItemContainer = document.querySelector('div[style*="margin-bottom:12px;"]');
    if (tipoItemContainer) tipoItemContainer.style.display = 'none';
    
    // Esconder forma de pagamento original (usamos a do servico)
    const pagOriginal = document.querySelector('.pagamento-grid');
    if (pagOriginal) pagOriginal.style.display = 'none';
    // Também esconder o label "Forma de Pagamento:" anterior
    if (pagOriginal) {
      const labelPag = pagOriginal.previousElementSibling;
      if (labelPag && labelPag.tagName === 'LABEL') labelPag.style.display = 'none';
    }
    
    // Alterar texto do botão salvar
    const btnSalvar = document.getElementById('btn-salvar-venda');
    if (btnSalvar) btnSalvar.innerText = '💾 Salvar Atendimento';
    
    // Garantir que campos de varejo estejam escondidos (esconder elementos, não pais)
    const statusOriginal = document.getElementById('v-status');
    if (statusOriginal) {
      statusOriginal.style.display = 'none';
      const labelStatus = statusOriginal.previousElementSibling;
      if (labelStatus && labelStatus.tagName === 'LABEL') labelStatus.style.display = 'none';
    }
    
    const obsOriginal = document.getElementById('vd-obs');
    if (obsOriginal) {
      obsOriginal.style.display = 'none';
      const labelObs = obsOriginal.previousElementSibling;
      if (labelObs && labelObs.tagName === 'LABEL') labelObs.style.display = 'none';
    }
    
    // Esconder a data original (vd-data) - tem label anterior
    const dataOriginal = document.getElementById('vd-data');
    if (dataOriginal) {
      dataOriginal.style.display = 'none';
      const labelData = dataOriginal.previousElementSibling;
      if (labelData && labelData.tagName === 'LABEL') labelData.style.display = 'none';
    }
    
    // Configurar header para perfil servicos (título específico, botão voltar visível)
    const headerOriginal = document.querySelector('.header-tela');
    if (headerOriginal) {
      const btnVoltar = headerOriginal.querySelector('.btn-voltar-topo');
      const tituloOriginal = headerOriginal.querySelector('#titulo-form-venda');
      // Mostrar botão voltar e garantir que chame voltarDashboard
      if (btnVoltar) {
        btnVoltar.style.display = 'flex';
        btnVoltar.onclick = voltarDashboard;
      }
      // Atualizar título se ainda não foi definido
      if (tituloOriginal && tituloOriginal.innerText !== 'Lançamento de Serviços') {
        tituloOriginal.innerText = 'Lançamento de Serviços';
      }
    }
    
    // Disparar funções de inicialização após DOM atualizar
    setTimeout(() => {
      // Configurar visibilidade inicial dos campos condicionais
      if (typeof alternarTipoContratacao === 'function') {
        alternarTipoContratacao();
        console.log("[SERVICOS] Tipo contratação configurado");
      }
      if (typeof alternarModeloCobranca === 'function') {
        alternarModeloCobranca();
        console.log("[SERVICOS] Modelo cobrança configurado");
      }
      if (typeof calcularSubtotalServico === 'function') {
        calcularSubtotalServico();
        console.log("[SERVICOS] Cálculo de subtotal disparado");
      }
    }, 100);
    
    console.log("[SERVICOS] Configurações finais aplicadas com sucesso");
    
    // Inicializar visibilidade da forma de pagamento baseado no status
    onStatusServicoChange();
    
    // Carregar sugestões dos datalists do Hub de Gestão
    carregarSugestoesFormularioServicos();
  }
  // ============================================================
  
  if (clientesGlobal.length === 0) carregarClientes();
  preencherAutocompleteClientes();
  
  // Para perfil servicos, garantir que datalists estejam populados
  if (perfilNegocioAtual === 'servicos' && typeof popularDatalistsServicos === 'function') {
    if (historicoGlobal.length > 0) {
      // Já temos histórico carregado, popular imediatamente
      popularDatalistsServicos(historicoGlobal);
    } else {
      // Histórico vazio (F5 ou primeiro acesso), carregar do Firebase
      carregarHistoricoParaDatalists();
    }
  }
  
  // Para perfil varejo, carregar sugestões do Hub (Produtos e Clientes)
  if (perfilNegocioAtual !== 'servicos' && typeof carregarSugestoesFormularioVarejo === 'function') {
    carregarSugestoesFormularioVarejo();
  }
  
  // Inicializar estado do formulário de pagamento para varejo
  if (perfilNegocioAtual !== 'servicos' && typeof onStatusVarejoChange === 'function') {
    onStatusVarejoChange();
  }
  
  mostrarTela("tela-lancar-vendas");
}

/**
 * Carrega histórico do Firebase especificamente para popular datalists do perfil servicos
 * Usado quando historicoGlobal está vazio (após F5 ou primeiro acesso)
 */
async function carregarHistoricoParaDatalists() {
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) return;
    
    console.log("[DATALISTS] Carregando histórico para popular datalists...");
    
    // Buscar vendas do tipo servico (sem orderBy para evitar necessidade de índice)
    // Ordenação será feita no JavaScript após carregar
    const q = window.firebaseQuery(
      window.firebaseCollection(window.firebaseDb, "lojas", uid, "vendas"),
      window.firebaseWhere("tipo", "==", "servico")
    );
    
    const snapshot = await window.firebaseGetDocs(q);
    
    // Ordenar no JavaScript (mais recente primeiro) e limitar a 100
    const vendasServico = snapshot.docs
      .map(docSnap => ({ ...docSnap.data(), docId: docSnap.id }))
      .sort((a, b) => (b.dataISO || b.data || "").localeCompare(a.dataISO || a.data || ""))
      .slice(0, 100);
    
    if (vendasServico.length > 0) {
      // Atualizar historicoGlobal parcialmente (apenas servicos)
      historicoGlobal = [...historicoGlobal, ...vendasServico];
      
      // Popular datalists
      popularDatalistsServicos(vendasServico);
      console.log(`[DATALISTS] Carregados ${vendasServico.length} serviços do Firebase`);
      
      // Feedback visual apenas na primeira carga (não recarregar sempre)
      const totalSugestoes = vendasServico.length;
      if (totalSugestoes > 0) {
        setTimeout(() => {
          mostrarToast(`📋 ${totalSugestoes} sugestões carregadas do histórico`, 'info');
        }, 800);
      }
    } else {
      console.log("[DATALISTS] Nenhum serviço encontrado no histórico");
    }
  } catch (err) {
    console.error("[DATALISTS] Erro ao carregar histórico:", err);
    // Não bloqueia o fluxo, apenas loga o erro
  }
}

// Abre modal para fechar caixa do dia
function abrirFecharCaixa(docId = "", dados = null) {
  // VERIFICAÇÃO DE PLANO: Fechamento de caixa disponível apenas no Premium
  if (!verificarAcessoFuncionalidade("fechamento")) {
    mostrarToastUpgrade("fechamento");
    return;
  }
  
  mostrarTela("tela-fechar-caixa");
  document.getElementById("fechamento-docId-edicao").value = docId;
  document.getElementById("fc-data").value = dados?.data || dataHoje();
  document.getElementById("fc-periodo").value = dados?.periodo || "";
  document.getElementById("fc-dinheiro").value = dados?.dinheiro || "";
  document.getElementById("fc-pix").value = dados?.pix || "";
  document.getElementById("fc-debito").value = dados?.debito || "";
  document.getElementById("fc-credito").value = dados?.credito || "";
  document.getElementById("fc-observacoes").value = dados?.observacoes || "";
}

// Listener para mudança de período no fechamento
function onPeriodoFechamentoChange() {
  const periodo = document.getElementById("fc-periodo").value;
  const horarioInicio = document.getElementById("fc-horario-inicio");
  const horarioFim = document.getElementById("fc-horario-fim");
  const container = document.getElementById("fc-periodo-horarios-container");
  
  if (periodo === "Personalizado") {
    horarioInicio.style.display = "block";
    horarioFim.style.display = "block";
    container.classList.add("has-horarios");
  } else {
    horarioInicio.style.display = "none";
    horarioFim.style.display = "none";
    container.classList.remove("has-horarios");
    // Limpa os campos de horário quando não for personalizado
    horarioInicio.value = "";
    horarioFim.value = "";
  }
}

// Salva fechamento de caixa do dia
async function salvarFechamentoCaixa(event) {
  event.preventDefault();
  const btn = document.getElementById("btn-salvar-fechamento");
  const orig = btn.innerText;
  btn.disabled = true; btn.innerText = "⏳..."; btn.style.opacity = ".7";

  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) { mostrarToast("⚠️ Sessão expirada.", "erro"); return; }

    const docId = document.getElementById("fechamento-docId-edicao").value;
    const dados = {
      data: document.getElementById("fc-data").value,
      periodo: document.getElementById("fc-periodo").value || "Dia Inteiro",
      dinheiro: document.getElementById("fc-dinheiro").value || "0",
      pix: document.getElementById("fc-pix").value || "0",
      debito: document.getElementById("fc-debito").value || "0",
      credito: document.getElementById("fc-credito").value || "0",
      observacoes: document.getElementById("fc-observacoes").value.trim(),
      modo: "fechamento",
      dataISO: document.getElementById("fc-data").value,
      registradoPor: localStorage.getItem("user_email"),
      nomeOperador: localStorage.getItem("nomeOperador") || "Vendedor"
    };

    // Calcula total
    const total = converterFloat(dados.dinheiro) + converterFloat(dados.pix) + 
                  converterFloat(dados.debito) + converterFloat(dados.credito);
    dados.total = String(total);

    if (docId) {
      // Editar fechamento existente
      await window.firebaseSetDoc(
        window.firebaseDoc(window.firebaseDb, "lojas", uid, "vendas", docId),
        dados,
        { merge: true }
      );
      mostrarToast("✅ Fechamento atualizado!", "sucesso");
    } else {
      // Novo fechamento
      await window.firebaseAddDoc(
        window.firebaseCollection(window.firebaseDb, "lojas", uid, "vendas"),
        dados
      );
      mostrarToast("✅ Fechamento salvo!", "sucesso");
    }

    voltarDashboard();
    atualizarDashboardFirebase();
  } catch (err) {
    console.error("Erro ao salvar fechamento:", err);
    mostrarToast("❌ Erro ao salvar fechamento.", "erro");
  } finally {
    resetarBotao("btn-salvar", orig);
  }
}

async function verificarMisturaModos() {
  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  if (!uid) return;
  try {
    const hoje = dataHoje();
    const q = window.firebaseQuery(
      window.firebaseCollection(window.firebaseDb, "lojas", uid, "vendas"),
      window.firebaseWhere("data", "==", hoje)
    );
    const snap = await window.firebaseGetDocs(q);
    const vendasHoje = snap.docs.map(d => d.data());
    const modos = [...new Set(vendasHoje.map(v => v.modo || "individual"))];
    if (modos.length > 1) {
      document.getElementById("aviso-modo-misto").style.display = "block";
    } else if (vendasHoje.length > 0 && modos[0]) {
      alternarModoVenda(modos[0]);
    }
  } catch { }
}

function calcularTotalVenda() {
  const d = converterFloat(document.getElementById("vd-dinheiro").value);
  const p = converterFloat(document.getElementById("vd-pix").value);
  const db = converterFloat(document.getElementById("vd-debito").value);
  const cr = converterFloat(document.getElementById("vd-credito").value);
  document.getElementById("vd-total-preview").innerText = formatarBRL(d + p + db + cr);
}

async function salvarVenda(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-salvar-venda");
  const orig = btn.innerText;
  btn.disabled = true; btn.innerText = "⏳ Salvando..."; btn.style.opacity = ".7";

  // ── FIREBASE: garante usuário autenticado ─────────────────────────────
  // 1ª tentativa: currentUser (sessão ativa)
  let uid = window.firebaseAuth?.currentUser?.uid;
  // 2ª tentativa: UID salvo no localStorage (sessão recém-restaurada pelo onAuthStateChanged)
  if (!uid) {
    uid = localStorage.getItem("user_uid") || "";
  }
  if (!uid) {
    mostrarToast("⚠️ Sessão expirada. Por favor, faça login novamente antes de salvar.", "erro");
    resetarBotao("btn-salvar-venda", orig);
    return;
  }
  // ─────────────────────────────────────────────────────────────────────

  const modo = document.getElementById("venda-modo").value || "individual";
  const statusSel = document.getElementById("v-status")?.value || "Pago";
  let dados = { modo, data: document.getElementById("vd-data").value, obs: document.getElementById("vd-obs").value || "", qtd: 1 }; // FASE 11.11: qtd como número inteiro
  if (modo === "individual") {
    // Verificar se é perfil de serviços (usar campos do bloco servico)
    const blocoServicoVisivel = document.getElementById("bloco-venda-servico")?.style.display !== "none";
    const isServicos = perfilNegocioAtual === "servicos" || blocoServicoVisivel;
    
    if (isServicos) {
      // Perfil SERVIÇOS: usar campos específicos do bloco servico
      const valor = converterFloat(document.getElementById("vd-valor-hora")?.value || "0");
      const custoAssociado = converterFloat(document.getElementById("vd-custo-associado")?.value || "0");
      const modeloCobranca = document.querySelector('input[name="modelo-cobranca"]:checked')?.value || "por-hora";
      const tipoContratacao = document.querySelector('input[name="tipo-contratacao"]:checked')?.value || "particular";
      const metodoPag = document.querySelector('input[name="forma-pag-servico"]:checked')?.value || "dinheiro";
      const statusServico = document.getElementById("v-status-servico")?.value || "Pago";
      
      console.log("[DEBUG] Status capturado:", statusServico);
      
      if (!valor) { mostrarToast("⚠️ Informe o valor do serviço.", "aviso"); resetarBotao("btn-salvar-venda", orig); return; }
      
      // Calcular horas e total baseado no modelo
      let horasTrabalhadas = 0;
      let valorTotal = valor;
      if (modeloCobranca === "por-hora") {
        const inicio = document.getElementById("vd-horario-inicio")?.value || "";
        const fim = document.getElementById("vd-horario-fim")?.value || "";
        if (inicio && fim) {
          const [h1, m1] = inicio.split(":").map(Number);
          const [h2, m2] = fim.split(":").map(Number);
          horasTrabalhadas = Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
        }
        valorTotal = valor * Math.max(0.5, horasTrabalhadas); // Mínimo meia hora
      }
      
      // Se for Pendente, zerar os valores de pagamento
      const isPendente = statusServico === "Pendente";
      
      // Debug: verificar valores capturados
      console.log("[SALVAR SERVICO] tipoContratacao:", tipoContratacao);
      console.log("[SALVAR SERVICO] nomeAgencia:", tipoContratacao === "agencia" ? document.getElementById("vd-nome-agencia")?.value : "N/A (particular)");
      console.log("[SALVAR SERVICO] valorTotal:", valorTotal);
      
      dados = {
        ...dados,
        tipo: "servico",
        formaPag: statusServico, // "Pago" ou "Pendente"
        valor: String(valorTotal),
        dinheiro: isPendente ? "0" : (metodoPag === "dinheiro" ? String(valorTotal) : "0"),
        pix: isPendente ? "0" : (metodoPag === "pix" ? String(valorTotal) : "0"),
        debito: isPendente ? "0" : (metodoPag === "debito" ? String(valorTotal) : "0"),
        credito: isPendente ? "0" : (metodoPag === "credito" ? String(valorTotal) : "0"),
        total: String(valorTotal), // Manter o valor mesmo quando pendente
        cliente: document.getElementById("vd-cliente-final")?.value || "",
        descricao: document.getElementById("vd-descricao-servico")?.value || "",
        executante: document.getElementById("vd-executante")?.value || "",
        dataServico: document.getElementById("vd-data-servico")?.value || "",
        periodo: "Serviço",
        modeloCobranca: modeloCobranca,
        tipoContratacao: tipoContratacao,
        nomeAgencia: tipoContratacao === "agencia" ? (document.getElementById("vd-nome-agencia")?.value || "") : "",
        horarioInicio: modeloCobranca === "por-hora" ? (document.getElementById("vd-horario-inicio")?.value || "") : "",
        horarioFim: modeloCobranca === "por-hora" ? (document.getElementById("vd-horario-fim")?.value || "") : "",
        observacoes: document.getElementById("vd-obs-servico")?.value || "",
        horasTrabalhadas: String(horasTrabalhadas),
        valorHora: modeloCobranca === "por-hora" ? String(valor) : "0",
        valorFixo: modeloCobranca === "valor-fixo" ? String(valor) : "0",
        custoAssociado: String(custoAssociado),
        lucroLiquido: String(valorTotal - custoAssociado),
        observacoes: document.getElementById("vd-obs-servico")?.value || ""
      };

      console.log("[SALVAR] Dados do serviço:", dados);
      console.log("[SALVAR] tipoContratacao:", tipoContratacao);
      console.log("[SALVAR] nomeAgencia:", dados.nomeAgencia);
    } else {
      // Perfil VAREJO: usar campos originais
      const valor = converterFloat(document.getElementById("vd-valor-individual").value);
      const custoAssociado = converterFloat(document.getElementById("vd-custo-associado").value);
      const qtdCampo = document.getElementById("vd-quantidade").value;
      const qtd = parseInt(qtdCampo) || 1;
      const valorTotal = valor * qtd; // Valor total calculado
      console.log(`[SALVAR VAREJO] Campos lidos: valor=${valor}, qtdCampo=${qtdCampo}, qtd=${qtd}, valorTotal=${valorTotal}`);
      if (!valor) { mostrarToast("⚠️ Informe o valor da venda.", "aviso"); resetarBotao("btn-salvar-venda", orig); return; }
      const metodoPag = document.querySelector('input[name="forma-pag"]:checked')?.value || "dinheiro";
      dados = {
        ...dados,
        formaPag: statusSel, // coluna 14 vira Status (Pago/Pendente)
        valor: String(valorTotal), // FASE 11.11: Usar valor total calculado
        valorUnitario: String(valor), // Manter valor unitário separado
        qtd: qtd, // FASE 11.11: qtd como número inteiro
        dinheiro: metodoPag === "dinheiro" ? String(valorTotal) : "0",
        pix: metodoPag === "pix" ? String(valorTotal) : "0",
        debito: metodoPag === "debito" ? String(valorTotal) : "0",
        credito: metodoPag === "credito" ? String(valorTotal) : "0",
        total: String(valorTotal),
        cliente: document.getElementById("vd-cliente").value || "",
        descricao: document.getElementById("vd-descricao").value || "",
        periodo: "Venda Individual",
        custoAssociado: String(custoAssociado * qtd),
        lucroLiquido: String(valorTotal - custoAssociado * qtd)
      };
      console.log("[FASE 11.11] Dados finais para Firebase:", { valorTotal, qtd, valor, dados });
      console.log("[SALVAR VAREJO] Dados a salvar:", { valor, qtd, valorTotal, dados });
    }
  } else {
    const d = converterFloat(document.getElementById("vd-dinheiro").value), p = converterFloat(document.getElementById("vd-pix").value), db = converterFloat(document.getElementById("vd-debito").value), cr = converterFloat(document.getElementById("vd-credito").value);
    if (!d && !p && !db && !cr) { mostrarToast("⚠️ Informe pelo menos um valor.", "aviso"); resetarBotao("btn-salvar-venda", orig); return; }
    const periodo = document.getElementById("vd-periodo").value;
    if (!periodo) { mostrarToast("⚠️ Escolha o período do dia.", "aviso"); resetarBotao("btn-salvar-venda", orig); return; }
    const totalFech = d + p + db + cr;
    dados = { ...dados, formaPag: statusSel, periodo, dinheiro: String(d), pix: String(p), debito: String(db), credito: String(cr), total: String(totalFech) };

    // Item 4: fechamento inteligente — consulta individuais do dia antes de salvar
    if ((configuracoesGlobais.estiloVendas || "individual") === "ambos") {
      try {
        const rIndiv = await chamarGoogle("buscarTotalIndividualDia", { data: document.getElementById("vd-data").value });
        const indivTotal = converterFloat(rIndiv?.total || 0);
        const avisoEl = document.getElementById("aviso-fechamento-inteligente");
        if (indivTotal > 0) {
          const diferenca = Math.max(0, totalFech - indivTotal);
          if (avisoEl) {
            avisoEl.style.display = "block";
            avisoEl.innerHTML = `ℹ️ Vendas individuais hoje: <strong>${formatarBRL(indivTotal)}</strong>. O sistema registrará a diferença: <strong>${formatarBRL(diferenca)}</strong>.`;
          }
          if (diferenca === 0) {
            mostrarToast("ℹ️ As vendas individuais já cobrem o valor do fechamento. Nada a registrar.", "aviso");
            resetarBotao("btn-salvar-venda", orig); return;
          }
        } else {
          if (avisoEl) avisoEl.style.display = "none";
        }
      } catch { } // não bloqueia se a consulta falhar
    }
  }
  if (sessaoIsMembro && sessaoEmailDono) dados.emailDono = sessaoEmailDono;
  dados.registradoPor = localStorage.getItem("user_email") || "";
  dados.nomeOperador = localStorage.getItem("nomeOperador") || localStorage.getItem("user_name") || ""; // Item 1+3
  const docId = document.getElementById("venda-docId-edicao").value;
  try {
    // ── FIREBASE: cria ou atualiza a venda no Firestore ──────────────
    if (docId) {
      // EDIÇÃO: atualiza o documento existente pelo docId (merge preserva campos não enviados)
      await window.firebaseSetDoc(
        window.firebaseDoc(window.firebaseDb, "lojas", uid, "vendas", docId),
        dados,
        { merge: true }
      );
    } else {
      // NOVO REGISTRO: cria um novo documento com ID automático
      await window.firebaseAddDoc(
        window.firebaseCollection(window.firebaseDb, "lojas", uid, "vendas"),
        dados
      );
    }
    
    // ─────────────────────────────────────────────────────────────────
    // Lançamento Casado: cria compra automática se houver custo associado
    if (!docId && modo === "individual" && dados.custoAssociado && parseFloat(dados.custoAssociado) > 0) {
      try {
        const dadosCompra = {
          data: dados.data,
          dataISO: dados.data,
          fornecedor: "Custo de Serviço / Venda",
          descricao: "Gasto ref. à venda: " + (dados.descricao || dados.cliente || "Sem identificação"),
          valor: String(dados.custoAssociado),
          obs: "Gerado automaticamente no lançamento de venda.",
          registradoPor: dados.registradoPor,
          nomeOperador: dados.nomeOperador,
          criadoEm: new Date().toISOString()
        };
        
        await window.firebaseAddDoc(
          window.firebaseCollection(window.firebaseDb, "lojas", uid, "compras"),
          dadosCompra
        );
        
        console.log("✅ Compra automática criada:", dadosCompra);
      } catch (errCompra) {
        console.error("Erro ao criar compra automática:", errCompra);
        // Não bloqueia o fluxo principal, apenas loga o erro
      }
    }
    
    // Baixa automática de estoque e lançamento casado - apenas para novas vendas (!docId) e modo "individual"
    if (!docId && modo === "individual" && dados.descricao && dados.quantidade) {
      const tipoSelecionado = document.querySelector('input[name="tipo-item"]:checked')?.value || "produto";
      const qtd = parseInt(dados.quantidade) || 1;
      
      try {
        const produtoEncontrado = produtosGlobal.find(p => 
          p.nome && p.nome.trim().toLowerCase() === dados.descricao.trim().toLowerCase()
        );
        
        let custoTotal = 0;
        
        if (tipoSelecionado === "produto" && produtoEncontrado && produtoEncontrado.custo !== undefined) {
          // Tipo PRODUTO: usa o custo cadastrado no produto
          custoTotal = (produtoEncontrado.custo || 0) * qtd;
          
          // Baixa de estoque - apenas para perfil varejo-premium
          if (perfilNegocioAtual === "varejo-premium" && produtoEncontrado.estoque !== undefined) {
            const estoqueAtual = parseInt(produtoEncontrado.estoque) || 0;
            const novoEstoque = Math.max(0, estoqueAtual - qtd);
            
            // Atualiza no Firebase
            await window.firebaseSetDoc(
              window.firebaseDoc(window.firebaseDb, "lojas", uid, "produtos", produtoEncontrado.docId),
              { estoque: String(novoEstoque) },
              { merge: true }
            );
            
            // Atualiza array local
            produtoEncontrado.estoque = String(novoEstoque);
            
            console.log(`Estoque baixado: ${produtoEncontrado.nome} - ${estoqueAtual} -> ${novoEstoque}`);
            
            // FASE 11.5: Alerta silencioso se estoque chegar a zero
            if (novoEstoque === 0) {
              mostrarToast(`⚠️ Estoque do produto "${produtoEncontrado.nome}" chegou a zero!`, 'aviso');
            }
          }
        } else {
          // Tipo SERVIÇO: usa o custo manual informado
          custoTotal = dados.custoAssociado || 0;
        }
        
        // Criar compra automática (Lançamento Casado)
        if (custoTotal > 0) {
          const dadosCompra = {
            data: dados.data,
            dataISO: dados.data,
            fornecedor: tipoSelecionado === "produto" ? "Custo de Produto Vendido" : "Custo de Serviço / Venda",
            descricao: "Gasto ref. à venda: " + (dados.descricao || dados.cliente || "Sem identificação"),
            valor: String(custoTotal),
            obs: `Gerado automaticamente no lançamento de ${tipoSelecionado}.`,
            registradoPor: dados.registradoPor,
            nomeOperador: dados.nomeOperador,
            criadoEm: new Date().toISOString()
          };
          
          await window.firebaseAddDoc(
            window.firebaseCollection(window.firebaseDb, "lojas", uid, "compras"),
            dadosCompra
          );
          
          console.log(`✅ Compra automática criada (${tipoSelecionado}):`, dadosCompra);
        }
      } catch (errCompra) {
        console.error("Erro ao criar compra automática:", errCompra);
        // Não bloqueia o fluxo principal
      }
    }
    
    // Auto-cadastra cliente se necessário (silencioso)
    if (!docId && dados.cliente) _autoCadastrarCliente(dados.cliente);
    
    // Retroalimentação instantânea: adicionar novos valores aos datalists (servicos)
    if (dados.tipo === 'servico' && typeof adicionarValoresDatalistsServicos === 'function') {
      adicionarValoresDatalistsServicos(dados);
    }
    
    // Abre modal de recibo com botão WhatsApp para venda individual nova
    if (!docId && modo === "individual" && dados.total) {
      resetarBotao("btn-salvar-venda", orig);
      voltarDashboard();
      setTimeout(() => abrirModalRecibo(dados), 300);
    } else {
      mostrarToast(docId ? "✅ Atualizado!" : "✅ Venda registrada!", "sucesso");
      resetarBotao("btn-salvar-venda", orig);
      voltarDashboard();
    }
    
    // FASE 11.9: Baixa automática de estoque (roda em background, não bloqueia)
    // Regra simples: se existe produtoId no dataset, é produto do estoque → dar baixa
    const inputDescricao = document.getElementById("vd-descricao");
    const inputQuantidade = document.getElementById("vd-quantidade");
    const produtoId = inputDescricao?.dataset?.produtoId;
    const quantidade = parseInt(inputQuantidade?.value) || 1;
    
    console.log(`[DEBUG ESTOQUE] Verificando baixa - Produto ID: ${produtoId}, Qtd: ${quantidade}`);
    
    if (produtoId) {
      console.log(`[DEBUG ESTOQUE] ✅ ID encontrado (${produtoId}), disparando baixa!`);
      baixarEstoqueProduto(produtoId, quantidade).catch(err => {
        console.error("[BAIXA-ESTOQUE] Erro não crítico:", err);
      });
      
      // Limpar dataset após baixa para evitar duplicação
      if (inputDescricao?.dataset) {
        delete inputDescricao.dataset.produtoId;
        console.log(`[DEBUG ESTOQUE] Dataset limpo`);
      }
    } else {
      console.log(`[DEBUG ESTOQUE] Sem produtoId, pulando baixa`);
    }
  } catch (err) {
    console.error("Erro ao salvar venda no Firestore:", err);
    resetarBotao("btn-salvar-venda", orig);
    mostrarToast("❌ Erro ao salvar.", "erro");
  }
}

// ============================================================
// HISTÓRICO
// ============================================================
var _ordemHistorico = "desc"; // "desc" = mais recente primeiro

function abrirHistorico() {
  document.getElementById("filtro-periodo-hist").value = "mes";
  document.getElementById("filtro-tipo-hist").value = "todos";
  document.getElementById("filtro-busca-hist").value = "";
  document.getElementById("filtro-modo-hist").value = "todos";
  document.getElementById("filtro-status-hist").value = "todos";
  onPeriodoHistChange();
  document.getElementById("filtro-data-ini").value = "";
  document.getElementById("filtro-data-fim").value = "";
  _ordemHistorico = "desc";
  document.getElementById("btn-ordenar-hist").title = "Ordem: mais recente primeiro";
  
  // Mostrar/esconder filtro de contratação baseado no perfil
  const filtroContratacao = document.getElementById("filtro-contratacao-wrapper");
  if (filtroContratacao) {
    if (perfilNegocioAtual === 'servicos') {
      filtroContratacao.style.display = 'block';
    } else {
      filtroContratacao.style.display = 'none';
      // Resetar filtro de contratação para não interferir
      document.getElementById("filtro-contratacao-hist").value = "todos";
    }
  }
  
  mostrarTela("tela-historico");
  buscarHistorico();
}

function onPeriodoHistChange() {
  const v = document.getElementById("filtro-periodo-hist").value;
  const containerIni = document.getElementById("filtro-data-ini-container");
  const containerFim = document.getElementById("filtro-data-fim-container");
  
  if (v === "custom") {
    containerIni.style.display = "block";
    containerFim.style.display = "block";
    // Se as datas já estiverem preenchidas, chama buscarHistorico() para sincronizar
    const dataIni = document.getElementById("filtro-data-ini").value;
    const dataFim = document.getElementById("filtro-data-fim").value;
    if (dataIni && dataFim) {
      buscarHistorico();
    }
  } else {
    containerIni.style.display = "none";
    containerFim.style.display = "none";
    // Limpa os campos de data quando não for personalizado
    document.getElementById("filtro-data-ini").value = "";
    document.getElementById("filtro-data-fim").value = "";
    buscarHistorico();
  }
}

// Retorna { mes, dataIni, dataFim } conforme período selecionado
function _calcularFiltroData() {
  const periodo = document.getElementById("filtro-periodo-hist").value;
  const hoje = dataHoje(); // formato garantido: "YYYY-MM-DD"
  if (periodo === "hoje") return { dataIni: hoje, dataFim: hoje };
  if (periodo === "7dias") {
    const d = new Date(); d.setDate(d.getDate() - 6);
    // toISOString pode dar dia errado em fuso UTC−3; usa formato local
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), dy = String(d.getDate()).padStart(2, "0");
    return { dataIni: `${y}-${m}-${dy}`, dataFim: hoje };
  }
  if (periodo === "custom") {
    return { dataIni: document.getElementById("filtro-data-ini").value || "", dataFim: document.getElementById("filtro-data-fim").value || "" };
  }
  // mes (padrão) — sem dataIni/dataFim; o backend filtra por mes
  return { mes: mesAtual() };
}

async function buscarHistorico() {
  const listEl = document.getElementById("lista-historico");
  listEl.innerHTML = '<div class="loader"></div>';
  try {
    // ── Resolve o UID (sessão ativa ou fallback localStorage) ────────────
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) {
      listEl.innerHTML = '<p style="text-align:center;color:#EF5350;padding:20px;">⚠️ Sessão expirada. Faça login novamente.</p>';
      return;
    }

    // ── Monta a query no Firestore ────────────────────────────────────────
    const filtro = _calcularFiltroData();
    const periodo = document.getElementById("filtro-periodo-hist").value;
    const vendasRef = window.firebaseCollection(window.firebaseDb, "lojas", uid, "vendas");

    let q;
    if (periodo === "mes") {
      // Filtra pelo mês atual usando range de datas ISO (lexicográfico)
      const mesStr = filtro.mes || mesAtual();
      const [ano, mes] = mesStr.split("-");
      const dataIni = `${ano}-${mes}-01`;
      // Último dia do mês
      const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
      const dataFim = `${ano}-${mes}-${String(ultimoDia).padStart(2, "0")}`;
      q = window.firebaseQuery(
        vendasRef,
        window.firebaseWhere("data", ">=", dataIni),
        window.firebaseWhere("data", "<=", dataFim),
        window.firebaseOrderBy("data", "desc")
      );
    } else if (filtro.dataIni && filtro.dataFim) {
      // Range explícito (7dias / custom)
      q = window.firebaseQuery(
        vendasRef,
        window.firebaseWhere("data", ">=", filtro.dataIni),
        window.firebaseWhere("data", "<=", filtro.dataFim),
        window.firebaseOrderBy("data", "desc")
      );
    } else {
      // Fallback: traz tudo ordenado por data (raramente usado)
      q = window.firebaseQuery(vendasRef, window.firebaseOrderBy("data", "desc"));
    }

    const snapshot = await window.firebaseGetDocs(q);

    // ── Normaliza os documentos para o formato esperado pelo frontend ────
    historicoGlobal = snapshot.docs.map((docSnap, idx) => {
      const d = docSnap.data();
      
      // FASE 12.7: Fallback robusto para conversão de data - trata DD/MM/YYYY e YYYY-MM-DD
      let dataSegura = String(d.dataISO || d.data || "").trim();
      if (dataSegura && dataSegura.includes('/')) {
        // Converter DD/MM/YYYY para YYYY-MM-DD se necessário
        const partes = dataSegura.split('/');
        if (partes.length === 3) {
          dataSegura = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
      }
      // Garante formato YYYY-MM-DD (primeiros 10 caracteres)
      dataSegura = dataSegura.substring(0, 10);
      
      // FASE 12.7: Fallback robusto para formaPag - normaliza case
      let formaPagSegura = String(d.formaPag || d.status || "Pago").trim();
      // Normaliza para lowercase para comparações consistentes
      formaPagSegura = formaPagSegura.toLowerCase();
      
      // FASE 12.13: converterParaNumero agora é função global (declarada antes de atualizarDashboardFirebase)
      
      return {
        // Identificação do documento Firebase
        docId: docSnap.id,
        // Campos de data — garante string "YYYY-MM-DD"
        dataISO: dataSegura,
        data: dataSegura,
        // Modo da venda
        modo: d.modo || "individual",
        periodo: d.periodo || (d.modo === "fechamento" ? "Fechamento" : "Venda Individual"),
        // Valores — FASE 12.7: converte para número e depois para string para compatibilidade
        total: String(converterParaNumero(d.total || d.valorTotal || 0)),
        dinheiro: String(converterParaNumero(d.dinheiro || 0)),
        pix: String(converterParaNumero(d.pix || 0)),
        debito: String(converterParaNumero(d.debito || 0)),
        credito: String(converterParaNumero(d.credito || 0)),
        // FASE 12.7: Adiciona valorTotal como fallback
        valorTotal: String(converterParaNumero(d.valorTotal || d.total || 0)),
        valor: String(converterParaNumero(d.valor || d.total || 0)),
        // Status / pagamento - FASE 12.7: normaliza case
        formaPag: formaPagSegura,
        // Dados opcionais
        cliente: d.cliente || "",
        descricao: d.descricao || "",
        obs: d.obs || "",
        nomeOperador: d.nomeOperador || "",
        registradoPor: d.registradoPor || "",
        // FASE 11.11: Adicionar qtd no mapeamento para que o histórico leia a quantidade corretamente
        qtd: parseInt(d.qtd || 1, 10),
        valorUnitario: String(converterParaNumero(d.valorUnitario || 0)),
        // Campos específicos de serviço (perfil servicos)
        tipoContratacao: d.tipoContratacao || "particular",
        nomeAgencia: d.nomeAgencia || "",
        executante: d.executante || "",
        modeloCobranca: d.modeloCobranca || "valor-fixo",
        dataServico: d.dataServico || "",
        horarioInicio: d.horarioInicio || "",
        horarioFim: d.horarioFim || "",
        horasTrabalhadas: d.horasTrabalhadas || "0",
        valorHora: d.valorHora || "0",
        custoAssociado: d.custoAssociado || "0",
        comissaoAgencia: d.comissaoAgencia || "0",
        subtotal: d.subtotal || "0",
        // FASE 12.7: Adiciona lucroLiquido se existir (dados legados)
        lucroLiquido: String(converterParaNumero(d.lucroLiquido || 0)),
      };
    });

    // Ordenação robusta: critério primário dataISO (desc), secundário criadoEm (desc)
    historicoGlobal.sort((a, b) => {
      // Primeiro: ordena por dataISO (mais recente primeiro)
      const dataCompare = (b.dataISO || b.data || "").localeCompare(a.dataISO || a.data || "");
      if (dataCompare !== 0) return dataCompare;
      
      // Desempate: ordena por criadoEm (mais recente primeiro)
      const criadoA = a.criadoEm || "";
      const criadoB = b.criadoEm || "";
      return criadoB.localeCompare(criadoA);
    });

    filtrarHistorico();
    
    // Popular datalists do perfil servicos com dados do histórico
    if (perfilNegocioAtual === 'servicos' && historicoGlobal.length > 0) {
      popularDatalistsServicos(historicoGlobal);
    }
  } catch (err) {
    console.error("Erro ao buscar histórico no Firestore:", err);
    listEl.innerHTML = '<p style="text-align:center;color:#EF5350;padding:20px;">❌ Erro ao carregar.</p>';
  }
}

/**
 * Popula os datalists do perfil servicos com valores únicos do histórico
 * Extrai descrição, executante, cliente e agência das vendas do tipo servico
 */
function popularDatalistsServicos(historicoVendas) {
  if (!historicoVendas || !Array.isArray(historicoVendas)) return;
  
  // Sets para garantir valores únicos
  const descricoes = new Set();
  const executantes = new Set();
  const clientes = new Set();
  const agencias = new Set();
  
  // Percorrer histórico e extrair valores
  historicoVendas.forEach(venda => {
    // Filtrar apenas vendas do tipo servico
    if (venda.tipo === 'servico' || venda.modeloCobranca || venda.tipoContratacao) {
      if (venda.descricao) descricoes.add(venda.descricao.trim());
      if (venda.executante) executantes.add(venda.executante.trim());
      if (venda.cliente) clientes.add(venda.cliente.trim());
      if (venda.nomeAgencia) agencias.add(venda.nomeAgencia.trim());
      
      // Também verificar campos alternativos que podem existir
      if (venda.descricaoServico) descricoes.add(venda.descricaoServico.trim());
      if (venda.clienteFinal) clientes.add(venda.clienteFinal.trim());
    }
  });
  
  // Função auxiliar para popular um datalist (preservando valores existentes)
  const popularDatalist = (datalistId, valoresNovos) => {
    const datalist = document.getElementById(datalistId);
    if (!datalist) return;
    
    // Coletar valores já existentes no datalist
    const valoresExistentes = new Set();
    Array.from(datalist.options).forEach(opt => {
      if (opt.value) valoresExistentes.add(opt.value);
    });
    
    // Adicionar apenas valores novos (evitar duplicatas)
    const valoresParaAdicionar = [];
    valoresNovos.forEach(valor => {
      if (!valoresExistentes.has(valor)) {
        valoresParaAdicionar.push(valor);
        valoresExistentes.add(valor); // Marcar como existente para próximos
      }
    });
    
    // Se não há valores novos, retornar
    if (valoresParaAdicionar.length === 0) return;
    
    // Adicionar novos valores
    valoresParaAdicionar.forEach(valor => {
      const option = document.createElement('option');
      option.value = valor;
      datalist.appendChild(option);
    });
    
    console.log(`[DATALIST] ${datalistId}: +${valoresParaAdicionar.length} novos valores (total: ${valoresExistentes.size})`);
  };
  
  // Popular cada datalist
  popularDatalist('lista-tipos-servico', descricoes);
  popularDatalist('lista-executantes', executantes);
  popularDatalist('lista-clientes-servico', clientes);
  popularDatalist('lista-agencias', agencias);
  
  console.log('[DATALISTS] População concluída:', {
    descricoes: descricoes.size,
    executantes: executantes.size,
    clientes: clientes.size,
    agencias: agencias.size
  });
}

/**
 * Adiciona novos valores aos datalists após salvar um serviço
 * Retroalimentação instantânea para auto-aprendizado
 */
function adicionarValoresDatalistsServicos(dadosServico) {
  if (!dadosServico) return;
  
  const adicionarAoDatalist = (datalistId, valor) => {
    if (!valor) return;
    const datalist = document.getElementById(datalistId);
    if (!datalist) return;
    
    // Verificar se valor já existe
    const existe = Array.from(datalist.options).some(opt => opt.value === valor);
    if (existe) return;
    
    // Adicionar novo valor
    const option = document.createElement('option');
    option.value = valor;
    datalist.appendChild(option);
    
    console.log(`[DATALIST] Novo valor adicionado ao ${datalistId}: "${valor}"`);
  };
  
  // Adicionar cada campo aos seus respectivos datalists
  if (dadosServico.descricao) adicionarAoDatalist('lista-tipos-servico', dadosServico.descricao.trim());
  if (dadosServico.executante) adicionarAoDatalist('lista-executantes', dadosServico.executante.trim());
  if (dadosServico.cliente) adicionarAoDatalist('lista-clientes-servico', dadosServico.cliente.trim());
  if (dadosServico.nomeAgencia) adicionarAoDatalist('lista-agencias', dadosServico.nomeAgencia.trim());
}

function toggleOrdemHistorico() {
  _ordemHistorico = _ordemHistorico === "desc" ? "asc" : "desc";
  const btn = document.getElementById("btn-ordenar-hist");
  btn.title = _ordemHistorico === "desc" ? "Ordem: mais recente primeiro" : "Ordem: mais antiga primeiro";
  btn.innerText = _ordemHistorico === "desc" ? "🔃" : "🔄";
  renderizarHistorico();
}

/**
 * Handler para quando o filtro de contratação é alterado
 * Mostra/esconde o dropdown de agências e popula com as agências disponíveis
 */
function onFiltroContratacaoChange() {
  const contratacao = document.getElementById("filtro-contratacao-hist")?.value || "todos";
  const containerAgencia = document.getElementById("filtro-agencia-container");
  const selectAgencia = document.getElementById("filtro-agencia-hist");
  
  if (!containerAgencia || !selectAgencia) return;
  
  if (contratacao === "agencia") {
    containerAgencia.style.display = "block";
    
    // Popular dropdown com agências únicas do histórico
    const agenciasUnicas = new Set();
    historicoGlobal.forEach(v => {
      if (v.tipoContratacao === "agencia" && v.nomeAgencia) {
        agenciasUnicas.add(v.nomeAgencia);
      }
    });
    
    // Reconstruir options (mantendo "Todas")
    selectAgencia.innerHTML = '<option value="todas">📋 Todas as agências</option>';
    Array.from(agenciasUnicas).sort().forEach(agencia => {
      const option = document.createElement("option");
      option.value = agencia;
      option.textContent = `🏢 ${agencia}`;
      selectAgencia.appendChild(option);
    });
  } else {
    containerAgencia.style.display = "none";
  }
  
  // Aplicar filtro
  filtrarHistorico();
}

function filtrarHistorico() {
  const tipo = document.getElementById("filtro-tipo-hist").value;
  const modo = document.getElementById("filtro-modo-hist").value;
  const status = document.getElementById("filtro-status-hist")?.value || "todos";
  const contratacao = document.getElementById("filtro-contratacao-hist")?.value || "todos";
  const agenciaSelecionada = document.getElementById("filtro-agencia-hist")?.value || "todas";
  const busca = document.getElementById("filtro-busca-hist").value.toLowerCase();
  const filtro = _calcularFiltroData();
  const periodo = document.getElementById("filtro-periodo-hist").value;

  historicoFiltrado = historicoGlobal.filter(v => {
    // Item 1: garante que dataISO seja sempre string "YYYY-MM-DD" antes de comparar
    const iso = String(v.dataISO || "").substring(0, 10);

    // Para "hoje": comparação de igualdade exata (não range, evita bug de fuso)
    if (periodo === "hoje" && iso !== dataHoje()) return false;

    // Para "7dias" e "custom": comparação de range com strings ISO (funciona lexicograficamente)
    if (periodo !== "hoje" && periodo !== "mes") {
      if (filtro.dataIni && iso < filtro.dataIni) return false;
      if (filtro.dataFim && iso > filtro.dataFim) return false;
    }

    const bOk = !busca || iso.includes(busca) || (v.obs || "").toLowerCase().includes(busca) || (v.cliente || "").toLowerCase().includes(busca) || (v.descricao || "").toLowerCase().includes(busca) || (v.nomeOperador || "").toLowerCase().includes(busca);
    const tOk = tipo === "todos" || converterFloat(v[tipo] || 0) > 0;
    
    // Filtro de modo: Todos, Apenas Vendas (individual), Apenas Fechamentos (fechamento)
    const mOk = modo === "todos" || v.modo === modo;
    
    // Filtro de status: Todos, Pago, Pendente
    const formaPag = String(v.formaPag || "").trim().toLowerCase();
    const sOk = status === "todos" || 
                (status === "pago" && formaPag !== "pendente") ||
                (status === "pendente" && formaPag === "pendente");
    
    // Filtro de contratação: Todas, Particular, Agência
    const tipoContratacao = v.tipoContratacao || "particular";
    const cOk = contratacao === "todos" || tipoContratacao === contratacao;
    
    // Filtro de agência específica (quando contratação = agencia)
    let aOk = true;
    if (contratacao === "agencia" && agenciaSelecionada !== "todas") {
      aOk = v.nomeAgencia === agenciaSelecionada;
    }
    
    return bOk && tOk && mOk && sOk && cOk && aOk;
  });
  renderizarHistorico();
}

function renderizarHistorico() {
  const listEl = document.getElementById("lista-historico");
  if (!historicoFiltrado.length) {
    listEl.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#B0BEC5;"><div style="font-size:48px;margin-bottom:10px;">📋</div><p style="font-size:14px;">Nenhuma venda encontrada.</p><button onclick="abrirLancarVendas()" class="btn-primario" style="background:#1565C0;max-width:220px;margin:15px auto 0;">+ Lançar venda</button></div>`;
    return;
  }
  
  // Debug: verificar se há serviços com agência
  const servicosComAgencia = historicoFiltrado.filter(v => v.tipoContratacao === "agencia" && v.nomeAgencia);
  console.log(`[HISTORICO] Total: ${historicoFiltrado.length}, Com agência: ${servicosComAgencia.length}`);
  if (servicosComAgencia.length > 0) {
    console.log("[HISTORICO] Exemplo serviço com agência:", servicosComAgencia[0]);
  }

  const porData = {};
  historicoFiltrado.forEach(v => { const k = v.dataISO || v.data || "—"; if (!porData[k]) porData[k] = []; porData[k].push(v); });
  const chaves = Object.keys(porData).sort((a, b) => _ordemHistorico === "desc" ? b.localeCompare(a) : a.localeCompare(b));

  let html = "";
  chaves.forEach(dk => {
    html += `<div style="font-size:12px;font-weight:700;color:#90A4AE;text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px;padding:0 2px;">📅 ${formatarDataBR(dk)}</div>`;
    porData[dk].forEach(v => {
      const total = converterFloat(v.total || 0);
      const docId = String(v.linha || v.docId || "");
      const dadosB64 = btoa(unescape(encodeURIComponent(JSON.stringify(v))));
      const isFiado = String(v.formaPag || "").trim().toLowerCase() === "pendente";
      
      // Gera ícones de pagamento compactos
      let iconesPagamento = "";
      if (v.modo === "fechamento") {
        // Para fechamentos, mostra todos os métodos usados
        if (converterFloat(v.dinheiro || 0) > 0) iconesPagamento += "💵";
        if (converterFloat(v.pix || 0) > 0) iconesPagamento += " 📱";
        if (converterFloat(v.debito || 0) > 0) iconesPagamento += " 💳";
        if (converterFloat(v.credito || 0) > 0) iconesPagamento += " 💳";
      } else {
        // Para vendas individuais, mostra apenas o método usado
        if (v.formaPag === "dinheiro") iconesPagamento = "💵";
        else if (v.formaPag === "pix") iconesPagamento = "📱";
        else if (v.formaPag === "debito") iconesPagamento = "💳";
        else if (v.formaPag === "credito") iconesPagamento = "💳";
        else iconesPagamento = "💰";
      }

      html += `
        <div class="item-card" style="cursor:pointer;" onclick="abrirDetalhesVenda('${docId}', JSON.parse(decodeURIComponent(escape(atob('${dadosB64}')))))">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div style="flex:1;">
              <span style="font-size:12px;color:#78909C;font-weight:700;text-transform:uppercase;">${v.modo === 'fechamento' ? `Fechamento de Caixa (${v.periodo})` : (v.periodo || "Venda")}</span>
              <p style="font-size:14px;font-weight:600;margin:2px 0;">${v.cliente ? '👤 ' + v.cliente : (v.descricao || 'Sem descrição')}</p>
              ${v.qtd && v.qtd > 1 ? `<span style="font-size:11px;color:#546E7A;background:#f0f0f0;padding:2px 6px;border-radius:4px;">📦 Qtd: ${v.qtd}</span>` : ''}
              <!-- Super Prévia: Nome do Operador e Ícones de Pagamento -->
              <div style="display:flex;align-items:center;gap:12px;margin-top:4px;">
                ${v.nomeOperador ? `<span style="font-size:11px;color:#546E7A;background:#f0f0f0;padding:2px 6px;border-radius:4px;">👤 ${v.nomeOperador}</span>` : ''}
                ${iconesPagamento ? `<span style="font-size:12px;color:#78909C;">${iconesPagamento}</span>` : ''}
              </div>
            </div>
            <div style="text-align:right;">
              <strong style="font-size:18px;color:#1565C0;font-weight:900;">${formatarBRL(total)}</strong>
              ${isFiado ? '<br><span style="color:#E65100;font-size:10px;font-weight:800;">⚠️ PENDENTE</span>' : ''}
            </div>
          </div>
        </div>`;
    });
  });
  listEl.innerHTML = html;
}


// Item 4: auto-cadastra cliente no Firebase se não existir na lista
async function _autoCadastrarCliente(nomeCliente) {
  if (!nomeCliente || !nomeCliente.trim()) return;

  // 1. Verifica se o cliente já está na nossa lista da memória (evita duplicados)
  const jaExiste = clientesGlobal.some(c => c.nome?.toLowerCase().trim() === nomeCliente.toLowerCase().trim());
  if (jaExiste) return;

  // 2. Pega o UID do lojista
  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  if (!uid) return;

  try {
    // 3. Salva no Firebase (Subcoleção Clientes)
    const docRef = await window.firebaseAddDoc(
      window.firebaseCollection(window.firebaseDb, "lojas", uid, "clientes"),
      {
        nome: nomeCliente.trim(),
        telefone: "",
        obs: "Cadastrado automaticamente via venda",
        criadoEm: new Date().toISOString()
      }
    );

    // 4. Atualiza a lista local na memória para o autocomplete funcionar na próxima vez
    const novoCliente = {
      nome: nomeCliente.trim(),
      docId: docRef.id,
      linha: docRef.id
    };
    clientesGlobal.push(novoCliente);

    // 5. Atualiza as sugestões (autocomplete) da tela de venda
    preencherAutocompleteClientes();

    console.log("✅ Cliente auto-cadastrado no Firebase:", nomeCliente);
  } catch (err) {
    console.error("Erro no auto-cadastro de cliente:", err);
  }
}

async function excluirVenda(docId) {
  if (!docId) { mostrarToast("⚠️ Venda inválida.", "aviso"); return; }
  if (!await confirmarAcao("🗑️", "Excluir Lançamento", "Esta venda será removida permanentemente.")) return;
  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  if (!uid) { mostrarToast("⚠️ Sessão expirada. Faça login novamente.", "erro"); return; }
  try {
    await window.firebaseDeleteDoc(
      window.firebaseDoc(window.firebaseDb, "lojas", uid, "vendas", docId)
    );
    mostrarToast("✅ Venda excluída!", "sucesso");
    buscarHistorico();
  } catch (err) {
    console.error("Erro ao excluir venda no Firestore:", err);
    mostrarToast("❌ Erro ao excluir.", "erro");
  }
}

// ============================================================
// COMPRAS
// ============================================================
function abrirCompras() {
  // VERIFICAÇÃO DE PLANO: Compras disponível apenas no Premium
  if (!verificarAcessoFuncionalidade("compras")) {
    mostrarToastUpgrade("compras");
    return;
  }
  
  resetarBotao("btn-salvar-compra", "💾 Salvar Compra");
  document.getElementById("form-compra").reset();
  document.getElementById("compra-docId-edicao").value = "";
  document.getElementById("cp-data").value = dataHoje();
  document.getElementById("filtro-mes-compras").value = mesAtual();
  document.getElementById("preview-notas-container").style.display = "none";
  document.getElementById("preview-notas-gallery").innerHTML = "";
  document.getElementById("preview-notas-nomes").innerText = "";
  document.getElementById("placeholder-nota").style.display = "block";
  document.getElementById("cp-nota-input").value = "";
  _notasSelecionadas = [];
  const contador = document.getElementById("nota-contador");
  if (contador) { contador.style.display = "none"; contador.innerText = ""; }
  mostrarTela("tela-compras");
  buscarCompras();
  preencherAutocompleteFornecedores();
}
function selecionarNota(input) {
  const files = Array.from(input.files || []);
  const estaEditando = Boolean(document.getElementById("compra-docId-edicao")?.value);

  const gallery = document.getElementById("preview-notas-gallery");
  const nomes = document.getElementById("preview-notas-nomes");
  const previewContainer = document.getElementById("preview-notas-container");
  const placeholder = document.getElementById("placeholder-nota");
  const contador = document.getElementById("nota-contador");
  if (!gallery || !nomes || !previewContainer || !placeholder || !contador) return;

  const limparUI = () => {
    input.value = "";
    gallery.innerHTML = "";
    nomes.innerText = "";
    previewContainer.style.display = "none";
    placeholder.style.display = "block";
    contador.style.display = "none";
    contador.innerText = "";
    _notasSelecionadas = estaEditando ? null : [];
  };

  if (!files.length) {
    gallery.innerHTML = "";
    nomes.innerText = "";
    previewContainer.style.display = "none";
    placeholder.style.display = "block";
    contador.style.display = "none";
    contador.innerText = "";
    _notasSelecionadas = estaEditando ? null : [];
    return;
  }

  if (files.length > 3) {
    mostrarToast("⚠️ Selecione no máximo 3 arquivos.", "aviso");
    limparUI();
    return;
  }

  for (const f of files) {
    if (f.size > 5 * 1024 * 1024) {
      mostrarToast("⚠️ Um dos arquivos passou de 5MB.", "aviso");
      limparUI();
      return;
    }
  }

  const lerArquivoComoBase64 = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const dataUrl = ev.target.result;
        const base64 = String(dataUrl).split(",")[1] || "";
        resolve({
          base64,
          mimeType: file.type || "",
          nome: file.name || "arquivo",
          previewDataUrl: (file.type || "").startsWith("image/") ? dataUrl : null
        });
      } catch (e) { reject(e); }
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  contador.style.display = "block";
  contador.innerText = `${files.length}/3 arquivos selecionados`;

  Promise.all(files.map(lerArquivoComoBase64))
    .then(arr => {
      _notasSelecionadas = arr.map(x => ({ base64: x.base64, mimeType: x.mimeType, nome: x.nome }));
      gallery.innerHTML = "";
      arr.forEach((x) => {
        if (x.previewDataUrl) {
          const img = document.createElement("img");
          img.src = x.previewDataUrl;
          img.alt = x.nome;
          gallery.appendChild(img);
        } else {
          const box = document.createElement("div");
          box.style.cssText = "border:1.5px dashed #90CAF9;border-radius:10px;background:#F8F9FF;height:90px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px;";
          box.innerHTML = `<div style="font-size:28px;line-height:1;">📄</div><div style="font-size:11px;font-weight:800;color:#546E7A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;">${(x.nome || "Arquivo").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
          gallery.appendChild(box);
        }
      });
      nomes.innerText = arr.map(x => x.nome).join(", ");
      previewContainer.style.display = "block";
      placeholder.style.display = "none";
    })
    .catch(() => {
      mostrarToast("❌ Erro ao ler arquivos.", "erro");
      limparUI();
    });
}

function _normalizarLinksNotas(linkNota) {
  if (!linkNota) return [];
  if (Array.isArray(linkNota)) return linkNota.filter(Boolean).map(String);
  const s = String(linkNota).trim();
  if (!s) return [];
  if (s.startsWith("[") && s.endsWith("]")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.filter(Boolean).map(String);
    } catch { }
  }
  if (s.includes(",")) {
    return s.split(",").map(x => x.trim()).filter(Boolean);
  }
  return [s];
}

async function salvarCompra(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-salvar-compra");
  const orig = btn.innerText;
  btn.disabled = true; btn.innerText = "⏳ Gravando no Firebase...";

  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  if (!uid) { mostrarToast("⚠️ Sessão expirada.", "erro"); resetarBotao("btn-salvar-compra", orig); return; }

  // 1. Captura os valores ANTES de começar os uploads
  const fornecedorNome = document.getElementById("cp-fornecedor").value.trim();
  const valorNum = converterFloat(document.getElementById("cp-valor").value);
  const docId = document.getElementById("compra-docId-edicao").value;
  const dataCompra = document.getElementById("cp-data").value;

  try {
    let linksDasNotas = [];

    // 2. Upload de arquivos (se houver)
    if (_notasSelecionadas && _notasSelecionadas.length > 0) {
      btn.innerText = `⏳ Subindo 0/${_notasSelecionadas.length} arquivos...`;
      for (let i = 0; i < _notasSelecionadas.length; i++) {
        const arquivo = _notasSelecionadas[i];
        const nomeArquivo = `${Date.now()}_${i}_${arquivo.nome}`;
        const caminhoNoStorage = `lojas/${uid}/compras/${nomeArquivo}`;
        const storageRef = window.firebaseRef(window.firebaseStorage, caminhoNoStorage);
        const blob = await (await fetch(`data:${arquivo.mimeType};base64,${arquivo.base64}`)).blob();

        await window.firebaseUpload(storageRef, blob);
        const urlPublica = await window.firebaseGetUrl(storageRef);
        linksDasNotas.push(urlPublica);
        btn.innerText = `⏳ Subindo ${i + 1}/${_notasSelecionadas.length}...`;
      }
    }

    // 3. Monta o objeto de dados
    const dadosCompra = {
      data: dataCompra,
      fornecedor: fornecedorNome || "Não Informado",
      descricao: document.getElementById("cp-descricao").value.trim(),
      valor: String(valorNum),
      obs: document.getElementById("cp-obs").value.trim(),
      dataISO: dataCompra,
      atualizadoEm: new Date().toISOString()
    };

    // Lógica para não apagar notas antigas se estiver apenas editando texto
    if (linksDasNotas.length > 0) {
      dadosCompra.linkNota = linksDasNotas.join(",");
    } else if (!docId) {
      dadosCompra.linkNota = "";
    }

    // 4. Salva no Firestore
    if (docId) {
      await window.firebaseSetDoc(window.firebaseDoc(window.firebaseDb, "lojas", uid, "compras", docId), dadosCompra, { merge: true });
    } else {
      await window.firebaseAddDoc(window.firebaseCollection(window.firebaseDb, "lojas", uid, "compras"), { ...dadosCompra, criadoEm: new Date().toISOString() });
    }

    // 5. Auto-cadastra o fornecedor na lista de contatos (Módulo C)
    _autoCadastrarFornecedor(fornecedorNome);

    mostrarToast(docId ? "✅ Compra atualizada!" : "✅ Compra registrada!", "sucesso");

    // Limpa TUDO: formulário, fotos da memória e galeria visual
    document.getElementById("form-compra").reset();
    document.getElementById("compra-docId-edicao").value = "";
    document.getElementById("preview-notas-container").style.display = "none";
    document.getElementById("preview-notas-gallery").innerHTML = "";
    _notasSelecionadas = [];

    // Atualiza a lista imediatamente
    buscarCompras();
  } catch (err) {
    console.error("Erro ao salvar compra:", err);
    mostrarToast("❌ Erro ao salvar.", "erro");
  } finally {
    resetarBotao("btn-salvar-compra", docId ? "💾 Atualizar Compra" : "+ Registrar Compra");
  }
}

// Helper: Salva o fornecedor no banco se ele for novo
async function _autoCadastrarFornecedor(nome) {
  if (!nome || nome === "Não Informado") return;
  const jaExiste = fornecedoresGlobal.some(f => f.nome?.toLowerCase() === nome.toLowerCase());
  if (jaExiste) return;
  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  try {
    await window.firebaseAddDoc(window.firebaseCollection(window.firebaseDb, "lojas", uid, "fornecedores"), {
      nome: nome, criadoEm: new Date().toISOString(), obs: "Cadastrado via Compra"
    });
    carregarFornecedoresCfg(); // Atualiza lista de sugestões
  } catch (e) { }
}

async function buscarCompras() {
  const listEl = document.getElementById("lista-compras");
  if (!listEl) return;
  listEl.innerHTML = '<div class="loader"></div>';

  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    const mesInput = document.getElementById("filtro-mes-compras").value;

    if (!uid) {
      listEl.innerHTML = '<p style="text-align:center;padding:20px;">⚠️ Faça login para ver as compras.</p>';
      return;
    }

    // Criamos a referência da coleção de compras deste usuário
    const comprasRef = window.firebaseCollection(window.firebaseDb, "lojas", uid, "compras");

    // Lógica de filtro por data (YYYY-MM-DD)
    const [ano, mes] = mesInput.split("-");
    const dataIni = `${ano}-${mes}-01`;
    const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
    const dataFim = `${ano}-${mes}-${String(ultimoDia).padStart(2, "0")}`;

    // Criamos a query com filtro de data e ordenação
    const q = window.firebaseQuery(
      comprasRef,
      window.firebaseWhere("data", ">=", dataIni),
      window.firebaseWhere("data", "<=", dataFim),
      window.firebaseOrderBy("data", "desc")
    );

    const snapshot = await window.firebaseGetDocs(q);

    // Mapeamos os resultados salvando o ID do documento em 'linha'
    comprasGlobal = snapshot.docs.map(doc => ({
      ...doc.data(),
      docId: doc.id
    }));

    renderizarCompras(); // Chama a função que desenha a tabela na tela
  } catch (err) {
    console.error("Erro ao buscar compras:", err);
    listEl.innerHTML = '<p style="text-align:center;color:#EF5350;padding:20px;">❌ Erro ao carregar compras do Firebase.</p>';
  }
}

// 1. Renderiza a lista de compras tornando o card clicável
function renderizarCompras() {
  const listEl = document.getElementById("lista-compras");
  if (!comprasGlobal.length) {
    listEl.innerHTML = '<p style="text-align:center;color:#B0BEC5;padding:20px;font-size:14px;">Nenhuma compra neste mês.</p>';
    return;
  }

  let tot = 0;
  let html = "";

  comprasGlobal.forEach(c => {
    const v = converterFloat(c.valor);
    tot += v;
    // Prepara dados para o clique
    const dadosB64 = btoa(unescape(encodeURIComponent(JSON.stringify(c))));

    html += `
      <div class="item-card item-card-compra" style="cursor:pointer; margin-top:8px;" onclick="abrirDetalhesCompra('${c.docId}', JSON.parse(decodeURIComponent(escape(atob('${dadosB64}')))))">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;">
            <div style="font-size:11px;color:#90A4AE;font-weight:700;">${formatarDataBR(c.dataISO || c.data)}</div>
            <div style="font-size:14px;font-weight:700;color:#333;">${c.fornecedor || "—"}</div>
            <div style="font-size:12px;color:#546E7A;">${c.descricao || ""}</div>
            ${c.linkNota ? `<span style="font-size:10px; color:#1565C0; font-weight:800;">📎 VER ${c.linkNota.split(',').length} ARQUIVO(S)</span>` : ""}
          </div>
          <strong style="font-size:17px;color:#E65100;">${formatarBRL(v)}</strong>
        </div>
      </div>`;
  });

  listEl.innerHTML = `
    <div style="background:#FFF8E1;border:1px solid #FFE082;border-radius:10px;padding:12px 15px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:13px;color:#E65100;font-weight:700;">Total do Mês</span>
      <strong style="font-size:18px;color:#E65100;">${formatarBRL(tot)}</strong>
    </div>` + html;
}

// 2. Abre a "Janela de Resumo" da Compra
function abrirDetalhesCompra(docId, d) {
  const modal = document.getElementById("modal-detalhes-compra");
  const resumoEl = document.getElementById("detalhes-compra-resumo");
  const notasEl = document.getElementById("detalhes-compra-notas");

  // Preenche o texto
  resumoEl.innerHTML = `
    <p>📅 <b>Data:</b> ${formatarDataBR(d.data)}</p>
    <p>🏭 <b>Fornecedor:</b> ${d.fornecedor || "Não informado"}</p>
    <p>📝 <b>Descrição:</b> ${d.descricao || "—"}</p>
    <p>💰 <b>Valor:</b> <span style="color:#E65100;font-weight:800;">${formatarBRL(d.valor)}</span></p>
    ${d.obs ? `<p>ℹ️ <b>Obs:</b> ${d.obs}</p>` : ""}
  `;

  // Lógica de Múltiplos Arquivos
  if (d.linkNota) {
    const links = d.linkNota.split(",");
    notasEl.innerHTML = `<p style="font-size:12px; font-weight:700; margin-bottom:8px; color:#333;">📎 Arquivos Anexados (${links.length}):</p>` +
      links.map((url, i) => `
        <a href="${url}" target="_blank" style="display:block; background:#F5F5F5; padding:10px; border-radius:8px; margin-bottom:5px; text-decoration:none; color:#1565C0; font-size:13px; border:1px solid #E0E0E0;">
          📄 Ver Arquivo ${i + 1}
        </a>
      `).join("");
  } else {
    notasEl.innerHTML = "";
  }

  // Configura botões de ação
  document.getElementById("btn-edit-compra").onclick = () => { fecharModalDetalhesCompra(); editarCompra(docId, d); };
  document.getElementById("btn-del-compra").onclick = () => { fecharModalDetalhesCompra(); excluirCompra(docId); };

  modal.style.display = "flex";
  _lockScroll();
}

function fecharModalDetalhesCompra() {
  document.getElementById("modal-detalhes-compra").style.display = "none";
  _unlockScroll();
}

function editarCompra(l, d) {
  document.getElementById("compra-docId-edicao").value = l;
  if (d.dataISO) document.getElementById("cp-data").value = d.dataISO;
  if (d.fornecedor) document.getElementById("cp-fornecedor").value = d.fornecedor;
  if (d.descricao) document.getElementById("cp-descricao").value = d.descricao;
  if (d.valor) document.getElementById("cp-valor").value = d.valor;
  if (d.obs) document.getElementById("cp-obs").value = d.obs;

  // No modo edição, não carregamos o comprovante existente no preview.
  // A variável _notasSelecionadas=null indica ao backend que deve preservar.
  document.getElementById("cp-nota-input").value = "";
  _notasSelecionadas = null;
  document.getElementById("preview-notas-gallery").innerHTML = "";
  document.getElementById("preview-notas-nomes").innerText = "";
  document.getElementById("preview-notas-container").style.display = "none";
  document.getElementById("placeholder-nota").style.display = "block";
  const contador = document.getElementById("nota-contador");
  if (contador) { contador.style.display = "none"; contador.innerText = ""; }

  document.getElementById("tela-compras").scrollTo({ top: 0, behavior: "smooth" });
}

async function excluirCompra(docId) {
  if (!await confirmarAcao("🗑️", "Excluir Compra", "Tem certeza?")) return;
  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  if (!uid) { mostrarToast("⚠️ Sessão expirada.", "erro"); return; }
  try {
    await window.firebaseDeleteDoc(
      window.firebaseDoc(window.firebaseDb, "lojas", uid, "compras", docId)
    );
    mostrarToast("✅ Excluída.", "sucesso");
    buscarCompras();
  } catch (err) {
    console.error("excluirCompra:", err);
    mostrarToast("❌ Erro ao excluir.", "erro");
  }
}

// ============================================================
// RELATÓRIOS
// ============================================================
function abrirRelatorios() { 
  // VERIFICAÇÃO DE PLANO: Relatórios disponível apenas no Premium
  if (!verificarAcessoFuncionalidade("relatorios")) {
    mostrarToastUpgrade("relatorios");
    return;
  }
  
  document.getElementById("filtro-mes-relatorio").value = mesAtual(); 
  document.getElementById("rel-mes-container").style.display = "block";
  document.getElementById("rel-data-ini-container").style.display = "none";
  document.getElementById("rel-data-fim-container").style.display = "none";
  mostrarTela("tela-relatorios"); 
  gerarRelatorio(); 
}

// Listener para mudança de período nos relatórios
function onPeriodoRelChange() {
  const periodo = document.getElementById("filtro-periodo-rel").value;
  const mesContainer = document.getElementById("rel-mes-container");
  const dataIniContainer = document.getElementById("rel-data-ini-container");
  const dataFimContainer = document.getElementById("rel-data-fim-container");
  
  // Esconde todos primeiro
  mesContainer.style.display = "none";
  dataIniContainer.style.display = "none";
  dataFimContainer.style.display = "none";
  
  if (periodo === "mes") {
    mesContainer.style.display = "block";
  } else if (periodo === "custom") {
    dataIniContainer.style.display = "block";
    dataFimContainer.style.display = "block";
  }
  
  gerarRelatorio();
}

// Carrega operadores únicos no filtro de funcionário
async function carregarOperadoresRelatorio() {
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    const vendasRef = window.firebaseCollection(window.firebaseDb, "lojas", uid, "vendas");
    const snapshot = await window.firebaseGetDocs(vendasRef);
    
    const operadores = new Set();
    snapshot.forEach(doc => {
      const v = doc.data();
      if (v.nomeOperador && v.nomeOperador.trim()) {
        operadores.add(v.nomeOperador.trim());
      }
    });
    
    const select = document.getElementById("filtro-func-rel");
    if (select) {
      select.innerHTML = '<option value="todos">👥 Todos</option>';
      Array.from(operadores).sort().forEach(op => {
        select.innerHTML += `<option value="${op}">${op}</option>`;
      });
    }
  } catch (err) {
    console.error('Erro ao carregar operadores:', err);
  }
}

// Reseta todos os filtros de relatório
function resetarFiltrosRelatorio() {
  document.getElementById("filtro-periodo-rel").value = "mes";
  document.getElementById("filtro-mes-relatorio").value = mesAtual();
  document.getElementById("filtro-data-ini-rel").value = "";
  document.getElementById("filtro-data-fim-rel").value = "";
  document.getElementById("filtro-tipo-rel").value = "todos";
  document.getElementById("filtro-func-rel").value = "todos";
  
  // Esconde campos de data personalizada
  document.getElementById("rel-data-ini-container").style.display = "none";
  document.getElementById("rel-data-fim-container").style.display = "none";
  document.getElementById("filtro-mes-relatorio").style.display = "block";
  
  gerarRelatorio();
}

async function gerarRelatorio() {
  const periodo = document.getElementById("filtro-periodo-rel").value;
  const mes = document.getElementById("filtro-mes-relatorio").value;
  const dataIni = document.getElementById("filtro-data-ini-rel").value;
  const dataFim = document.getElementById("filtro-data-fim-rel").value;
  const tipo = document.getElementById("filtro-tipo-rel").value;
  
  // Usa datas personalizadas se fornecidas, senão usa o mês ou outras opções
  let filtroDataIni, filtroDataFim, tituloPeriodo;
  
  if (periodo === "custom" && dataIni && dataFim) {
    filtroDataIni = dataIni;
    filtroDataFim = dataFim;
    tituloPeriodo = `${formatarDataBR(dataIni)} a ${formatarDataBR(dataFim)}`;
  } else if (periodo === "hoje") {
    const hoje = dataHoje();
    filtroDataIni = hoje;
    filtroDataFim = hoje;
    tituloPeriodo = `Hoje (${formatarDataBR(hoje)})`;
  } else if (periodo === "7dias") {
    const d = new Date(); 
    d.setDate(d.getDate() - 6);
    filtroDataIni = d.toISOString().split('T')[0];
    filtroDataFim = dataHoje();
    tituloPeriodo = `Últimos 7 dias (${formatarDataBR(filtroDataIni)} a ${formatarDataBR(filtroDataFim)})`;
  } else if (periodo === "mes" && mes) {
    const [ano, mesNum] = mes.split("-");
    filtroDataIni = `${ano}-${mesNum}-01`;
    const ultimoDia = new Date(Number(ano), Number(mesNum), 0).getDate();
    filtroDataFim = `${ano}-${mesNum}-${String(ultimoDia).padStart(2, "0")}`;
    const mesNome = new Date(Number(ano), Number(mesNum) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    tituloPeriodo = mesNome.charAt(0).toUpperCase() + mesNome.slice(1);
  } else {
    return;
  }

  ["rel-receita", "rel-compras", "rel-lucro"].forEach(id => {
    const el = document.getElementById(id); if (el) el.innerText = "...";
  });

  document.getElementById("lista-relatorio").innerHTML = '<div class="loader"></div>';

  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";

    const vendasRef = window.firebaseCollection(window.firebaseDb, "lojas", uid, "vendas");
    let q = window.firebaseQuery(
      vendasRef,
      window.firebaseWhere("data", ">=", filtroDataIni),
      window.firebaseWhere("data", "<=", filtroDataFim),
      window.firebaseOrderBy("data", "desc")
    );

    const snapshot = await window.firebaseGetDocs(q);

    let r = {
      receita: 0,
      compras: 0, // Compras ainda leremos do Google por enquanto ou ficará zerado
      totalDinheiro: 0,
      totalPix: 0,
      totalDebito: 0,
      totalCredito: 0,
      vendas: []
    };

    snapshot.forEach(docSnap => {
      const v = docSnap.data();
      
      // Aplica filtro de tipo
      if (tipo !== "todos" && v.modo !== tipo) return;
      
      const total = converterFloat(v.total || 0);
      r.receita += total;
      r.totalDinheiro += converterFloat(v.dinheiro || 0);
      r.totalPix += converterFloat(v.pix || 0);
      r.totalDebito += converterFloat(v.debito || 0);
      r.totalCredito += converterFloat(v.credito || 0);
      r.vendas.push({ ...v, dataISO: v.data, total: total });
    });

    dadosRelatorioGlobal = { ...r, tituloPeriodo };

    // Injeta os valores na tela
    document.getElementById("rel-receita").innerText = formatarBRL(r.receita);
    document.getElementById("rel-compras").innerText = formatarBRL(0); // Ajustaremos compras depois
    const lucro = r.receita - 0;
    const lEl = document.getElementById("rel-lucro");
    lEl.innerText = formatarBRL(lucro);
    lEl.style.color = lucro >= 0 ? "#2E7D32" : "#C62828";

    renderizarGrafico(r);
    renderizarListaRelatorio(r.vendas, tituloPeriodo);

  } catch (err) {
    console.error("Erro no Relatório Firebase:", err);
    document.getElementById("lista-relatorio").innerHTML = '<p style="text-align:center;color:#EF5350;padding:20px;">❌ Erro ao carregar dados.</p>';
  }
}


function renderizarGrafico(r) {
  const canvas = document.getElementById("grafico-pagamentos"), ph = document.getElementById("grafico-placeholder");
  const td = converterFloat(r.totalDinheiro || 0), tp = converterFloat(r.totalPix || 0), tdb = converterFloat(r.totalDebito || 0), tcr = converterFloat(r.totalCredito || 0), total = td + tp + tdb + tcr;
  if (!total) { canvas.style.display = "none"; ph.style.display = "block"; return; }
  canvas.style.display = "block"; ph.style.display = "none";
  if (graficoInstance) { graficoInstance.destroy(); graficoInstance = null; }
  
  // Configurar o canvas para ficar maior e à esquerda
  canvas.style.maxWidth = "320px";
  canvas.style.maxHeight = "320px";
  canvas.style.width = "100%";
  canvas.style.height = "auto";
  canvas.style.margin = "0";
  canvas.style.display = "inline-block";
  canvas.style.verticalAlign = "top";
  
  // Criar container horizontal para gráfico + legenda
  const container = canvas.parentElement;
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";
  container.style.gap = "8px";
  container.style.margin = "0";
  container.style.padding = "0";
  container.style.flexWrap = "nowrap";
  
  graficoInstance = new Chart(canvas, { 
    type: "doughnut", 
    data: { 
      labels: ["💵 Dinheiro", "📱 PIX", "💳 Débito", "💳 Crédito"], 
      datasets: [{ 
        data: [td, tp, tdb, tcr], 
        backgroundColor: ["#1565C0", "#FF8F00", "#2E7D32", "#7B1FA2"], 
        borderWidth: 2,
        borderColor: "#fff",
        hoverOffset: 8 
      }] 
    }, 
    options: { 
      responsive: true, 
      maintainAspectRatio: true,
      layout: {
        padding: 0
      },
      plugins: { 
        legend: { 
          position: "right", 
          labels: { 
            font: { size: 11, weight: "600" }, 
            padding: 8,
            boxWidth: 12,
            usePointStyle: true,
            pointStyle: 'circle',
            generateLabels: function(chart) {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                const dataset = data.datasets[0];
                const total = dataset.data.reduce((a, b) => a + b, 0);
                return data.labels.map((label, i) => {
                  const value = dataset.data[i];
                  const percentage = Math.round(value / total * 100);
                  // Texto mais curto para não cortar
                  const shortLabel = label.split(' ')[1] || label; // Remove emoji
                  return {
                    text: `${shortLabel}: ${formatarBRL(value)} (${percentage}%)`,
                    fillStyle: dataset.backgroundColor[i],
                    hidden: false,
                    index: i,
                    pointStyle: 'circle'
                  };
                });
              }
              return [];
            }
          } 
        }, 
        tooltip: { 
          callbacks: { 
            label: ctx => ` ${formatarBRL(ctx.raw)} (${Math.round(ctx.raw / total * 100)}%)` 
          } 
        } 
      } 
    } 
  });
}
function renderizarListaRelatorio(vendas, tituloPeriodo) {
  const listEl = document.getElementById("lista-relatorio");
  if (!vendas.length) { listEl.innerHTML = '<p style="text-align:center;color:#B0BEC5;padding:10px;font-size:13px;">Sem lançamentos.</p>'; return; }
  let html = `<div style="margin-top:10px;"><strong style="font-size:13px;color:#546E7A;display:block;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;">Lançamentos - ${tituloPeriodo}</strong>`;
  vendas.forEach(v => { 
    const tipo = v.modo === 'fechamento' ? `Fechamento de Caixa (${v.periodo})` : (v.periodo || "Venda");
    html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;font-size:13px;"><div><span style="color:#333;font-weight:600;">${formatarDataBR(v.dataISO || v.data)}</span><span style="color:#90A4AE;margin-left:8px;">${tipo}</span>${v.cliente ? `<span style="color:#1565C0;margin-left:6px;font-size:12px;">👤 ${v.cliente}</span>` : ""}</div><strong style="color:#1565C0;">${formatarBRL(converterFloat(v.total || 0))}</strong></div>`; 
  });
  html += "</div>"; listEl.innerHTML = html;
}
function enviarRelatorio() {
  if (!dadosRelatorioGlobal?.receita) { 
    mostrarToast("⚠️ Gere um relatório primeiro.", "aviso"); 
    return; 
  }

  // Criar modal de opções de compartilhamento
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 360px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  `;

  content.innerHTML = `
    <h3 style="margin: 0 0 16px 0; color: #1e3a8a; font-size: 18px; text-align: center;">
      📤 Enviar Relatório
    </h3>
    <p style="margin: 0 0 20px 0; color: #64748b; font-size: 14px; text-align: center;">
      Escolha como deseja compartilhar:
    </p>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <button onclick="compartilharRelatorio('texto')" style="
        background: #10b981;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      ">
        📝 Enviar como Texto
      </button>
      <button onclick="compartilharRelatorio('copiar')" style="
        background: #f59e0b;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      ">
        📋 Copiar Texto
      </button>
      <button onclick="compartilharRelatorio('imagem')" style="
        background: #3b82f6;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      ">
        🖼️ Enviar como Imagem
      </button>
      <button onclick="compartilharRelatorio('email')" style="
        background: #0078d4;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      ">
        📧 Enviar por Email
      </button>
      <button onclick="compartilharRelatorio('baixar')" style="
        background: #6366f1;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      ">
        💾 Baixar Imagem
      </button>
      <button onclick="fecharModalRelatorio()" style="
        background: #f1f5f9;
        color: #64748b;
        border: none;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        margin-top: 8px;
      ">
        Cancelar
      </button>
    </div>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  // Fechar modal ao clicar fora
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      fecharModalRelatorio();
    }
  });
}

function fecharModalRelatorio() {
  const modal = document.querySelector('div[style*="position: fixed"][style*="background: rgba"]');
  if (modal) {
    document.body.removeChild(modal);
  }
}

// ============================================================
// COMPARTILHAMENTO OTIMIZADO - Mobile & Desktop
// ============================================================

function detectarDispositivo() {
  const userAgent = navigator.userAgent.toLowerCase();
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  
  // Detectar mobile
  const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || 
                   (maxTouchPoints > 0 && /mobile|tablet/i.test(userAgent));
  
  return {
    isMobile: isMobile,
    isDesktop: !isMobile,
    isAndroid: /android/i.test(userAgent),
    isIOS: /iphone|ipad|ipod/i.test(userAgent)
  };
}

async function compartilharUniversal(tipo, dados) {
  const dispositivo = detectarDispositivo();
  
  if (tipo === 'texto') {
    await compartilharTextoUniversal(dados, dispositivo);
  } else if (tipo === 'imagem') {
    await compartilharImagemUniversal(dados, dispositivo);
  }
}

async function compartilharTextoUniversal(dados, dispositivo) {
  const { r, lucro, periodo } = dados;
  const txt = formatarTextoWhatsApp(r, lucro, periodo);
  
  if (dispositivo.isMobile) {
    // Mobile: tentar apps nativas diretamente
    await compartilharTextoMobile(txt, dispositivo);
  } else {
    // Desktop: Web Share API ou fallback
    await compartilharTextoDesktop(txt);
  }
}

async function compartilharTextoMobile(texto, dispositivo) {
  try {
    // Tentar Web Share API primeiro (melhor experiência)
    if (navigator.share) {
      await navigator.share({
        title: 'Relatório BateCaixa',
        text: texto
      });
      mostrarToast("✅ Relatório compartilhado!", "sucesso");
      return;
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.log("Web Share falhou, usando deep links...", err);
  }
  
  // Fallback: tentar abrir apps nativas com deep links
  if (dispositivo.isAndroid) {
    // Android: tentar WhatsApp diretamente
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    mostrarToast("📱 Abrindo WhatsApp...", "sucesso");
  } else if (dispositivo.isIOS) {
    // iOS: tentar WhatsApp
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
    mostrarToast("📱 Abrindo WhatsApp...", "sucesso");
  } else {
    // Fallback genérico: mostrar modal de cópia
    mostrarModalOpcoesTexto(dados.r, dados.lucro, dados.periodo);
  }
}

async function compartilharTextoDesktop(texto) {
  try {
    // Tentar Web Share API
    if (navigator.share) {
      await navigator.share({
        title: 'Relatório BateCaixa',
        text: texto
      });
      mostrarToast("✅ Relatório compartilhado!", "sucesso");
      return;
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.log("Web Share falhou no desktop...", err);
  }
  
  // Fallback desktop: copiar para área de transferência
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(texto);
      mostrarToast("✅ Texto copiado! Cole onde desejar.", "sucesso");
    } else {
      // Fallback mais antigo
      const textarea = document.createElement("textarea");
      textarea.value = texto;
      textarea.style.cssText = "position:fixed;opacity:0;left:-9999px;";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (successful) {
        mostrarToast("✅ Texto copiado! Cole onde desejar.", "sucesso");
      } else {
        mostrarToast("⚠️ Selecione e copie manualmente.", "aviso");
      }
    }
  } catch (err) {
    console.error("Erro ao copiar texto:", err);
    mostrarToast("❌ Erro ao copiar texto.", "erro");
  }
}

async function compartilharImagemUniversal(dados, dispositivo) {
  if (typeof html2canvas === "undefined") { 
    mostrarToast("⚠️ Indisponível.", "aviso"); 
    return; 
  }
  
  mostrarToast("📸 Gerando imagem...", "aviso");
  
  try {
    const canvas = await html2canvas(document.getElementById("tela-relatorios"), { 
      scale: 3, 
      useCORS: true, 
      backgroundColor: "#ffffff",
      willReadFrequently: true
    });
    
    canvas.toBlob(async (blob) => {
      const periodo = document.getElementById("filtro-mes-relatorio").value;
      const nomeArquivo = `relatorio-batecaixa-${periodo}.png`;
      
      if (!blob || blob.size === 0) {
        mostrarToast("❌ Erro ao gerar imagem.", "erro");
        return;
      }
      
      const { r, lucro } = dados;
      const texto = formatarTextoWhatsApp(r, lucro, periodo);
      
      if (dispositivo.isMobile) {
        // Mobile: tentar compartilhamento nativo com arquivo
        if (navigator.share && navigator.canShare) {
          try {
            const file = new File([blob], nomeArquivo, { 
              type: 'image/png',
              lastModified: new Date().getTime()
            });
            
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: 'Relatório BateCaixa',
                text: texto,
                files: [file]
              });
              mostrarToast("✅ Imagem compartilhada!", "sucesso");
              return;
            }
          } catch (err) {
            if (err.name === 'AbortError') return;
            console.log("Web Share com arquivo falhou, tentando WhatsApp...", err);
          }
        }
        
        // Fallback mobile: tentar WhatsApp com texto + instruções
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
        mostrarToast("📱 Abrindo WhatsApp! Cole a imagem manualmente.", "sucesso");
        
        // Baixar imagem para o usuário
        downloadImagemComNome(blob, nomeArquivo);
        setTimeout(() => {
          mostrarToast("⬇️ Imagem baixada! Anexe ao WhatsApp.", "info");
        }, 1000);
        
      } else {
        // Desktop: mostrar modal simplificado com opção de WhatsApp
        mostrarModalImagemDesktopOtimizado(blob, nomeArquivo, texto);
      }
      
    }, 'image/png', 1.0);
  } catch (err) {
    console.error("Erro ao gerar imagem:", err);
    mostrarToast("❌ Erro ao gerar imagem.", "erro");
  }
}

async function compartilharRelatorio(formato) {
  fecharModalRelatorio();
  
  if (!dadosRelatorioGlobal?.receita) { 
    mostrarToast("⚠️ Gere um relatório primeiro.", "aviso"); 
    return; 
  }
  
  const r = dadosRelatorioGlobal;
  const lucro = converterFloat(r.receita) - converterFloat(r.compras);
  const periodo = r?.tituloPeriodo || document.getElementById("filtro-mes-relatorio").value;
  const dados = { r, lucro, periodo };
  
  if (formato === 'texto') {
    await compartilharUniversal('texto', dados);
  } else if (formato === 'copiar') {
    // Abrir modal de opções de cópia (mantido para compatibilidade)
    mostrarModalOpcoesTexto(r, lucro, periodo);
  } else if (formato === 'imagem') {
    await compartilharUniversal('imagem', dados);
  } else if (formato === 'email') {
    // Enviar por email: gerar imagem e abrir email
    await enviarRelatorioPorEmail();
  } else if (formato === 'baixar') {
    await baixarImagemRelatorio();
  }
}

async function compartilharRelatorioTexto() {
  const r = dadosRelatorioGlobal;
  const lucro = converterFloat(r.receita) - converterFloat(r.compras);
  // Usar tituloPeriodo salvo no relatório, senão fallback para o input
  const periodo = r?.tituloPeriodo || document.getElementById("filtro-mes-relatorio").value;
  
  // Formato com negrito para WhatsApp
  const txt = formatarTextoWhatsApp(r, lucro, periodo);
  
  // Tentar Web Share API (funciona em mobile e alguns desktops)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Relatório BateCaixa',
        text: txt
      });
      mostrarToast("✅ Relatório compartilhado!", "sucesso");
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // Usuário cancelou
      console.log("Web Share falhou, tentando fallback...", err);
    }
  }
  
  // Fallback: mostrar modal com opções de cópia
  mostrarModalOpcoesTexto(r, lucro, periodo);
}

function formatarTextoGenerico(r, lucro, periodo) {
  return `📊 Relatório BateCaixa - ${periodo}
🏪 ${configuracoesGlobais.nomeLoja || "Meu Negócio"}

💵 Receita Bruta: ${formatarBRL(r.receita)}
🛒 Compras/Estoque: ${formatarBRL(r.compras)}
💰 Lucro Estimado: ${formatarBRL(lucro)}

Formas de recebimento:
• 💵 Dinheiro: ${formatarBRL(r.totalDinheiro || 0)}
• 📱 PIX: ${formatarBRL(r.totalPix || 0)}
• 💳 Débito: ${formatarBRL(r.totalDebito || 0)}
• 💳 Crédito: ${formatarBRL(r.totalCredito || 0)}

_Gerado pelo BateCaixa_`;
}

function formatarTextoWhatsApp(r, lucro, periodo) {
  // WhatsApp usa *texto* (um asterisco) para negrito
  return `*📊 Relatório BateCaixa - ${periodo}*
*🏪 ${configuracoesGlobais.nomeLoja || "Meu Negócio"}*

*💵 Receita Bruta:* ${formatarBRL(r.receita)}
*🛒 Compras/Estoque:* ${formatarBRL(r.compras)}
*💰 Lucro Estimado:* ${formatarBRL(lucro)}

*Formas de recebimento:*
• *💵 Dinheiro:* ${formatarBRL(r.totalDinheiro || 0)}
• *📱 PIX:* ${formatarBRL(r.totalPix || 0)}
• *💳 Débito:* ${formatarBRL(r.totalDebito || 0)}
• *💳 Crédito:* ${formatarBRL(r.totalCredito || 0)}

_Gerado pelo BateCaixa_`;
}

function formatarTextoTelegram(r, lucro, periodo) {
  return `*📊 Relatório BateCaixa* - \`${periodo}\`
*🏪 ${configuracoesGlobais.nomeLoja || "Meu Negócio"}*

*💵 Receita Bruta:* \`${formatarBRL(r.receita)}\`
*🛒 Compras/Estoque:* \`${formatarBRL(r.compras)}\`
*💰 Lucro Estimado:* \`${formatarBRL(lucro)}\`

*Formas de recebimento:*
• *💵 Dinheiro:* \`${formatarBRL(r.totalDinheiro || 0)}\`
• *📱 PIX:* \`${formatarBRL(r.totalPix || 0)}\`
• *💳 Débito:* \`${formatarBRL(r.totalDebito || 0)}\`
• *💳 Crédito:* \`${formatarBRL(r.totalCredito || 0)}\`

_Gerado pelo BateCaixa_`;
}

function formatarTextoEmail(r, lucro, periodo) {
  return `📊 RELATÓRIO BATECAIXA - ${periodo.toUpperCase()}
🏪 Loja: ${configuracoesGlobais.nomeLoja || "Meu Negócio"}

💰 RESUMO FINANCEIRO:
   Receita Bruta:     ${formatarBRL(r.receita)}
   Compras/Estoque:   ${formatarBRL(r.compras)}
   Lucro Estimado:    ${formatarBRL(lucro)}

💳 FORMAS DE RECEBIMENTO:
   Dinheiro: ${formatarBRL(r.totalDinheiro || 0)}
   PIX:      ${formatarBRL(r.totalPix || 0)}
   Débito:   ${formatarBRL(r.totalDebito || 0)}
   Crédito:  ${formatarBRL(r.totalCredito || 0)}

---
Gerado pelo BateCaixa`;
}

function mostrarModalOpcoesTexto(r, lucro, periodo) {
  // Remover modal existente se houver
  const modalExistente = document.getElementById('modal-texto-opcoes');
  if (modalExistente) {
    document.body.removeChild(modalExistente);
  }

  const modal = document.createElement('div');
  modal.id = 'modal-texto-opcoes';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 380px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    max-height: 80vh;
    overflow-y: auto;
  `;

  content.innerHTML = `
    <h3 style="margin: 0 0 16px 0; color: #1e3a8a; font-size: 18px; text-align: center;">
      📝 Copiar Texto para App
    </h3>
    <p style="margin: 0 0 20px 0; color: #64748b; font-size: 14px; text-align: center;">
      Escolha o formato para o app desejado:
    </p>
    
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <button onclick="copiarTextoFormatado('whatsapp')" style="
        background: #25D366;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      ">
        📱 Copiar para WhatsApp
      </button>
      <button onclick="copiarTextoFormatado('telegram')" style="
        background: #0088cc;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      ">
        ✈️ Copiar para Telegram
      </button>
      <button onclick="copiarTextoFormatado('email')" style="
        background: #EA4335;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      ">
        📧 Copiar para Email
      </button>
      <button onclick="copiarTextoFormatado('generico')" style="
        background: #6b7280;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      ">
        📄 Copiar Formato Genérico
      </button>
      <button onclick="fecharModalTextoOpcoes()" style="
        background: #f1f5f9;
        color: #64748b;
        border: none;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        margin-top: 8px;
      ">
        Cancelar
      </button>
    </div>
  `;

  // Armazenar dados globalmente
  window.textoDadosRelatorio = { r, lucro, periodo };

  modal.appendChild(content);
  document.body.appendChild(modal);

  // Fechar modal ao clicar fora
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      fecharModalTextoOpcoes();
    }
  });
}

async function copiarTextoFormatado(app) {
  const { r, lucro, periodo } = window.textoDadosRelatorio;
  let texto;

  switch(app) {
    case 'whatsapp':
      texto = formatarTextoWhatsApp(r, lucro, periodo);
      // Método especial para WhatsApp Web
      await copiarParaWhatsApp(texto);
      return; // Sai da função aqui para não executar o resto
    case 'telegram':
      texto = formatarTextoTelegram(r, lucro, periodo);
      break;
    case 'email':
      texto = formatarTextoEmail(r, lucro, periodo);
      break;
    default:
      texto = formatarTextoGenerico(r, lucro, periodo);
  }

  // Método padrão para outros apps
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(texto);
      mostrarToast(`✅ Texto copiado! Cole no ${app.charAt(0).toUpperCase() + app.slice(1)}.`, "sucesso");
    } else {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = texto;
      textarea.style.cssText = "position:fixed;opacity:0;left:-9999px;";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (successful) {
        mostrarToast(`✅ Texto copiado! Cole no ${app.charAt(0).toUpperCase() + app.slice(1)}.`, "sucesso");
      } else {
        mostrarToast("⚠️ Não foi possível copiar automaticamente.", "aviso");
      }
    }
    fecharModalTextoOpcoes();
  } catch (err) {
    console.error("Erro ao copiar texto:", err);
    mostrarToast("❌ Erro ao copiar texto.", "erro");
  }
}

async function copiarParaWhatsApp(texto) {
  try {
    // Método 1: Tentar Clipboard API normal primeiro
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(texto);
      mostrarToast("✅ Texto copiado! Cole no WhatsApp.", "sucesso");
    } else {
      // Método 2: Usar textarea visível temporariamente
      const textarea = document.createElement("textarea");
      textarea.value = texto;
      textarea.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 300px;
        height: 100px;
        padding: 10px;
        border: 2px solid #25D366;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10001;
        background: white;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      `;
      
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      
      const successful = document.execCommand('copy');
      
      // Remover após cópia
      setTimeout(() => {
        if (document.body.contains(textarea)) {
          document.body.removeChild(textarea);
        }
      }, 100);
      
      if (successful) {
        mostrarToast("✅ Texto copiado! Cole no WhatsApp.", "sucesso");
      } else {
        mostrarToast("⚠️ Selecione e copie o texto manualmente.", "aviso");
      }
    }
    
    // Mostrar instruções específicas para WhatsApp
    setTimeout(() => {
      mostrarToast("💡 Dica: No WhatsApp Web, cole e pressione Ctrl+Enter para enviar.", "info");
    }, 1500);
    
    fecharModalTextoOpcoes();
    
  } catch (err) {
    console.error("Erro ao copiar para WhatsApp:", err);
    mostrarToast("❌ Erro ao copiar texto.", "erro");
  }
}

function fecharModalTextoOpcoes() {
  const modal = document.getElementById('modal-texto-opcoes');
  if (modal) {
    document.body.removeChild(modal);
  }
  window.textoDadosRelatorio = null;
}

async function baixarImagemRelatorio() {
  if (typeof html2canvas === "undefined") { 
    mostrarToast("⚠️ Indisponível.", "aviso"); 
    return; 
  }
  
  mostrarToast("📸 Gerando imagem...", "aviso");
  
  try {
    const canvas = await html2canvas(document.getElementById("tela-relatorios"), { 
      scale: 3, 
      useCORS: true, 
      backgroundColor: "#ffffff",
      willReadFrequently: true
    });
    
    canvas.toBlob(async (blob) => {
      // Gerar nome dinâmico do arquivo
      const periodo = document.getElementById("filtro-mes-relatorio").value;
      const nomeArquivo = `relatorio-batecaixa-${periodo}.png`;
      
      downloadImagemComNome(blob, nomeArquivo);
      mostrarToast("⬇️ Imagem baixada com sucesso!", "sucesso");
    }, 'image/png');
  } catch (err) {
    console.error("Erro ao gerar imagem:", err);
    mostrarToast("❌ Erro ao gerar imagem.", "erro");
  }
}

async function compartilharRelatorioImagem() {
  if (typeof html2canvas === "undefined") { 
    mostrarToast("⚠️ Indisponível.", "aviso"); 
    return; 
  }
  
  mostrarToast("📸 Gerando imagem...", "aviso");
  
  try {
    const canvas = await html2canvas(document.getElementById("tela-relatorios"), { 
      scale: 3, 
      useCORS: true, 
      backgroundColor: "#ffffff",
      willReadFrequently: true
    });
    
    canvas.toBlob(async (blob) => {
      const periodo = document.getElementById("filtro-mes-relatorio").value;
      const nomeArquivo = `relatorio-batecaixa-${periodo}.png`;
      
      // Verificar se blob é válido
      if (!blob || blob.size === 0) {
        mostrarToast("❌ Erro ao gerar imagem.", "erro");
        return;
      }
      
      // Tentar Web Share API com arquivo (melhor opção)
      if (navigator.share && navigator.canShare) {
        try {
          // Criar arquivo com propriedades completas
          const file = new File([blob], nomeArquivo, { 
            type: 'image/png',
            lastModified: new Date().getTime()
          });
          
          // Verificar se pode compartilhar
          if (navigator.canShare({ files: [file] })) {
            // Usar tituloPeriodo do relatório se disponível, senão usar o valor do input
            const periodoTexto = dadosRelatorioGlobal?.tituloPeriodo || periodo;
            
            await navigator.share({
              title: 'Relatório BateCaixa',
              text: `Relatório - ${periodoTexto}`,
              files: [file]
            });
            mostrarToast("✅ Imagem compartilhada!", "sucesso");
            return;
          }
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.log("Web Share com arquivo falhou:", err);
        }
      }
      
      // Fallback: mostrar opções para desktop
      mostrarModalImagemDesktop(blob, nomeArquivo);
      
    }, 'image/png', 1.0); // Qualidade máxima (1.0)
  } catch (err) {
    console.error("Erro ao gerar imagem:", err);
    mostrarToast("❌ Erro ao gerar imagem.", "erro");
  }
}

async function enviarRelatorioPorEmail() {
  if (typeof html2canvas === "undefined") { 
    mostrarToast("⚠️ Indisponível.", "aviso"); 
    return; 
  }
  
  mostrarToast("📸 Gerando imagem para email...", "aviso");
  
  try {
    const canvas = await html2canvas(document.getElementById("tela-relatorios"), { 
      scale: 3, 
      useCORS: true, 
      backgroundColor: "#ffffff",
      willReadFrequently: true
    });
    
    canvas.toBlob(async (blob) => {
      const periodo = document.getElementById("filtro-mes-relatorio").value;
      const nomeArquivo = `relatorio-batecaixa-${periodo}.png`;
      
      // Baixar a imagem PRIMEIRO
      downloadImagemComNome(blob, nomeArquivo);
      mostrarToast("⬇️ Imagem baixada!", "sucesso");
      
      // Esperar 2 segundos para garantir que a imagem foi salva
      setTimeout(() => {
        // Abrir cliente de email
        const periodoTexto = dadosRelatorioGlobal?.tituloPeriodo || periodo;
        const r = dadosRelatorioGlobal;
        const lucro = converterFloat(r.receita) - converterFloat(r.compras);
        
        // Dados formatados para o email
        const dadosEmail = `
📊 RELATÓRIO BATECAIXA
📅 Período: ${periodoTexto}
🏪 Loja: ${configuracoesGlobais.nomeLoja || "Meu Negócio"}

💰 RESUMO FINANCEIRO:
   Receita Bruta:     ${formatarBRL(r.receita)}
   Compras/Estoque:   ${formatarBRL(r.compras)}
   Lucro Estimado:    ${formatarBRL(lucro)}

💳 FORMAS DE RECEBIMENTO:
   Dinheiro: ${formatarBRL(r.totalDinheiro || 0)}
   PIX:      ${formatarBRL(r.totalPix || 0)}
   Débito:   ${formatarBRL(r.totalDebito || 0)}
   Crédito:  ${formatarBRL(r.totalCredito || 0)}

---
📎 A imagem "${nomeArquivo}" foi baixada automaticamente.
   Anexe-a ao email para referência visual.`;
        
        const assunto = encodeURIComponent(`Relatório BateCaixa - ${periodoTexto}`);
        const corpo = encodeURIComponent(`Olá,\n\nSegue o relatório do BateCaixa:\n\n${dadosEmail}\n\n---\nGerado pelo BateCaixa`);
        
        window.open(`mailto:?subject=${assunto}&body=${corpo}`, '_blank');
        
        mostrarToast("📧 Email aberto! Anexe a imagem '${nomeArquivo}' baixada.", "info", 6000);
      }, 2000);
      
    }, 'image/png', 1.0);
  } catch (err) {
    console.error("Erro ao gerar imagem:", err);
    mostrarToast("❌ Erro ao gerar imagem.", "erro");
  }
}

function mostrarModalImagemDesktopOtimizado(blob, nomeArquivo, texto) {
  // Remover modal existente se houver
  const modalExistente = document.getElementById('modal-imagem-desktop');
  if (modalExistente) {
    document.body.removeChild(modalExistente);
  }

  const modal = document.createElement('div');
  modal.id = 'modal-imagem-desktop';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 380px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  `;

  content.innerHTML = `
    <h3 style="margin: 0 0 16px 0; color: #1e3a8a; font-size: 18px; text-align: center;">
      🖼️ Compartilhar Imagem
    </h3>
    <p style="margin: 0 0 20px 0; color: #64748b; font-size: 14px; text-align: center;">
      Escolha como deseja compartilhar:
    </p>
    
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <button onclick="enviarParaWhatsAppComImagem()" style="
        background: #25D366;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      ">
        📱 Enviar para WhatsApp
      </button>
      <button onclick="baixarImagemDesktop()" style="
        background: #3b82f6;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      ">
        💾 Baixar Imagem
      </button>
      <button onclick="fecharModalImagemDesktop()" style="
        background: #f1f5f9;
        color: #64748b;
        border: none;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        margin-top: 8px;
      ">
        Cancelar
      </button>
    </div>
  `;

  // Armazenar dados globalmente
  window.imagemBlobDesktop = blob;
  window.imagemNomeDesktop = nomeArquivo;
  window.imagemTextoDesktop = texto;

  modal.appendChild(content);
  document.body.appendChild(modal);

  // Fechar modal ao clicar fora
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      fecharModalImagemDesktop();
    }
  });
}

function enviarParaWhatsAppComImagem() {
  // Baixar a imagem primeiro
  if (window.imagemBlobDesktop && window.imagemNomeDesktop) {
    downloadImagemComNome(window.imagemBlobDesktop, window.imagemNomeDesktop);
    
    // Abrir WhatsApp Web com o texto
    window.open(`https://web.whatsapp.com/`, '_blank');
    
    setTimeout(() => {
      mostrarToast("📱 WhatsApp Web aberto! Anexe a imagem baixada.", "sucesso");
    }, 1000);
  }
  fecharModalImagemDesktop();
}

function abrirWhatsAppDesktop() {
  const dispositivo = detectarDispositivo();
  
  if (dispositivo.isMobile) {
    // Mobile: tentar abrir app nativa
    window.open(`https://wa.me/`, '_blank');
    mostrarToast("📱 Abrindo WhatsApp...", "sucesso");
  } else {
    // Desktop: abrir WhatsApp Web
    window.open('https://web.whatsapp.com/', '_blank');
    mostrarToast("📱 WhatsApp Web aberto! Envie a imagem baixada manualmente.", "info");
  }
  
  // Baixar automaticamente a imagem
  if (window.imagemBlobDesktop && window.imagemNomeDesktop) {
    downloadImagemComNome(window.imagemBlobDesktop, window.imagemNomeDesktop);
    setTimeout(() => {
      mostrarToast("⬇️ Imagem baixada! Cole no WhatsApp.", "sucesso");
    }, 1000);
  }
  fecharModalImagemDesktop();
}

function abrirTelegramDesktop() {
  const dispositivo = detectarDispositivo();
  
  if (dispositivo.isMobile) {
    // Mobile: tentar app nativa
    window.open(`https://tg://msg`, '_blank');
    mostrarToast("✈️ Abrindo Telegram...", "sucesso");
  } else {
    // Desktop: abrir Telegram Web
    window.open('https://web.telegram.org/', '_blank');
    mostrarToast("✈️ Telegram Web aberto! Envie a imagem baixada manualmente.", "info");
  }
  
  // Baixar automaticamente a imagem
  if (window.imagemBlobDesktop && window.imagemNomeDesktop) {
    downloadImagemComNome(window.imagemBlobDesktop, window.imagemNomeDesktop);
    setTimeout(() => {
      mostrarToast("⬇️ Imagem baixada! Cole no Telegram.", "sucesso");
    }, 1000);
  }
  fecharModalImagemDesktop();
}

function abrirEmailDesktop() {
  // Baixar a imagem primeiro
  if (window.imagemBlobDesktop && window.imagemNomeDesktop) {
    downloadImagemComNome(window.imagemBlobDesktop, window.imagemNomeDesktop);
    
    // Tentar abrir cliente de email padrão do sistema
    const periodoTexto = dadosRelatorioGlobal?.tituloPeriodo || '';
    const assunto = encodeURIComponent(`Relatório BateCaixa - ${periodoTexto}`);
    const corpo = encodeURIComponent(`Olá,\n\nSegue em anexo o relatório do BateCaixa.\n\nPeríodo: ${periodoTexto}\n\n---\nGerado pelo BateCaixa`);
    
    // Abrir mailto: (vai abrir o Outlook ou app de email padrão)
    window.open(`mailto:?subject=${assunto}&body=${corpo}`, '_blank');
    
    mostrarToast("📧 Cliente de email aberto! Anexe a imagem baixada.", "info");
    setTimeout(() => {
      mostrarToast("⬇️ Imagem baixada! Anexe ao email.", "sucesso");
    }, 1500);
  } else {
    mostrarToast("❌ Erro ao preparar email.", "erro");
  }
  fecharModalImagemDesktop();
}

function tentarCompartilharImagemDesktop() {
  if (window.imagemBlobDesktop && navigator.share) {
    const file = new File([window.imagemBlobDesktop], window.imagemNomeDesktop, { type: 'image/png' });
    
    navigator.share({
      title: 'Relatório BateCaixa',
      files: [file]
    }).then(() => {
      mostrarToast("✅ Compartilhamento iniciado!", "sucesso");
      fecharModalImagemDesktop();
    }).catch((err) => {
      console.error("Erro ao compartilhar:", err);
      mostrarToast("⚠️ Compartilhamento não suportado. Use a opção de baixar.", "aviso");
    });
  } else {
    mostrarToast("⚠️ Compartilhamento não disponível. Use a opção de baixar.", "aviso");
  }
}

function baixarImagemDesktop() {
  if (window.imagemBlobDesktop && window.imagemNomeDesktop) {
    downloadImagemComNome(window.imagemBlobDesktop, window.imagemNomeDesktop);
    mostrarToast("⬇️ Imagem baixada com sucesso!", "sucesso");
    fecharModalImagemDesktop();
  }
}

function fecharModalImagemDesktop() {
  const modal = document.getElementById('modal-imagem-desktop');
  if (modal) {
    document.body.removeChild(modal);
  }
  window.imagemBlobDesktop = null;
  window.imagemNomeDesktop = null;
  window.imagemTextoDesktop = null;
}

function downloadImagemComNome(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function copiarRelatorio() {
  if (!dadosRelatorioGlobal?.receita) { mostrarToast("⚠️ Gere um relatório primeiro.", "aviso"); return; }
  const r = dadosRelatorioGlobal, lucro = converterFloat(r.receita) - converterFloat(r.compras);
  const txt = `📊 *Relatório BateCaixa — ${document.getElementById("filtro-mes-relatorio").value}*\n🏪 ${configuracoesGlobais.nomeLoja || "Meu Negócio"}\n\n💵 *Receita Bruta:* ${formatarBRL(r.receita)}\n🛒 *Compras/Estoque:* ${formatarBRL(r.compras)}\n💰 *Lucro Estimado:* ${formatarBRL(lucro)}\n\nFormas de recebimento:\n• 💵 Dinheiro: ${formatarBRL(r.totalDinheiro || 0)}\n• 📱 PIX: ${formatarBRL(r.totalPix || 0)}\n• 💳 Débito: ${formatarBRL(r.totalDebito || 0)}\n• 💳 Crédito: ${formatarBRL(r.totalCredito || 0)}\n\n_Gerado pelo BateCaixa_`;
  if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(txt).then(() => mostrarToast("✅ Copiado!", "sucesso")).catch(() => mostrarToast("⚠️ Não foi possível copiar.", "aviso")); }
  else { const t = document.createElement("textarea"); t.value = txt; t.style.cssText = "position:fixed;opacity:0;"; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); mostrarToast("✅ Copiado!", "sucesso"); } catch { mostrarToast("⚠️ Não foi possível copiar.", "aviso"); } document.body.removeChild(t); }
}

function salvarImagemRelatorio() {
  if (typeof html2canvas === "undefined") { mostrarToast("⚠️ Indisponível.", "aviso"); return; }
  mostrarToast("📸 Gerando imagem...", "aviso");
  html2canvas(document.getElementById("tela-relatorios"), { scale: 2, useCORS: true, backgroundColor: "#ffffff", willReadFrequently: true }).then(canvas => { const l = document.createElement("a"); l.download = "relatorio-batecaixa.png"; l.href = canvas.toDataURL("image/png"); l.click(); mostrarToast("✅ Imagem salva!", "sucesso"); }).catch(() => mostrarToast("❌ Erro.", "erro"));
}

// ============================================================
// CONFIGURAÇÕES — FIX: não redireciona para o dashboard
// ============================================================
function abrirConfiguracoes() {
  // Define telaAtual ANTES de chamar qualquer async
  mostrarTela("tela-configuracoes");
  mudarAba("loja");

  // Preenche imediatamente com o que já temos "de cabeça" (cache em memória)
  const s = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ""; };
  s("cfg-nome-loja", configuracoesGlobais.nomeLoja);
  s("cfg-cidade", configuracoesGlobais.cidade);
  s("cfg-ramo", configuracoesGlobais.ramo);
  s("cfg-meta-valor", configuracoesGlobais.metaMensal);
  s("cfg-seu-nome", configuracoesGlobais.nomeProprietario || localStorage.getItem("user_name") || "");
  const estiloEl = document.getElementById("cfg-estilo-vendas");
  if (estiloEl && configuracoesGlobais.estiloVendas) estiloEl.value = configuracoesGlobais.estiloVendas;

  // FASE 12.1: Garantir que o select config-perfil-negocio carregue o valor do localStorage
  const selectPerfil = document.getElementById("config-perfil-negocio");
  if (selectPerfil) {
    const perfilCacheado = localStorage.getItem('perfilAdminTeste') || perfilNegocioAtual;
    selectPerfil.value = perfilCacheado;
    console.log('[CONFIGURAÇÕES] Perfil carregado para select:', perfilCacheado);
  }

  // AGORA A MÁGICA: Atualiza em background buscando do FIRESTORE (não mais do Google)
  _buscarConfigsFirestore().then(configs => {
    // Se o usuário já saiu da tela ou os dados vieram vazios, não faz nada
    if (telaAtual !== "tela-configuracoes" || !Object.keys(configs).length) return;

    // Guarda os novos dados na memória global
    Object.assign(configuracoesGlobais, configs);

    // Atualiza os campos da tela com os dados fresquinhos do Firebase
    s("cfg-nome-loja", configs.nomeLoja);
    s("cfg-cidade", configs.cidade);
    s("cfg-ramo", configs.ramo);
    s("cfg-meta-valor", configs.metaMensal);
    s("cfg-seu-nome", configs.nomeProprietario || localStorage.getItem("user_name") || "");
    if (estiloEl && configs.estiloVendas) estiloEl.value = configs.estiloVendas;
  }).catch(() => { });
}

// ============================================================
// HUB DE GESTÃO - Tela central de cadastros
// ============================================================
function abrirTelaGestao() {
  mostrarTela("tela-gestao");
  
  // Aplicar visibilidade dos cards conforme perfil atual
  const cardClientes = document.getElementById("card-gestao-clientes");
  const cardProdutos = document.getElementById("card-gestao-produtos");
  const cardFornecedores = document.getElementById("card-gestao-fornecedores");
  const cardServicos = document.getElementById("card-gestao-servicos");
  const cardAgencias = document.getElementById("card-gestao-agencias");
  const cardExecutantes = document.getElementById("card-gestao-executantes");
  
  if (perfilNegocioAtual === "servicos") {
    // Perfil Serviços: mostrar apenas relevantes
    if (cardClientes) cardClientes.style.display = "block";
    if (cardProdutos) cardProdutos.style.display = "none";
    if (cardFornecedores) cardFornecedores.style.display = "none";
    if (cardServicos) cardServicos.style.display = "block";
    if (cardAgencias) cardAgencias.style.display = "block";
    if (cardExecutantes) cardExecutantes.style.display = "block";
  } else {
    // Perfis Varejo: mostrar padrão
    if (cardClientes) cardClientes.style.display = "block";
    if (cardProdutos) cardProdutos.style.display = "block";
    if (cardFornecedores) cardFornecedores.style.display = "block";
    if (cardServicos) cardServicos.style.display = "none";
    if (cardAgencias) cardAgencias.style.display = "none";
    if (cardExecutantes) cardExecutantes.style.display = "none";
  }
}

// Funções de gestão - Módulos de Varejo
function abrirGestaoClientes() {
  mostrarTela("tela-gestao-clientes");
  carregarClientesHub();
}

function abrirGestaoProdutos() {
  mostrarTela("tela-gestao-produtos");
  carregarProdutosHub();
}

function abrirGestaoFornecedores() {
  mostrarTela("tela-gestao-fornecedores");
  carregarFornecedoresHub();
}

function abrirGestaoAgencias() {
  mostrarTela("tela-gestao-agencias");
  carregarAgencias();
}

function abrirGestaoServicos() {
  mostrarTela("tela-gestao-servicos");
  carregarTiposServico();
}

function abrirGestaoExecutantes() {
  mostrarTela("tela-gestao-executantes");
  carregarExecutantes();
}

// ============================================================
// CRUD DE EXECUTANTES
// ============================================================

/**
 * Salva ou atualiza um executante no Firebase
 */
async function salvarExecutante(event) {
  event.preventDefault();
  
  const btn = document.getElementById("btn-salvar-executante");
  const orig = btn.innerText;
  btn.innerText = "⏳ Salvando...";
  btn.disabled = true;
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const docId = document.getElementById("exec-docId-edicao").value;
    const nome = document.getElementById("exec-nome").value.trim();
    const telefone = document.getElementById("exec-telefone").value.trim();
    const pix = document.getElementById("exec-pix").value.trim();
    
    if (!nome) {
      mostrarToast("⚠️ Informe o nome do executante", "aviso");
      btn.innerText = orig;
      btn.disabled = false;
      return;
    }
    
    const dados = {
      nome,
      telefone,
      pix,
      atualizadoEm: new Date().toISOString()
    };
    
    if (docId) {
      // Edição: atualizar documento existente
      await window.firebaseSetDoc(
        window.firebaseDoc(window.firebaseDb, "lojas", uid, "executantes", docId),
        dados,
        { merge: true }
      );
      mostrarToast("✅ Executante atualizado!", "sucesso");
    } else {
      // Novo: criar documento
      dados.criadoEm = new Date().toISOString();
      await window.firebaseAddDoc(
        window.firebaseCollection(window.firebaseDb, "lojas", uid, "executantes"),
        dados
      );
      mostrarToast("✅ Executante cadastrado!", "sucesso");
    }
    
    // Limpar formulário
    document.getElementById("form-executante").reset();
    document.getElementById("exec-docId-edicao").value = "";
    btn.innerText = "💾 Adicionar Executante";
    
    // Recarregar lista
    carregarExecutantes();
    
  } catch (err) {
    console.error("Erro ao salvar executante:", err);
    mostrarToast("❌ Erro ao salvar executante", "erro");
    btn.innerText = orig;
    btn.disabled = false;
  }
}

/**
 * Carrega todos os executantes do Firebase
 */
async function carregarExecutantes() {
  const listaEl = document.getElementById("lista-executantes-cadastrados");
  const badgeEl = document.getElementById("badge-qtd-executantes");
  
  if (!listaEl) return;
  
  listaEl.innerHTML = '<div class="loader" style="margin:20px auto;"></div>';
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const q = window.firebaseQuery(
      window.firebaseCollection(window.firebaseDb, "lojas", uid, "executantes"),
      window.firebaseOrderBy("nome", "asc")
    );
    
    const snapshot = await window.firebaseGetDocs(q);
    const executantes = snapshot.docs.map(doc => ({
      ...doc.data(),
      docId: doc.id
    }));
    
    // Atualizar badge
    if (badgeEl) badgeEl.innerText = executantes.length;
    
    if (executantes.length === 0) {
      listaEl.innerHTML = `
        <div style="text-align:center;padding:30px;color:#90A4AE;">
          <div style="font-size:32px;margin-bottom:8px;">👤</div>
          <p style="font-size:13px;margin:0;">Nenhum executante cadastrado ainda.</p>
        </div>
      `;
      return;
    }
    
    // Renderizar lista
    let html = "";
    executantes.forEach(exec => {
      html += `
        <div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:14px;display:flex;justify-content:space-between;align-items:center;">
          <div style="flex:1;">
            <div style="font-weight:700;color:#333;font-size:15px;">${escapeHtml(exec.nome)}</div>
            ${exec.telefone ? `<div style="font-size:13px;color:#666;margin-top:2px;">📱 ${escapeHtml(exec.telefone)}</div>` : ''}
            ${exec.pix ? `<div style="font-size:12px;color:#009688;margin-top:2px;">💠 PIX: ${escapeHtml(exec.pix)}</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="editarExecutante('${exec.docId}')" style="background:#E3F2FD;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;color:#1565C0;font-size:13px;">
              ✏️
            </button>
            <button onclick="excluirExecutante('${exec.docId}', '${escapeHtml(exec.nome)}')" style="background:#FFEBEE;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;color:#C62828;font-size:13px;">
              🗑️
            </button>
          </div>
        </div>
      `;
    });
    
    listaEl.innerHTML = html;
    
  } catch (err) {
    console.error("Erro ao carregar executantes:", err);
    listaEl.innerHTML = `
      <div style="text-align:center;padding:20px;color:#EF5350;">
        <p style="font-size:13px;margin:0;">❌ Erro ao carregar executantes.</p>
      </div>
    `;
  }
}

/**
 * Carrega dados do executante para edição
 */
async function editarExecutante(docId) {
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const docSnap = await window.firebaseGetDoc(
      window.firebaseDoc(window.firebaseDb, "lojas", uid, "executantes", docId)
    );
    
    if (!docSnap.exists()) {
      mostrarToast("❌ Executante não encontrado", "erro");
      return;
    }
    
    const dados = docSnap.data();
    
    document.getElementById("exec-docId-edicao").value = docId;
    document.getElementById("exec-nome").value = dados.nome || "";
    document.getElementById("exec-telefone").value = dados.telefone || "";
    document.getElementById("exec-pix").value = dados.pix || "";
    
    document.getElementById("btn-salvar-executante").innerText = "💾 Atualizar Executante";
    
    // Scroll para o formulário
    document.getElementById("form-executante").scrollIntoView({ behavior: 'smooth' });
    
  } catch (err) {
    console.error("Erro ao carregar executante:", err);
    mostrarToast("❌ Erro ao carregar executante", "erro");
  }
}

/**
 * Limpa o formulário de executantes e remove modo de edição
 */
function limparFormExecutante() {
  document.getElementById("form-executante").reset();
  document.getElementById("exec-docId-edicao").value = "";
  document.getElementById("btn-salvar-executante").innerText = "💾 Adicionar Executante";
}

/**
 * Limpa o formulário de agências e remove modo de edição
 */
function limparFormAgencia() {
  document.getElementById("form-agencia").reset();
  document.getElementById("agencia-docId-edicao").value = "";
  document.getElementById("btn-salvar-agencia").innerText = "💾 Adicionar Agência";
}

/**
 * Limpa o formulário de tipos de serviço e remove modo de edição
 */
function limparFormTipoServico() {
  document.getElementById("form-tipo-servico").reset();
  document.getElementById("tipo-servico-docId-edicao").value = "";
  document.getElementById("btn-salvar-tipo-servico").innerText = "💾 Adicionar Tipo de Serviço";
}

/**
 * Limpa o formulário de clientes do Hub e remove modo de edição
 */
function limparFormClienteHub() {
  document.getElementById("form-gestao-cliente").reset();
  document.getElementById("gestao-cli-docId-edicao").value = "";
  document.getElementById("btn-salvar-cliente-hub").innerText = "💾 Adicionar Cliente";
}

// ============================================================
// CRUD DE CLIENTES NO HUB
// ============================================================

/**
 * Salva ou atualiza um cliente no Firebase (Hub de Gestão)
 */
async function salvarClienteHub(event) {
  event.preventDefault();
  
  const btn = document.getElementById("btn-salvar-cliente-hub");
  const orig = btn.innerText;
  btn.innerText = "⏳ Salvando...";
  btn.disabled = true;
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const docId = document.getElementById("gestao-cli-docId-edicao").value;
    const nome = document.getElementById("gestao-cli-nome").value.trim();
    const telefone = document.getElementById("gestao-cli-telefone").value.trim();
    const obs = document.getElementById("gestao-cli-obs").value.trim();
    
    if (!nome) {
      mostrarToast("⚠️ Informe o nome do cliente", "aviso");
      btn.innerText = orig;
      btn.disabled = false;
      return;
    }
    
    const dados = {
      nome,
      telefone,
      obs,
      atualizadoEm: new Date().toISOString()
    };
    
    if (docId) {
      // Edição
      await window.firebaseSetDoc(
        window.firebaseDoc(window.firebaseDb, "lojas", uid, "clientes", docId),
        dados,
        { merge: true }
      );
      mostrarToast("✅ Cliente atualizado!", "sucesso");
    } else {
      // Novo
      dados.criadoEm = new Date().toISOString();
      await window.firebaseAddDoc(
        window.firebaseCollection(window.firebaseDb, "lojas", uid, "clientes"),
        dados
      );
      mostrarToast("✅ Cliente cadastrado!", "sucesso");
    }
    
    // Limpar formulário
    limparFormClienteHub();
    
    // Recarregar lista
    carregarClientesHub();
    
  } catch (err) {
    console.error("Erro ao salvar cliente:", err);
    mostrarToast("❌ Erro ao salvar cliente", "erro");
    btn.innerText = orig;
    btn.disabled = false;
  }
}

/**
 * Carrega todos os clientes do Firebase (Hub de Gestão)
 */
async function carregarClientesHub() {
  const listaEl = document.getElementById("lista-clientes-hub");
  const badgeEl = document.getElementById("badge-qtd-clientes-hub");
  
  if (!listaEl) return;
  
  listaEl.innerHTML = '<div class="loader" style="margin:20px auto;"></div>';
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const q = window.firebaseQuery(
      window.firebaseCollection(window.firebaseDb, "lojas", uid, "clientes"),
      window.firebaseOrderBy("nome", "asc")
    );
    
    const snapshot = await window.firebaseGetDocs(q);
    const clientes = snapshot.docs.map(doc => ({
      ...doc.data(),
      docId: doc.id
    }));
    
    if (badgeEl) badgeEl.innerText = clientes.length;
    
    if (clientes.length === 0) {
      listaEl.innerHTML = `
        <div style="text-align:center;padding:30px;color:#90A4AE;">
          <div style="font-size:32px;margin-bottom:8px;">🧑</div>
          <p style="font-size:13px;margin:0;">Nenhum cliente cadastrado ainda.</p>
        </div>
      `;
      return;
    }
    
    let html = "";
    clientes.forEach(cli => {
      html += `
        <div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:14px;display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;">
            <div style="font-weight:700;color:#333;font-size:15px;">${escapeHtml(cli.nome)}</div>
            ${cli.telefone ? `<div style="font-size:13px;color:#666;margin-top:2px;">📱 ${escapeHtml(cli.telefone)}</div>` : ''}
            ${cli.obs ? `<div style="font-size:12px;color:#888;margin-top:4px;font-style:italic;">📝 ${escapeHtml(cli.obs)}</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="editarClienteHub('${cli.docId}')" style="background:#E3F2FD;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;color:#1565C0;font-size:13px;">✏️</button>
            <button onclick="excluirClienteHub('${cli.docId}', '${escapeHtml(cli.nome)}')" style="background:#FFEBEE;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;color:#C62828;font-size:13px;">🗑️</button>
          </div>
        </div>
      `;
    });
    
    listaEl.innerHTML = html;
    
  } catch (err) {
    console.error("Erro ao carregar clientes:", err);
    listaEl.innerHTML = `<div style="text-align:center;padding:20px;color:#EF5350;"><p style="font-size:13px;margin:0;">❌ Erro ao carregar clientes.</p></div>`;
  }
}

/**
 * Carrega dados do cliente para edição (Hub)
 */
async function editarClienteHub(docId) {
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const docSnap = await window.firebaseGetDoc(
      window.firebaseDoc(window.firebaseDb, "lojas", uid, "clientes", docId)
    );
    
    if (!docSnap.exists()) {
      mostrarToast("❌ Cliente não encontrado", "erro");
      return;
    }
    
    const dados = docSnap.data();
    
    document.getElementById("gestao-cli-docId-edicao").value = docId;
    document.getElementById("gestao-cli-nome").value = dados.nome || "";
    document.getElementById("gestao-cli-telefone").value = dados.telefone || "";
    document.getElementById("gestao-cli-obs").value = dados.obs || "";
    
    document.getElementById("btn-salvar-cliente-hub").innerText = "💾 Atualizar Cliente";
    
    document.getElementById("form-gestao-cliente").scrollIntoView({ behavior: 'smooth' });
    
  } catch (err) {
    console.error("Erro ao carregar cliente:", err);
    mostrarToast("❌ Erro ao carregar cliente", "erro");
  }
}

/**
 * Exclui um cliente do Firebase (Hub)
 */
async function excluirClienteHub(docId, nome) {
  if (!confirm(`Tem certeza que deseja excluir "${nome}"?`)) return;
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    await window.firebaseDeleteDoc(
      window.firebaseDoc(window.firebaseDb, "lojas", uid, "clientes", docId)
    );
    
    mostrarToast("✅ Cliente excluído", "sucesso");
    carregarClientesHub();
    
  } catch (err) {
    console.error("Erro ao excluir cliente:", err);
    mostrarToast("❌ Erro ao excluir cliente", "erro");
  }
}

// ============================================================
// CRUD DE PRODUTOS (Hub de Gestão)
// ============================================================

/**
 * Salva ou atualiza um produto no Firebase (Hub de Gestão)
 */
async function salvarProdutoHub(event) {
  event.preventDefault();
  
  const btn = document.getElementById("btn-salvar-produto-hub");
  const orig = btn.innerText;
  btn.innerText = "⏳ Salvando...";
  btn.disabled = true;
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const docId = document.getElementById("gestao-prod-docId-edicao").value;
    const nome = document.getElementById("gestao-prod-nome").value.trim();
    const codigo = document.getElementById("gestao-prod-codigo").value.trim();
    const precoCusto = parseFloat(document.getElementById("gestao-prod-preco-custo").value) || 0;
    const precoVenda = parseFloat(document.getElementById("gestao-prod-preco-venda").value) || 0;
    const estoque = parseInt(document.getElementById("gestao-prod-estoque").value) || 0;
    
    if (!nome) {
      mostrarToast("⚠️ Informe o nome do produto", "aviso");
      btn.innerText = orig;
      btn.disabled = false;
      return;
    }
    
    if (precoVenda <= 0) {
      mostrarToast("⚠️ Informe o preço de venda", "aviso");
      btn.innerText = orig;
      btn.disabled = false;
      return;
    }
    
    const dados = {
      nome,
      codigo,
      precoCusto,
      precoVenda,
      estoque,
      atualizadoEm: new Date().toISOString()
    };
    
    if (docId) {
      // Atualizar existente
      await window.firebaseSetDoc(
        window.firebaseDoc(window.firebaseDb, "lojas", uid, "produtos", docId),
        dados,
        { merge: true }
      );
      mostrarToast("✅ Produto atualizado", "sucesso");
    } else {
      // Criar novo
      dados.criadoEm = new Date().toISOString();
      await window.firebaseAddDoc(
        window.firebaseCollection(window.firebaseDb, "lojas", uid, "produtos"),
        dados
      );
      mostrarToast("✅ Produto cadastrado", "sucesso");
    }
    
    limparFormProdutoHub();
    carregarProdutosHub();
    
  } catch (err) {
    console.error("Erro ao salvar produto:", err);
    mostrarToast("❌ Erro ao salvar produto", "erro");
  } finally {
    btn.innerText = orig;
    btn.disabled = false;
  }
}

/**
 * Carrega a lista de produtos do Firebase (Hub)
 */
async function carregarProdutosHub() {
  const listaEl = document.getElementById("lista-produtos-hub");
  const badgeEl = document.getElementById("badge-qtd-produtos-hub");
  
  listaEl.innerHTML = `<div style="text-align:center;padding:30px;"><div class="loader"></div><p style="font-size:13px;color:#666;margin-top:10px;">Carregando produtos...</p></div>`;
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const snapshot = await window.firebaseGetDocs(
      window.firebaseQuery(
        window.firebaseCollection(window.firebaseDb, "lojas", uid, "produtos"),
        window.firebaseOrderBy("nome", "asc")
      )
    );
    
    const produtos = [];
    snapshot.forEach(docSnap => {
      produtos.push({ docId: docSnap.id, ...docSnap.data() });
    });
    
    badgeEl.innerText = produtos.length;
    
    if (!produtos.length) {
      listaEl.innerHTML = `<div style="text-align:center;padding:30px;color:#90A4AE;"><div style="font-size:32px;margin-bottom:8px;">📦</div><p style="font-size:13px;margin:0;">Nenhum produto cadastrado ainda.</p></div>`;
      return;
    }
    
    let html = "";
    produtos.forEach(prod => {
      const lucro = (prod.precoVenda || 0) - (prod.precoCusto || 0);
      const margem = prod.precoCusto > 0 ? ((lucro / prod.precoCusto) * 100).toFixed(1) : 0;
      html += `
        <div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:14px;display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;">
            <div style="font-weight:700;color:#333;font-size:15px;">${escapeHtml(prod.nome)}</div>
            ${prod.codigo ? `<div style="font-size:12px;color:#888;margin-top:2px;">🏷️ ${escapeHtml(prod.codigo)}</div>` : ''}
            <div style="display:flex;gap:15px;margin-top:6px;font-size:13px;">
              <span style="color:#666;">💰 Venda: <b style="color:#E65100;">R$ ${(prod.precoVenda || 0).toFixed(2)}</b></span>
              <span style="color:#666;">📦 Estoque: <b>${prod.estoque || 0}</b></span>
            </div>
            ${lucro > 0 ? `<div style="font-size:12px;color:#2E7D32;margin-top:4px;">📈 Lucro: R$ ${lucro.toFixed(2)} (${margem}%)</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="editarProdutoHub('${prod.docId}')" style="background:#FFF3E0;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;color:#E65100;font-size:13px;">✏️</button>
            <button onclick="excluirProdutoHub('${prod.docId}', '${escapeHtml(prod.nome)}')" style="background:#FFEBEE;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;color:#C62828;font-size:13px;">🗑️</button>
          </div>
        </div>
      `;
    });
    
    listaEl.innerHTML = html;
    
  } catch (err) {
    console.error("Erro ao carregar produtos:", err);
    listaEl.innerHTML = `<div style="text-align:center;padding:20px;color:#EF5350;"><p style="font-size:13px;margin:0;">❌ Erro ao carregar produtos.</p></div>`;
  }
}

/**
 * Carrega dados do produto para edição (Hub)
 */
async function editarProdutoHub(docId) {
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const docSnap = await window.firebaseGetDoc(
      window.firebaseDoc(window.firebaseDb, "lojas", uid, "produtos", docId)
    );
    
    if (!docSnap.exists()) {
      mostrarToast("❌ Produto não encontrado", "erro");
      return;
    }
    
    const dados = docSnap.data();
    
    document.getElementById("gestao-prod-docId-edicao").value = docId;
    document.getElementById("gestao-prod-nome").value = dados.nome || "";
    document.getElementById("gestao-prod-codigo").value = dados.codigo || "";
    document.getElementById("gestao-prod-preco-custo").value = dados.precoCusto || "";
    document.getElementById("gestao-prod-preco-venda").value = dados.precoVenda || "";
    document.getElementById("gestao-prod-estoque").value = dados.estoque || "";
    
    document.getElementById("btn-salvar-produto-hub").innerText = "💾 Atualizar Produto";
    
    document.getElementById("form-gestao-produto").scrollIntoView({ behavior: 'smooth' });
    
  } catch (err) {
    console.error("Erro ao carregar produto:", err);
    mostrarToast("❌ Erro ao carregar produto", "erro");
  }
}

/**
 * Exclui um produto do Firebase (Hub)
 */
async function excluirProdutoHub(docId, nome) {
  if (!confirm(`Tem certeza que deseja excluir "${nome}"?`)) return;
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    await window.firebaseDeleteDoc(
      window.firebaseDoc(window.firebaseDb, "lojas", uid, "produtos", docId)
    );
    
    mostrarToast("✅ Produto excluído", "sucesso");
    carregarProdutosHub();
    
  } catch (err) {
    console.error("Erro ao excluir produto:", err);
    mostrarToast("❌ Erro ao excluir produto", "erro");
  }
}

/**
 * Limpa o formulário de produto (Hub)
 */
function limparFormProdutoHub() {
  document.getElementById("gestao-prod-docId-edicao").value = "";
  document.getElementById("gestao-prod-nome").value = "";
  document.getElementById("gestao-prod-codigo").value = "";
  document.getElementById("gestao-prod-preco-custo").value = "";
  document.getElementById("gestao-prod-preco-venda").value = "";
  document.getElementById("gestao-prod-estoque").value = "";
  document.getElementById("btn-salvar-produto-hub").innerText = "💾 Adicionar Produto";
}

// ============================================================
// CRUD DE FORNECEDORES (Hub de Gestão)
// ============================================================

/**
 * Salva ou atualiza um fornecedor no Firebase (Hub de Gestão)
 */
async function salvarFornecedorHub(event) {
  event.preventDefault();
  
  const btn = document.getElementById("btn-salvar-fornecedor-hub");
  const orig = btn.innerText;
  btn.innerText = "⏳ Salvando...";
  btn.disabled = true;
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const docId = document.getElementById("gestao-forn-docId-edicao").value;
    const nome = document.getElementById("gestao-forn-nome").value.trim();
    const telefone = document.getElementById("gestao-forn-telefone").value.trim();
    const documento = document.getElementById("gestao-forn-documento").value.trim();
    
    if (!nome) {
      mostrarToast("⚠️ Informe o nome do fornecedor", "aviso");
      btn.innerText = orig;
      btn.disabled = false;
      return;
    }
    
    const dados = {
      nome,
      telefone,
      documento,
      atualizadoEm: new Date().toISOString()
    };
    
    if (docId) {
      // Atualizar existente
      await window.firebaseSetDoc(
        window.firebaseDoc(window.firebaseDb, "lojas", uid, "fornecedores", docId),
        dados,
        { merge: true }
      );
      mostrarToast("✅ Fornecedor atualizado", "sucesso");
    } else {
      // Criar novo
      dados.criadoEm = new Date().toISOString();
      await window.firebaseAddDoc(
        window.firebaseCollection(window.firebaseDb, "lojas", uid, "fornecedores"),
        dados
      );
      mostrarToast("✅ Fornecedor cadastrado", "sucesso");
    }
    
    limparFormFornecedorHub();
    carregarFornecedoresHub();
    
  } catch (err) {
    console.error("Erro ao salvar fornecedor:", err);
    mostrarToast("❌ Erro ao salvar fornecedor", "erro");
  } finally {
    btn.innerText = orig;
    btn.disabled = false;
  }
}

/**
 * Carrega a lista de fornecedores do Firebase (Hub)
 */
async function carregarFornecedoresHub() {
  const listaEl = document.getElementById("lista-fornecedores-hub");
  const badgeEl = document.getElementById("badge-qtd-fornecedores-hub");
  
  listaEl.innerHTML = `<div style="text-align:center;padding:30px;"><div class="loader"></div><p style="font-size:13px;color:#666;margin-top:10px;">Carregando fornecedores...</p></div>`;
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const snapshot = await window.firebaseGetDocs(
      window.firebaseQuery(
        window.firebaseCollection(window.firebaseDb, "lojas", uid, "fornecedores"),
        window.firebaseOrderBy("nome", "asc")
      )
    );
    
    const fornecedores = [];
    snapshot.forEach(docSnap => {
      fornecedores.push({ docId: docSnap.id, ...docSnap.data() });
    });
    
    badgeEl.innerText = fornecedores.length;
    
    if (!fornecedores.length) {
      listaEl.innerHTML = `<div style="text-align:center;padding:30px;color:#90A4AE;"><div style="font-size:32px;margin-bottom:8px;">🏭</div><p style="font-size:13px;margin:0;">Nenhum fornecedor cadastrado ainda.</p></div>`;
      return;
    }
    
    let html = "";
    fornecedores.forEach(forn => {
      html += `
        <div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:14px;display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;">
            <div style="font-weight:700;color:#333;font-size:15px;">${escapeHtml(forn.nome)}</div>
            ${forn.telefone ? `<div style="font-size:13px;color:#666;margin-top:2px;">📱 ${escapeHtml(forn.telefone)}</div>` : ''}
            ${forn.documento ? `<div style="font-size:12px;color:#888;margin-top:4px;font-style:italic;">🆔 ${escapeHtml(forn.documento)}</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="editarFornecedorHub('${forn.docId}')" style="background:#F3E5F5;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;color:#7B1FA2;font-size:13px;">✏️</button>
            <button onclick="excluirFornecedorHub('${forn.docId}', '${escapeHtml(forn.nome)}')" style="background:#FFEBEE;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;color:#C62828;font-size:13px;">🗑️</button>
          </div>
        </div>
      `;
    });
    
    listaEl.innerHTML = html;
    
  } catch (err) {
    console.error("Erro ao carregar fornecedores:", err);
    listaEl.innerHTML = `<div style="text-align:center;padding:20px;color:#EF5350;"><p style="font-size:13px;margin:0;">❌ Erro ao carregar fornecedores.</p></div>`;
  }
}

/**
 * Carrega dados do fornecedor para edição (Hub)
 */
async function editarFornecedorHub(docId) {
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const docSnap = await window.firebaseGetDoc(
      window.firebaseDoc(window.firebaseDb, "lojas", uid, "fornecedores", docId)
    );
    
    if (!docSnap.exists()) {
      mostrarToast("❌ Fornecedor não encontrado", "erro");
      return;
    }
    
    const dados = docSnap.data();
    
    document.getElementById("gestao-forn-docId-edicao").value = docId;
    document.getElementById("gestao-forn-nome").value = dados.nome || "";
    document.getElementById("gestao-forn-telefone").value = dados.telefone || "";
    document.getElementById("gestao-forn-documento").value = dados.documento || "";
    
    document.getElementById("btn-salvar-fornecedor-hub").innerText = "💾 Atualizar Fornecedor";
    
    document.getElementById("form-gestao-fornecedor").scrollIntoView({ behavior: 'smooth' });
    
  } catch (err) {
    console.error("Erro ao carregar fornecedor:", err);
    mostrarToast("❌ Erro ao carregar fornecedor", "erro");
  }
}

/**
 * Exclui um fornecedor do Firebase (Hub)
 */
async function excluirFornecedorHub(docId, nome) {
  if (!confirm(`Tem certeza que deseja excluir "${nome}"?`)) return;
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    await window.firebaseDeleteDoc(
      window.firebaseDoc(window.firebaseDb, "lojas", uid, "fornecedores", docId)
    );
    
    mostrarToast("✅ Fornecedor excluído", "sucesso");
    carregarFornecedoresHub();
    
  } catch (err) {
    console.error("Erro ao excluir fornecedor:", err);
    mostrarToast("❌ Erro ao excluir fornecedor", "erro");
  }
}

/**
 * Limpa o formulário de fornecedor (Hub)
 */
function limparFormFornecedorHub() {
  document.getElementById("gestao-forn-docId-edicao").value = "";
  document.getElementById("gestao-forn-nome").value = "";
  document.getElementById("gestao-forn-telefone").value = "";
  document.getElementById("gestao-forn-documento").value = "";
  document.getElementById("btn-salvar-fornecedor-hub").innerText = "💾 Adicionar Fornecedor";
}

// ============================================================
// PONTE DE DADOS: Integração dos Datalists do Formulário com o Hub
// ============================================================

/**
 * Carrega sugestões para os datalists do formulário de serviços
 * Combina dados do Firebase (Gestão) com dados do Histórico
 */
async function carregarSugestoesFormularioServicos() {
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) return;
    
    console.log("[DATALISTS] Carregando sugestões do Hub de Gestão...");
    
    // Sets para evitar duplicidades
    const executantesSet = new Set();
    const clientesSet = new Set();
    const tiposServicoSet = new Set();
    const agenciasSet = new Set();
    
    // Mapa para armazenar valores sugeridos por tipo de serviço
    window.mapaValoresServico = new Map();
    
    // Mapa para armazenar valores por hora das agências
    window.mapaValoresAgencia = new Map();
    
    // Buscar Executantes
    try {
      const qExec = window.firebaseQuery(
        window.firebaseCollection(window.firebaseDb, "lojas", uid, "executantes"),
        window.firebaseOrderBy("nome", "asc")
      );
      const snapExec = await window.firebaseGetDocs(qExec);
      snapExec.docs.forEach(doc => {
        const dados = doc.data();
        if (dados.nome) executantesSet.add(dados.nome);
      });
    } catch (e) { console.warn("[DATALISTS] Erro ao carregar executantes:", e); }
    
    // Buscar Clientes
    try {
      const qCli = window.firebaseQuery(
        window.firebaseCollection(window.firebaseDb, "lojas", uid, "clientes"),
        window.firebaseOrderBy("nome", "asc")
      );
      const snapCli = await window.firebaseGetDocs(qCli);
      snapCli.docs.forEach(doc => {
        const dados = doc.data();
        if (dados.nome) clientesSet.add(dados.nome);
      });
    } catch (e) { console.warn("[DATALISTS] Erro ao carregar clientes:", e); }
    
    // Buscar Tipos de Serviço (com valor sugerido)
    try {
      const qTipo = window.firebaseQuery(
        window.firebaseCollection(window.firebaseDb, "lojas", uid, "tipos_servico"),
        window.firebaseOrderBy("nome", "asc")
      );
      const snapTipo = await window.firebaseGetDocs(qTipo);
      snapTipo.docs.forEach(doc => {
        const dados = doc.data();
        if (dados.nome) {
          tiposServicoSet.add(dados.nome);
          // Guardar valor sugerido para autofill
          if (dados.valorBase && dados.valorBase > 0) {
            window.mapaValoresServico.set(dados.nome, dados.valorBase);
          }
        }
      });
    } catch (e) { console.warn("[DATALISTS] Erro ao carregar tipos de serviço:", e); }
    
    // Buscar Agências (com comissão)
    try {
      const qAg = window.firebaseQuery(
        window.firebaseCollection(window.firebaseDb, "lojas", uid, "agencias"),
        window.firebaseOrderBy("nome", "asc")
      );
      const snapAg = await window.firebaseGetDocs(qAg);
      snapAg.docs.forEach(doc => {
        const dados = doc.data();
        if (dados.nome) {
          agenciasSet.add(dados.nome);
          // Guardar valor por hora para autofill
          if (dados.valorHora && dados.valorHora > 0) {
            window.mapaValoresAgencia.set(dados.nome, dados.valorHora);
          }
        }
      });
    } catch (e) { console.warn("[DATALISTS] Erro ao carregar agências:", e); }
    
    // Adicionar também dados do histórico (se existirem)
    if (typeof historicoGlobal !== 'undefined' && historicoGlobal.length > 0) {
      historicoGlobal.forEach(venda => {
        if (venda.executante) executantesSet.add(venda.executante);
        if (venda.cliente) clientesSet.add(venda.cliente);
        if (venda.descricao) tiposServicoSet.add(venda.descricao);
        if (venda.agencia) agenciasSet.add(venda.agencia);
      });
    }
    
    // Popular os datalists
    popularDatalist("lista-executantes", executantesSet);
    popularDatalist("lista-clientes-servico", clientesSet);
    popularDatalist("lista-tipos-servico", tiposServicoSet);
    popularDatalist("lista-agencias", agenciasSet);
    
    // Log de debug
    console.log(`[DATALISTS] Mapa de valores de agências:`, window.mapaValoresAgencia);
    
    // Configurar listener para autofill do valor sugerido
    configurarAutofillValorServico();
    
    console.log(`[DATALISTS] Sugestões carregadas: ${executantesSet.size} executantes, ${clientesSet.size} clientes, ${tiposServicoSet.size} serviços, ${agenciasSet.size} agências`);
    
  } catch (err) {
    console.error("[DATALISTS] Erro ao carregar sugestões:", err);
  }
}

// ============================================================
// PONTE DE DADOS: Integração dos Datalists do Formulário VAREJO com o Hub
// ============================================================

/**
 * Carrega sugestões para os datalists do formulário de VAREJO
 * Combina dados do Firebase (Gestão) com dados do Histórico
 */
async function carregarSugestoesFormularioVarejo() {
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    // Sets para evitar duplicatas
    const produtosSet = new Set();
    const clientesSet = new Set();
    
    // Mapa de preços para autofill (nome do produto -> precoVenda)
    window.mapaPrecosProduto = new Map();
    // FASE 11.5: Mapa de IDs dos produtos para baixa de estoque (nome -> docId)
    window.mapaIdsProduto = new Map();
    
    console.log("[DATALISTS-VAREJO] Carregando sugestões...");
    
    // Buscar Produtos do Hub (com preços)
    try {
      const qProd = window.firebaseQuery(
        window.firebaseCollection(window.firebaseDb, "lojas", uid, "produtos"),
        window.firebaseOrderBy("nome", "asc")
      );
      const snapProd = await window.firebaseGetDocs(qProd);
      snapProd.docs.forEach(doc => {
        const dados = doc.data();
        if (dados.nome) {
          produtosSet.add(dados.nome);
          // Guardar preço e docId no mapa global para autofill
          const precoVenda = dados.precoVenda || dados.preco || 0;
          if (precoVenda > 0) {
            window.mapaPrecosProduto.set(dados.nome, precoVenda);
          }
          // Guardar ID do produto para baixa de estoque
          if (doc.id) {
            window.mapaIdsProduto.set(dados.nome, doc.id);
          }
        }
      });
    } catch (e) { console.warn("[DATALISTS-VAREJO] Erro ao carregar produtos:", e); }
    
    // Buscar Clientes do Hub
    try {
      const qCli = window.firebaseQuery(
        window.firebaseCollection(window.firebaseDb, "lojas", uid, "clientes"),
        window.firebaseOrderBy("nome", "asc")
      );
      const snapCli = await window.firebaseGetDocs(qCli);
      snapCli.docs.forEach(doc => {
        const dados = doc.data();
        if (dados.nome) clientesSet.add(dados.nome);
      });
    } catch (e) { console.warn("[DATALISTS-VAREJO] Erro ao carregar clientes:", e); }
    
    // Adicionar também dados do histórico (se existirem)
    if (typeof historicoGlobal !== 'undefined' && historicoGlobal.length > 0) {
      historicoGlobal.forEach(venda => {
        if (venda.descricao) produtosSet.add(venda.descricao);
        if (venda.cliente) clientesSet.add(venda.cliente);
      });
    }
    
    // Popular os datalists
    popularDatalist("lista-produtos-varejo", produtosSet);
    popularDatalist("lista-clientes-varejo", clientesSet);
    
    // Log de debug
    console.log(`[DATALISTS-VAREJO] Mapa de preços:`, window.mapaPrecosProduto);
    console.log(`[DATALISTS-VAREJO] Mapa de IDs:`, window.mapaIdsProduto);
    console.log(`[DATALISTS-VAREJO] Sugestões carregadas: ${produtosSet.size} produtos, ${clientesSet.size} clientes`);
    
  } catch (err) {
    console.error("[DATALISTS-VAREJO] Erro ao carregar sugestões:", err);
  }
}

/**
 * FASE 11.9: Calcula o total da venda no perfil Varejo (infalível)
 * Lê valor unitário do campo e multiplica pela quantidade
 */
function calcularTotalVarejo() {
  const inputValorIndividual = document.getElementById("vd-valor-individual");
  const inputQuantidade = document.getElementById("vd-quantidade");
  const inputValorTotal = document.getElementById("vd-valor");
  
  if (!inputValorIndividual || !inputQuantidade || !inputValorTotal) {
    console.log('[CALCULO-VAREJO] Elementos não encontrados');
    return;
  }
  
  // Ler quantidade (validar)
  let quantidade = parseInt(inputQuantidade.value) || 1;
  if (quantidade < 1 || isNaN(quantidade)) quantidade = 1;
  
  // Ler valor unitário com limpeza robusta de formatação
  let precoBase = 0;
  if (inputValorIndividual.value) {
    // Remover tudo exceto dígitos, vírgula e ponto
    const valorLimpo = inputValorIndividual.value.replace(/[^\d,-]/g, '');
    // Converter vírgula para ponto (formato brasileiro)
    const valorStr = valorLimpo.replace(',', '.');
    precoBase = parseFloat(valorStr) || 0;
    console.log(`[CALCULO-VAREJO] Valor unitário lido: "${inputValorIndividual.value}" → R$ ${precoBase}`);
  }
  
  // Calcular total
  const total = precoBase * quantidade;
  
  // Preencher campo de valor total
  inputValorTotal.value = total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  console.log(`[CALCULO-VAREJO] ✅ ${precoBase} × ${quantidade} = ${total}`);
}

/**
 * Handler quando um produto é selecionado no formulário de Varejo
 * Preenche automaticamente o preço de venda e captura o ID do produto
 */
function onProdutoSelecionadoVarejo(nomeProduto) {
  if (!nomeProduto) {
    console.log('[AUTOFILL-VAREJO] Nome do produto vazio');
    return;
  }
  
  console.log(`[AUTOFILL-VAREJO] Produto selecionado: "${nomeProduto}"`);
  console.log(`[AUTOFILL-VAREJO] mapaPrecosProduto existe:`, !!window.mapaPrecosProduto);
  console.log(`[AUTOFILL-VAREJO] mapaIdsProduto existe:`, !!window.mapaIdsProduto);
  
  // Preencher preço unitário
  if (window.mapaPrecosProduto) {
    const preco = window.mapaPrecosProduto.get(nomeProduto);
    console.log(`[AUTOFILL-VAREJO] Preço encontrado no mapa:`, preco);
    
    if (preco && preco > 0) {
      const inputValor = document.getElementById("vd-valor-individual");
      if (inputValor) {
        inputValor.value = preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        console.log(`[AUTOFILL-VAREJO] Preço preenchido no campo: "${inputValor.value}"`);
        
        // FASE 11.11: Sincronizar vd-valor (total) com vd-valor-individual ao selecionar produto
        const inputValorTotal = document.getElementById("vd-valor");
        if (inputValorTotal) {
          inputValorTotal.value = inputValor.value;
          console.log(`[AUTOFILL-VAREJO] Valor total sincronizado: "${inputValorTotal.value}"`);
        }
      } else {
        console.log(`[AUTOFILL-VAREJO] ❌ Campo vd-valor-individual não encontrado!`);
      }
    } else {
      console.log(`[AUTOFILL-VAREJO] ❌ Preço inválido: ${preco}`);
    }
  } else {
    console.log(`[AUTOFILL-VAREJO] ❌ mapaPrecosProduto não existe!`);
  }
  
  // FASE 11.10: Capturar ID do produto SEMPRE (sem filtro de perfil)
  // O controle de baixa de estoque deve ficar apenas na função de baixar
  const inputDescricao = document.getElementById("vd-descricao");
  if (inputDescricao && window.mapaIdsProduto) {
    console.log(`[AUTOFILL-VAREJO] Capturando ID para: "${nomeProduto}"`);
    const produtoId = window.mapaIdsProduto.get(nomeProduto);
    console.log(`[AUTOFILL-VAREJO] ID encontrado:`, produtoId);
    
    if (produtoId) {
      inputDescricao.dataset.produtoId = produtoId;
      console.log(`[AUTOFILL-VAREJO] ✅ Produto ID salvo no dataset: ${produtoId}`);
    } else {
      delete inputDescricao.dataset.produtoId;
      console.log(`[AUTOFILL-VAREJO] ❌ ID não encontrado para: "${nomeProduto}"`);
    }
  } else {
    console.log(`[AUTOFILL-VAREJO] Não foi possível salvar ID: inputDescricao=${!!inputDescricao}, mapaIdsProduto=${!!window.mapaIdsProduto}`);
  }
  
  // Calcular total automaticamente
  calcularTotalVarejo();
}

/**
 * FASE 11.5: Baixa automática de estoque após venda
 * Usa o produtoId capturado no dataset do input de descrição
 * @param {string} produtoId - ID do produto no Firebase
 * @param {number} quantidadeVendida - Quantidade vendida
 */
async function baixarEstoqueProduto(produtoId, quantidadeVendida) {
  console.log(`[DEBUG ESTOQUE] Iniciando baixa - Produto ID: ${produtoId}, Qtd: ${quantidadeVendida}`);
  
  if (!produtoId || !quantidadeVendida || quantidadeVendida <= 0) {
    console.log(`[DEBUG ESTOQUE] Pulando: produtoId=${produtoId}, quantidade=${quantidadeVendida}`);
    return;
  }
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid");
    console.log(`[DEBUG ESTOQUE] UID: ${uid}`);
    
    if (!uid) {
      console.log("[BAIXA-ESTOQUE] UID não disponível, pulando baixa");
      return;
    }
    
    // Verificar se updateDoc está disponível
    if (!window.firebaseUpdateDoc) {
      console.error("[DEBUG ESTOQUE] ERRO: window.firebaseUpdateDoc não está disponível!");
      return;
    }
    
    // Buscar produto no Firestore
    const prodRef = window.firebaseDoc(window.firebaseDb, "lojas", uid, "produtos", produtoId);
    console.log(`[DEBUG ESTOQUE] Buscando produto no path: lojas/${uid}/produtos/${produtoId}`);
    
    const prodSnap = await window.firebaseGetDoc(prodRef);
    
    if (!prodSnap.exists()) {
      console.log(`[BAIXA-ESTOQUE] Produto ${produtoId} não encontrado`);
      return;
    }
    
    const produto = prodSnap.data();
    const estoqueAtual = parseInt(produto.estoque) || 0;
    const novoEstoque = Math.max(0, estoqueAtual - quantidadeVendida);
    
    console.log(`[DEBUG ESTOQUE] Produto: ${produto.nome}, Estoque atual: ${estoqueAtual}, Novo: ${novoEstoque}`);
    
    // Atualizar estoque no Firestore
    await window.firebaseUpdateDoc(prodRef, { estoque: String(novoEstoque) });
    
    console.log(`[BAIXA-ESTOQUE] ✅ SUCESSO: ${produto.nome}: ${estoqueAtual} → ${novoEstoque} (-${quantidadeVendida})`);
    
    // FASE 11.11: Atualizar UI de Gestão após baixa de estoque
    if (typeof carregarProdutosHub === 'function') {
      try {
        await carregarProdutosHub();
        console.log("[BAIXA-ESTOQUE] UI de Gestão atualizada");
      } catch (e) {
        console.warn("[BAIXA-ESTOQUE] Erro ao atualizar UI de Gestão:", e);
      }
    }
    
    // Alerta silencioso se estoque chegou a zero
    if (novoEstoque === 0) {
      mostrarToast(`⚠️ Estoque do produto "${produto.nome}" chegou a zero!`, 'aviso');
    }
    
  } catch (err) {
    console.error("[BAIXA-ESTOQUE] Erro:", err);
    console.error("[DEBUG ESTOQUE] Stack:", err.stack);
  }
}

/**
 * Popula um datalist com valores de um Set
 */
function popularDatalist(datalistId, valoresSet) {
  const datalist = document.getElementById(datalistId);
  if (!datalist) return;
  
  // Limpar e repopular
  datalist.innerHTML = "";
  
  // Converter Set para Array e ordenar
  const valoresArray = Array.from(valoresSet).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  
  valoresArray.forEach(valor => {
    const option = document.createElement("option");
    option.value = valor;
    datalist.appendChild(option);
  });
}

/**
 * Configura o autofill do valor sugerido quando um tipo de serviço é selecionado
 */
function configurarAutofillValorServico() {
  const inputDescricao = document.getElementById("vd-descricao-servico");
  const inputValorHora = document.getElementById("vd-valor-hora");
  
  if (!inputDescricao || !inputValorHora || !window.mapaValoresServico) return;
  
  // Remover listener anterior se existir
  inputDescricao.removeEventListener("change", onServicoChange);
  inputDescricao.removeEventListener("blur", onServicoChange);
  
  // Adicionar listeners
  inputDescricao.addEventListener("change", onServicoChange);
  inputDescricao.addEventListener("blur", onServicoChange);
}

/**
 * Handler para quando o serviço é alterado/selecionado
 */
function onServicoChange(e) {
  const inputDescricao = e.target;
  const inputValorHora = document.getElementById("vd-valor-hora");
  
  if (!inputDescricao || !inputValorHora || !window.mapaValoresServico) return;
  
  const servicoSelecionado = inputDescricao.value.trim();
  const valorSugerido = window.mapaValoresServico.get(servicoSelecionado);
  
  if (valorSugerido && valorSugerido > 0) {
    // Só preencher se o campo estiver vazio ou for zero
    const valorAtual = parseFloat(inputValorHora.value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    
    if (valorAtual === 0) {
      inputValorHora.value = valorSugerido.toFixed(2).replace('.', ',');
      console.log(`[AUTOFILL] Valor sugerido para "${servicoSelecionado}": R$ ${valorSugerido}`);
      
      // RECALCULAR SUBTOTAL após preencher o valor!
      if (typeof calcularSubtotalServico === 'function') {
        calcularSubtotalServico();
      }
    }
  }
}

/**
 * Handler para quando o status do serviço é alterado
 * Mostra/esconde forma de pagamento baseado no status
 */
function onStatusServicoChange() {
  const status = document.getElementById("v-status-servico")?.value || "Pago";
  const containerPagamento = document.getElementById("container-forma-pagamento");
  
  if (!containerPagamento) return;
  
  if (status === "Pago") {
    containerPagamento.style.display = "block";
  } else {
    containerPagamento.style.display = "none";
  }
  
  console.log(`[STATUS CHANGE] Status: ${status}, Forma de pagamento: ${status === 'Pago' ? 'visível' : 'oculta'}`);
}

/**
 * Handler para quando o status do varejo é alterado
 * Mostra/esconde forma de pagamento baseado no status (Pago/Pendente)
 */
function onStatusVarejoChange() {
  const status = document.getElementById("v-status")?.value || "Pago";
  const containerPagamento = document.getElementById("container-forma-pagamento-varejo");
  
  if (!containerPagamento) return;
  
  if (status === "Pago") {
    containerPagamento.style.display = "block";
  } else {
    containerPagamento.style.display = "none";
  }
  
  console.log(`[STATUS VAREJO] Status: ${status}, Forma de pagamento: ${status === 'Pago' ? 'visível' : 'oculta'}`);
}

/**
 * Handler para quando a agência é alterada/selecionada
 * Guarda o valor por hora da agência e recalcula o subtotal
 */
function onAgenciaChange() {
  console.log("[AGENCIA CHANGE] Função chamada");
  
  const inputAgencia = document.getElementById("vd-nome-agencia");
  const hiddenValorHora = document.getElementById("vd-valor-hora-agencia-hidden");
  
  console.log("[AGENCIA CHANGE] Elementos:", { inputAgencia: !!inputAgencia, hiddenValorHora: !!hiddenValorHora, mapa: !!window.mapaValoresAgencia });
  
  if (!inputAgencia || !hiddenValorHora || !window.mapaValoresAgencia) {
    console.warn("[AGENCIA CHANGE] Elementos não encontrados");
    return;
  }
  
  const agenciaSelecionada = inputAgencia.value.trim();
  console.log("[AGENCIA CHANGE] Agência selecionada:", agenciaSelecionada);
  console.log("[AGENCIA CHANGE] Mapa completo:", window.mapaValoresAgencia);
  
  const valorSugerido = window.mapaValoresAgencia.get(agenciaSelecionada);
  console.log("[AGENCIA CHANGE] Valor sugerido:", valorSugerido);
  
  if (valorSugerido && valorSugerido > 0) {
    // Guardar valor por hora no campo hidden (para cálculo do custo)
    hiddenValorHora.value = valorSugerido;
    console.log(`[AUTOFILL] Valor/hora da agência "${agenciaSelecionada}": R$ ${valorSugerido}`);
    
    // Sugerir o mesmo valor no campo de cobrança (Valor/Hora) se estiver vazio
    const inputValorHora = document.getElementById("vd-valor-hora");
    if (inputValorHora) {
      const valorAtual = parseFloat(inputValorHora.value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
      if (valorAtual === 0) {
        inputValorHora.value = valorSugerido.toFixed(2).replace('.', ',');
        console.log(`[AUTOFILL] Valor de cobrança sugerido: R$ ${valorSugerido}`);
      }
    }
    
    // Recalcular subtotal (o custo será calculado automaticamente)
    if (typeof calcularSubtotalServico === 'function') {
      calcularSubtotalServico();
    }
  } else {
    hiddenValorHora.value = "0";
  }
}

// ============================================================
// CRUD DE AGÊNCIAS
// ============================================================

/**
 * Salva ou atualiza uma agência no Firebase
 */
async function salvarAgencia(event) {
  event.preventDefault();
  
  const btn = document.getElementById("btn-salvar-agencia");
  const orig = btn.innerText;
  btn.innerText = "⏳ Salvando...";
  btn.disabled = true;
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const docId = document.getElementById("agencia-docId-edicao").value;
    const nome = document.getElementById("agencia-nome").value.trim();
    const contato = document.getElementById("agencia-contato").value.trim();
    const valorHora = document.getElementById("agencia-valor-hora").value;
    
    if (!nome) {
      mostrarToast("⚠️ Informe o nome da agência", "aviso");
      btn.innerText = orig;
      btn.disabled = false;
      return;
    }
    
    const dados = {
      nome,
      contato,
      valorHora: valorHora ? parseFloat(valorHora.replace(/[R$\s.]/g, '').replace(',', '.')) : 0,
      atualizadoEm: new Date().toISOString()
    };
    
    if (docId) {
      // Edição
      await window.firebaseSetDoc(
        window.firebaseDoc(window.firebaseDb, "lojas", uid, "agencias", docId),
        dados,
        { merge: true }
      );
      mostrarToast("✅ Agência atualizada!", "sucesso");
    } else {
      // Novo
      dados.criadoEm = new Date().toISOString();
      await window.firebaseAddDoc(
        window.firebaseCollection(window.firebaseDb, "lojas", uid, "agencias"),
        dados
      );
      mostrarToast("✅ Agência cadastrada!", "sucesso");
    }
    
    document.getElementById("form-agencia").reset();
    document.getElementById("agencia-docId-edicao").value = "";
    btn.innerText = "💾 Adicionar Agência";
    
    carregarAgencias();
    
  } catch (err) {
    console.error("Erro ao salvar agência:", err);
    mostrarToast("❌ Erro ao salvar agência", "erro");
    btn.innerText = orig;
    btn.disabled = false;
  }
}

/**
 * Carrega todas as agências do Firebase
 */
async function carregarAgencias() {
  const listaEl = document.getElementById("lista-agencias-cadastradas");
  const badgeEl = document.getElementById("badge-qtd-agencias");
  
  if (!listaEl) return;
  
  listaEl.innerHTML = '<div class="loader" style="margin:20px auto;"></div>';
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const q = window.firebaseQuery(
      window.firebaseCollection(window.firebaseDb, "lojas", uid, "agencias"),
      window.firebaseOrderBy("nome", "asc")
    );
    
    const snapshot = await window.firebaseGetDocs(q);
    const agencias = snapshot.docs.map(doc => ({
      ...doc.data(),
      docId: doc.id
    }));
    
    if (badgeEl) badgeEl.innerText = agencias.length;
    
    if (agencias.length === 0) {
      listaEl.innerHTML = `
        <div style="text-align:center;padding:30px;color:#90A4AE;">
          <div style="font-size:32px;margin-bottom:8px;">🏢</div>
          <p style="font-size:13px;margin:0;">Nenhuma agência cadastrada ainda.</p>
        </div>
      `;
      return;
    }
    
    let html = "";
    agencias.forEach(ag => {
      const valorHoraTexto = ag.valorHora ? `<span style="background:#FFF8E1;color:#F57C00;padding:2px 8px;border-radius:12px;font-size:12px;">R$ ${ag.valorHora.toFixed(2).replace('.', ',')}/hora</span>` : '';
      
      html += `
        <div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:14px;display:flex;justify-content:space-between;align-items:center;">
          <div style="flex:1;">
            <div style="font-weight:700;color:#333;font-size:15px;">${escapeHtml(ag.nome)}</div>
            ${ag.contato ? `<div style="font-size:13px;color:#666;margin-top:4px;">👤 ${escapeHtml(ag.contato)}</div>` : ''}
            ${valorHoraTexto ? `<div style="margin-top:6px;">${valorHoraTexto}</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="editarAgencia('${ag.docId}')" style="background:#E3F2FD;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;color:#1565C0;font-size:13px;">✏️</button>
            <button onclick="excluirAgencia('${ag.docId}', '${escapeHtml(ag.nome)}')" style="background:#FFEBEE;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;color:#C62828;font-size:13px;">🗑️</button>
          </div>
        </div>
      `;
    });
    
    listaEl.innerHTML = html;
    
  } catch (err) {
    console.error("Erro ao carregar agências:", err);
    listaEl.innerHTML = `<div style="text-align:center;padding:20px;color:#EF5350;"><p style="font-size:13px;margin:0;">❌ Erro ao carregar agências.</p></div>`;
  }
}

/**
 * Carrega dados da agência para edição
 */
async function editarAgencia(docId) {
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const docSnap = await window.firebaseGetDoc(
      window.firebaseDoc(window.firebaseDb, "lojas", uid, "agencias", docId)
    );
    
    if (!docSnap.exists()) {
      mostrarToast("❌ Agência não encontrada", "erro");
      return;
    }
    
    const dados = docSnap.data();
    
    document.getElementById("agencia-docId-edicao").value = docId;
    document.getElementById("agencia-nome").value = dados.nome || "";
    document.getElementById("agencia-contato").value = dados.contato || "";
    document.getElementById("agencia-valor-hora").value = dados.valorHora || "";
    
    document.getElementById("btn-salvar-agencia").innerText = "💾 Atualizar Agência";
    
    document.getElementById("form-agencia").scrollIntoView({ behavior: 'smooth' });
    
  } catch (err) {
    console.error("Erro ao carregar agência:", err);
    mostrarToast("❌ Erro ao carregar agência", "erro");
  }
}

/**
 * Exclui uma agência do Firebase
 */
async function excluirAgencia(docId, nome) {
  if (!confirm(`Tem certeza que deseja excluir "${nome}"?`)) return;
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    await window.firebaseDeleteDoc(
      window.firebaseDoc(window.firebaseDb, "lojas", uid, "agencias", docId)
    );
    
    mostrarToast("✅ Agência excluída", "sucesso");
    carregarAgencias();
    
  } catch (err) {
    console.error("Erro ao excluir agência:", err);
    mostrarToast("❌ Erro ao excluir agência", "erro");
  }
}

// ============================================================
// CRUD DE TIPOS DE SERVIÇO
// ============================================================

/**
 * Salva ou atualiza um tipo de serviço no Firebase
 */
async function salvarTipoServico(event) {
  event.preventDefault();
  
  const btn = document.getElementById("btn-salvar-tipo-servico");
  const orig = btn.innerText;
  btn.innerText = "⏳ Salvando...";
  btn.disabled = true;
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const docId = document.getElementById("tipo-servico-docId-edicao").value;
    const nome = document.getElementById("tipo-servico-nome").value.trim();
    const valorInput = document.getElementById("tipo-servico-valor").value;
    
    if (!nome) {
      mostrarToast("⚠️ Informe o nome do serviço", "aviso");
      btn.innerText = orig;
      btn.disabled = false;
      return;
    }
    
    // Converter valor formatado para número
    const valorBase = valorInput ? parseFloat(valorInput.replace(/\./g, '').replace(',', '.')) : 0;
    
    const dados = {
      nome,
      valorBase,
      atualizadoEm: new Date().toISOString()
    };
    
    if (docId) {
      // Edição
      await window.firebaseSetDoc(
        window.firebaseDoc(window.firebaseDb, "lojas", uid, "tipos_servico", docId),
        dados,
        { merge: true }
      );
      mostrarToast("✅ Tipo de serviço atualizado!", "sucesso");
    } else {
      // Novo
      dados.criadoEm = new Date().toISOString();
      await window.firebaseAddDoc(
        window.firebaseCollection(window.firebaseDb, "lojas", uid, "tipos_servico"),
        dados
      );
      mostrarToast("✅ Tipo de serviço cadastrado!", "sucesso");
    }
    
    document.getElementById("form-tipo-servico").reset();
    document.getElementById("tipo-servico-docId-edicao").value = "";
    btn.innerText = "💾 Adicionar Tipo de Serviço";
    
    carregarTiposServico();
    
  } catch (err) {
    console.error("Erro ao salvar tipo de serviço:", err);
    mostrarToast("❌ Erro ao salvar tipo de serviço", "erro");
    btn.innerText = orig;
    btn.disabled = false;
  }
}

/**
 * Carrega todos os tipos de serviço do Firebase
 */
async function carregarTiposServico() {
  const listaEl = document.getElementById("lista-tipos-servico-cadastrados");
  const badgeEl = document.getElementById("badge-qtd-tipos-servico");
  
  if (!listaEl) return;
  
  listaEl.innerHTML = '<div class="loader" style="margin:20px auto;"></div>';
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const q = window.firebaseQuery(
      window.firebaseCollection(window.firebaseDb, "lojas", uid, "tipos_servico"),
      window.firebaseOrderBy("nome", "asc")
    );
    
    const snapshot = await window.firebaseGetDocs(q);
    const tipos = snapshot.docs.map(doc => ({
      ...doc.data(),
      docId: doc.id
    }));
    
    if (badgeEl) badgeEl.innerText = tipos.length;
    
    if (tipos.length === 0) {
      listaEl.innerHTML = `
        <div style="text-align:center;padding:30px;color:#90A4AE;">
          <div style="font-size:32px;margin-bottom:8px;">🛠️</div>
          <p style="font-size:13px;margin:0;">Nenhum tipo de serviço cadastrado ainda.</p>
        </div>
      `;
      return;
    }
    
    let html = "";
    tipos.forEach(tipo => {
      const valorTexto = tipo.valorBase ? `<span style="background:#E8F5E9;color:#2E7D32;padding:2px 8px;border-radius:12px;font-size:12px;">R$ ${tipo.valorBase.toFixed(2).replace('.', ',')}</span>` : '';
      
      html += `
        <div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:14px;display:flex;justify-content:space-between;align-items:center;">
          <div style="flex:1;">
            <div style="font-weight:700;color:#333;font-size:15px;">${escapeHtml(tipo.nome)}</div>
            ${valorTexto ? `<div style="margin-top:6px;">${valorTexto}</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="editarTipoServico('${tipo.docId}')" style="background:#E3F2FD;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;color:#1565C0;font-size:13px;">✏️</button>
            <button onclick="excluirTipoServico('${tipo.docId}', '${escapeHtml(tipo.nome)}')" style="background:#FFEBEE;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;color:#C62828;font-size:13px;">🗑️</button>
          </div>
        </div>
      `;
    });
    
    listaEl.innerHTML = html;
    
  } catch (err) {
    console.error("Erro ao carregar tipos de serviço:", err);
    listaEl.innerHTML = `<div style="text-align:center;padding:20px;color:#EF5350;"><p style="font-size:13px;margin:0;">❌ Erro ao carregar tipos de serviço.</p></div>`;
  }
}

/**
 * Carrega dados do tipo de serviço para edição
 */
async function editarTipoServico(docId) {
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    const docSnap = await window.firebaseGetDoc(
      window.firebaseDoc(window.firebaseDb, "lojas", uid, "tipos_servico", docId)
    );
    
    if (!docSnap.exists()) {
      mostrarToast("❌ Tipo de serviço não encontrado", "erro");
      return;
    }
    
    const dados = docSnap.data();
    
    document.getElementById("tipo-servico-docId-edicao").value = docId;
    document.getElementById("tipo-servico-nome").value = dados.nome || "";
    
    // Formatar valor para exibição
    if (dados.valorBase) {
      const valorFormatado = dados.valorBase.toFixed(2).replace('.', ',');
      document.getElementById("tipo-servico-valor").value = valorFormatado;
    } else {
      document.getElementById("tipo-servico-valor").value = "";
    }
    
    document.getElementById("btn-salvar-tipo-servico").innerText = "💾 Atualizar Tipo de Serviço";
    
    document.getElementById("form-tipo-servico").scrollIntoView({ behavior: 'smooth' });
    
  } catch (err) {
    console.error("Erro ao carregar tipo de serviço:", err);
    mostrarToast("❌ Erro ao carregar tipo de serviço", "erro");
  }
}

/**
 * Exclui um tipo de serviço do Firebase
 */
async function excluirTipoServico(docId, nome) {
  if (!confirm(`Tem certeza que deseja excluir "${nome}"?`)) return;
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    await window.firebaseDeleteDoc(
      window.firebaseDoc(window.firebaseDb, "lojas", uid, "tipos_servico", docId)
    );
    
    mostrarToast("✅ Tipo de serviço excluído", "sucesso");
    carregarTiposServico();
    
  } catch (err) {
    console.error("Erro ao excluir tipo de serviço:", err);
    mostrarToast("❌ Erro ao excluir tipo de serviço", "erro");
  }
}

/**
 * Exclui um executante do Firebase
 */
async function excluirExecutante(docId, nome) {
  if (!confirm(`Tem certeza que deseja excluir "${nome}"?`)) return;
  
  try {
    const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    if (!uid) throw new Error("Usuário não autenticado");
    
    await window.firebaseDeleteDoc(
      window.firebaseDoc(window.firebaseDb, "lojas", uid, "executantes", docId)
    );
    
    mostrarToast("✅ Executante excluído", "sucesso");
    carregarExecutantes();
    
  } catch (err) {
    console.error("Erro ao excluir executante:", err);
    mostrarToast("❌ Erro ao excluir executante", "erro");
  }
}

/**
 * Função auxiliar para escapar HTML (prevenir XSS)
 */
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function mudarAba(aba) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  document.getElementById("btn-tab-" + aba)?.classList.add("active");
  document.getElementById("content-" + aba)?.classList.add("active");

  // VERIFICAÇÃO DE PLANO: Restringir abas Premium para plano Básico
  const nivelPlano = localStorage.getItem("plano_nivel") || "Básico";
  
  if (aba === "membros") {
    if (!verificarAcessoFuncionalidade("membros")) {
      mostrarToastUpgrade("membros");
      // Volta para aba 'loja' se não tem acesso
      mudarAba("loja");
      return;
    }
    carregarMembros();
  }
  
  if (aba === "fornecedores") {
    if (!verificarAcessoFuncionalidade("fornecedores")) {
      mostrarToastUpgrade("fornecedores");
      // Volta para aba 'loja' se não tem acesso
      mudarAba("loja");
      return;
    }
    carregarFornecedoresCfg();
  }
  
  if (aba === "clientes") carregarClientes();
  if (aba === "produtos") buscarProdutos();
}

// Setas de navegação das abas — suporta novo ID e função genérica
function scrollTabsConfig(direcao) {
  const n = document.getElementById("nav-tabs-configuracoes") || document.getElementById("tabs-nav-cfg");
  if (n) n.scrollBy({ left: direcao * 120, behavior: "smooth" });
}
// Aliases mantidos para compatibilidade
function scrollTabsEsquerda() { scrollTabsConfig(-1); }
function scrollTabsDireita() { scrollTabsConfig(1); }

// 1. Salvar Informações da Loja/Perfil
async function salvarConfigLoja(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-salvar-config-loja");
  const orig = btn.innerText;
  btn.disabled = true; btn.innerText = "⏳..."; btn.style.opacity = ".7";

  const seuNome = document.getElementById("cfg-seu-nome")?.value.trim() || "";
  const perfilSelecionado = document.getElementById("config-perfil-negocio")?.value || "";
  
  const dados = {
    nomeLoja: document.getElementById("cfg-nome-loja").value,
    cidade: document.getElementById("cfg-cidade").value,
    ramo: document.getElementById("cfg-ramo").value,
    nomeProprietario: seuNome,
    perfilNegocio: perfilSelecionado
  };

  try {
    await _salvarConfigsFirestore(dados);

    // SINCRONIZAÇÃO EM TEMPO REAL: atualiza variáveis globais e UI imediatamente
    Object.assign(configuracoesGlobais, dados);

    // Atualiza dashboard em tempo real
    atualizarDashboardFirebase();
    
    // Aplica configurações visuais (cores, nome da loja, etc.)
    aplicarConfigsVisuais();

    // Atualiza nome da loja no cabeçalho
    const nEl = document.getElementById("nome-loja-dash");
    if (nEl && dados.nomeLoja) nEl.innerText = dados.nomeLoja;

    if (seuNome && !sessaoIsMembro) {
      localStorage.setItem("user_name", seuNome);
      localStorage.setItem("nomeOperador", seuNome);
      atualizarHeaderOperador();
      const sp = document.getElementById("nome-loading"); if (sp) sp.innerText = seuNome.split(" ")[0];
    }
    
    // Atualizar perfil de negócio se foi alterado
    if (perfilSelecionado && perfilSelecionado !== perfilNegocioAtual) {
      // FASE 12.5: Trava Estrita do Admin VIP - bloquear QUALQUER sobrescrita
      const userEmail = localStorage.getItem("user_email");
      const ehAdmin = (userEmail === EMAIL_ADMIN);
      const perfilTeste = localStorage.getItem('perfilAdminTeste');

      if (ehAdmin && perfilTeste) {
        // Admin pode alterar manualmente - atualiza o cache também
        perfilNegocioAtual = perfilSelecionado;
        localStorage.setItem("perfilNegocio", perfilNegocioAtual);
        localStorage.setItem('perfilAdminTeste', perfilNegocioAtual);
        console.log('[ADMIN VIP] TRAVA ESTRITA: Perfil alterado manualmente e cache atualizado:', perfilNegocioAtual);
      } else {
        // Fluxo normal para usuários comuns
        perfilNegocioAtual = perfilSelecionado;
        localStorage.setItem("perfilNegocio", perfilNegocioAtual);
      }
      aplicarPerfilNegocio();
    }
    
    mostrarToast("✅ Configurações salvas e aplicadas!", "sucesso");
  }
  catch (err) {
    console.error("Erro ao salvar config:", err);
    mostrarToast("❌ Erro ao salvar no Firebase.", "erro");
  }
  finally { resetarBotao("btn-salvar-config-loja", orig); }
}

// 2. Salvar Estilo de Vendas
async function salvarConfigEstilo(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-salvar-estilo");
  const orig = btn.innerText;
  btn.disabled = true; btn.innerText = "⏳..."; btn.style.opacity = ".7";
  const estilo = document.getElementById("cfg-estilo-vendas").value;
  try {
    await _salvarConfigsFirestore({ estiloVendas: estilo });
    configuracoesGlobais.estiloVendas = estilo;
    mostrarToast("✅ Estilo salvo!", "sucesso");
  } catch (err) {
    mostrarToast("❌ Erro ao salvar estilo.", "erro");
  }
  finally { resetarBotao("btn-salvar-estilo", orig); }
}

// 3. Salvar Meta Mensal
async function salvarConfigMeta(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-salvar-meta");
  const orig = btn.innerText;
  btn.disabled = true; btn.innerText = "⏳..."; btn.style.opacity = ".7";
  const meta = document.getElementById("cfg-meta-valor").value;
  try {
    await _salvarConfigsFirestore({ metaMensal: meta });
    configuracoesGlobais.metaMensal = meta;
    mostrarToast("🎯 Meta definida!", "sucesso");
  }
  catch (err) {
    mostrarToast("❌ Erro ao salvar meta.", "erro");
  }
  finally { resetarBotao("btn-salvar-meta", orig); }
}


async function removerMeta() {
  await _salvarConfigsFirestore({ metaMensal: "" });
  configuracoesGlobais.metaMensal = "";
  document.getElementById("cfg-meta-valor").value = "";
  const bC = document.getElementById("barra-meta-container"); if (bC) bC.style.display = "none";
  mostrarToast("Meta removida.", "aviso");
}

// ============================================================
// MEMBROS
// ============================================================
async function carregarMembros() {
  // VERIFICAÇÃO DE PLANO: Membros/Funcionários disponível apenas no Premium
  if (!verificarAcessoFuncionalidade("membros")) {
    mostrarToastUpgrade("membros");
    return;
  }
  
  document.getElementById("lista-membros").innerHTML = '<div class="loader"></div>';
  try { const res = await chamarGoogle("buscarMembros"); membrosGlobal = res?.membros || []; renderizarMembros(); }
  catch { document.getElementById("lista-membros").innerHTML = '<p style="color:#EF5350;font-size:14px;">❌ Erro.</p>'; }
}
function renderizarMembros() {
  const listEl = document.getElementById("lista-membros"); const bEl = document.getElementById("badge-qtd-membros"); if (bEl) bEl.innerText = membrosGlobal.length;
  if (!membrosGlobal.length) { listEl.innerHTML = '<p style="color:#B0BEC5;font-size:14px;padding:15px 0;">Nenhum membro cadastrado.</p>'; return; }
  const badgeCl = { Vendedor: "badge-vendedor", Gerente: "badge-gerente" };
  const badgeStatus = { Ativo: "badge-ativo", Pendente: "badge-pendente", Suspenso: "badge-suspenso" };
  const permLabels = { individual: "👤 Individual", fechamento: "📅 Fechamento", ambos: "🔄 Ambos" };
  listEl.innerHTML = membrosGlobal.map(m => `<div class="item-card item-card-membro" style="margin-top:8px;"><div style="display:flex;justify-content:space-between;align-items:center;"><div style="flex:1;min-width:0;"><span style="font-size:13px;font-weight:700;display:block;">${m.nomeOperador || m.email || "—"}</span><span style="font-size:12px;color:#78909C;display:block;overflow:hidden;text-overflow:ellipsis;">${m.email || ""}</span><span style="font-size:11px;color:#90A4AE;">${m.status === "Pendente" ? "⏳ Aguardando" : "✅ Ativo"} · ${permLabels[m.permissaoVenda || "individual"] || ""}</span></div><span class="badge-papel ${badgeCl[m.papel] || "badge-vendedor"}" style="margin-left:10px;flex-shrink:0;">${m.papel || "—"}</span></div><div class="acoes-card"><button class="btn-acao btn-editar" onclick="editarMembro('${m.email}','${(m.nomeOperador || "").replace(/'/g, "")}','${m.papel || "Vendedor"}','${m.permissaoVenda || "individual"}')">✏️ Editar</button><button class="btn-acao btn-excluir" onclick="removerMembro('${m.email}')">🗑️ Remover</button></div></div>`).join("");
}
// Item 1: editar nome e papel de membro existente
function editarMembro(email, nomeAtual, papelAtual, permissaoAtual) {
  document.getElementById("m-nome").value = nomeAtual;
  document.getElementById("m-email").value = email;
  document.getElementById("m-email").readOnly = true;
  document.getElementById("m-email").style.opacity = "0.6";
  document.getElementById("m-papel").value = papelAtual;
  const permEl = document.getElementById("m-permissao-venda");
  if (permEl) permEl.value = permissaoAtual || "individual"; // Item 2
  document.getElementById("m-docId-edicao").value = email;
  const btn = document.getElementById("btn-add-membro");
  btn.innerText = "💾 Atualizar Membro"; btn.style.background = "#FF8F00";
  document.getElementById("content-membros").scrollTo({ top: 0, behavior: "smooth" });
}

async function adicionarMembro(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-add-membro"); const orig = btn.innerText;
  btn.disabled = true; btn.innerText = "⏳..."; btn.style.opacity = ".7";
  const email = document.getElementById("m-email").value.toLowerCase().trim();
  const papel = document.getElementById("m-papel").value;
  const nomeOp = (document.getElementById("m-nome")?.value || "").trim();
  const permissaoVenda = document.getElementById("m-permissao-venda")?.value || "individual"; // Item 2
  const editando = document.getElementById("m-docId-edicao")?.value || "";
  if (!nomeOp) { mostrarToast("⚠️ Informe o nome do funcionário.", "aviso"); resetarBotao("btn-add-membro", orig); return; }
  try {
    let res;
    if (editando) {
      res = await chamarGoogle("editarNomeMembro", { emailMembro: email, nomeOperador: nomeOp, papel, permissaoVenda }); // Item 2
    } else {
      res = await chamarGoogle("adicionarMembro", { emailMembro: email, papel, nomeOperador: nomeOp, permissaoVenda }); // Item 2
    }
    if (res?.status === "Sucesso") {
      mostrarToast(editando ? "✅ Membro atualizado!" : "✅ Convite enviado!", "sucesso");
      // Reseta form
      document.getElementById("m-email").value = ""; document.getElementById("m-email").readOnly = false; document.getElementById("m-email").style.opacity = "1";
      document.getElementById("m-nome").value = ""; document.getElementById("m-papel").value = "";
      if (document.getElementById("m-docId-edicao")) document.getElementById("m-docId-edicao").value = "";
      resetarBotao("btn-add-membro", "+ Convidar Membro"); btn.style.background = "#3949AB";
      carregarMembros();
    } else mostrarToast("❌ " + (res?.mensagem || "Erro."), "erro");
  } catch { mostrarToast("❌ Erro.", "erro"); }
  finally { resetarBotao("btn-add-membro", orig); }
}
async function removerMembro(emailMembro) {
  if (!await confirmarAcao("🗑️", "Remover Membro", `Remover <strong>${emailMembro}</strong> da equipe?`)) return;
  try { const res = await chamarGoogle("removerMembro", { emailMembro }); if (res?.status === "Sucesso") { mostrarToast("✅ Removido.", "sucesso"); carregarMembros(); } else throw new Error(); }
  catch { mostrarToast("❌ Erro.", "erro"); }
}

// ============================================================
// CLIENTES — MIGRAÇÃO FIREBASE (Módulo C)
// ============================================================

async function carregarClientes() {
  const listEl = document.getElementById("lista-clientes");
  if (!listEl) return;
  listEl.innerHTML = '<div class="loader"></div>';

  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  if (!uid) return;

  try {
    // Busca do Firebase ordenada por nome
    const q = window.firebaseQuery(
      window.firebaseCollection(window.firebaseDb, "lojas", uid, "clientes"),
      window.firebaseOrderBy("nome", "asc")
    );
    const snap = await window.firebaseGetDocs(q);

    // Mapeamos os dados salvando o ID do documento em 'docId'
    clientesGlobal = snap.docs.map(doc => ({
      ...doc.data(),
      docId: doc.id
    }));

    renderizarClientes(clientesGlobal);
  } catch (err) {
    console.error("Erro ao carregar clientes:", err);
    // FALLBACK: garante que o app não quebre
    clientesGlobal = [];
    listEl.innerHTML = '<p style="color:#EF5350;font-size:13px;">❌ Erro ao carregar. Tente novamente.</p>';
  }
}

function renderizarClientes(lista) {
  const listEl = document.getElementById("lista-clientes");
  const bEl = document.getElementById("badge-qtd-clientes");
  if (bEl) bEl.innerText = lista.length;

  if (!lista.length) {
    listEl.innerHTML = '<p style="color:#B0BEC5;font-size:14px;padding:15px 0;">Nenhum cliente cadastrado.</p>';
    return;
  }

  listEl.innerHTML = lista.map(c => `
    <div class="item-card item-card-cliente" style="margin-top:8px;">
      <div>
        <strong style="font-size:14px;">${c.nome || "—"}</strong>
        ${c.telefone ? `<p style="font-size:12px;color:#78909C;margin:3px 0 0;"><a href="https://wa.me/55${String(c.telefone || '').replace(/\D/g, '')}" target="_blank" style="color:#25D366;font-weight:700;">📱 ${c.telefone}</a></p>` : ""} 
        ${c.obs ? `<p style="font-size:12px;color:#90A4AE;margin:3px 0 0;">${c.obs}</p>` : ""}
      </div>
      <div class="acoes-card">
        ${c.telefone ? `<a href="https://wa.me/55${String(c.telefone || '').replace(/\D/g, '')}" target="_blank" class="btn-acao btn-wpp">💬 WhatsApp</a>` : ""}
        <button class="btn-acao btn-editar" onclick="editarCliente('${c.docId}','${(c.nome || '').replace(/'/g, '')}','${c.telefone || ''}','${(c.obs || '').replace(/'/g, '')}')" >✏️ Editar</button>
        <button class="btn-acao btn-excluir" onclick="excluirCliente('${c.docId}')">🗑️ Excluir</button>
      </div>
    </div>`).join("");
}

function filtrarListaClientes() {
  const b = document.getElementById("busca-clientes").value.toLowerCase();
  renderizarClientes(clientesGlobal.filter(c => (c.nome || "").toLowerCase().includes(b) || (c.telefone || "").includes(b)));
}

function editarCliente(docId, nome, telefone, obs) {
  document.getElementById("cli-nome").value = nome;
  document.getElementById("cli-telefone").value = telefone;
  document.getElementById("cli-obs").value = obs;
  document.getElementById("cli-docId-edicao").value = docId;

  const btn = document.getElementById("btn-add-cliente");
  btn.innerText = "💾 Atualizar Cliente";
  btn.style.background = "#FF8F00";
  document.getElementById("content-clientes").scrollTo({ top: 0, behavior: "smooth" });
}

async function adicionarCliente(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-add-cliente");
  const orig = btn.innerText;
  btn.disabled = true; btn.innerText = "⏳..."; btn.style.opacity = ".7";

  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  const docId = document.getElementById("cli-docId-edicao").value;

  const dados = {
    nome: document.getElementById("cli-nome").value.trim(),
    telefone: document.getElementById("cli-telefone").value.trim(),
    obs: document.getElementById("cli-obs").value.trim(),
    atualizadoEm: new Date().toISOString()
  };

  try {
    if (docId) {
      // Editar documento existente
      await window.firebaseSetDoc(
        window.firebaseDoc(window.firebaseDb, "lojas", uid, "clientes", docId),
        dados,
        { merge: true }
      );
      mostrarToast("✅ Cliente atualizado!", "sucesso");
    } else {
      // Criar novo documento
      await window.firebaseAddDoc(
        window.firebaseCollection(window.firebaseDb, "lojas", uid, "clientes"),
        { ...dados, criadoEm: new Date().toISOString() }
      );
      mostrarToast("✅ Cliente adicionado!", "sucesso");
    }

    document.getElementById("form-add-cliente").reset();
    document.getElementById("cli-docId-edicao").value = "";
    resetarBotao("btn-add-cliente", "+ Adicionar Cliente");
    document.getElementById("btn-add-cliente").style.background = "#1565C0";

    carregarClientes();
    preencherAutocompleteClientes();
  } catch (err) {
    console.error("Erro ao salvar cliente:", err);
    mostrarToast("❌ Erro ao salvar no Firebase.", "erro");
  } finally {
    resetarBotao("btn-add-cliente", orig);
  }
}

async function excluirCliente(docId) {
  if (!docId) return;
  if (!await confirmarAcao("🗑️", "Excluir Cliente", "Tem certeza?")) return;

  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  try {
    await window.firebaseDeleteDoc(
      window.firebaseDoc(window.firebaseDb, "lojas", uid, "clientes", docId)
    );
    mostrarToast("✅ Excluído.", "sucesso");
    carregarClientes();
  } catch (err) {
    console.error("Erro ao excluir:", err);
    mostrarToast("❌ Erro ao excluir.", "erro");
  }
}

// MELHORIA: Usa a lista que já está na memória em vez de fazer nova requisição
function preencherAutocompleteClientes() {
  const dl = document.getElementById("lista-clientes-autocomplete");
  if (dl && clientesGlobal) {
    dl.innerHTML = clientesGlobal.map(c => `<option value="${c.nome}">`).join("");
  }
}

// ============================================================
// FORNECEDORES — MIGRAÇÃO FIREBASE (Módulo C)
// ============================================================

async function carregarFornecedoresCfg() {
  const listEl = document.getElementById("lista-fornecedores-cfg");
  if (!listEl) return;
  listEl.innerHTML = '<div class="loader"></div>';

  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  if (!uid) return;

  try {
    // Busca do Firebase ordenada por nome
    const q = window.firebaseQuery(
      window.firebaseCollection(window.firebaseDb, "lojas", uid, "fornecedores"),
      window.firebaseOrderBy("nome", "asc")
    );
    const snap = await window.firebaseGetDocs(q);

    fornecedoresGlobal = snap.docs.map(doc => ({
      ...doc.data(),
      docId: doc.id,
      linha: doc.id
    }));

    renderizarFornecedores(fornecedoresGlobal);
  } catch (err) {
    console.error("Erro ao carregar fornecedores:", err);
    listEl.innerHTML = '<p style="color:#EF5350;font-size:13px;">❌ Erro ao carregar fornecedores.</p>';
  }
}

function renderizarFornecedores(lista) {
  const listEl = document.getElementById("lista-fornecedores-cfg");
  const bEl = document.getElementById("badge-qtd-fornecedores");
  if (bEl) bEl.innerText = lista.length;

  if (!lista.length) {
    listEl.innerHTML = '<p style="color:#B0BEC5;font-size:14px;padding:15px 0;">Nenhum fornecedor cadastrado.</p>';
    return;
  }

  listEl.innerHTML = lista.map(f => `
    <div class="item-card item-card-forn" style="margin-top:8px;">
      <div>
        <strong style="font-size:14px;">${f.nome || "—"}</strong>
        ${f.produto ? `<p style="font-size:12px;color:#78909C;margin:3px 0 0;">📦 ${f.produto}</p>` : ""}
        ${f.telefone ? `<p style="font-size:12px;margin:3px 0 0;"><a href="https://wa.me/55${String(f.telefone || '').replace(/\D/g, '')}" target="_blank" style="color:#25D366;font-weight:700;">📱 ${f.telefone}</a></p>` : ""}
        ${f.obs ? `<p style="font-size:12px;color:#90A4AE;margin:3px 0 0;">${f.obs}</p>` : ""}
      </div>
      <div class="acoes-card">
        ${f.telefone ? `<a href="https://wa.me/55${String(f.telefone || '').replace(/\D/g, '')}" target="_blank" class="btn-acao btn-wpp">💬 WhatsApp</a>` : ""}
        <button class="btn-acao btn-editar" onclick="editarFornecedor('${f.docId}','${(f.nome || '').replace(/'/g, '')}','${f.telefone || ''}','${(f.produto || '').replace(/'/g, '')}','${(f.obs || '').replace(/'/g, '')}')" >✏️ Editar</button>
        <button class="btn-acao btn-excluir" onclick="excluirFornecedor('${f.docId}')">🗑️ Excluir</button>
      </div>
    </div>`).join("");
}

function filtrarListaFornecedores() {
  const b = document.getElementById("busca-fornecedores").value.toLowerCase();
  renderizarFornecedores(fornecedoresGlobal.filter(f => (f.nome || "").toLowerCase().includes(b) || (f.produto || "").toLowerCase().includes(b)));
}

function editarFornecedor(docId, nome, telefone, produto, obs) {
  document.getElementById("forn-nome").value = nome;
  document.getElementById("forn-telefone").value = telefone;
  document.getElementById("forn-produto").value = produto;
  document.getElementById("forn-obs").value = obs;
  document.getElementById("forn-docId-edicao").value = docId;
  const btn = document.getElementById("btn-add-fornecedor");
  btn.innerText = "💾 Atualizar Fornecedor";
  btn.style.background = "#FF8F00";
  document.getElementById("content-fornecedores").scrollTo({ top: 0, behavior: "smooth" });
}

async function adicionarFornecedor(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-add-fornecedor");
  const orig = btn.innerText;
  btn.disabled = true; btn.innerText = "⏳..."; btn.style.opacity = ".7";

  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  const docId = document.getElementById("forn-docId-edicao").value;

  const dados = {
    nome: document.getElementById("forn-nome").value.trim(),
    telefone: document.getElementById("forn-telefone").value.trim(),
    produto: document.getElementById("forn-produto").value.trim(),
    obs: document.getElementById("forn-obs").value.trim(),
    atualizadoEm: new Date().toISOString()
  };

  try {
    if (docId) {
      await window.firebaseSetDoc(window.firebaseDoc(window.firebaseDb, "lojas", uid, "fornecedores", docId), dados, { merge: true });
      mostrarToast("✅ Fornecedor atualizado!", "sucesso");
    } else {
      await window.firebaseAddDoc(window.firebaseCollection(window.firebaseDb, "lojas", uid, "fornecedores"), { ...dados, criadoEm: new Date().toISOString() });
      mostrarToast("✅ Fornecedor adicionado!", "sucesso");
    }
    document.getElementById("form-add-fornecedor").reset();
    document.getElementById("forn-docId-edicao").value = "";
    resetarBotao("btn-add-fornecedor", "+ Adicionar Fornecedor");
    document.getElementById("btn-add-fornecedor").style.background = "#E65100";
    carregarFornecedoresCfg();
    preencherAutocompleteFornecedores();
  } catch (err) {
    console.error("Erro ao salvar fornecedor:", err);
    mostrarToast("❌ Erro ao salvar.", "erro");
  } finally {
    resetarBotao("btn-add-fornecedor", orig);
  }
}

async function excluirFornecedor(docId) {
  if (!docId) return;
  if (!await confirmarAcao("🗑️", "Excluir Fornecedor", "Tem certeza?")) return;
  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  try {
    await window.firebaseDeleteDoc(window.firebaseDoc(window.firebaseDb, "lojas", uid, "fornecedores", docId));
    mostrarToast("✅ Excluído.", "sucesso");
    carregarFornecedoresCfg();
  } catch (err) {
    mostrarToast("❌ Erro ao excluir.", "erro");
  }
}

// MELHORIA: Usa a lista local
function preencherAutocompleteFornecedores() {
  const dl = document.getElementById("lista-fornecedores-autocomplete");
  if (dl && fornecedoresGlobal) {
    dl.innerHTML = fornecedoresGlobal.map(f => `<option value="${f.nome}">`).join("");
  }
}

// ============================================================
// ADMIN
// ============================================================
async function abrirAdmin() {
  mostrarTela("tela-admin"); document.getElementById("lista-admin-clientes").innerHTML = '<div class="loader"></div>'; document.getElementById("busca-admin").value = "";
  try { const res = await chamarGoogle("buscarTodosClientes"); adminClientesGlobal = res?.clientes || []; renderizarAdmin(); }
  catch { document.getElementById("lista-admin-clientes").innerHTML = '<p style="text-align:center;color:#EF5350;padding:20px;">❌ Erro.</p>'; }
}
function filtrarAdmin() { renderizarAdmin(); }
function renderizarAdmin() {
  const busca = (document.getElementById("busca-admin")?.value || "").toLowerCase();
  const lista = adminClientesGlobal.filter(c => !busca || (c.email || "").toLowerCase().includes(busca) || (c.nome || "").toLowerCase().includes(busca));
  const container = document.getElementById("lista-admin-clientes");
  if (!lista.length) { container.innerHTML = '<p style="text-align:center;color:#B0BEC5;padding:20px;">Nenhum cliente.</p>'; return; }
  const cor = c => c.status === "Ativo" ? "#2E7D32" : c.status === "Trial" ? "#E65100" : "#C62828";
  const badge = c => c.status === "Ativo" ? "badge-ativo" : c.status === "Trial" ? "badge-trial" : "badge-suspenso";
  
  // Nomes amigáveis dos perfis
  const nomesPlanos = {
    "varejo-rapido": "Varejo Rápido",
    "varejo-padrao": "Varejo Padrão",
    "varejo-premium": "Varejo Premium",
    "servicos": "Prestador Serviços"
  };
  
  container.innerHTML = lista.map(c => {
    // Verificar se este cliente tem perfil de negócio definido
    let perfilInfo = "";
    if (c.perfilNegocio) {
      const nomePerfil = nomesPlanos[c.perfilNegocio] || c.perfilNegocio;
      perfilInfo = ` | Perfil: <span style="color:#1565C0;font-weight:600;">${nomePerfil}</span>`;
    }
    
    return `<div class="item-card" style="border-left-color:${cor(c)};">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="flex:1;min-width:0;">
          <strong style="font-size:14px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.nome || "—"}</strong>
          <span style="font-size:12px;color:#78909C;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.email || "—"}</span>
        </div>
        <span class="badge-papel ${badge(c)}" style="margin-left:10px;flex-shrink:0;">${c.status || "—"}</span>
      </div>
      <div style="font-size:12px;margin-top:8px;color:#546E7A;">
        ${c.vencimento ? `Vence em: <strong style="color:#E65100;">${formatarDataVencimento(c.vencimento)}</strong>` : "Sem vencimento definido"}${c.plano ? ` | <strong style="color:#1565C0;">${getNomePlano(c.plano)}</strong>` : ""}${perfilInfo}
        ${c.ultimaAlteracao ? `<div style="font-size:11px;color:#888;margin-top:4px;">Última alteração: <strong>${formatarDataVencimento(c.ultimaAlteracao)}</strong> por ${c.alteradoPor || "Admin"}</div>` : ""}
      </div>
      <div class="acoes-card">
        <button class="btn-acao" style="background:#E8F5E9;color:#2E7D32;" onclick="gerenciarCliente('${c.email}','Ativo')">✅ Renovar +30d</button>
        <button class="btn-acao btn-excluir" onclick="gerenciarCliente('${c.email}','Suspenso')">🚫 Bloquear</button>
        <button class="btn-acao" style="background:#E3F2FD;color:#1565C0;" onclick="abrirModalAjustePlano('${c.uid || c.email}', '${c.perfilNegocio || ""}', '${c.vencimento || ""}')">⚙️ Ajustar Plano</button>
      </div>
    </div>`;
  }).join("");
}

// Função para obter nome amigável do plano
function getNomePlano(planoId) {
  const nomesPlanos = {
    'varejo-trial': 'Trial 7 Dias',
    'varejo-rapido': 'Plano Básico',
    'varejo-padrao': 'Plano Padrão',
    'varejo-premium': 'Plano Premium',
    'servicos': 'Prestador de Serviços',
    'Trial 7 Dias': 'Trial 7 Dias',
    'Básico': 'Plano Básico',
    'Padrão': 'Plano Padrão',
    'Premium': 'Plano Premium',
    'Serviços': 'Prestador de Serviços'
  };
  return nomesPlanos[planoId] || planoId || 'Não definido';
}

// Função para formatar data de vencimento para exibição amigável
function formatarDataVencimento(dataString) {
  if (!dataString) return "";
  
  // Formato ISO string (2026-04-29T03:00:00.000Z)
  if (dataString.includes("T") && dataString.includes("Z")) {
    const dataObj = new Date(dataString);
    return dataObj.toLocaleDateString('pt-BR'); // DD/MM/YYYY
  }
  
  // Formato YYYY-MM-DD
  if (dataString.includes("-") && dataString.length === 10) {
    const [ano, mes, dia] = dataString.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  
  // Formato DD/MM/YYYY (já está correto)
  if (dataString.includes("/")) {
    return dataString;
  }
  
  // Fallback: retornar original
  return dataString;
}

async function gerenciarCliente(emailAlvo, novoStatus) {
  if (!await confirmarAcao(novoStatus === "Ativo" ? "✅" : "🚫", "Alterar Acesso", `${novoStatus === "Ativo" ? "Renovar (+30 dias)" : "Bloquear"} acesso de <strong>${emailAlvo}</strong>?`)) return;
  try { const res = await chamarGoogle("alterarStatusCliente", { emailAlvo, novoStatus }); if (res?.status === "Sucesso") { mostrarToast("✅ Acesso alterado!", "sucesso"); abrirAdmin(); } else throw new Error(); }
  catch { mostrarToast("❌ Erro.", "erro"); }
}

function abrirModalAjustePlano(uid, perfilAtual, vencimentoAtual) {
  // Debug: verificar parâmetros recebidos
  console.log("abrirModalAjustePlano - UID:", uid, "perfilAtual:", perfilAtual, "vencimentoAtual:", vencimentoAtual);
  console.log("adminClientesGlobal:", adminClientesGlobal);
  
  // Buscar dados completos do usuário
  const usuario = adminClientesGlobal.find(u => u.uid === uid || u.email === uid);
  console.log("Usuário encontrado:", usuario);
  
  // Criar modal de ajuste se não existir
  let modal = document.getElementById("modal-ajuste-plano");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-ajuste-plano";
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); z-index: 9999;
      display: flex; align-items: center; justify-content: center;
    `;
    
    modal.innerHTML = `
      <div style="background: white; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.15);">
        <h3 id="modal-ajuste-titulo" style="margin: 0 0 20px 0; color: #1565C0; font-size: 18px;">Ajustar Plano do Usuário</h3>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Tipo de Plano:</label>
          <select id="ajuste-perfil" style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
            <option value="varejo-trial">Plano Trial (7 dias - Completo)</option>
            <option value="varejo-rapido">Plano Básico: Varejo Rápido</option>
            <option value="varejo-padrao">Plano Padrão: Varejo</option>
            <option value="varejo-premium">Plano Premium: Varejo com Inventário</option>
            <option value="servicos">Perfil: Prestador de Serviços</option>
          </select>
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Data de Vencimento:</label>
          <input type="date" id="ajuste-vencimento" style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button onclick="fecharModalAjustePlano()" style="padding: 10px 20px; border: 2px solid #e0e0e0; background: white; border-radius: 8px; cursor: pointer; font-size: 14px;">Cancelar</button>
          <button onclick="salvarAjusteAdmin('${uid}')" style="padding: 10px 20px; background: #1565C0; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">Salvar Ajustes</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
  
  // Auto-preenchimento inteligente com dados do usuário
  if (usuario) {
    console.log("Dados do usuário:", JSON.stringify(usuario, null, 2));
    
    // Atualizar título com e-mail do usuário
    const tituloEl = document.getElementById("modal-ajuste-titulo");
    if (tituloEl) {
      tituloEl.innerHTML = `Ajustar Plano: <strong>${usuario.email || uid}</strong>`;
    }
    
    // Preencher perfil atual (verificar diferentes nomes de campo)
    let perfilUsuario = usuario.perfilNegocio || usuario.perfil || "";
    
    // Se ainda não encontrou, tentar mapear do campo 'plano'
    if (!perfilUsuario && usuario.plano) {
      const planoMap = {
        // Mapeamento de nomes amigáveis para IDs
        "Trial 7 Dias": "varejo-trial",
        "Básico": "varejo-rapido",
        "Padrão": "varejo-padrao", 
        "Premium": "varejo-premium",
        "Serviços": "servicos",
        "Trial": "varejo-trial",
        // IDs que já vêm formatados (mapeamento direto)
        "varejo-trial": "varejo-trial",
        "varejo-rapido": "varejo-rapido",
        "varejo-padrao": "varejo-padrao",
        "varejo-premium": "varejo-premium",
        "servicos": "servicos"
      };
      
      // Tentar mapear o valor do campo plano
      perfilUsuario = planoMap[usuario.plano];
      
      // Se não encontrou no mapa, verificar se já é um ID válido
      if (!perfilUsuario) {
        const idsValidos = ["varejo-trial", "varejo-rapido", "varejo-padrao", "varejo-premium", "servicos"];
        if (idsValidos.includes(usuario.plano)) {
          perfilUsuario = usuario.plano;
        }
      }
      
      console.log("Perfil mapeado do campo plano:", usuario.plano, "->", perfilUsuario);
    }
    
    // Se ainda não encontrou, tentar usar perfilNegocio do usuário
    if (!perfilUsuario && usuario.perfilNegocio) {
      perfilUsuario = usuario.perfilNegocio;
      console.log("Usando perfilNegocio do usuário:", perfilUsuario);
    }
    
    console.log("Perfil do usuário:", perfilUsuario);
    const selectPerfil = document.getElementById("ajuste-perfil");
    if (selectPerfil) {
      selectPerfil.value = perfilUsuario;
      console.log("Select perfil preenchido com:", selectPerfil.value);
    }
    
    // Preencher data de vencimento (formatar para YYYY-MM-DD)
    const dataVencimento = usuario.vencimento || "";
    console.log("Data de vencimento bruta:", dataVencimento);
    
    if (dataVencimento) {
      let dataFormatada = "";
      
      // Formato ISO string (2026-04-29T03:00:00.000Z)
      if (dataVencimento.includes("T") && dataVencimento.includes("Z")) {
        const dataObj = new Date(dataVencimento);
        dataFormatada = dataObj.toISOString().split('T')[0]; // Pega apenas YYYY-MM-DD
        console.log("Data ISO formatada:", dataFormatada);
      }
      // Formato DD/MM/YYYY
      else if (dataVencimento.includes("/")) {
        const partes = dataVencimento.split("/");
        if (partes.length === 3) {
          dataFormatada = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        }
      }
      // Formato YYYY-MM-DD (já está correto)
      else if (dataVencimento.includes("-") && dataVencimento.length === 10) {
        dataFormatada = dataVencimento;
      }
      
      console.log("Data formatada final:", dataFormatada);
      const inputVencimento = document.getElementById("ajuste-vencimento");
      if (inputVencimento) {
        inputVencimento.value = dataFormatada;
        console.log("Input vencimento preenchido com:", inputVencimento.value);
      }
    } else {
      const inputVencimento = document.getElementById("ajuste-vencimento");
      if (inputVencimento) {
        inputVencimento.value = "";
        console.log("Input vencimento limpo (sem data)");
      }
    }
  } else {
    console.log("Usuário não encontrado, usando fallback");
    // Fallback para valores passados como parâmetro
    const selectPerfil = document.getElementById("ajuste-perfil");
    if (selectPerfil) {
      selectPerfil.value = perfilAtual || "";
      console.log("Fallback - perfil preenchido com:", perfilAtual);
    }
    
    const inputVencimento = document.getElementById("ajuste-vencimento");
    if (inputVencimento) {
      inputVencimento.value = vencimentoAtual || "";
      console.log("Fallback - vencimento preenchido com:", vencimentoAtual);
    }
  }
  
  // Armazenar UID para salvar
  modal.dataset.uid = uid;
  
  // Exibir modal
  modal.style.display = "flex";
}

function fecharModalAjustePlano() {
  const modal = document.getElementById("modal-ajuste-plano");
  if (modal) {
    modal.style.display = "none";
  }
}

async function salvarAjusteAdmin(uid) {
  const modal = document.getElementById("modal-ajuste-plano");
  if (!modal) return;
  
  const novoPerfil = document.getElementById("ajuste-perfil").value;
  const novaData = document.getElementById("ajuste-vencimento").value;
  
  if (!novoPerfil || !novaData) {
    mostrarToast("Preencha todos os campos!", "erro");
    return;
  }
  
  try {
    console.log("Salvando ajuste de plano - UID:", uid, "Perfil:", novoPerfil, "Data:", novaData);
    
    // Usar apenas chamarGoogle() para salvar na planilha
    // O sistema de sincronização do cliente vai baixar o novo plano quando abrir o app
    console.log("Enviando requisição para ajustarPlanoUsuario...");
    
    const res = await chamarGoogle("ajustarPlanoUsuario", {
      uid: uid,
      perfilNegocio: novoPerfil,
      vencimento: novaData
    });
    
    console.log("Resposta completa do backend:", JSON.stringify(res, null, 2));
    console.log("Status da resposta:", res?.status);
    console.log("Mensagem da resposta:", res?.mensagem);
    
    if (res?.status === "Sucesso") {
      // Atualizar array local adminClientesGlobal
      const usuarioIndex = adminClientesGlobal.findIndex(u => u.email === uid);
      if (usuarioIndex !== -1) {
        adminClientesGlobal[usuarioIndex].plano = res.dados.perfilNegocio;
        adminClientesGlobal[usuarioIndex].vencimento = res.dados.vencimento;
        // Adicionar data da última alteração
        adminClientesGlobal[usuarioIndex].ultimaAlteracao = new Date().toISOString();
        adminClientesGlobal[usuarioIndex].alteradoPor = window.firebaseAuth?.currentUser?.email || EMAIL_ADMIN;
        console.log("Array local atualizado:", adminClientesGlobal[usuarioIndex]);
      }
      
      // Atualização em tempo real: se o usuário editado for o mesmo logado
      const usuarioAtual = window.firebaseAuth?.currentUser;
      if (usuarioAtual && (uid === usuarioAtual.email || uid === usuarioAtual.uid)) {
        console.log("Usuário editado é o mesmo logado - atualizando perfil em tempo real");

        // FASE 12.5: Trava Estrita do Admin VIP - bloquear QUALQUER sobrescrita
        const userEmail = localStorage.getItem("user_email");
        const ehAdmin = (userEmail === EMAIL_ADMIN);
        const perfilTeste = localStorage.getItem('perfilAdminTeste');

        if (ehAdmin && perfilTeste) {
          perfilNegocioAtual = perfilTeste; // O Admin é o Rei
          localStorage.setItem("perfilNegocio", perfilNegocioAtual);
          console.log('[ADMIN RT VIP] TRAVA ESTRITA: Forçando perfil de teste sobre atualização em tempo real:', perfilTeste);
          console.log('[ADMIN RT VIP] Servidor retornou:', novoPerfil, '- IGNORADO');
          return; // Aborta a atualização
        }

        // Atualizar variável global (fluxo normal para usuários comuns)
        perfilNegocioAtual = novoPerfil;

        // Aplicar perfil imediatamente
        aplicarPerfilNegocio();
        
        // Atualizar configurações se necessário
        if (typeof carregarConfiguracoes === 'function') {
          carregarConfiguracoes();
        }
        
        console.log("Perfil atualizado em tempo real para:", perfilNegocioAtual);
      }
      
      // Atualizar interface em tempo real
      renderizarAdmin();
      
      mostrarToast("Plano ajustado com sucesso!", "sucesso");
      fecharModalAjustePlano();
    } else {
      throw new Error(res?.mensagem || "Erro desconhecido");
    }
    
  } catch (err) {
    console.error("Erro ao ajustar plano:", err);
    mostrarToast("", "erro");
  }
}

// ============================================================
// TOAST, CONFIRMAÇÃO, MODAIS
// ============================================================
function mostrarToast(msg, tipo = "sucesso") {
  const c = document.getElementById("toast-container"); if (!c) return;
  const t = document.createElement("div"); t.className = "toast " + tipo; t.innerText = msg;
  c.appendChild(t); setTimeout(() => t.remove(), 3500);
}
function confirmarAcao(icone, titulo, mensagem) {
  document.getElementById("confirm-icon").innerText = icone;
  document.getElementById("confirm-titulo").innerText = titulo;
  document.getElementById("confirm-mensagem").innerHTML = mensagem;
  document.getElementById("modal-confirmacao").style.display = "flex";
  _lockScroll();
  return new Promise(resolve => { confirmacaoResolve = resolve; const btn = document.getElementById("btn-confirmar-ok"); btn.replaceWith(btn.cloneNode(true)); document.getElementById("btn-confirmar-ok").onclick = () => fecharConfirmacao(true); });
}
function fecharConfirmacao(v) { document.getElementById("modal-confirmacao").style.display = "none"; _unlockScroll(); if (confirmacaoResolve) { confirmacaoResolve(v); confirmacaoResolve = null; } }
// Helpers centralizados de body overflow (Item 1: evita scroll do fundo ao abrir modal)
function _lockScroll() { document.body.style.overflow = "hidden"; }
function _unlockScroll() { document.body.style.overflow = ""; }

function abrirModalTermos(e) { if (e) e.preventDefault(); document.getElementById("modal-termos").style.display = "flex"; _lockScroll(); }
function fecharModalTermos() { document.getElementById("modal-termos").style.display = "none"; _unlockScroll(); }
function abrirModalFeedback(e) { if (e) e.preventDefault(); document.getElementById("modal-feedback").style.display = "flex"; _lockScroll(); }
function fecharModalFeedback() { document.getElementById("modal-feedback").style.display = "none"; _unlockScroll(); }

// ── Modal de planos — renderizado dinamicamente via Planilha Motor ────────────
var _planosCache = null; // cache para não buscar a cada abertura

function abrirModalPlanos() {
  document.getElementById("modal-planos").style.display = "flex";
  _lockScroll();
  voltarEscolhaPlanos();
  _carregarPlanos();
}
function fecharModalPlanos() { document.getElementById("modal-planos").style.display = "none"; _unlockScroll(); }
function voltarEscolhaPlanos() {
  document.getElementById("modal-planos-escolha").style.display = "block";
  document.getElementById("modal-planos-pix").style.display = "none";
}

async function _carregarPlanos() {
  const listaEl = document.getElementById("modal-planos-lista");
  if (!listaEl) return;

  // Usar dados atualizados do localStorage (carregados por carregarPlanosConfig)
  const planosConfig = JSON.parse(localStorage.getItem("planosConfig") || "[]");
  console.log("[PLANOS MODAL] Usando planos do localStorage:", planosConfig);
  
  if (!planosConfig.length) {
    // Sem planos no localStorage: exibe mensagem de erro
    listaEl.innerHTML = `
      <div style="background:#FFF3E0;border:1.5px solid #FFB300;border-radius:12px;padding:18px;text-align:left;">
        <p style="font-size:13px;color:#E65100;margin:0;line-height:1.6;">
          <strong>Nenhum plano ativo encontrado.</strong><br>
          Execute <code>verificarPlanilhaMotor()</code> no Apps Script para criar a aba <strong>Config_Planos</strong>,
          ou verifique se algum plano tem Status = <strong>Ativo</strong>.
        </p>
      </div>`;
    return;
  }
  
  renderizarModalPlanos(planosConfig);
}

function renderizarModalPlanos(planos) {
  const listaEl = document.getElementById("modal-planos-lista");
  if (!listaEl) return;

  console.log("[PLANOS MODAL] Renderizando planos:", planos);
  const fmtValor = v => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Precificação Inteligente ──────────────────────────────────────────────────
  // Encontra o plano mensal como base de comparação para calcular descontos
  const planoMensal = planos.find(p => p.id && p.id.includes("mensal"));
  const precoBaseMensal = planoMensal ? planoMensal.preco || 0 : 0;

  // Ajuste Final de Polimento: Filtrar planos Trial da vitrine (não faz sentido comercial)
  const planosFiltrados = planos.filter(p => 
    p.id !== "trial_7dias" && 
    !p.nome?.toLowerCase().includes("trial") &&
    !(p.perfil === "varejo-trial" && p.preco === 0)
  );
  
  listaEl.innerHTML = planosFiltrados.map(p => {
    const valor = p.preco || 0;

    // Detecta quantos meses o plano cobre pelo período ou ID
    let meses = 1;
    if (p.periodo === "trimestral" || (p.id && p.id.includes("trimestral"))) meses = 3;
    if (p.periodo === "semestral") meses = 6;
    if (p.periodo === "anual") meses = 12;

    // Cálculo automático de equivalência e desconto (se planilha não tiver valor definido)
    let badgeTexto = p.destaque || "";   // usa planilha como prioridade
    let descTexto = p.descricao || "";  // usa planilha como fallback
    
    // Ajuste especial para Trial: mostrar como upgrade premium
    if (p.id === "trial_7dias" || (p.perfil === "varejo-trial" && valor === 0)) {
      badgeTexto = "TESTE PREMIUM";
      descTexto = "Teste todas as funcionalidades premium por 7 dias gratuitos. Sem compromisso!";
    }

    // Se não houver badge definido na planilha, calcula automaticamente
    if (!badgeTexto && meses > 1 && valor > 0) {
      const equivalente = valor / meses;
      if (precoBaseMensal > 0) {
        const desconto = 100 - (equivalente / precoBaseMensal * 100);
        if (desconto > 0) {
          badgeTexto = "Economize " + Math.round(desconto) + "%";
        }
      }
    }
    
    // Se não houver descrição definida na planilha, calcula automaticamente
    if (!descTexto && meses > 1 && valor > 0) {
      const equivalente = valor / meses;
      descTexto = "Equivale a R\$ " + equivalente.toFixed(2).replace(".", ",") + "/mês. Renovação a cada " + meses + " meses.";
    } else if (!descTexto && meses === 1) {
      descTexto = "Cobrança mensal automática. Cancele quando quiser.";
    }

    return `
    <div style="background:${p.bgCard || "#E3F2FD"};border:2px solid ${p.corBorda || p.cor || "#1565C0"};border-radius:14px;padding:18px;margin-bottom:12px;">
      ${badgeTexto ? `<p style="font-size:11px;font-weight:700;color:${p.cor || "#1565C0"};text-transform:uppercase;margin:0 0 4px;">${badgeTexto}</p>` : ""}
      <strong style="font-size:22px;color:${p.cor || "#0D47A1"};">R\$ ${fmtValor(valor)}</strong>
      ${p.nome ? `<span style="font-size:14px;color:#546E7A;margin-left:4px;">${p.nome}</span>` : ""}
      ${descTexto ? `<p style="font-size:13px;color:#546E7A;margin:8px 0 12px;">${descTexto}</p>` : ""}
      <div style="display:flex;gap:8px;">
        <button onclick="gerarCheckoutAvulso('${p.id}')" id="btn-assinar-${p.id}"
          class="btn-primario" style="flex:1;background:linear-gradient(135deg,${p.cor || "#1565C0"},${p.cor || "#0D47A1"});font-size:13px;padding:12px 8px;">
          💳 Cartão
        </button>
        <button onclick="gerarPixAvulso('${p.id}')" id="btn-pix-${p.id}"
          class="btn-primario" style="flex:1;background:linear-gradient(135deg,#2E7D32,#1B5E20);font-size:13px;padding:12px 8px;">
          📱 PIX
        </button>
      </div>
    </div>`;
  }).join("");
}

// ── Assinar plano: cartão = redirect MP | pix = QR Code direto ───────────────
async function assinarPlano(plano, metodo) {
  metodo = metodo || "cartao";
  
  // Usar mapeamento correto: ID_Plano para checkout
  const planoId = getPlanoIdFromPerfil(plano);
  console.log(`Assinando plano: ${plano} → ID_Plano: ${planoId}`);
  
  const btnId = metodo === "pix" ? "btn-pix-" + plano : "btn-assinar-" + plano;
  const btn = document.getElementById(btnId);
  const orig = btn?.innerText || "";
  if (btn) { btn.disabled = true; btn.innerText = "⏳..."; btn.style.opacity = ".7"; }

  try {
    if (metodo === "pix") {
      // ── Fluxo PIX: gera QR Code direto sem redirect ──────────────────────
      const res = await chamarGoogle("gerarPixAvulso", { plano });
      if (btn) resetarBotao(btnId, orig);

      if (res?.ok && res?.qrCodeBase64 && res?.qrCode) {
        document.getElementById("pix-qrcode-img").src = "data:image/png;base64," + res.qrCodeBase64;
        document.getElementById("pix-copia-cola").value = res.qrCode;
        // FIX: usa o valor REAL retornado pelo backend (vem da planilha), nunca hardcoded
        const planoInfo = (_planosCache || []).find(p => p.id === plano);
        const nomePlano = planoInfo?.nome || plano;
        const valorLabel = res.valor != null
          ? "R$ " + Number(res.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
          : (planoInfo ? "R$ " + Number(planoInfo.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "");
        document.getElementById("pix-plano-label").innerText = nomePlano + " — " + valorLabel;
        document.getElementById("modal-planos-escolha").style.display = "none";
        document.getElementById("modal-planos-pix").style.display = "block";
      } else {
        mostrarToast("❌ " + (res?.erro || "Erro ao gerar PIX. Tente novamente."), "erro");
      }

    } else {
      // ── Fluxo Cartão: redireciona para checkout do Mercado Pago ─────────
      const res = await chamarGoogle("gerarLinkAssinatura", { plano: planoId });
      if (btn) resetarBotao(btnId, orig);

      if (res?.ok && res?.link) {
        mostrarToast("✅ Redirecionando para pagamento seguro...", "sucesso");
        setTimeout(() => { window.location.href = res.link; }, 800);
      } else {
        mostrarToast("❌ " + (res?.erro || "Erro ao gerar link. Tente novamente."), "erro");
      }
    }

  } catch {
    if (btn) resetarBotao(btnId, orig);
    mostrarToast("❌ Erro de conexão.", "erro");
  }
}

// ── Copia o código PIX Copia e Cola para a área de transferência ──────────────
function copiarPixCode() {
  const input = document.getElementById("pix-copia-cola");
  if (!input?.value) return;
  navigator.clipboard.writeText(input.value)
    .then(() => mostrarToast("✅ Código PIX copiado!", "sucesso"))
    .catch(() => {
      // Fallback para navegadores sem clipboard API
      input.select(); document.execCommand("copy");
      mostrarToast("✅ Código PIX copiado!", "sucesso");
    });
}
async function enviarFeedback(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-enviar-feedback"); const orig = btn.innerText;
  btn.disabled = true; btn.innerText = "⏳..."; btn.style.opacity = ".7";
  const payload = {
    preco: document.getElementById("fb-preco").value,
    vital: document.getElementById("fb-vital").value,
    sugestao: document.getElementById("fb-sugestao")?.value || "",
    email: localStorage.getItem("user_email") || "anônimo"
  };
  try {
    const res = await chamarGoogle("salvarFeedback", payload);
    if (res?.status === "Sucesso") { mostrarToast("✅ Obrigado pelo feedback! 🙌", "sucesso"); document.getElementById("form-feedback").reset(); fecharModalFeedback(); }
    else throw new Error();
  }
  catch { mostrarToast("❌ Erro ao enviar.", "erro"); }
  finally { resetarBotao("btn-enviar-feedback", orig); }
}
function logout() { document.getElementById("modal-logout").style.display = "flex"; _lockScroll(); }
function fecharModalLogout() { document.getElementById("modal-logout").style.display = "none"; _unlockScroll(); }
function confirmarLogout() { localStorage.clear(); location.reload(); }

// ============================================================
// Item 2 — Detector de Conexão Offline
// ============================================================
function _atualizarStatusOnline() {
  const barra = document.getElementById("aviso-offline");
  if (!barra) return;
  if (!navigator.onLine) {
    barra.style.display = "block";
    // Empurra o conteúdo para baixo para não sobrepor o header
    document.getElementById("container-app").style.paddingTop = "40px";
  } else {
    barra.style.display = "none";
    document.getElementById("container-app").style.paddingTop = "";
  }
}
window.addEventListener("offline", _atualizarStatusOnline);
window.addEventListener("online", () => {
  _atualizarStatusOnline();
  mostrarToast("✅ Conexão restaurada!", "sucesso");
});

// ============================================================
// Item 4 — Recibo via WhatsApp (modal após salvar venda)
// ============================================================
var _ultimaVendaRecibo = null; // guarda dados da última venda para o recibo
var _detalhesVendaLinha = null; // linha no Sheets para dar baixa

function abrirDetalhesVenda(docId, d) {
  _detalhesVendaLinha = docId; // Agora o ID é o docId do Firebase
  console.log("[DETALHES] Dados recebidos:", d);
  const modal = document.getElementById("modal-detalhes-venda");
  const resumoEl = document.getElementById("detalhes-venda-resumo");
  const btnBaixa = document.getElementById("btn-dar-baixa");

  if (!modal || !resumoEl) return;

  const status = String(d?.formaPag || "").trim();
  const totalStr = formatarBRL(converterFloat(d?.total || d?.valor || 0));

  // Monta o texto do resumo
  const tipoContratacao = d.tipoContratacao || "particular";
  const agenciaInfo = tipoContratacao === "agencia" && d.nomeAgencia 
    ? `<p>🏢 <b>Agência:</b> ${d.nomeAgencia}</p>` 
    : "";
  
  // Calcular forma de pagamento
  const metodos = [];
  if (converterFloat(d.dinheiro) > 0) metodos.push("💵 Dinheiro");
  if (converterFloat(d.pix) > 0) metodos.push("📱 PIX");
  if (converterFloat(d.debito) > 0) metodos.push("💳 Débito");
  if (converterFloat(d.credito) > 0) metodos.push("💳 Crédito");
  const formaPagamentoStr = metodos.length ? metodos.join(" + ") : "—";
  
  let resumoHTML = `
    <div style="text-align:left; font-size:14px; line-height:1.6;">
      <p>📅 <b>Data:</b> ${formatarDataBR(d.data)}</p>
      <p>👤 <b>Cliente:</b> ${d.cliente || "Não informado"}</p>
      ${agenciaInfo}
      <p>📝 <b>Descrição:</b> ${d.descricao || "—"}</p>
      <p>📦 <b>Quantidade:</b> ${d.qtd || 1}</p>
      <p>💰 <b>Total:</b> <span style="color:#1565C0;font-weight:800;">${totalStr}</span></p>
      <p>📌 <b>Status:</b> ${status === "Pendente" ? "⏳ Pendente (Fiado)" : "✅ Pago"}</p>
      <p>💳 <b>Forma de Pagamento:</b> ${formaPagamentoStr}</p>
    </div>
    <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
       <button class="btn-acao btn-editar" style="width:100%; padding:12px;" onclick="fecharModalDetalhesVenda(); abrirLancarVendas('${docId}', ${JSON.stringify(d).replace(/"/g, '&quot;')})">✏️ Editar</button>
       <button class="btn-acao btn-excluir" style="width:100%; padding:12px;" onclick="fecharModalDetalhesVenda(); excluirVenda('${docId}')">🗑️ Excluir</button>
       <button class="btn-acao" style="width:100%; padding:12px; grid-column: span 2; background:#25D366; color:white;" onclick="fecharModalDetalhesVenda(); abrirModalRecibo(${JSON.stringify(d).replace(/"/g, '&quot;')})">💬 Recibo WhatsApp</button>
    </div>
  `;

  resumoEl.innerHTML = resumoHTML;

  // Mostra botão de dar baixa apenas se estiver pendente
  if (btnBaixa) {
    btnBaixa.style.display = status === "Pendente" ? "block" : "none";
    btnBaixa.onclick = () => darBaixaVenda(docId);
  }

  modal.style.display = "flex";
  _lockScroll();
}

function fecharModalDetalhesVenda() {
  const modal = document.getElementById("modal-detalhes-venda");
  if (modal) modal.style.display = "none";
  _unlockScroll();
}

async function darBaixaVenda(docId) {
  if (!docId) return;
  fecharModalDetalhesVenda();
  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  if (!uid) { mostrarToast("⚠️ Sessão expirada. Faça login novamente.", "erro"); return; }
  const telaAntes = telaAtual;
  mostrarTela("tela-loading");
  try {
    // ── FIREBASE: atualiza apenas o campo formaPag para 'Pago' ────────
    await window.firebaseUpdateDoc(
      window.firebaseDoc(window.firebaseDb, "lojas", uid, "vendas", docId),
      { formaPag: "Pago" }
    );
    // ─────────────────────────────────────────────────────────────────
    mostrarToast("✅ Baixa registrada como Pago!", "sucesso");
  } catch (err) {
    console.error("Erro ao dar baixa no Firestore:", err);
    mostrarToast("❌ Erro ao dar baixa.", "erro");
  } finally {
    // Recarrega histórico e volta para a tela anterior
    try { buscarHistorico(); } catch { }
    mostrarTela(telaAntes && telaAntes !== "tela-loading" ? telaAntes : "tela-dashboard");
  }
}

function abrirModalRecibo(dados) {
  _ultimaVendaRecibo = dados;
  console.log("[RECIBO] Dados recebidos:", dados);
  const resumo = document.getElementById("recibo-resumo");
  if (resumo) {
    const linhas = [];
    if (dados.cliente) linhas.push(`👤 Cliente: ${dados.cliente}`);
    // Adicionar agência se for contratação via agência
    const tipoContratacao = dados.tipoContratacao || "particular";
    if (tipoContratacao === "agencia" && dados.nomeAgencia) {
      linhas.push(`🏢 Agência: ${dados.nomeAgencia}`);
    }
    if (dados.descricao) linhas.push(`📝 ${dados.descricao}`);
    // Adicionar quantidade se existir
    if (dados.qtd && dados.qtd > 1) {
      linhas.push(`📦 Quantidade: ${dados.qtd}`);
    }
    const status = String(dados.formaPag || "").trim();
    console.log("[RECIBO] Status recebido:", status);
    linhas.push(`💰 Valor: ${formatarBRL(dados.total || dados.valor || 0)}`);
    if (status) linhas.push(`Status: ${status === "Pendente" ? "⏳ Fiado (Pendente)" : "✅ Pago"}`);
    const metodos = [];
    if (converterFloat(dados.dinheiro) > 0) metodos.push("💵 Dinheiro");
    if (converterFloat(dados.pix) > 0) metodos.push("📱 PIX");
    if (converterFloat(dados.debito) > 0) metodos.push("💳 Débito");
    if (converterFloat(dados.credito) > 0) metodos.push("💳 Crédito");
    if (metodos.length) linhas.push(`Método: ${metodos.join(" + ")}`);
    resumo.innerText = linhas.join("\n");
  }
  document.getElementById("modal-recibo").style.display = "flex";
  _lockScroll();
}
function fecharModalRecibo() {
  document.getElementById("modal-recibo").style.display = "none";
  _unlockScroll();
}
function enviarReciboWhatsApp() {
  if (!_ultimaVendaRecibo) return;
  const d = _ultimaVendaRecibo;
  const loja = configuracoesGlobais.nomeLoja || "BateCaixa";
  const valor = formatarBRL(d.total || d.valor || 0);
  const status = String(d.formaPag || "").trim();
  const metodos = [];
  if (converterFloat(d.dinheiro) > 0) metodos.push("Dinheiro");
  if (converterFloat(d.pix) > 0) metodos.push("PIX");
  if (converterFloat(d.debito) > 0) metodos.push("Débito");
  if (converterFloat(d.credito) > 0) metodos.push("Crédito");
  const linhas = [
    `🧾 *Confirmação de Venda — ${loja}*`,
    ``,
    d.cliente ? `👤 Cliente: ${d.cliente}` : null,
    d.descricao ? `📝 ${d.descricao}` : null,
    `💰 *Valor: ${valor}*`,
    status ? `📌 *Status:* ${status === "Pendente" ? "Fiado (Pendente)" : "Pago"}` : null,
    metodos.length ? `💳 *Método:* ${metodos.join(" + ")}` : null,
    ``,
    `_Emitido pelo BateCaixa_`
  ].filter(l => l !== null).join("%0A");
  window.open("https://wa.me/?text=" + linhas, "_blank");
}

// Baixa o recibo do modal como PNG (print via html2canvas)
async function baixarReciboImagem() {
  if (typeof html2canvas === "undefined") { mostrarToast("⚠️ html2canvas indisponível.", "aviso"); return; }
  const area = document.getElementById("recibo-imagem-area");
  if (!area) { mostrarToast("❌ Área do recibo não encontrada.", "erro"); return; }

  const btn = document.getElementById("btn-recibo-baixar");
  const orig = btn?.innerText || "";
  if (btn) { btn.disabled = true; btn.innerText = "⏳ Gerando..."; btn.style.opacity = ".7"; }
  mostrarToast("📸 Gerando recibo em imagem...", "aviso");

  try {
    const canvas = await html2canvas(area, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff"
    });
    const link = document.createElement("a");
    link.download = "recibo-batecaixa.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    mostrarToast("✅ Recibo baixado!", "sucesso");
  } catch {
    mostrarToast("❌ Erro ao gerar imagem do recibo.", "erro");
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = orig; btn.style.opacity = "1"; }
  }
}

// ============================================================
// Item 3 — PWA: Botão "Instalar App"
// ============================================================
var _pwaInstallEvent = null;

window.addEventListener("beforeinstallprompt", (e) => {
  // Captura o evento sem mostrar o prompt nativo imediatamente
  e.preventDefault();
  _pwaInstallEvent = e;
  // Mostra o botão somente quando o evento estiver disponível
  const btn = document.getElementById("btn-instalar-app");
  if (btn) btn.style.display = "block";
});

window.addEventListener("appinstalled", () => {
  // App foi instalado — oculta o botão
  const btn = document.getElementById("btn-instalar-app");
  if (btn) btn.style.display = "none";
  _pwaInstallEvent = null;
  mostrarToast("✅ BateCaixa instalado com sucesso!", "sucesso");
});

function instalarApp() {
  if (!_pwaInstallEvent) {
    mostrarToast("ℹ️ Para instalar: use o menu do navegador → 'Adicionar à tela inicial'.", "aviso");
    return;
  }
  _pwaInstallEvent.prompt();
  _pwaInstallEvent.userChoice.then(choice => {
    if (choice.outcome === "accepted") mostrarToast("✅ Instalando BateCaixa...", "sucesso");
    _pwaInstallEvent = null;
    const btn = document.getElementById("btn-instalar-app");
    if (btn) btn.style.display = "none";
  });
}

// ============================================================
// INICIALIZAÇÃO VISUAL BÁSICA
// ============================================================
window.onload = () => {
  console.log("[ONLOAD] Iniciando...");
  
  // Atualizar nome e só DEPOIS mostrar loading (para evitar flicker)
  const temSessao = document.documentElement.classList.contains('tem-sessao');
  console.log("[ONLOAD] tem-sessao:", temSessao);
  console.log("[ONLOAD] window.__nomeUsuarioLoading:", window.__nomeUsuarioLoading);
  
  if (temSessao) {
    const nome = window.__nomeUsuarioLoading || "Vendedor";
    console.log("[ONLOAD] Nome completo que será usado:", nome);
    
    const nomeLoading = document.getElementById("nome-loading");
    console.log("[ONLOAD] Elemento nome-loading encontrado:", nomeLoading ? "SIM" : "NÃO");
    
    if (nomeLoading) {
      console.log("[ONLOAD] Texto ANTES:", nomeLoading.innerText);
      nomeLoading.innerText = nome; // Nome completo
      console.log("[ONLOAD] Texto DEPOIS:", nomeLoading.innerText);
    }
    
    // SÓ AGORA mostrar o loading (depois do nome estar correto)
    const loading = document.getElementById("tela-loading");
    console.log("[ONLOAD] Elemento tela-loading encontrado:", loading ? "SIM" : "NÃO");
    
    if (loading) {
      loading.style.display = "flex";
      loading.style.pointerEvents = "all";
      console.log("[ONLOAD] Loading mostrado");
    }
  }
  
  console.log("[ONLOAD] Finalizado");
};


// ============================================================
// PRODUTOS (Módulo D - Funções essenciais)
// ============================================================

function preencherAutocompleteProdutos() {
  const datalist = document.getElementById("lista-produtos-autocomplete");
  if (!datalist) return;
  
  datalist.innerHTML = "";
  produtosGlobal.forEach(produto => {
    if (produto.nome && produto.nome.trim()) {
      const option = document.createElement("option");
      option.value = produto.nome.trim();
      datalist.appendChild(option);
    }
  });
}

function calcularPrecoVenda() {
  const custo = converterFloat(document.getElementById("prod-custo").value) || 0;
  const margem = converterFloat(document.getElementById("prod-margem").value) || 0;
  
  if (custo > 0 && margem >= 0) {
    const precoVenda = custo * (1 + margem / 100);
    document.getElementById("prod-preco").value = formatarBRL(precoVenda);
  }
}

function alternarTipoItemVenda() {
  const tipoSelecionado = document.querySelector('input[name="tipo-item"]:checked')?.value || "produto";
  const blocoProduto = document.getElementById("bloco-venda-produto");
  const blocoServico = document.getElementById("bloco-venda-servico");
  
  if (tipoSelecionado === "produto") {
    blocoProduto.style.display = "block";
    blocoServico.style.display = "none";
  } else {
    blocoProduto.style.display = "none";
    blocoServico.style.display = "block";
  }
}

/**
 * Alterna entre modelo de cobrança "Por Hora" e "Valor Fixo"
 * Atualiza o label do valor, controla visibilidade dos campos de horário
 * e chama o cálculo do subtotal
 */
function alternarModeloCobranca() {
  const modeloSelecionado = document.querySelector('input[name="modelo-cobranca"]:checked')?.value || "por-hora";
  const labelValor = document.getElementById("label-vd-valor");
  const inputValor = document.getElementById("vd-valor-hora");
  const containerHorarios = document.getElementById("container-horarios");
  
  if (modeloSelecionado === "por-hora") {
    if (labelValor) labelValor.textContent = "Valor/Hora (R$):";
    if (inputValor) inputValor.placeholder = "0,00";
    // Mostrar campos de horário
    if (containerHorarios) containerHorarios.style.display = "grid";
  } else {
    if (labelValor) labelValor.textContent = "Valor Fixo (R$):";
    if (inputValor) inputValor.placeholder = "Valor total do serviço";
    // Esconder campos de horário (não necessários para valor fixo)
    if (containerHorarios) containerHorarios.style.display = "none";
  }
  
  // Recalcular subtotal ao alternar modelo
  calcularSubtotalServico();
}

/**
 * Alterna entre tipo de contratação "Particular" e "Agência"
 * Mostra/esconde o campo de nome da agência
 */
function alternarTipoContratacao() {
  const tipoSelecionado = document.querySelector('input[name="tipo-contratacao"]:checked')?.value || "particular";
  const containerAgencia = document.getElementById("container-agencia");
  
  if (tipoSelecionado === "agencia") {
    if (containerAgencia) containerAgencia.style.display = "block";
  } else {
    if (containerAgencia) containerAgencia.style.display = "none";
    // Limpar campo de agência quando voltar para particular
    const inputAgencia = document.getElementById("vd-nome-agencia");
    if (inputAgencia) inputAgencia.value = "";
  }
}

/**
 * Calcula o subtotal do serviço baseado no modelo de cobrança
 * Por Hora: (Horário Fim - Horário Início) × Valor por Hora - Custo
 * Valor Fixo: Valor Fixo - Custo
 */
function calcularSubtotalServico() {
  const modeloSelecionado = document.querySelector('input[name="modelo-cobranca"]:checked')?.value || "por-hora";
  const horarioInicio = document.getElementById("vd-horario-inicio")?.value || "";
  const horarioFim = document.getElementById("vd-horario-fim")?.value || "";
  const valorInput = document.getElementById("vd-valor-hora")?.value || "0";
  const inputCusto = document.getElementById("vd-custo-associado");
  const previewElement = document.getElementById("preview-subtotal-servico");
  
  if (!previewElement) return;
  
  // Converter valores de moeda brasileira para número
  const valor = parseFloat(valorInput.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
  
  // Verificar se é contratação via agência
  const tipoContratacao = document.querySelector('input[name="tipo-contratacao"]:checked')?.value || "particular";
  const valorHoraAgencia = parseFloat(document.getElementById("vd-valor-hora-agencia-hidden")?.value) || 0;
  
  let custo = 0;
  let horasTrabalhadas = 0;
  
  // Calcular horas trabalhadas (se tiver horários)
  if (horarioInicio && horarioFim) {
    const [horaInicio, minInicio] = horarioInicio.split(':').map(Number);
    const [horaFim, minFim] = horarioFim.split(':').map(Number);
    
    const minutosInicio = horaInicio * 60 + minInicio;
    const minutosFim = horaFim * 60 + minFim;
    let minutosTrabalhados = minutosFim - minutosInicio;
    
    // Se o horário fim é menor que início, assumiu que passou da meia-noite (adicionar 24h)
    if (minutosTrabalhados < 0) {
      minutosTrabalhados += 24 * 60;
    }
    
    horasTrabalhadas = minutosTrabalhados / 60;
  }
  
  // Calcular valor e custo baseado no tipo de contratação
  if (tipoContratacao === "agencia" && valorHoraAgencia > 0) {
    // Se for agência: o valor por hora deve ser o valor que a agência paga (receita)
    // O custo é manual (gasolina, etc.) ou zero
    if (modeloSelecionado === "por-hora" && horasTrabalhadas > 0) {
      // Atualizar o campo de valor/hora com o valor da agência (se estiver vazio)
      const inputValorHora = document.getElementById("vd-valor-hora");
      if (inputValorHora) {
        const valorAtual = parseFloat(inputValorHora.value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
        if (valorAtual === 0) {
          inputValorHora.value = valorHoraAgencia.toFixed(2).replace('.', ',');
        }
      }
      
      // Usar o valor atual do campo (pode ter sido editado pelo usuário)
      const valorCobranca = parseFloat(document.getElementById("vd-valor-hora")?.value.replace(/[R$\s.]/g, '').replace(',', '.')) || valorHoraAgencia;
      
      // Custo é o que o usuário digitou manualmente (ou zero)
      custo = parseFloat(inputCusto?.value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    } else {
      // Particular ou valor fixo: usar valores normais
      custo = parseFloat(inputCusto?.value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    }
  } else {
    // Particular: usar o custo manual digitado
    custo = parseFloat(inputCusto?.value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
  }
  
  let subtotal = 0;
  let detalhesCalculo = "";
  
  if (modeloSelecionado === "por-hora") {
    if (horasTrabalhadas > 0) {
      // Usar horas já calculadas no início da função
      const valorBruto = horasTrabalhadas * valor;
      subtotal = valorBruto - custo;
      
      const horasInt = Math.floor(horasTrabalhadas);
      const minutosRest = Math.round((horasTrabalhadas - horasInt) * 60);
      detalhesCalculo = `(${horasInt}h ${minutosRest}min × R$ ${valor.toFixed(2).replace('.', ',')})`;
    } else {
      subtotal = -custo; // Apenas mostrar o custo se não tiver horários
    }
  } else {
    // Valor Fixo
    subtotal = valor - custo;
    detalhesCalculo = "(Valor Fixo)";
  }
  
  // Formatar subtotal em moeda brasileira
  const subtotalFormatado = subtotal.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
  
  // Atualizar preview
  if (subtotal < 0) {
    previewElement.style.background = "#FFEBEE";
    previewElement.style.borderColor = "#EF5350";
    previewElement.style.color = "#C62828";
    previewElement.innerHTML = `⚠️ Prejuízo: ${subtotalFormatado} <small style="font-size:12px;display:block;">${detalhesCalculo} - Custo: R$ ${custo.toFixed(2).replace('.', ',')}</small>`;
  } else if (subtotal === 0 && (valor > 0 || custo > 0)) {
    previewElement.style.background = "#FFF8E1";
    previewElement.style.borderColor = "#FFC107";
    previewElement.style.color = "#F57F17";
    previewElement.innerHTML = `⚖️ Equilibrado: ${subtotalFormatado} <small style="font-size:12px;display:block;">${detalhesCalculo}</small>`;
  } else {
    previewElement.style.background = "#4CAF50";
    previewElement.style.borderColor = "#388E3C";
    previewElement.style.color = "white";
    previewElement.innerHTML = `💰 Subtotal: ${subtotalFormatado} <small style="font-size:12px;display:block;">${detalhesCalculo}</small>`;
  }
}

function salvarPerfilNegocio() {
  const selectPerfil = document.getElementById("config-perfil-negocio");
  if (!selectPerfil) return;
  
  // Verificar se é admin antes de permitir alteração
  const userEmail = localStorage.getItem("user_email") || "";
  const isAdmin = (userEmail.toLowerCase() === EMAIL_ADMIN.toLowerCase());
  
  if (!isAdmin) {
    mostrarToast("Apenas o administrador pode alterar o perfil de negócio.", "erro");
    return;
  }
  
  const novoPerfil = selectPerfil.value;
  if (novoPerfil === perfilNegocioAtual) return; // Sem mudança

  // FASE 12.5: Trava Estrita do Admin VIP - bloquear QUALQUER sobrescrita
  const perfilTeste = localStorage.getItem('perfilAdminTeste');

  if (isAdmin && perfilTeste) {
    perfilNegocioAtual = novoPerfil; // Admin pode alterar manualmente
    localStorage.setItem("perfilNegocio", perfilNegocioAtual);
    localStorage.setItem('perfilAdminTeste', perfilNegocioAtual);
    console.log('[ADMIN VIP] TRAVA ESTRITA: Perfil alterado manualmente e cache atualizado:', perfilNegocioAtual);
  } else {
    // Fluxo normal para usuários comuns
    perfilNegocioAtual = novoPerfil;
    localStorage.setItem("perfilNegocio", perfilNegocioAtual);
  }
  
  // Salvar no Firebase para persistência permanente
  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  if (uid) {
    try {
      window.firebaseSetDoc(
        window.firebaseDoc(window.firebaseDb, "lojas", uid),
        { perfilNegocio: perfilNegocioAtual },
        { merge: true }
      );
      console.log("Perfil salvo no Firebase:", perfilNegocioAtual);
    } catch (err) {
      console.error("Erro ao salvar perfil no Firebase:", err);
      // Continua mesmo com erro, já que tem localStorage como backup
    }
  }
  
  console.log("Perfil de negócio alterado para:", perfilNegocioAtual);
  mostrarToast(`Perfil alterado para: ${selectPerfil.options[selectPerfil.selectedIndex].text}`, "sucesso");
  
  // Aplicar mudanças imediatamente
  aplicarPerfilNegocio();
}

function ajustarMenuLateral() {
  console.log("Ajustando menu lateral para perfil:", perfilNegocioAtual);
  
  // Botões do menu lateral
  const btnTabClientes = document.getElementById("btn-tab-clientes");
  const btnTabFornecedores = document.getElementById("btn-tab-fornecedores");
  const btnTabProdutos = document.getElementById("btn-tab-produtos");
  
  // Resetar todos para visível primeiro
  if (btnTabClientes) btnTabClientes.classList.remove("esconder-elemento");
  if (btnTabFornecedores) btnTabFornecedores.classList.remove("esconder-elemento");
  if (btnTabProdutos) btnTabProdutos.classList.remove("esconder-elemento");
  
  // Aplicar regras por perfil
  switch (perfilNegocioAtual) {
    case "varejo-rapido":
      // Básico: esconder Clientes e Fornecedores
      if (btnTabClientes) btnTabClientes.classList.add("esconder-elemento");
      if (btnTabFornecedores) btnTabFornecedores.classList.add("esconder-elemento");
      break;
      
    case "servicos":
      // Serviços: alterar texto do botão Produtos
      if (btnTabProdutos) {
        btnTabProdutos.innerHTML = "🛠️<br>Catálogo de Serviços";
      }
      break;
      
    case "varejo-padrao":
      // Padrão: esconder apenas Produtos
      if (btnTabProdutos) btnTabProdutos.classList.add("esconder-elemento");
      break;
      
    case "varejo-premium":
    case "varejo-trial":
      // Premium/Trial: manter tudo visível
      // Produtos já mostra "📦<br>Produtos" por padrão
      break;
  }
}

function aplicarPerfilNegocio() {
  console.log("Aplicando perfil de negócio:", perfilNegocioAtual);
  
  // Verificação de admin vs usuário comum
  const userEmail = localStorage.getItem("user_email") || "";
  const isAdmin = (userEmail.toLowerCase() === EMAIL_ADMIN.toLowerCase());
  
  // Controle do seletor de perfil
  const containerSeletor = document.getElementById("container-seletor-perfil");
  const textoPerfilAtual = document.getElementById("texto-perfil-atual");
  const selectPerfilEl = document.getElementById("config-perfil-negocio");

  // FASE 12.2: Preencher dropdown visualmente
  if (selectPerfilEl && perfilNegocioAtual) {
    selectPerfilEl.value = perfilNegocioAtual;
    console.log('[APLICAR PERFIL] Dropdown atualizado visualmente:', perfilNegocioAtual);
  }

  if (isAdmin) {
    // Admin pode ver e alterar o seletor
    if (containerSeletor) containerSeletor.style.display = "block";
    if (textoPerfilAtual) textoPerfilAtual.style.display = "none";
  } else {
    // Usuário comum vê apenas texto informativo
    if (containerSeletor) containerSeletor.style.display = "none";
    if (textoPerfilAtual) {
      textoPerfilAtual.style.display = "block";
      // Mostrar nome amigável do plano atual
      const nomesPlanos = {
        "varejo-rapido": "Plano Básico: Varejo Rápido (Só Fechamento de Caixa)",
        "varejo-padrao": "Plano Padrão: Varejo (Fechamentos + Vendas Individuais sem Estoque)",
        "varejo-premium": "Plano Premium: Varejo com Inventário (Baixa automática de Estoque)",
        "servicos": "Perfil: Prestador de Serviços (Serviços + Despesas Casadas)"
      };
      textoPerfilAtual.innerText = `Seu plano atual: ${getNomePlano(perfilNegocioAtual)}`;
    }
  }
  
  // Interface da Home - Botões
  const btnVendas = document.getElementById("btn-home-vendas");
  const btnFecharCaixa = document.getElementById("btn-home-fechar-caixa");
  const btnCompras = document.getElementById("btn-home-compras");
  
  // Resetar todos os botões para padrão
  if (btnVendas) {
    btnVendas.style.display = "flex";
    btnVendas.innerHTML = '<div class="menu-icon">🛒</div><div class="menu-text">Lançar Vendas</div>';
  }
  if (btnFecharCaixa) {
    btnFecharCaixa.style.display = "flex";
    btnFecharCaixa.innerHTML = '<div class="menu-icon">📠</div><div class="menu-text">Fechar Caixa</div>';
  }
  if (btnCompras) {
    btnCompras.style.display = "flex";
    // Não reescreve o innerHTML - mantém o texto fixo '🧾 Compras' do HTML
  }
  
  // Interface da Tela de Vendas - Abas e Radio
  const abaVendaIndividual = document.getElementById("aba-venda-individual");
  const abaFechamento = document.getElementById("aba-fechamento");
  const radioProduto = document.querySelector('input[name="tipo-item"][value="produto"]');
  const radioServico = document.querySelector('input[name="tipo-item"][value="servico"]');
  const blocoTipoItem = document.querySelector('div[style*="margin-bottom:12px;"]'); // Container do radio de tipo
  
  // Resetar estado padrão (limpar completamente)
  if (abaVendaIndividual) {
    abaVendaIndividual.style.display = "block";
    abaVendaIndividual.className = ""; // Limpar classes
  }
  if (abaFechamento) {
    abaFechamento.style.display = "block";
    abaFechamento.className = ""; // Limpar classes
  }
  if (blocoTipoItem) {
    blocoTipoItem.style.display = "block";
    blocoTipoItem.className = ""; // Limpar classes
  }
  if (radioProduto) {
    radioProduto.checked = true;
    radioProduto.disabled = false;
    radioProduto.parentElement.style.display = "block"; // Garantir visibilidade
  }
  if (radioServico) {
    radioServico.checked = false;
    radioServico.disabled = false;
    radioServico.parentElement.style.display = "block"; // Garantir visibilidade
  }
  
  // Aplicar regras específicas por perfil
  switch (perfilNegocioAtual) {
    case "varejo-rapido":
      // Home: apenas Fechar Caixa (esconder Lançar Vendas)
      if (btnVendas) {
        btnVendas.style.display = "none";
      }
      if (btnFecharCaixa) {
        btnFecharCaixa.style.display = "flex";
        btnFecharCaixa.innerHTML = '<div class="menu-icon">📠</div><div class="menu-text">Fechar Caixa</div>';
      }
      if (btnCompras) {
        btnCompras.style.display = "none";
      }
      // Tela Vendas: apenas Fechamento
      if (abaVendaIndividual) abaVendaIndividual.style.display = "none";
      if (blocoTipoItem) blocoTipoItem.style.display = "none";
      break;
      
    case "varejo-padrao":
      // Home: Lançar Venda + Fechar Caixa (padrão)
      if (btnVendas) {
        btnVendas.style.display = "flex";
        btnVendas.innerHTML = '<div class="menu-icon">🛒</div><div class="menu-text">Lançar Vendas</div>';
      }
      if (btnFecharCaixa) {
        btnFecharCaixa.style.display = "flex";
        btnFecharCaixa.innerHTML = '<div class="menu-icon">📠</div><div class="menu-text">Fechar Caixa</div>';
      }
      if (btnCompras) {
        btnCompras.style.display = "none";
      }
      // Tela Vendas: Venda Individual + Fechamento (já é padrão)
      break;
      
    case "varejo-premium":
    case "varejo-trial":
      // Home: Lançar Venda + Fechar Caixa + Inventário
      if (btnVendas) {
        btnVendas.style.display = "flex";
        btnVendas.innerHTML = '<div class="menu-icon">🛒</div><div class="menu-text">Lançar Vendas</div>';
      }
      if (btnFecharCaixa) {
        btnFecharCaixa.style.display = "flex";
        btnFecharCaixa.innerHTML = '<div class="menu-icon">📠</div><div class="menu-text">Fechar Caixa</div>';
      }
      if (btnCompras) {
        btnCompras.style.display = "flex";
        // Não reescreve o innerHTML - mantém o texto fixo '🧾 Compras' do HTML
      }
      // Tela Vendas: Venda Individual + Fechamento com Produto marcado
      if (radioProduto) radioProduto.checked = true;
      break;
      
    case "servicos":
      // Home: Lançar Serviço + Despesas
      if (btnVendas) {
        btnVendas.style.display = "flex";
        btnVendas.innerHTML = '<div class="menu-icon">🛠️</div><div class="menu-text">Lançar Serviço</div>';
      }
      if (btnFecharCaixa) {
        btnFecharCaixa.style.display = "none";
      }
      // FASE 11.8: Ocultar botão Minhas Despesas (obsoleto)
      if (btnCompras) {
        btnCompras.style.display = "none";
        btnCompras.innerHTML = '';
      }
      
      // === HUB DE GESTÃO: Mostrar apenas cards relevantes para Serviços ===
      const cardClientes = document.getElementById("card-gestao-clientes");
      const cardProdutos = document.getElementById("card-gestao-produtos");
      const cardFornecedores = document.getElementById("card-gestao-fornecedores");
      const cardServicos = document.getElementById("card-gestao-servicos");
      const cardAgencias = document.getElementById("card-gestao-agencias");
      const cardExecutantes = document.getElementById("card-gestao-executantes");
      
      if (cardClientes) cardClientes.style.display = "block";      // ✅ Mostrar
      if (cardProdutos) cardProdutos.style.display = "none";      // ❌ Esconder (varejo)
      if (cardFornecedores) cardFornecedores.style.display = "none"; // ❌ Esconder (varejo)
      if (cardServicos) cardServicos.style.display = "block";     // ✅ Mostrar
      if (cardAgencias) cardAgencias.style.display = "block";     // ✅ Mostrar
      if (cardExecutantes) cardExecutantes.style.display = "block"; // ✅ Mostrar
      
      // Tela Vendas: apenas Venda Individual com Serviço travado
      if (abaFechamento) abaFechamento.style.display = "none";
      if (abaVendaIndividual) abaVendaIndividual.style.display = "none"; // Esconder aba também
      if (radioServico) {
        radioServico.checked = true;
        radioServico.disabled = true;
      }
      if (radioProduto) radioProduto.disabled = true;
      
      // === LIMPEZA DE CAMPOS DE VAREJO (Ruído Visual) ===
      // Manter campos-individual visível (bloco servico está dentro dele)
      const camposIndContainer = document.getElementById("campos-individual");
      if (camposIndContainer) camposIndContainer.style.display = "block";
      
      // Esconder seletor de Tipo de Lançamento (Produto/Serviço)
      if (blocoTipoItem) blocoTipoItem.style.display = "none";
      
      // Configurar header para perfil servicos (título específico, botão voltar visível)
      const headerOriginal = document.querySelector('.header-tela');
      if (headerOriginal) {
        const btnVoltar = headerOriginal.querySelector('.btn-voltar-topo');
        const tituloOriginal = headerOriginal.querySelector('#titulo-form-venda');
        // Mostrar botão voltar e garantir funcionalidade
        if (btnVoltar) {
          btnVoltar.style.display = 'flex';
          btnVoltar.onclick = voltarDashboard;
        }
        // Atualizar título para "Lançamento de Serviços"
        if (tituloOriginal) {
          tituloOriginal.innerText = 'Lançamento de Serviços';
        }
      }
      
      // Esconder campo Valor original (input + label anterior)
      const campoValorOriginal = document.getElementById("vd-valor-individual");
      if (campoValorOriginal) {
        campoValorOriginal.style.display = "none";
        const labelValor = campoValorOriginal.previousElementSibling;
        if (labelValor && labelValor.tagName === 'LABEL') labelValor.style.display = "none";
      }
      
      // Esconder campo Cliente original (input + label anterior)
      const campoClienteOriginal = document.getElementById("vd-cliente");
      if (campoClienteOriginal) {
        campoClienteOriginal.style.display = "none";
        const labelCliente = campoClienteOriginal.previousElementSibling;
        if (labelCliente && labelCliente.tagName === 'LABEL') labelCliente.style.display = "none";
      }
      
      // Esconder campo Data original (input + label anterior)
      const campoDataOriginal = document.getElementById("vd-data");
      if (campoDataOriginal) {
        campoDataOriginal.style.display = "none";
        const labelData = campoDataOriginal.previousElementSibling;
        if (labelData && labelData.tagName === 'LABEL') labelData.style.display = "none";
      }
      
      // Esconder Status e Observações originais (inputs + labels anteriores)
      const statusOriginal = document.getElementById("v-status");
      if (statusOriginal) {
        statusOriginal.style.display = "none";
        const labelStatus = statusOriginal.previousElementSibling;
        if (labelStatus && labelStatus.tagName === 'LABEL') labelStatus.style.display = "none";
      }
      const obsOriginal = document.getElementById("vd-obs");
      if (obsOriginal) {
        obsOriginal.style.display = "none";
        const labelObs = obsOriginal.previousElementSibling;
        if (labelObs && labelObs.tagName === 'LABEL') labelObs.style.display = "none";
      }
      
      // Esconder campo Quantidade - esconder o bloco completo de produto
      const campoQuantidade = document.getElementById("vd-quantidade");
      if (campoQuantidade && campoQuantidade.parentElement && campoQuantidade.parentElement.parentElement) {
        campoQuantidade.parentElement.parentElement.style.display = "none";
      }
      
      // Esconder bloco-venda-produto completamente
      const blocoProduto = document.getElementById("bloco-venda-produto");
      if (blocoProduto) blocoProduto.style.display = "none";
      
      // === TERMINOLOGIA INTERPRETEPRO ===
      // Alterar título do modal
      const tituloForm = document.getElementById("titulo-form-venda");
      if (tituloForm && tituloForm.innerText !== "Editar Lançamento") {
        tituloForm.innerText = "Lançamento de Serviços";
      }
      
      // Alterar texto do botão salvar
      const btnSalvar = document.getElementById("btn-salvar-venda");
      if (btnSalvar) btnSalvar.innerText = "💾 Salvar Atendimento";
      
      // Mostrar bloco de serviço e aplicar classe para estilização
      const blocoServico = document.getElementById("bloco-venda-servico");
      if (blocoServico) {
        blocoServico.style.display = "block";
        blocoServico.classList.remove("esconder-elemento");
        // Sincronizar data original com data do serviço
        const dataOriginal = document.getElementById("vd-data")?.value;
        const dataServico = document.getElementById("vd-data-servico");
        if (dataServico && dataOriginal) {
          dataServico.value = dataOriginal;
        }
      }
      
      // Esconder forma de pagamento original do varejo
      const pagGridOriginal = document.querySelector(".pagamento-grid");
      if (pagGridOriginal) pagGridOriginal.style.display = "none";
      break;
  }
  
  // Atualizar select de configurações
  if (selectPerfilEl) {
    selectPerfilEl.value = perfilNegocioAtual;
  }
  
  // Ajustar menu lateral conforme perfil
  ajustarMenuLateral();
  
  // Controle da aba de Produtos - REMOVIDA (usar Hub de Gestão)
  const btnTabProdutos = document.getElementById("btn-tab-produtos");
  if (btnTabProdutos) {
    btnTabProdutos.style.display = "none";
  }
  
  // Controle da seção de Estilo de Lançamento de Vendas (apenas para varejo-padrao)
  const secaoEstiloVendas = document.getElementById("secao-estilo-vendas");
  if (secaoEstiloVendas) {
    secaoEstiloVendas.style.display = perfilNegocioAtual === "varejo-padrao" ? "block" : "none";
  }
  
  // === HUB DE GESTÃO: Configurar cards conforme perfil (fora do switch para garantir execução) ===
  const cardClientesG = document.getElementById("card-gestao-clientes");
  const cardProdutosG = document.getElementById("card-gestao-produtos");
  const cardFornecedoresG = document.getElementById("card-gestao-fornecedores");
  const cardServicosG = document.getElementById("card-gestao-servicos");
  const cardAgenciasG = document.getElementById("card-gestao-agencias");
  const cardExecutantesG = document.getElementById("card-gestao-executantes");
  
  if (perfilNegocioAtual === "servicos") {
    // Perfil Serviços: já configurado no case acima
    // (Clientes, Serviços, Agências, Executantes visíveis)
  } else {
    // Perfis de Varejo (padrão, premium, rápido, trial)
    if (cardClientesG) cardClientesG.style.display = "block";      // ✅ Mostrar
    if (cardProdutosG) cardProdutosG.style.display = "block";     // ✅ Mostrar
    if (cardFornecedoresG) cardFornecedoresG.style.display = "block"; // ✅ Mostrar
    if (cardServicosG) cardServicosG.style.display = "none";      // ❌ Esconder (serviços)
    if (cardAgenciasG) cardAgenciasG.style.display = "none";      // ❌ Esconder (serviços)
    if (cardExecutantesG) cardExecutantesG.style.display = "none"; // ❌ Esconder (serviços)
  }
  
  // FASE 11.11: Nuke visual no Perfil de Serviço - garantir que bloco-tipo-lancamento e container-valor-total-varejo sumam se perfil NÃO for varejo
  const blocoTipoLancamento = document.getElementById("bloco-tipo-lancamento");
  const containerValorTotalVarejo = document.getElementById("container-valor-total-varejo");
  const isVarejo = perfilNegocioAtual.includes("varejo") || perfilNegocioAtual.includes("trial");
  
  if (!isVarejo) {
    if (blocoTipoLancamento) blocoTipoLancamento.style.setProperty("display", "none", "important");
    if (containerValorTotalVarejo) containerValorTotalVarejo.style.setProperty("display", "none", "important");
  }
  
  // FASE 12.12: Rótulo dinâmico do cartão 'A Receber' conforme perfil
  const tituloReceber = document.getElementById("titulo-card-receber");
  if (tituloReceber) {
    if (perfilNegocioAtual && perfilNegocioAtual.includes('servicos')) {
      tituloReceber.innerText = 'Total a Receber';
    } else {
      tituloReceber.innerText = 'A Receber (Fiados)';
    }
  }
}

async function buscarProdutos() {
  const listEl = document.getElementById("lista-produtos");
  if (!listEl) return;
  listEl.innerHTML = '<div class="loader"></div>';

  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  if (!uid) return;

  try {
    const q = window.firebaseQuery(
      window.firebaseCollection(window.firebaseDb, "lojas", uid, "produtos"),
      window.firebaseOrderBy("nome", "asc")
    );
    const snap = await window.firebaseGetDocs(q);

    produtosGlobal = snap.docs.map(doc => ({
      ...doc.data(),
      linha: doc.id,
      docId: doc.id
    }));

    renderizarProdutos(produtosGlobal);
  } catch (err) {
    console.error("buscarProdutos:", err);
    listEl.innerHTML = `<p style="text-align:center;color:#EF5350;padding:20px;">❌ Erro ao carregar produtos.</p>`;
  }
}

function renderizarProdutos(lista) {
  const listEl = document.getElementById("lista-produtos");
  const bEl = document.getElementById("badge-qtd-produtos");
  if (bEl) bEl.innerText = lista.length;

  if (!lista.length) {
    listEl.innerHTML = `<p style="text-align:center;color:#B0BEC5;padding:20px;">Nenhum produto cadastrado.</p>`;
    return;
  }

  listEl.innerHTML = lista.map(p => `
    <div class="item-card" style="margin-top:8px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="flex:1;">
          <strong style="font-size:14px;">${p.nome}</strong>
          <p style="font-size:12px;color:#78909C;margin:3px 0 0;">Estoque: <strong>${p.estoque || 0}</strong> un.</p>
          ${p.custo ? `<p style="font-size:11px;color:#546E7A;">Custo: <strong>${formatarBRL(p.custo)}</strong> | Margem: <strong>${p.margem || 0}%</strong></p>` : ''}
        </div>
        <strong style="font-size:17px;color:#1565C0;">${formatarBRL(p.preco || 0)}</strong>
      </div>
      <div class="acoes-card">
        <button class="btn-acao btn-editar" onclick="editarProduto('${p.docId}')">✏️ Editar</button>
        <button class="btn-acao btn-excluir" onclick="excluirProduto('${p.docId}')">🗑️ Excluir</button>
      </div>
    </div>`).join("");
}

async function salvarProduto(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-salvar-produto");
  const orig = btn.innerText;
  btn.disabled = true; btn.innerText = "⏳...";

  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  const docId = document.getElementById("prod-docId-edicao").value;

  const dados = {
    nome: document.getElementById("prod-nome").value.trim(),
    preco: converterFloat(document.getElementById("prod-preco").value),
    custo: converterFloat(document.getElementById("prod-custo").value) || 0,
    margem: converterFloat(document.getElementById("prod-margem").value) || 0,
    estoque: parseInt(document.getElementById("prod-estoque").value) || 0,
    categoria: document.getElementById("prod-categoria")?.value || "",
    atualizadoEm: new Date().toISOString()
  };

  try {
    if (docId) {
      await window.firebaseSetDoc(window.firebaseDoc(window.firebaseDb, "lojas", uid, "produtos", docId), dados, { merge: true });
      mostrarToast("✅ Produto atualizado!", "sucesso");
    } else {
      await window.firebaseAddDoc(window.firebaseCollection(window.firebaseDb, "lojas", uid, "produtos"), { ...dados, criadoEm: new Date().toISOString() });
      mostrarToast("✅ Produto cadastrado!", "sucesso");
    }
    document.getElementById("form-produto").reset();
    document.getElementById("prod-docId-edicao").value = "";
    buscarProdutos();
  } catch (err) {
    mostrarToast("❌ Erro ao salvar produto.", "erro");
  } finally {
    resetarBotao("btn-salvar-produto", "+ Adicionar Produto");
  }
}

function editarProduto(docId) {
  const p = produtosGlobal.find(x => x.docId === docId);
  if (!p) return;

  document.getElementById("prod-nome").value = p.nome;
  document.getElementById("prod-preco").value = p.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  document.getElementById("prod-custo").value = (p.custo || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  document.getElementById("prod-margem").value = (p.margem || 0).toString();
  document.getElementById("prod-estoque").value = p.estoque;
  document.getElementById("prod-docId-edicao").value = docId;

  const btn = document.getElementById("btn-salvar-produto");
  if (btn) { btn.innerText = "💾 Atualizar Produto"; btn.style.background = "#FF8F00"; }

  document.getElementById("content-produtos").scrollTo({ top: 0, behavior: "smooth" });
}

async function excluirProduto(docId) {
  if (!await confirmarAcao("🗑️", "Excluir?", "Deseja excluir este produto?")) return;
  const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
  try {
    await window.firebaseDeleteDoc(window.firebaseDoc(window.firebaseDb, "lojas", uid, "produtos", docId));
    mostrarToast("✅ Excluído!", "sucesso");
    buscarProdutos();
  } catch (err) {
    mostrarToast("❌ Erro ao excluir.", "erro");
  }
}

// ============================================================
// FUNÇÕES DE PAGAMENTO AVULSO
// ============================================================
async function gerarPixAvulso(plano) {
  try {
    // Upgrade especial para Trial (gratuito)
    if (plano === "trial_7dias") {
      return await ativarTrialPremium();
    }
    
    mostrarToast("⏳ Gerando PIX...", "aviso");
    const res = await chamarGoogle('gerarPixAvulso', { plano: plano });
    
    if (res?.ok && res?.qrCodeBase64 && res?.qrCode) {
      // Mostra modal com QR Code
      document.getElementById("pix-qrcode-img").src = "data:image/png;base64," + res.qrCodeBase64;
      document.getElementById("pix-copia-cola").value = res.qrCode;
      
      const planoInfo = (_planosCache || []).find(p => p.id === plano);
      const nomePlano = planoInfo?.nome || plano;
      const valorLabel = res.valor != null
        ? "R$ " + Number(res.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
        : (planoInfo ? "R$ " + Number(planoInfo.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "");
      document.getElementById("pix-plano-label").innerText = nomePlano + " — " + valorLabel;
      
      // Mostra modal PIX
      document.getElementById("modal-planos-escolha").style.display = "none";
      document.getElementById("modal-planos-pix").style.display = "block";
      
      mostrarToast("✅ PIX gerado! Escaneie o QR Code.", "sucesso");
    } else {
      mostrarToast("❌ " + (res?.erro || "Erro ao gerar PIX. Tente novamente."), "erro");
    }
  } catch (error) {
    mostrarToast("❌ Erro ao gerar PIX. Tente novamente.", "erro");
  }
}

// Função para ativar Trial Premium automaticamente
async function ativarTrialPremium() {
  try {
    mostrarToast("Ativando Teste Premium...", "aviso");
    
    const userEmail = localStorage.getItem("user_email");
    if (!userEmail) {
      mostrarToast("Usuário não encontrado. Faça login novamente.", "erro");
      return;
    }
    
    // Calcular data de vencimento (7 dias a partir de hoje)
    const hoje = new Date();
    hoje.setDate(hoje.getDate() + 7);
    const vencimento7dias = hoje.toISOString().split('T')[0];
    
    // Chamar backend para ajustar plano
    const res = await chamarGoogle("ajustarPlanoUsuario", {
      uid: userEmail,
      perfilNegocio: "varejo-trial",
      vencimento: vencimento7dias
    });
    
    if (res?.status === "Sucesso") {
      // FASE 12.5: Trava Estrita do Admin VIP - bloquear QUALQUER sobrescrita
      const ehAdmin = (userEmail === EMAIL_ADMIN);
      const perfilTeste = localStorage.getItem('perfilAdminTeste');

      if (ehAdmin && perfilTeste) {
        perfilNegocioAtual = perfilTeste; // O Admin é o Rei
        localStorage.setItem("perfilNegocio", perfilNegocioAtual);
        console.log('[ADMIN VIP] TRAVA ESTRITA: Forçando perfil de teste sobre ativação de Trial:', perfilTeste);
      } else {
        // Atualizar perfil local imediatamente (fluxo normal para usuários comuns)
        perfilNegocioAtual = "varejo-trial";
        localStorage.setItem("perfilNegocio", perfilNegocioAtual);
      }

      // Aplicar configurações do perfil Trial
      await aplicarPerfilNegocio();
      
      // Fechar modal de planos
      fecharModalPlanos();
      
      mostrarToast("Teste Premium ativado! Você tem 7 dias para testar todas as funcionalidades.", "sucesso");
      
      // Mostrar notificação sobre o período de teste
      setTimeout(() => {
        mostrarToast("Após 7 dias, escolha um plano para continuar usando as funcionalidades premium.", "info");
      }, 3000);
      
    } else {
      mostrarToast("Erro ao ativar Teste Premium: " + (res?.mensagem || "Tente novamente."), "erro");
    }
    
  } catch (error) {
    console.error("Erro ao ativar Trial Premium:", error);
    mostrarToast("Erro ao ativar Teste Premium. Tente novamente.", "erro");
  }
}

async function gerarCheckoutAvulso(plano) {
  try {
    // Upgrade especial para Trial (gratuito)
    if (plano === "trial_7dias") {
      return await ativarTrialPremium();
    }
    
    mostrarToast("⏳ Gerando link de pagamento...", "aviso");
    const res = await chamarGoogle('gerarLinkAssinatura', { plano: plano });
    
    if (res?.ok && res?.link) {
      mostrarToast("✅ Redirecionando para pagamento seguro...", "sucesso");
      window.open(res.link, '_blank');
    } else {
      mostrarToast("❌ " + (res?.erro || "Erro ao gerar link de pagamento. Tente novamente."), "erro");
    }
  } catch (error) {
    mostrarToast("❌ Erro ao gerar link de pagamento. Tente novamente.", "erro");
  }
}

// ============================================================
// MIGRAÇÃO DE DADOS LEGADOS
// ============================================================

/**
 * Versão silenciosa da migração de dados legados (FASE 12.6)
 * Executa migração REAL sem confirm, sem botão, com retorno formatado
 * @param {string} email - Email do usuário
 * @param {string} uid - UID do usuário
 * @returns {Object} - { sucesso: boolean, vendas: number, clientes: number, produtos: number }
 */
async function migrarDadosLegadosSilencioso(email, uid) {
  console.log("[MIGRAÇÃO] 🚀 Iniciando Migração REAL de dados legados...");
  console.log("[MIGRAÇÃO] Usuário:", email, "(UID:", uid + ")");
  
  // FASE 12.8: Debug - Verificar se UID está definido
  if (!uid) {
    console.error("[MIGRAÇÃO] ❌ UID está VAZIO ou UNDEFINED!");
    console.error("[MIGRAÇÃO] Tentando obter UID do Firebase Auth...");
    uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
    console.log("[MIGRAÇÃO] UID obtido como fallback:", uid);
  }
  
  console.log("[MIGRAÇÃO] Path de gravação será: lojas/" + uid + "/vendas");

  try {
    const res = await chamarGoogle('exportarDadosLegados');
    console.log('📦 Dados recebidos do Google:', res);
    
    // Verifica quais tipos de dados vieram
    console.log('📦 Tem vendas?', !!res.vendas, 'Quantidade:', res.vendas?.length || 0);
    console.log('📦 Tem clientes?', !!res.clientes, 'Quantidade:', res.clientes?.length || 0);
    console.log('📦 Tem compras?', !!res.Compras_Estoque, 'Quantidade:', res.Compras_Estoque?.length || 0);
    console.log('📦 Tem fornecedores?', !!res.Fornecedores_Loja, 'Quantidade:', res.Fornecedores_Loja?.length || 0);
    console.log('📦 Tem produtos?', !!res.Produtos, 'Quantidade:', res.Produtos?.length || 0);
    
    // Se houver erro explícito do backend, lança exceção
    if (res?.erro) {
      throw new Error(res.erro);
    }
    
    // Verifica se temos dados (qualquer tipo) - isso indica sucesso
    if (!res.vendas && !res.clientes && !res.Compras_Estoque && !res.Fornecedores_Loja && !res.Produtos) {
      console.warn("[MIGRAÇÃO] ⚠️ Nenhum dado encontrado para migrar.");
      return {
        sucesso: true,
        vendas: 0,
        clientes: 0,
        produtos: 0
      };
    }
    
    console.log('🎯 SUCESSO: Dados encontrados para migração REAL!');
    console.log('📊 Resumo dos dados:');
    console.log(`  - Vendas: ${res.vendas?.length || 0} itens`);
    console.log(`  - Clientes: ${res.clientes?.length || 0} itens`);
    console.log(`  - Compras: ${res.Compras_Estoque?.length || 0} itens`);
    console.log(`  - Fornecedores: ${res.Fornecedores_Loja?.length || 0} itens`);
    console.log(`  - Produtos: ${res.Produtos?.length || 0} itens`);

    let vendasMigradas = 0;
    let clientesMigrados = 0;
    let comprasMigradas = 0;
    let fornecedoresMigrados = 0;
    let produtosMigrados = 0;

    // Lógica Anti-Duplicação para Vendas - Loops Sequenciais Blindados
    if (res.vendas && Array.isArray(res.vendas)) {
      // FASE 12.8: Redefine UID dentro do loop para garantir consistência com migrarDadosLegados
      let uidVendas = window.firebaseAuth?.currentUser?.uid;
      if (!uidVendas) {
        uidVendas = localStorage.getItem("user_uid") || "";
      }
      if (!uidVendas) {
        console.error('[MIGRAÇÃO] UID não encontrado para migração de vendas');
        return;
      }
      
      console.log('[MIGRAÇÃO] UID usado para vendas:', uidVendas);
      
      // Auto-Limpeza (Reset de Testes): Deleta todos os documentos onde migrado === true
      try {
        console.log('🧹 Iniciando limpeza de vendas migradas anteriormente...');
        const vendasMigradasQuery = window.firebaseQuery(
          window.firebaseCollection(window.firebaseDb, "lojas", uidVendas, "vendas"),
          window.firebaseWhere('migrado', '==', true)
        );
        const vendasMigradasSnapshot = await window.firebaseGetDocs(vendasMigradasQuery);
        const vendasParaDeletar = vendasMigradasSnapshot.docs;
        
        for (const doc of vendasParaDeletar) {
          await window.firebaseDeleteDoc(doc.ref);
          console.log(`🗑️ Venda migrada ${doc.id} deletada`);
        }
        
        console.log(`🧹 ${vendasParaDeletar.length} vendas migradas deletadas`);
      } catch (err) {
        console.warn('⚠️ Erro na limpeza de vendas migradas:', err);
      }
      
      for (const venda of res.vendas) {
        // Verificação Simplificada: pula se já foi migrado
        if (historicoGlobal.some(v => v.linha === venda.linha)) {
          console.log(`⏭️ Venda linha ${venda.linha} já existe, pulando...`);
          continue;
        }
        
        try {
          // FASE 12.7: Conversão robusta de datas - trata DD/MM/YYYY e YYYY-MM-DD
          let dataFormatadaISO = venda.dataISO || venda.data || "";
          let dataBR = "";
          let mesAnoStr = "";
          
          // FASE 12.9: Gerar mesAno diretamente da data para garantir indexação
          if (dataFormatadaISO) {
            if (dataFormatadaISO.includes('-')) {
              // Formato YYYY-MM-DD
              const partes = dataFormatadaISO.split('-');
              if (partes.length === 3) {
                mesAnoStr = `${partes[1]}/${partes[0]}`; // MM/YYYY
              }
            } else if (dataFormatadaISO.includes('/')) {
              // Formato DD/MM/YYYY
              const partes = dataFormatadaISO.split('/');
              if (partes.length === 3) {
                mesAnoStr = `${partes[1]}/${partes[2]}`; // MM/YYYY
                // Converte para YYYY-MM-DD
                dataFormatadaISO = `${partes[2]}-${partes[1]}-${partes[0]}`;
              }
            }
          }
          
          // Fallback: se mesAno ainda estiver vazio, usa data atual
          if (!mesAnoStr) {
            const hoje = new Date();
            mesAnoStr = `${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
            dataFormatadaISO = hoje.toISOString().substring(0, 10);
          }
          
          // Tenta converter via Date para validação e formatação (apenas para dataBR)
          try {
            const d = new Date(dataFormatadaISO);
            if (!isNaN(d.getTime())) {
              const isoStr = d.toISOString().substring(0, 10);
              dataFormatadaISO = isoStr;
              const [ano, mes, dia] = isoStr.split('-');
              dataBR = `${dia}/${mes}/${ano}`;
            }
          } catch(e) {}
          
          // FASE 12.3: Formatação Estrita - Mapeamento correto de campos
          
          // FASE 12.11: Verificar status legado para preservar fiados (pendentes)
          let statusOriginal = String(venda.formaPag || venda.status || venda.periodo || "").toLowerCase();
          let statusCorrigido = "pago"; // fallback padrão
          
          // Se a planilha velha dizia que era pendente ou fiado, preservamos a dívida
          if (statusOriginal.includes("pendente") || statusOriginal.includes("fiado") || statusOriginal.includes("não pago") || statusOriginal.includes("nao pago")) {
            statusCorrigido = "pendente";
          }
          
          const vendaFormatada = {
            ...venda,
            linha: venda.linha,
            data: dataFormatadaISO,
            dataISO: dataFormatadaISO,
            mesAno: mesAnoStr,
            modo: venda.modo || "individual",
            qtd: 1,
            // FASE 12.11: Usar status corrigido para preservar fiados
            formaPag: statusCorrigido,
            status: statusCorrigido,
            valor: String(venda.total || 0),
            valorUnitario: String(venda.total || 0),
            valorTotal: String(venda.total || 0),
            dinheiro: String(venda.dinheiro || 0),
            pix: String(venda.pix || 0),
            debito: String(venda.debito || 0),
            credito: String(venda.credito || 0),
            total: String(venda.total || 0),
            cliente: venda.cliente || "",
            descricao: venda.descricao || "",
            periodo: venda.periodo || "Venda Individual",
            custoAssociado: "0",
            lucroLiquido: String(venda.total || 0),
            criadoEm: venda.criadoEm || new Date().toISOString(),
            migrado: true,
            registradoPor: localStorage.getItem("user_email") || "",
            nomeOperador: localStorage.getItem("nomeOperador") || localStorage.getItem("user_name") || ""
          };
          
          // FASE 12.8: Debug - Log antes do addDoc
          console.log("[MIGRAÇÃO] Salvando venda linha", venda.linha, "no path: lojas/" + uidVendas + "/vendas");
          console.log("[MIGRAÇÃO] UID usado:", uidVendas);
          console.log("[MIGRAÇÃO] Dados da venda:", JSON.stringify(vendaFormatada).substring(0, 200));
          
          const docRef = await window.firebaseAddDoc(
            window.firebaseCollection(window.firebaseDb, "lojas", uidVendas, "vendas"),
            vendaFormatada
          );
          
          historicoGlobal.push({
            ...vendaFormatada,
            docId: docRef.id,
            linha: docRef.id
          });
          
          vendasMigradas++;
          console.log(`✅ Venda linha ${venda.linha} salva com sucesso (ID: ${docRef.id})`);
          
          if (vendaFormatada.cliente) {
            _autoCadastrarCliente(vendaFormatada.cliente);
          }
          
        } catch (err) {
          console.error(`❌ Erro ao salvar venda linha ${venda.linha}:`, err);
        }
      }
    }

    // Lógica Anti-Duplicação para Clientes
    if (res.clientes && Array.isArray(res.clientes)) {
      // FASE 12.8: Redefine UID para garantir consistência
      let uidClientes = window.firebaseAuth?.currentUser?.uid;
      if (!uidClientes) {
        uidClientes = localStorage.getItem("user_uid") || "";
      }
      
      try {
        console.log('🧹 Iniciando limpeza de clientes migrados anteriormente...');
        const clientesMigradosQuery = window.firebaseQuery(
          window.firebaseCollection(window.firebaseDb, "lojas", uidClientes, "clientes"),
          window.firebaseWhere('migrado', '==', true)
        );
        const clientesMigradosSnapshot = await window.firebaseGetDocs(clientesMigradosQuery);
        const clientesParaDeletar = clientesMigradosSnapshot.docs;
        
        for (const doc of clientesParaDeletar) {
          await window.firebaseDeleteDoc(doc.ref);
          console.log(`🗑️ Cliente migrado ${doc.id} deletado`);
        }
        
        console.log(`🧹 ${clientesParaDeletar.length} clientes migrados deletados`);
      } catch (err) {
        console.warn('⚠️ Erro na limpeza de clientes migrados:', err);
      }
      
      for (const cliente of res.clientes) {
        if (clientesGlobal.some(c => c.linha === cliente.linha)) {
          console.log(`⏭️ Cliente linha ${cliente.linha} já existe, pulando...`);
          continue;
        }
        
        try {
          const clienteFormatado = {
            ...cliente,
            linha: cliente.linha,
            nome: cliente.nome?.trim() || "",
            telefone: cliente.telefone?.trim() || "",
            obs: cliente.obs?.trim() || "",
            criadoEm: cliente.criadoEm || new Date().toISOString(),
            migrado: true
          };
          
          const docRef = await window.firebaseAddDoc(
            window.firebaseCollection(window.firebaseDb, "lojas", uidClientes, "clientes"),
            clienteFormatado
          );
          
          clientesGlobal.push({
            ...clienteFormatado,
            docId: docRef.id,
            linha: docRef.id
          });
          
          clientesMigrados++;
          console.log(`✅ Cliente linha ${cliente.linha} (${cliente.nome}) salvo com sucesso (ID: ${docRef.id})`);
          
        } catch (err) {
          console.error(`❌ Erro ao salvar cliente linha ${cliente.linha}:`, err);
        }
      }
    }

    // Migração de COMPRAS
    if (res.Compras_Estoque && Array.isArray(res.Compras_Estoque)) {
      // FASE 12.8: Redefine UID para garantir consistência
      let uidCompras = window.firebaseAuth?.currentUser?.uid;
      if (!uidCompras) {
        uidCompras = localStorage.getItem("user_uid") || "";
      }
      
      try {
        console.log('🧹 Iniciando limpeza de compras migradas anteriormente...');
        const comprasMigradasQuery = window.firebaseQuery(
          window.firebaseCollection(window.firebaseDb, "lojas", uidCompras, "compras"),
          window.firebaseWhere('migrado', '==', true)
        );
        const comprasMigradasSnapshot = await window.firebaseGetDocs(comprasMigradasQuery);
        const comprasParaDeletar = comprasMigradasSnapshot.docs;
        
        for (const doc of comprasParaDeletar) {
          await window.firebaseDeleteDoc(doc.ref);
          console.log(`🗑️ Compra migrada ${doc.id} deletada`);
        }
        
        console.log(`🧹 ${comprasParaDeletar.length} compras migradas deletadas`);
      } catch (err) {
        console.warn('⚠️ Erro na limpeza de compras migradas:', err);
      }
      
      for (const compra of res.Compras_Estoque) {
        if (comprasGlobal.some(c => c.linha === compra.linha)) {
          console.log(`⏭️ Compra linha ${compra.linha} já existe, pulando...`);
          continue;
        }
        
        try {
          let dataFormatadaISO = compra.dataISO;
          let dataBR = "";
          let mesAnoStr = "";
          try {
            const d = new Date(compra.data || compra.dataISO);
            if (!isNaN(d.getTime())) {
              const isoStr = d.toISOString().substring(0, 10);
              dataFormatadaISO = isoStr;
              const [ano, mes, dia] = isoStr.split('-');
              dataBR = `${dia}/${mes}/${ano}`;
              mesAnoStr = `${mes}/${ano}`;
            }
          } catch(e) {}
          
          const compraFormatada = {
            ...compra,
            linha: compra.linha,
            data: dataFormatadaISO,
            dataISO: dataFormatadaISO,
            mesAno: mesAnoStr,
            criadoEm: compra.criadoEm || new Date().toISOString(),
            migrado: true
          };
          
          const docRef = await window.firebaseAddDoc(
            window.firebaseCollection(window.firebaseDb, "lojas", uidCompras, "compras"),
            compraFormatada
          );
          
          comprasGlobal.push({
            ...compraFormatada,
            docId: docRef.id,
            linha: docRef.id
          });
          
          comprasMigradas++;
          console.log(`✅ Compra linha ${compra.linha} salva com sucesso (ID: ${docRef.id})`);
          
        } catch (err) {
          console.error(`❌ Erro ao salvar compra linha ${compra.linha}:`, err);
        }
      }
    }

    // Migração de FORNECEDORES
    if (res.Fornecedores_Loja && Array.isArray(res.Fornecedores_Loja)) {
      // FASE 12.8: Redefine UID para garantir consistência
      let uidFornecedores = window.firebaseAuth?.currentUser?.uid;
      if (!uidFornecedores) {
        uidFornecedores = localStorage.getItem("user_uid") || "";
      }
      
      try {
        console.log('🧹 Iniciando limpeza de fornecedores migrados anteriormente...');
        const fornecedoresMigradosQuery = window.firebaseQuery(
          window.firebaseCollection(window.firebaseDb, "lojas", uidFornecedores, "fornecedores"),
          window.firebaseWhere('migrado', '==', true)
        );
        const fornecedoresMigradosSnapshot = await window.firebaseGetDocs(fornecedoresMigradosQuery);
        const fornecedoresParaDeletar = fornecedoresMigradosSnapshot.docs;
        
        for (const doc of fornecedoresParaDeletar) {
          await window.firebaseDeleteDoc(doc.ref);
          console.log(`🗑️ Fornecedor migrado ${doc.id} deletado`);
        }
        
        console.log(`🧹 ${fornecedoresParaDeletar.length} fornecedores migrados deletados`);
      } catch (err) {
        console.warn('⚠️ Erro na limpeza de fornecedores migrados:', err);
      }
      
      for (const fornecedor of res.Fornecedores_Loja) {
        if (fornecedoresGlobal.some(f => f.linha === fornecedor.linha)) {
          console.log(`⏭️ Fornecedor linha ${fornecedor.linha} já existe, pulando...`);
          continue;
        }
        
        try {
          const fornecedorFormatado = {
            ...fornecedor,
            linha: fornecedor.linha,
            nome: fornecedor.nome?.trim() || "",
            criadoEm: fornecedor.criadoEm || new Date().toISOString(),
            migrado: true
          };
          
          const docRef = await window.firebaseAddDoc(
            window.firebaseCollection(window.firebaseDb, "lojas", uidFornecedores, "fornecedores"),
            fornecedorFormatado
          );
          
          fornecedoresGlobal.push({
            ...fornecedorFormatado,
            docId: docRef.id,
            linha: docRef.id
          });
          
          fornecedoresMigrados++;
          console.log(`✅ Fornecedor linha ${fornecedor.linha} (${fornecedor.nome}) salvo com sucesso (ID: ${docRef.id})`);
          
        } catch (err) {
          console.error(`❌ Erro ao salvar fornecedor linha ${fornecedor.linha}:`, err);
        }
      }
    }

    // Migração de PRODUTOS
    if (res.Produtos && Array.isArray(res.Produtos)) {
      // FASE 12.8: Redefine UID para garantir consistência
      let uidProdutos = window.firebaseAuth?.currentUser?.uid;
      if (!uidProdutos) {
        uidProdutos = localStorage.getItem("user_uid") || "";
      }
      
      for (const produto of res.Produtos) {
        if (produtosGlobal.some(p => p.linha === produto.linha)) {
          console.log(`⏭️ Produto linha ${produto.linha} já existe, pulando...`);
          continue;
        }
        
        try {
          const produtoFormatado = {
            ...produto,
            linha: produto.linha,
            nome: produto.nome?.trim() || "",
            criadoEm: produto.criadoEm || new Date().toISOString(),
            migrado: true
          };
          
          const docRef = await window.firebaseAddDoc(
            window.firebaseCollection(window.firebaseDb, "lojas", uidProdutos, "produtos"),
            produtoFormatado
          );
          
          produtosGlobal.push({
            ...produtoFormatado,
            docId: docRef.id,
            linha: docRef.id
          });
          
          produtosMigrados++;
          console.log(`✅ Produto linha ${produto.linha} (${produto.nome}) salvo com sucesso (ID: ${docRef.id})`);
          
        } catch (err) {
          console.error(`❌ Erro ao salvar produto linha ${produto.linha}:`, err);
        }
      }
    }

    console.log("[MIGRAÇÃO] ✅ Migração REAL concluída com sucesso!");
    console.log(`[MIGRAÇÃO] 📊 Resumo: ${vendasMigradas} vendas, ${clientesMigrados} clientes, ${produtosMigrados} produtos`);
    
    return {
      sucesso: true,
      vendas: vendasMigradas,
      clientes: clientesMigrados,
      produtos: produtosMigrados
    };

  } catch (err) {
    console.error('[MIGRAÇÃO] ❌ Erro na migração REAL:', err);
    throw err;
  }
}

async function migrarDadosLegados() {
  if (!confirm("Deseja puxar seus dados antigos para o novo sistema? Isso pode levar alguns segundos.")) {
    return;
  }

  const btn = document.getElementById("btn-migrar-legado");
  const textoOriginal = btn.innerText;
  btn.innerText = "⏳ Sincronizando...";
  btn.disabled = true;

  try {
    const res = await chamarGoogle('exportarDadosLegados');
    console.log('📦 Dados recebidos do Google:', res);
    console.log('📦 Estrutura completa da resposta:', JSON.stringify(res, null, 2));
    
    // Verifica quais tipos de dados vieram
    console.log('📦 Tem vendas?', !!res.vendas, 'Quantidade:', res.vendas?.length || 0);
    console.log('📦 Tem clientes?', !!res.clientes, 'Quantidade:', res.clientes?.length || 0);
    console.log('📦 Tem compras?', !!res.Compras_Estoque, 'Quantidade:', res.Compras_Estoque?.length || 0);
    console.log('📦 Tem fornecedores?', !!res.Fornecedores_Loja, 'Quantidade:', res.Fornecedores_Loja?.length || 0);
    console.log('📦 Tem produtos?', !!res.Produtos, 'Quantidade:', res.Produtos?.length || 0);
    
    // Debug completo da estrutura
    console.log('🔍 Estrutura completa:', Object.keys(res));
    console.log('🔍 Campos disponíveis:', {
      vendas: !!res.vendas,
      clientes: !!res.clientes,
      Compras_Estoque: !!res.Compras_Estoque,
      Fornecedores_Loja: !!res.Fornecedores_Loja,
      Produtos: !!res.Produtos
    });
    
    // Se houver erro explícito do backend, lança exceção
    if (res?.erro) {
      throw new Error(res.erro);
    }
    
    // Verifica se temos dados (qualquer tipo) - isso indica sucesso
    if (!res.vendas && !res.clientes && !res.Compras_Estoque && !res.Fornecedores_Loja && !res.Produtos) {
      mostrarToast("❌ Nenhum dado encontrado para migrar.", "erro");
      return;
    }
    
    // Se chegamos aqui, é porque temos dados válidos
    console.log('🎯 SUCESSO: Dados encontrados para migração!');
    console.log('📊 Resumo dos dados:');
    console.log(`  - Vendas: ${res.vendas?.length || 0} itens`);
    console.log(`  - Clientes: ${res.clientes?.length || 0} itens`);
    console.log(`  - Compras: ${res.Compras_Estoque?.length || 0} itens`);
    console.log(`  - Fornecedores: ${res.Fornecedores_Loja?.length || 0} itens`);
    console.log(`  - Produtos: ${res.Produtos?.length || 0} itens`);
    
    // Verifica se faltam dados no backend
    const faltantes = [];
    if (!res.Compras_Estoque) faltantes.push('Compras_Estoque');
    if (!res.Fornecedores_Loja) faltantes.push('Fornecedores_Loja');
    if (!res.Produtos) faltantes.push('Produtos');
    
    if (faltantes.length > 0) {
      console.warn('⚠️ ATENÇÃO: Backend não está retornando todos os dados!');
      console.warn('🔧 Campos faltantes:', faltantes.join(', '));
      console.warn('💡 SOLUÇÃO: Adicionar no Roteador.gs:');
      console.warn(`
        if (acao === "exportarDadosLegados") {
          return retornarJSON({ 
            vendas: buscarVendas(emailNorm, null) || [], 
            clientes: buscarClientes(emailNorm) || [],
            Compras_Estoque: buscarCompras(emailNorm, null) || [],
            Fornecedores_Loja: buscarFornecedores(emailNorm) || []
            // Produtos: implementar função buscarProdutos se necessário
          });
        }
      `);
    }
    
    // Se chegamos aqui, é porque temos dados válidos

    let vendasMigradas = 0;
    let clientesMigrados = 0;
    let comprasMigradas = 0;
    let fornecedoresMigrados = 0;
    let produtosMigrados = 0;

    // Lógica Anti-Duplicação para Vendas - Loops Sequenciais Blindados
    if (res.vendas && Array.isArray(res.vendas)) {
      // Pega o UID do lojista
      let uid = window.firebaseAuth?.currentUser?.uid;
      if (!uid) {
        uid = localStorage.getItem("user_uid") || "";
      }
      if (!uid) {
        console.error('UID não encontrado para migração de vendas');
        return;
      }
      
      // Auto-Limpeza (Reset de Testes): Deleta todos os documentos onde migrado === true
      try {
        console.log('🧹 Iniciando limpeza de vendas migradas anteriormente...');
        const vendasMigradasQuery = window.firebaseQuery(
          window.firebaseCollection(window.firebaseDb, "lojas", uid, "vendas"),
          window.firebaseWhere('migrado', '==', true)
        );
        const vendasMigradasSnapshot = await window.firebaseGetDocs(vendasMigradasQuery);
        const vendasParaDeletar = vendasMigradasSnapshot.docs;
        
        for (const doc of vendasParaDeletar) {
          await window.firebaseDeleteDoc(doc.ref);
          console.log(`🗑️ Venda migrada ${doc.id} deletada`);
        }
        
        console.log(`🧹 ${vendasParaDeletar.length} vendas migradas deletadas`);
      } catch (err) {
        console.warn('⚠️ Erro na limpeza de vendas migradas:', err);
      }
      
      for (const venda of res.vendas) {
        // Verificação Simplificada: pula se já foi migrado
        if (historicoGlobal.some(v => v.linha === venda.linha)) {
          console.log(`⏭️ Venda linha ${venda.linha} já existe, pulando...`);
          continue;
        }
        
        try {
          // Conversão segura de datas via objeto Date
          let dataFormatadaISO = venda.dataISO;
          let dataBR = "";
          let mesAnoStr = "";
          try {
            // Tenta converter qualquer formato maluco que venha da planilha para um Date real
            const d = new Date(venda.data || venda.dataISO);
            if (!isNaN(d.getTime())) {
              const isoStr = d.toISOString().substring(0, 10); // YYYY-MM-DD
              dataFormatadaISO = isoStr;
              const [ano, mes, dia] = isoStr.split('-');
              dataBR = `${dia}/${mes}/${ano}`;
              mesAnoStr = `${mes}/${ano}`;
            }
          } catch(e) {}
          
          // FASE 12.3: Formatação Estrita - Mapeamento correto de campos para compatibilidade com salvarVenda()
          const vendaFormatada = {
            ...venda,
            linha: venda.linha,
            data: dataFormatadaISO, // DEVE receber YYYY-MM-DD para bater com filtros
            dataISO: dataFormatadaISO,
            mesAno: mesAnoStr,
            // Campos compatíveis com salvarVenda
            modo: venda.modo || "individual", // individual ou fechamento
            qtd: 1, // Dados legados não têm quantidade, assume 1
            formaPag: "Pago", // Dados legados são todos pagos (não tinham status pendente)
            valor: String(venda.total || 0), // Valor total da venda
            valorUnitario: String(venda.total || 0), // Dados legados não têm valor unitário, assume igual ao total
            valorTotal: String(venda.total || 0), // Valor total
            dinheiro: String(venda.dinheiro || 0),
            pix: String(venda.pix || 0),
            debito: String(venda.debito || 0),
            credito: String(venda.credito || 0),
            total: String(venda.total || 0),
            cliente: venda.cliente || "",
            descricao: venda.descricao || "",
            periodo: venda.periodo || "Venda Individual",
            custoAssociado: "0", // Dados legados não têm custo associado
            lucroLiquido: String(venda.total || 0), // Lucro = total - custo (custo = 0)
            criadoEm: venda.criadoEm || new Date().toISOString(),
            migrado: true,
            registradoPor: localStorage.getItem("user_email") || "",
            nomeOperador: localStorage.getItem("nomeOperador") || localStorage.getItem("user_name") || ""
          };
          
          // Salva no Firebase - Injeção Sequencial Blindada
          const docRef = await window.firebaseAddDoc(
            window.firebaseCollection(window.firebaseDb, "lojas", uid, "vendas"),
            vendaFormatada
          );
          
          // Atualização Imediata no Loop
          historicoGlobal.push({
            ...vendaFormatada,
            docId: docRef.id,
            linha: docRef.id
          });
          
          vendasMigradas++;
          console.log(`✅ Venda linha ${venda.linha} salva com sucesso (ID: ${docRef.id})`);
          
          // Auto-cadastra cliente se necessário
          if (vendaFormatada.cliente) {
            _autoCadastrarCliente(vendaFormatada.cliente);
          }
          
        } catch (err) {
          console.error(`❌ Erro ao salvar venda linha ${venda.linha}:`, err);
          // Loop continua para o próximo item
        }
      }
    }

    // Lógica Anti-Duplicação para Clientes - Loops Sequenciais Blindados
    if (res.clientes && Array.isArray(res.clientes)) {
      // Pega o UID do lojista
      let uid = window.firebaseAuth?.currentUser?.uid;
      if (!uid) {
        uid = localStorage.getItem("user_uid") || "";
      }
      
      // Auto-Limpeza (Reset de Testes): Deleta todos os documentos onde migrado === true
      try {
        console.log('🧹 Iniciando limpeza de clientes migrados anteriormente...');
        const clientesMigradosQuery = window.firebaseQuery(
          window.firebaseCollection(window.firebaseDb, "lojas", uid, "clientes"),
          window.firebaseWhere('migrado', '==', true)
        );
        const clientesMigradosSnapshot = await window.firebaseGetDocs(clientesMigradosQuery);
        const clientesParaDeletar = clientesMigradosSnapshot.docs;
        
        for (const doc of clientesParaDeletar) {
          await window.firebaseDeleteDoc(doc.ref);
          console.log(`🗑️ Cliente migrado ${doc.id} deletado`);
        }
        
        console.log(`🧹 ${clientesParaDeletar.length} clientes migrados deletados`);
      } catch (err) {
        console.warn('⚠️ Erro na limpeza de clientes migrados:', err);
      }
      
      for (const cliente of res.clientes) {
        // Verificação Simplificada: pula se já foi migrado
        if (clientesGlobal.some(c => c.linha === cliente.linha)) {
          console.log(`⏭️ Cliente linha ${cliente.linha} já existe, pulando...`);
          continue;
        }
        
        try {
          // Formatação de Clientes Estrita
          const clienteFormatado = {
            ...cliente,
            linha: cliente.linha,
            nome: cliente.nome?.trim() || "",
            telefone: cliente.telefone?.trim() || "",
            obs: cliente.obs?.trim() || "",
            criadoEm: cliente.criadoEm || new Date().toISOString(),
            migrado: true
          };
          
          // Salva no Firebase - Injeção Sequencial Blindada
          const docRef = await window.firebaseAddDoc(
            window.firebaseCollection(window.firebaseDb, "lojas", uid, "clientes"),
            clienteFormatado
          );
          
          // Atualização Imediata no Loop
          clientesGlobal.push({
            ...clienteFormatado,
            docId: docRef.id,
            linha: docRef.id
          });
          
          clientesMigrados++;
          console.log(`✅ Cliente linha ${cliente.linha} (${cliente.nome}) salvo com sucesso (ID: ${docRef.id})`);
          
        } catch (err) {
          console.error(`❌ Erro ao salvar cliente linha ${cliente.linha}:`, err);
          // Loop continua para o próximo item
        }
      }
    }

    // Migração de COMPRAS - Loops Sequenciais Blindados
    if (res.Compras_Estoque && Array.isArray(res.Compras_Estoque)) {
      // Pega o UID do lojista
      let uid = window.firebaseAuth?.currentUser?.uid;
      if (!uid) {
        uid = localStorage.getItem("user_uid") || "";
      }
      if (!uid) {
        console.error('UID não encontrado para migração de compras');
        return;
      }
      
      // Auto-Limpeza (Reset de Testes): Deleta todos os documentos onde migrado === true
      try {
        console.log('🧹 Iniciando limpeza de compras migradas anteriormente...');
        const comprasMigradasQuery = window.firebaseQuery(
          window.firebaseCollection(window.firebaseDb, "lojas", uid, "compras"),
          window.firebaseWhere('migrado', '==', true)
        );
        const comprasMigradasSnapshot = await window.firebaseGetDocs(comprasMigradasQuery);
        const comprasParaDeletar = comprasMigradasSnapshot.docs;
        
        for (const doc of comprasParaDeletar) {
          await window.firebaseDeleteDoc(doc.ref);
          console.log(`🗑️ Compra migrada ${doc.id} deletada`);
        }
        
        console.log(`🧹 ${comprasParaDeletar.length} compras migradas deletadas`);
      } catch (err) {
        console.warn('⚠️ Erro na limpeza de compras migradas:', err);
      }
      
      for (const compra of res.Compras_Estoque) {
        // Verificação Simplificada: pula se já foi migrado
        if (comprasGlobal.some(c => c.linha === compra.linha)) {
          console.log(`⏭️ Compra linha ${compra.linha} já existe, pulando...`);
          continue;
        }
        
        try {
          // Conversão segura de datas via objeto Date
          let dataFormatadaISO = compra.dataISO;
          let dataBR = "";
          let mesAnoStr = "";
          try {
            // Tenta converter qualquer formato maluco que venha da planilha para um Date real
            const d = new Date(compra.data || compra.dataISO);
            if (!isNaN(d.getTime())) {
              const isoStr = d.toISOString().substring(0, 10); // YYYY-MM-DD
              dataFormatadaISO = isoStr;
              const [ano, mes, dia] = isoStr.split('-');
              dataBR = `${dia}/${mes}/${ano}`;
              mesAnoStr = `${mes}/${ano}`;
            }
          } catch(e) {}
          
          // Formatação de Compras Estrita: Força sobreposição das datas
          const compraFormatada = {
            ...compra,
            linha: compra.linha,
            data: dataFormatadaISO, // DEVE receber YYYY-MM-DD para bater com filtros
            dataISO: dataFormatadaISO,
            mesAno: mesAnoStr,
            criadoEm: compra.criadoEm || new Date().toISOString(),
            migrado: true
          };
          
          // Salva no Firebase - Injeção Sequencial Blindada
          const docRef = await window.firebaseAddDoc(
            window.firebaseCollection(window.firebaseDb, "lojas", uid, "compras"),
            compraFormatada
          );
          
          // Atualização Imediata no Loop
          comprasGlobal.push({
            ...compraFormatada,
            docId: docRef.id,
            linha: docRef.id
          });
          
          comprasMigradas++;
          console.log(`✅ Compra linha ${compra.linha} salva com sucesso (ID: ${docRef.id})`);
          
        } catch (err) {
          console.error(`❌ Erro ao salvar compra linha ${compra.linha}:`, err);
          // Loop continua para o próximo item
        }
      }
    }

    // Migração de FORNECEDORES - Loops Sequenciais Blindados
    if (res.Fornecedores_Loja && Array.isArray(res.Fornecedores_Loja)) {
      // Pega o UID do lojista
      let uid = window.firebaseAuth?.currentUser?.uid;
      if (!uid) {
        uid = localStorage.getItem("user_uid") || "";
      }
      if (!uid) {
        console.error('UID não encontrado para migração de fornecedores');
        return;
      }
      
      // Auto-Limpeza (Reset de Testes): Deleta todos os documentos onde migrado === true
      try {
        console.log('🧹 Iniciando limpeza de fornecedores migrados anteriormente...');
        const fornecedoresMigradosQuery = window.firebaseQuery(
          window.firebaseCollection(window.firebaseDb, "lojas", uid, "fornecedores"),
          window.firebaseWhere('migrado', '==', true)
        );
        const fornecedoresMigradosSnapshot = await window.firebaseGetDocs(fornecedoresMigradosQuery);
        const fornecedoresParaDeletar = fornecedoresMigradosSnapshot.docs;
        
        for (const doc of fornecedoresParaDeletar) {
          await window.firebaseDeleteDoc(doc.ref);
          console.log(`🗑️ Fornecedor migrado ${doc.id} deletado`);
        }
        
        console.log(`🧹 ${fornecedoresParaDeletar.length} fornecedores migrados deletados`);
      } catch (err) {
        console.warn('⚠️ Erro na limpeza de fornecedores migrados:', err);
      }
      
      for (const fornecedor of res.Fornecedores_Loja) {
        // Verificação Simplificada: pula se já foi migrado
        if (fornecedoresGlobal.some(f => f.linha === fornecedor.linha)) {
          console.log(`⏭️ Fornecedor linha ${fornecedor.linha} já existe, pulando...`);
          continue;
        }
        
        try {
          // Formatação de Fornecedores Estrita
          const fornecedorFormatado = {
            ...fornecedor,
            linha: fornecedor.linha,
            nome: fornecedor.nome?.trim() || "",
            criadoEm: fornecedor.criadoEm || new Date().toISOString(),
            migrado: true
          };
          
          // Salva no Firebase - Injeção Sequencial Blindada
          const docRef = await window.firebaseAddDoc(
            window.firebaseCollection(window.firebaseDb, "lojas", uid, "fornecedores"),
            fornecedorFormatado
          );
          
          // Atualização Imediata no Loop
          fornecedoresGlobal.push({
            ...fornecedorFormatado,
            docId: docRef.id,
            linha: docRef.id
          });
          
          fornecedoresMigrados++;
          console.log(`✅ Fornecedor linha ${fornecedor.linha} (${fornecedor.nome}) salvo com sucesso (ID: ${docRef.id})`);
          
        } catch (err) {
          console.error(`❌ Erro ao salvar fornecedor linha ${fornecedor.linha}:`, err);
          // Loop continua para o próximo item
        }
      }
    }

    // Migração de PRODUTOS - Loops Sequenciais Blindados
    if (res.Produtos && Array.isArray(res.Produtos)) {
      // Pega o UID do lojista
      let uid = window.firebaseAuth?.currentUser?.uid;
      if (!uid) {
        uid = localStorage.getItem("user_uid") || "";
      }
      if (!uid) {
        console.error('UID não encontrado para migração de produtos');
        return;
      }
      
      for (const produto of res.Produtos) {
        // Verificação Simplificada: pula se já foi migrado
        if (produtosGlobal.some(p => p.linha === produto.linha)) {
          console.log(`⏭️ Produto linha ${produto.linha} já existe, pulando...`);
          continue;
        }
        
        try {
          // Formatação de Produtos Estrita
          const produtoFormatado = {
            ...produto,
            linha: produto.linha,
            nome: produto.nome?.trim() || "",
            criadoEm: produto.criadoEm || new Date().toISOString(),
            migrado: true
          };
          
          // Salva no Firebase - Injeção Sequencial Blindada
          const docRef = await window.firebaseAddDoc(
            window.firebaseCollection(window.firebaseDb, "lojas", uid, "produtos"),
            produtoFormatado
          );
          
          // Atualização Imediata no Loop
          produtosGlobal.push({
            ...produtoFormatado,
            docId: docRef.id,
            linha: docRef.id
          });
          
          produtosMigrados++;
          console.log(`✅ Produto linha ${produto.linha} (${produto.nome}) salvo com sucesso (ID: ${docRef.id})`);
          
        } catch (err) {
          console.error(`❌ Erro ao salvar produto linha ${produto.linha}:`, err);
          // Loop continua para o próximo item
        }
      }
    }

    // Função auxiliar para limpar duplicados
    async function limparClientesDuplicados() {
      try {
        const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
        if (!uid) return;
        
        // Remove duplicados do array local
        const clientesUnicos = clientesGlobal.filter((cliente, index, self) => 
          index === self.findIndex(c => 
            c.nome?.toLowerCase().trim() === cliente.nome?.toLowerCase().trim()
          )
        );
        
        console.log(`🧹 Limpeza Local: ${clientesGlobal.length} → ${clientesUnicos.length} clientes`);
        
        // Atualiza array local
        clientesGlobal = clientesUnicos;
        
        // Limpeza no Firebase: remove duplicados por nome
        console.log('🧹 Iniciando limpeza de clientes duplicados no Firebase...');
        
        const todosClientesQuery = window.firebaseQuery(
          window.firebaseCollection(window.firebaseDb, "lojas", uid, "clientes")
        );
        const todosClientesSnapshot = await window.firebaseGetDocs(todosClientesQuery);
        const todosClientes = todosClientesSnapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
        
        // Agrupa por nome para encontrar duplicados
        const clientesPorNome = {};
        todosClientes.forEach(cliente => {
          const nomeNormalizado = cliente.nome?.toLowerCase().trim() || '';
          if (!clientesPorNome[nomeNormalizado]) {
            clientesPorNome[nomeNormalizado] = [];
          }
          clientesPorNome[nomeNormalizado].push(cliente);
        });
        
        // Remove duplicados, mantendo apenas o primeiro
        let deletados = 0;
        for (const [nome, clientes] of Object.entries(clientesPorNome)) {
          if (clientes.length > 1) {
            // Mantém o primeiro, remove os outros
            const paraDeletar = clientes.slice(1);
            for (const cliente of paraDeletar) {
              await window.firebaseDeleteDoc(
                window.firebaseDoc(window.firebaseDb, "lojas", uid, "clientes", cliente.docId)
              );
              console.log(`🗑️ Cliente duplicado "${cliente.nome}" (${cliente.docId}) deletado`);
              deletados++;
            }
          }
        }
        
        console.log(`🧹 Limpeza Firebase: ${deletados} clientes duplicados deletados`);
        
        // Recarrega lista de clientes
        carregarClientes();
        preencherAutocompleteClientes();
        
      } catch (err) {
        console.error('Erro na limpeza de clientes:', err);
      }
    }

    // Atualiza o toast com todos os dados migrados
    let mensagemFinal = `✅ Migração concluída!`;
    let dadosMigrados = [];
    
    if (vendasMigradas > 0) dadosMigrados.push(`${vendasMigradas} vendas`);
    if (clientesMigrados > 0) dadosMigrados.push(`${clientesMigrados} clientes`);
    if (comprasMigradas > 0) dadosMigrados.push(`${comprasMigradas} compras`);
    if (fornecedoresMigrados > 0) dadosMigrados.push(`${fornecedoresMigrados} fornecedores`);
    if (produtosMigrados > 0) dadosMigrados.push(`${produtosMigrados} produtos`);
    
    if (dadosMigrados.length > 0) {
      mensagemFinal += ` ${dadosMigrados.join(', ')} sincronizados.`;
    } else {
      mensagemFinal += ` Nenhum dado novo encontrado para migrar.`;
    }
    
    mostrarToast(mensagemFinal, "sucesso");
    
    // Recarrega o histórico para mostrar os novos dados
    await buscarHistorico();

    // Limpeza de clientes duplicados (ativa agora)
    await limparClientesDuplicados();

    // FASE 12.3: Blindagem contra duplicação - marcar migração como concluída
    // Só marca como concluída se houve dados migrados com sucesso
    if (vendasMigradas > 0 || clientesMigrados > 0 || comprasMigradas > 0 || fornecedoresMigrados > 0 || produtosMigrados > 0) {
      const uid = window.firebaseAuth?.currentUser?.uid || localStorage.getItem("user_uid") || "";
      if (uid) {
        try {
          await marcarMigracaoConcluida(uid);
          console.log('[MIGRAÇÃO] Flag migradoSheets marcada como true após migração bem-sucedida');
        } catch (err) {
          console.error('[MIGRAÇÃO] Erro ao marcar migração como concluída:', err);
        }
      }
    }

  } catch (err) {
    console.error('🚨 Erro detalhado na migração:', err);
    mostrarToast('❌ Erro na migração: ' + (err.message || 'Falha na migração'), 'erro');
  } finally {
    btn.innerText = textoOriginal;
    btn.disabled = false;
  }
}

// ============================================================
// MAPEAMENTO DINÂMICO DE PLANOS (15 COLUNAS)
// ============================================================

// Função para obter ID_Plano a partir do perfilNegocio (mapeamento dinâmico)
function getPlanoIdFromPerfil(perfilNegocio) {
  console.log(`[MAPEAMENTO] Buscando ID_Plano para perfil: ${perfilNegocio}`);
  
  // Usar mapeamento dinâmico carregado da Config_Planos
  if (window.PERFIL_TO_PLANO_ID && window.PERFIL_TO_PLANO_ID[perfilNegocio]) {
    const planoId = window.PERFIL_TO_PLANO_ID[perfilNegocio];
    console.log(`[MAPEAMENTO] Encontrado em PERFIL_TO_PLANO_ID: ${planoId}`);
    return planoId;
  }
  
  // Fallback para mapeamento estático
  const PERFIL_TO_PLANO_ID = {
    'varejo-trial': 'trial_7dias',
    'varejo-rapido': 'mensal_basico',
    'varejo-padrao': 'mensal_padrao',
    'varejo-premium': 'mensal_premium',
    'servicos': 'mensal_servicos'
  };
  
  const planoIdFallback = PERFIL_TO_PLANO_ID[perfilNegocio] || 'mensal_padrao';
  console.log(`[MAPEAMENTO] Usando fallback estático: ${planoIdFallback}`);
  return planoIdFallback;
}

// Função para obter perfilNegocio a partir do ID_Plano (mapeamento dinâmico)
function getPerfilFromPlanoId(planoId) {
  console.log(`[MAPEAMENTO] Buscando perfil para ID_Plano: ${planoId}`);
  
  // Usar mapeamento dinâmico carregado da Config_Planos
  if (window.PLANO_MAP && window.PLANO_MAP[planoId]) {
    const perfil = window.PLANO_MAP[planoId];
    console.log(`[MAPEAMENTO] Encontrado em PLANO_MAP: ${perfil}`);
    return perfil;
  }
  
  // Fallback para mapeamento estático
  const PLANO_MAP = {
    'trial_7dias': 'varejo-trial',
    'mensal_basico': 'varejo-rapido',
    'mensal_padrao': 'varejo-padrao',
    'mensal_premium': 'varejo-premium',
    'trimestral_premium': 'varejo-premium',
    'mensal_servicos': 'servicos'
  };
  
  const perfilFallback = PLANO_MAP[planoId] || 'varejo-padrao';
  console.log(`[MAPEAMENTO] Usando fallback estático: ${perfilFallback}`);
  return perfilFallback;
}

// Função para obter dados completos do plano (incluindo campos visuais)
function getDadosPlano(planoId) {
  const planos = JSON.parse(localStorage.getItem("planosConfig") || "[]");
  return planos.find(p => p.id === planoId);
}

// Função para calcular vencimento baseado no período
function calcularVencimento(periodo, dataBase = new Date()) {
  const dias = {
    'mensal': 30,
    'trimestral': 90,
    'anual': 365,
    'semestral': 180
  };
  
  const diasAdicionar = dias[periodo] || 30;
  const vencimento = new Date(dataBase);
  vencimento.setDate(vencimento.getDate() + diasAdicionar);
  
  return vencimento.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Função para carregar planos da Config_Planos (15 colunas)
async function carregarPlanosConfig() {
  try {
    console.log("[PLANOS] Iniciando carregamento de planos...");
    const res = await chamarGoogle("buscarPlanosAtivos");
    console.log("[PLANOS] Resposta do backend:", res);
    
    if (res?.planos) {
      console.log("[PLANOS] Planos encontrados:", res.planos.length);
      // Backend já retorna objetos com as 15 colunas mapeadas
      const planosProcessados = res.planos.map(plano => {
        return {
          // Colunas principais (já mapeadas pelo backend)
          id: plano.id, // Coluna A: ID_Plano
          nome: plano.nome, // Coluna B: Nome
          perfil: plano.perfil, // Coluna C: Perfil
          preco: plano.preco, // Coluna D: Preço
          status: plano.status, // Coluna E: Status
          descricao: plano.descricao, // Coluna F: Descrição
          periodo: plano.periodo, // Coluna G: Período
          trial: plano.trial, // Coluna H: Trial
          recursos: plano.recursos, // Coluna I: Recursos
          limites: plano.limites, // Coluna J: Limites
          nivel: plano.nivel, // Coluna K: Nível
          // Campos visuais
          cor: plano.cor, // Coluna M: Cor
          corBorda: plano.corBorda, // Coluna N: CorBorda
          bgCard: plano.bgCard, // Coluna O: BgCard
          destaque: plano.destaque // Coluna L: Destaque
        };
      });
      
      // Armazenar mapeamento para uso posterior
      localStorage.setItem("planosConfig", JSON.stringify(planosProcessados));
      
      // Construir mapeamento dinâmico ID_Plano -> Perfil
      const planoMap = {};
      const perfilToPlanoId = {};
      
      planosProcessados.forEach(plano => {
        planoMap[plano.id] = plano.perfil;
        perfilToPlanoId[plano.perfil] = plano.id;
      });
      
      // Atualizar mapeamentos globais
      window.PLANO_MAP = planoMap;
      window.PERFIL_TO_PLANO_ID = perfilToPlanoId;
      
      console.log("[PLANOS] Planos processados:", planosProcessados);
      console.log("[PLANOS] Mapeamento ID_Plano -> Perfil:", planoMap);
      console.log("[PLANOS] Mapeamento Perfil -> ID_Plano:", perfilToPlanoId);
      
      return planosProcessados;
    } else {
      console.warn("[PLANOS] Nenhum plano encontrado na resposta");
      return [];
    }
  } catch (err) {
    console.error("[PLANOS] Erro ao carregar planos:", err);
    return [];
  }
}

// ============================================================
// SINCRONIZAÇÃO AUTOMÁTICA DE PERFIL
// ============================================================

async function sincronizarPerfilSilencioso() {
  try {
    const userEmail = localStorage.getItem("user_email");
    if (!userEmail) {
      console.log("[SYNC] Sem email para sincronizar perfil");
      return;
    }

    console.log("[SYNC] Iniciando sincronização silenciosa de perfil para:", userEmail);
    
    // Chamar verificarAcesso para obter dados atualizados da planilha
    const res = await chamarGoogle("verificarAcesso", { email: userEmail });
    
    if (res?.perfilNegocio && res.perfilNegocio !== perfilNegocioAtual) {
      console.log("[SYNC] Perfil atualizado na planilha:", res.perfilNegocio);
      console.log("[SYNC] Perfil atual no app:", perfilNegocioAtual);

      // FASE 12.5: Trava Estrita do Admin VIP - bloquear QUALQUER sobrescrita
      const ehAdmin = (userEmail === EMAIL_ADMIN);
      const perfilTeste = localStorage.getItem('perfilAdminTeste');

      if (ehAdmin && perfilTeste) {
        perfilNegocioAtual = perfilTeste; // O Admin é o Rei
        localStorage.setItem("perfilNegocio", perfilNegocioAtual);
        console.log('[SYNC ADMIN VIP] TRAVA ESTRITA: Forçando perfil de teste sobre resposta do servidor:', perfilTeste);
        console.log('[SYNC ADMIN VIP] Servidor retornou:', res.perfilNegocio, '- IGNORADO');
        return; // Aborta a sincronização
      }

      // Atualizar variável global (fluxo normal para usuários comuns)
      perfilNegocioAtual = res.perfilNegocio;
      localStorage.setItem("perfilNegocio", perfilNegocioAtual);
      
      // Aplicar perfil imediatamente (sem loading)
      aplicarPerfilNegocio();
      
      // Atualizar dashboard se estiver visível
      if (document.getElementById("dashboard") && document.getElementById("dashboard").style.display !== "none") {
        montarDashboard(res.dadosIniciais || {}, false);
      }
      
      console.log("[SYNC] Perfil sincronizado automaticamente para:", perfilNegocioAtual);
    } else {
      console.log("[SYNC] Perfil já está sincronizado");
    }
  } catch (err) {
    console.warn("[SYNC] Erro na sincronização silenciosa:", err);
  }
}