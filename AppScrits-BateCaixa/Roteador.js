// ============================================================
// ARQUIVO: Roteador.gs — BateCaixa Backend (VERSÃO TESTES)
// Corrigido: Inclui Modo Leitura + Mercado Pago + Migração
// ============================================================

const EMAIL_MASTER      = "danilobertolani@gmail.com";
const ID_PLANILHA_MOTOR = "1k5Etah4KwsYIg0rHqpcmcKGi-I9ejH6XsP5sgOSREXY";
const ID_PASTA_DADOS    = "1key6BDUzMEAqfiuUcHGzFRdqVauej6xJ";
const ID_PASTA_NOTAS    = "1Jypux0AdzvTq49Q3yxiXywP-J_tAraCj";
const URL_APP           = "https://batecaixa.deab.com.br/"; 
const WHATSAPP_SUPORTE  = "5527996962395"; 

function doPost(e) {
  try {
    let payload;
    try { payload = JSON.parse(e.postData.contents); }
    catch { return retornarJSON({ erro: "JSON inválido" }); }

    const { acao, email, dados } = payload;
    const emailNorm = (email || "").toLowerCase().trim();

    registrarEvento(emailNorm, acao, "recebido");

    // ── Webhook Mercado Pago ──────────────────────────────────────────────────
    if (!acao && (payload.type === "payment" || payload.type === "subscription_preapproval")) {
      return retornarJSON(processarWebhookMP(payload));
    }

    // ── Rotas abertas (sem verificação de licença) ────────────────────────────
    if (acao === "verificarAcesso")         return retornarJSON(verificarAcessoSaaS(emailNorm, true));
    if (acao === "ativarTesteGratis")       return retornarJSON(ativarTesteGratis(emailNorm, dados?.nome || "Vendedor"));
    if (acao === "salvarFeedback")          return retornarJSON(salvarFeedback(dados));
    if (acao === "verificarMembroExiste")   return retornarJSON(verificarMembroExiste(dados?.emailMembro));
    if (acao === "solicitarAcessoMembro")   return retornarJSON(solicitarAcessoMembro(dados?.emailMembro));
    if (acao === "validarCodigoMembro")     return retornarJSON(validarCodigoMembro(dados?.emailMembro, dados?.codigo));

    // ── Verificação de acesso e Modo Leitura (Read-Only) ──────────────────────
    const acesso = verificarAcessoSaaS(emailNorm);
    
    if (!acesso.liberado && !acesso.isReadOnly) {
      return retornarJSON({ 
        liberado: false, 
        isReadOnly: false,
        motivo: acesso.motivo 
      });
    }

    // ── Rotas de LEITURA (Funcionam mesmo se a assinatura expirou) ────────────
    const rotasLeitura = [
      "carregarDashboard", "buscarVendas", "buscarCompras", "gerarRelatorio",
      "buscarConfiguracoes", "buscarPlanosAtivos", "buscarMembros",
      "buscarClientes", "buscarFornecedores", "buscarFornecedoresCfg",
      "buscarTotalIndividualDia", "exportarDadosLegados"
    ];

    if (rotasLeitura.includes(acao)) {
      if (acao === "carregarDashboard")       return retornarJSON({ dados: carregarDadosDashboard(emailNorm) });
      if (acao === "buscarVendas")            return retornarJSON({ vendas: buscarVendas(emailNorm, dados) });
      if (acao === "buscarCompras")           return retornarJSON({ compras: buscarCompras(emailNorm, dados) });
      if (acao === "gerarRelatorio")          return retornarJSON({ relatorio: gerarRelatorio(emailNorm, dados) });
      if (acao === "buscarConfiguracoes")     return retornarJSON({ configs: buscarConfiguracoes(emailNorm) });
      if (acao === "buscarPlanosAtivos")      return retornarJSON({ planos: buscarPlanosAtivos() });
      if (acao === "buscarMembros")           return retornarJSON({ membros: buscarMembros(emailNorm) });
      if (acao === "buscarClientes")          return retornarJSON({ clientes: buscarClientes(emailNorm) });
      if (acao === "buscarFornecedores")      return retornarJSON({ fornecedores: buscarFornecedoresNomes(emailNorm) });
      if (acao === "buscarFornecedoresCfg")   return retornarJSON({ fornecedores: buscarFornecedores(emailNorm) });
      if (acao === "buscarTotalIndividualDia")return retornarJSON({ total: buscarTotalIndividualDia(emailNorm, dados?.data) });
      if (acao === "exportarDadosLegados") {
        return retornarJSON({ 
          vendas: buscarVendas(emailNorm, null) || [], 
          clientes: buscarClientes(emailNorm) || [],
          Compras_Estoque: buscarCompras(emailNorm, null) || [],
          Fornecedores_Loja: buscarFornecedores(emailNorm) || []
          // Produtos: buscarProdutos(emailNorm) removido temporariamente até a função existir no backend
        });
      }
    }

    // ── Rotas de PAGAMENTO (Sempre liberadas para o usuário renovar) ──────────
    if (acao === "gerarLinkAssinatura")     return retornarJSON(gerarLinkAssinatura(emailNorm, dados?.plano || "mensal"));
    if (acao === "gerarPixAvulso")          return retornarJSON(gerarPixAvulso(emailNorm, dados?.plano || "mensal"));

    // ── Rotas de ESCRITA (Bloqueadas no Modo Leitura) ─────────────────────────
    const rotasEscrita = [
      "salvarVenda", "editarVenda", "excluirVenda", "darBaixaVenda",
      "salvarCompra", "editarCompra", "excluirCompra", "salvarConfiguracoes",
      "adicionarMembro", "editarNomeMembro", "removerMembro",
      "salvarCliente", "editarCliente", "excluirCliente",
      "salvarFornecedor", "editarFornecedor", "excluirFornecedor"
    ];

    if (rotasEscrita.includes(acao)) {
      if (acesso.isReadOnly === true) {
        return retornarJSON({
          status: "Erro",
          liberado: false,
          isReadOnly: true,
          mensagem: "🔒 Sua assinatura expirou. Modo leitura ativado. Para lançar novas vendas ou editar dados, realize o pagamento da assinatura."
        });
      }

      if (acao === "salvarVenda")             return retornarJSON(salvarVenda(dados, emailNorm));
      if (acao === "editarVenda")             return retornarJSON(editarVenda(dados?.linha, dados?.dados, emailNorm));
      if (acao === "excluirVenda")            return retornarJSON(excluirVenda(dados?.linha, emailNorm));
      if (acao === "darBaixaVenda")           return retornarJSON(darBaixaVenda(dados?.linha, emailNorm));
      if (acao === "salvarCompra")            return retornarJSON(salvarCompra(dados, emailNorm));
      if (acao === "editarCompra")            return retornarJSON(editarCompra(dados?.linha, dados?.dados, emailNorm));
      if (acao === "excluirCompra")           return retornarJSON(excluirCompra(dados?.linha, emailNorm));
      if (acao === "salvarConfiguracoes")     return retornarJSON(salvarConfiguracoes(dados, emailNorm));
      if (acao === "adicionarMembro")         return retornarJSON(adicionarMembro(emailNorm, dados?.emailMembro, dados?.papel, dados?.nomeOperador, dados?.permissaoVenda));
      if (acao === "editarNomeMembro")        return retornarJSON(editarNomeMembro(emailNorm, dados?.emailMembro, dados?.nomeOperador, dados?.papel, dados?.permissaoVenda));
      if (acao === "removerMembro")           return retornarJSON(removerMembro(emailNorm, dados?.emailMembro));
      if (acao === "salvarCliente")           return retornarJSON(salvarCliente(dados, emailNorm));
      if (acao === "editarCliente")           return retornarJSON(editarCliente(dados?.linha, dados?.dados, emailNorm));
      if (acao === "excluirCliente")          return retornarJSON(excluirCliente(dados?.linha, emailNorm));
      if (acao === "salvarFornecedor")        return retornarJSON(salvarFornecedor(dados, emailNorm));
      if (acao === "editarFornecedor")        return retornarJSON(editarFornecedor(dados?.linha, dados?.dados, emailNorm));
      if (acao === "excluirFornecedor")       return retornarJSON(excluirFornecedor(dados?.linha, emailNorm));
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    if (acao === "buscarTodosClientes" && emailNorm === EMAIL_MASTER.toLowerCase())
      return retornarJSON({ clientes: buscarTodosClientes() });
    
    if (acao === "alterarStatusCliente" && emailNorm === EMAIL_MASTER.toLowerCase())
      return retornarJSON(alterarStatusCliente(dados?.emailAlvo, dados?.novoStatus));
    
    if (acao === "ajustarPlanoUsuario" && emailNorm === EMAIL_MASTER.toLowerCase())
      return retornarJSON(ajustarPlanoUsuario(dados));

    return retornarJSON({ erro: "Ação não encontrada: " + acao });
  } catch (err) {
    return retornarJSON({ erro: err.message });
  }
}
