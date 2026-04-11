# 📁 Estrutura do Banco de Dados - BateCaixa Firebase

## 🏗️ Estrutura Firestore

```
📦 lojas/
├── 📄 {uid}/                          # Documento raiz de cada loja
│   ├── 📋 nomeLoja: "Minha Loja"
│   ├── 🏙️ cidade: "São Paulo"
│   ├── 🏪 ramo: "Varejo"
│   ├── 👤 nomeProprietario: "João Silva"
│   ├── 🎯 metaMensal: "50000"
│   ├── 📊 estiloVendas: "individual"
│   └── 📅 criadoEm: "2024-01-01T00:00:00.000Z"
│
├── 📦 vendas/                         # Subcoleção de vendas
│   ├── 📄 {docId}/                   # Documento de cada venda
│   │   ├── 📅 data: "2024-01-15"
│   │   ├── 💰 total: "150.50"
│   │   ├── 💵 dinheiro: "100.00"
│   │   ├── 💳 pix: "50.50"
│   │   ├── 💳 cartao: "0"
│   │   ├── 📝 descricao: "Venda de produtos"
│   │   ├── 👤 cliente: "Maria Santos"
│   │   ├── 📦 modo: "individual"
│   │   ├── 📊 periodo: "Venda Individual"
│   │   ├── 📧 registradoPor: "joao@email.com"
│   │   ├── 👨‍💼 nomeOperador: "João Silva"
│   │   └── 📅 criadoEm: "2024-01-15T10:30:00.000Z"
│   └── 📄 {docId}/...
│
├── 📦 compras/                        # Subcoleção de compras
│   ├── 📄 {docId}/                   # Documento de cada compra
│   │   ├── 📅 data: "2024-01-15"
│   │   ├── 🏪 fornecedor: "Atacado São Paulo"
│   │   ├── 💰 valor: "500.00"
│   │   ├── 📝 descricao: "Compra de mercadorias"
│   │   ├── 📎 linkNota: "https://storage.googleapis.com/..."
│   │   ├── 📧 registradoPor: "joao@email.com"
│   │   ├── 👨‍💼 nomeOperador: "João Silva"
│   │   └── 📅 criadoEm: "2024-01-15T14:20:00.000Z"
│   └── 📄 {docId}/...
│
├── 📦 clientes/                       # Subcoleção de clientes
│   ├── 📄 {docId}/                   # Documento de cada cliente
│   │   ├── 👤 nome: "Maria Santos"
│   │   ├── 📱 telefone: "(27) 9 9999-9999"
│   │   ├── 📝 obs: "Cliente VIP"
│   │   ├── 📅 criadoEm: "2024-01-10T08:00:00.000Z"
│   │   └── 🔄 atualizadoEm: "2024-01-15T10:30:00.000Z"
│   └── 📄 {docId}/...
│
├── 📦 fornecedores/                   # Subcoleção de fornecedores
│   ├── 📄 {docId}/                   # Documento de cada fornecedor
│   │   ├── 🏪 nome: "Atacado São Paulo"
│   │   ├── 📱 telefone: "(11) 9 9999-9999"
│   │   ├── 📦 produto: "Roupas femininas"
│   │   ├── 📝 obs: "Entrega segunda/quinta"
│   │   ├── 📅 criadoEm: "2024-01-05T09:00:00.000Z"
│   │   └── 🔄 atualizadoEm: "2024-01-15T14:20:00.000Z"
│   │
│   └── 📄 {docId}/...
│
└── 📦 produtos/                       # Subcoleção de produtos
    ├── 📄 {docId}/                   # Documento de cada produto
    │   ├── 📦 nome: "Camiseta Polo Azul"
    │   ├── 💰 preco: 89.90
    │   ├── 📊 estoque: 25
    │   ├── 🏷️ categoria: "Vestuario"
    │   ├── 📅 criadoEm: "2024-01-08T11:00:00.000Z"
    │   └── 🔄 atualizadoEm: "2024-01-15T16:45:00.000Z"
    └── 📄 {docId}/...
```

## 🗂️ Estrutura Storage

```
📦 lojas/
└── 📦 {uid}/                          # Pasta do usuário (isolada por UID)
    └── 📦 compras/                    # Notas fiscais e comprovantes
        ├── 📄 1705123456000_0_nota_fiscal.jpg
        ├── 📄 1705123456000_1_comprovante.png
        └── 📄 1705123456000_2_fatura.pdf
```

## 🔐 Regras de Segurança Sugeridas

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuários só acessam seus próprios dados
    match /lojas/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Usuários só acessam sua própria pasta
    match /lojas/{uid}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## 🔄 Fluxo de Dados

1. **Autenticação**: Firebase Auth → UID único
2. **Firestore**: `lojas/{uid}` → isolamento completo por usuário
3. **Storage**: `lojas/{uid}/compras/` → arquivos isolados
4. **Legado**: Google Apps Script → Membros, Admin, Pagamentos

## 📊 Estatísticas

- **Migração Completa**: ✅ Vendas, Compras, Clientes, Fornecedores, Produtos
- **Sincronização**: ✅ Tempo real com `atualizarDashboardFirebase()`
- **Segurança**: ✅ Blindagem por UID em todas as operações
- **Fallback**: ✅ Valores padrão para evitar quebras
- **Performance**: ✅ Cache local + Firebase otimizado
