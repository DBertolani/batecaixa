// ============================================================
// MAPEAMENTO ID_Plano ↔ perfilNegocio
// ============================================================

// Mapeamento baseado na estrutura da Config_Planos
const PLANO_MAP = {
  // ID_Plano → perfilNegocio
  'trial_7dias': 'varejo-trial',
  'mensal_basico': 'varejo-rapido',
  'mensal_padrao': 'varejo-padrao',
  'mensal_premium': 'varejo-premium',
  'trimestral_premium': 'varejo-premium',
  'mensal_servicos': 'servicos'
};

// Mapeamento reverso: perfilNegocio → ID_Plano (para checkout)
const PERFIL_TO_PLANO_ID = {
  'varejo-trial': 'trial_7dias',
  'varejo-rapido': 'mensal_basico',
  'varejo-padrao': 'mensal_padrao',
  'varejo-premium': 'mensal_premium',
  'servicos': 'mensal_servicos'
};

// Função para obter ID_Plano a partir do perfilNegocio (mapeamento dinâmico)
function getPlanoIdFromPerfil(perfilNegocio) {
  // Usar mapeamento dinâmico carregado da Config_Planos
  if (window.PERFIL_TO_PLANO_ID && window.PERFIL_TO_PLANO_ID[perfilNegocio]) {
    return window.PERFIL_TO_PLANO_ID[perfilNegocio];
  }
  
  // Fallback para mapeamento estático
  return PERFIL_TO_PLANO_ID[perfilNegocio] || 'mensal_padrao';
}

// Função para obter perfilNegocio a partir do ID_Plano (mapeamento dinâmico)
function getPerfilFromPlanoId(planoId) {
  // Usar mapeamento dinâmico carregado da Config_Planos
  if (window.PLANO_MAP && window.PLANO_MAP[planoId]) {
    return window.PLANO_MAP[planoId];
  }
  
  // Fallback para mapeamento estático
  return PLANO_MAP[planoId] || 'varejo-padrao';
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
    const res = await chamarGoogle("buscarPlanosAtivos");
    if (res?.status === "Sucesso" && res?.planos) {
      // Processar planos com 15 colunas
      const planosProcessados = res.planos.map(plano => {
        return {
          // Colunas principais
          id: plano[0], // Coluna A: ID_Plano
          nome: plano[1], // Coluna B: Nome
          perfil: plano[2], // Coluna C: Perfil
          preco: plano[3], // Coluna D: Preço
          descricao: plano[4], // Coluna E: Descrição
          status: plano[5], // Coluna F: Status
          periodo: plano[6], // Coluna G: Período
          trial: plano[7], // Coluna H: Trial
          recursos: plano[8], // Coluna I: Recursos
          limites: plano[9], // Coluna J: Limites
          // Campos visuais
          cor: plano[10], // Coluna K: Cor
          corBorda: plano[11], // Coluna L: CorBorda
          bgCard: plano[12], // Coluna M: BgCard
          destaque: plano[13], // Coluna N: Destaque
          popular: plano[14] // Coluna O: Popular
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
      
      console.log("Planos carregados (15 colunas):", planosProcessados);
      console.log("Mapeamento ID_Plano -> Perfil:", planoMap);
      console.log("Mapeamento Perfil -> ID_Plano:", perfilToPlanoId);
      
      return planosProcessados;
    }
    return [];
  } catch (err) {
    console.error("Erro ao carregar planos:", err);
    return [];
  }
}
