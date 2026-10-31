# Airspace ACARS — Parallel 42 Flow Pro (MSFS 2024)

Plugin oficial de integração do **Airspace ACARS** para o **Parallel 42 Flow Pro** no **Microsoft Flight Simulator 2024**.

Desenvolvido especificamente para o ambiente Coherent GT do MSFS 2024, este widget traz as funcionalidades essenciais do Airspace ACARS diretamente para dentro do cockpit por meio de uma janela flutuante arrastável, um botão dinâmico na roda do Flow e integração completa com a barra de pesquisa **Otto**.

---

## Funcionalidades Principais

### 1. Conexão Multi-VA (Device Code OAuth)
- **Seletor de Companhias Aéreas (Tenants)**: Lista automaticamente todas as Virtual Airlines da rede Airspace (`GET /api/tenants`) com busca rápida por nome ou domínio.
- **Autenticação por Código de Dispositivo**: Conecte-se à sua VA sem digitar senhas dentro do simulador (`/api/v2/acars/auth/request` e `/api/v2/acars/auth/token`). Basta abrir o painel da VA pelo botão rápido ou digitar o código exibido.
- **Troca Rápida entre VAs**: Os tokens de acesso ficam salvos no armazenamento persistente do Flow (`this.$api.datastore`), permitindo alternar entre diferentes VAs com um clique.
- **Tratamento Automático de Expiração**: Respostas `401 Unauthorized` limpam apenas o token expirado e retornam suavemente para a tela de reconexão.

### 2. vOCC & Mensagens ACARS
- **Recebimento em Tempo Real**: Polling em segundo plano (`loop_1hz`) que monitora novas mensagens do vOCC / Despacho (`/api/v2/acars/messages`).
- **Alerta Flutuante no Simulador (Toast)**: Quando uma mensagem do vOCC chega com o painel fechado, um card de alerta aparece no canto da tela com opções para **Responder / Abrir** ou **Confirmar Leitura (WILCO)**.
- **Respostas Rápidas (Quick Replies)**: Botões de um clique (`WILCO`, `ROGER`, `STANDBY`, ` PRONTO PUSHBACK`, `NO PORTÃO`) além de campo de texto livre para conversar com o vOCC (`/api/v2/acars/message`).
- **Confirmação de Leitura**: Marcação automática ou manual via `PUT /api/v2/acars/message/confirm`.

### 3. Aeroportos & Documentos
- **Pesquisa de Documentos e Briefings**: Busque por código ICAO (ex.: `SBGR`, `SBRJ`, `SBSP`) ou título em toda a biblioteca da companhia (`/api/v2/acars/documents`).
- **Atalhos Automáticos da Rota Ativa**: Caso você tenha um voo reservado (`/api/v2/acars/booking`), o painel exibe botões diretos para filtrar documentos de **DEP**, **ARR** e **ALT**.
- **Aeroporto Mais Próximo no MSFS 2024**: O botão **Próx. MSFS** consulta `this.$api.airports.find_airports_by_coords` usando a posição atual da aeronave no simulador e abre imediatamente os briefings daquele aeródromo.
- **Categorias & Pastas**: Filtre entre `Todos`, `Aeroportos`, `Manuais / SOP`, `FDM` e `Load`, navegue por pastas e leia documentos HTML higienizados com segurança dentro do simulador (ou abra anexos PDF no navegador).

### 4. Voo Ativo, Perfil do Piloto & NOTAMs
- Exibe resumo completo do **Booking Ativo** (`callsign`, número do voo, aeronave, registro, aeroportos e rota) e **Perfil do Piloto** (`/api/v2/acars/pilot`).
- Lista e exibe o conteúdo completo dos **NOTAMs ativos** da companhia (`/api/v2/acars/notams`).

### 5. Barra de Pesquisa Otto (Flow Pro)
Com `can_otto: true`, você pode pesquisar e executar ações diretamente na barra **Otto** do Flow Pro:
| Comando na Barra Otto | Ação Executada |
| :--- | :--- |
| `doc SBGR` ou `docs SBGR` | Pesquisa documentos e briefings contendo `SBGR` e abre o leitor |
| `briefing SBRJ` ou `apt SBRJ` | Filtra especificamente briefings de aeroporto para `SBRJ` |
| `vocc` | Lista as últimas mensagens do vOCC e permite abrir o chat |
| `vocc WILCO PRONTO` | Envia imediatamente a mensagem `WILCO PRONTO` para o vOCC |
| `notam` | Lista e abre os NOTAMs ativos da companhia aérea |
| `airspace` ou `acars` | Abre o painel principal ou busca geral nos documentos |

---

## Instalação (Usuários Finais — MSFS 2024)

1. Acesse a página de [**Releases**](../../releases) deste repositório e baixe o arquivo **`p42-util-airspace-acars.zip`** da versão mais recente.
2. Extraia a pasta `p42-util-airspace-acars` diretamente dentro da sua pasta **`Community`** do Microsoft Flight Simulator 2024.
3. Inicie o MSFS 2024, abra a roda do **Parallel 42 Flow Pro**, entre no modo de edição e adicione o widget **Airspace ACARS** à sua roda.

---

## Estrutura do Projeto

```text
p42-util-airspace-acars/
├── .github/workflows/
│   ├── ci.yml                # Testes e verificação de build em cada Push / PR
│   └── release.yml           # Build automático e publicação de Release (.zip) via tags v*
├── assets/
│   └── Thumbnail.jpg         # Miniatura oficial do pacote para o MSFS 2024
├── scripts/
│   └── build.mjs             # Empacotador MSFS 2024 (gera manifest.json, layout.json e template Flow)
├── src/
│   ├── code.js               # Lógica do widget Flow, cliente Airspace ACARS v2 e integração Otto
│   ├── code.html             # Template HTML do painel flutuante e toast do vOCC
│   └── code.css              # Estilos escopados (.as-acars-*) compatíveis com Coherent GT
├── test/
│   └── widget.test.mjs       # Suíte de testes automatizados (Node.js test runner)
└── package.json
```

---

## Desenvolvimento Local e Build

### Pré-requisitos
- **Node.js 20+** (não requer dependências externas do npm).

### Comandos Disponíveis
```bash
# Executar a suíte de testes unitários e de integração
npm test

# Gerar o pacote MSFS 2024 pronto para a pasta Community em dist/p42-util-airspace-acars/
npm run build
```

### Editando ao Vivo no MSFS 2024 (Working Directory do Flow Pro)
Para desenvolver com recarregamento rápido dentro do simulador:
1. Nas configurações do **Flow Pro** no MSFS 2024, defina o **Working Directory** para uma pasta local.
2. Copie ou crie um link simbólico dos arquivos de `src/` (`code.js`, `code.html`, `code.css`) dentro da subpasta do script no Working Directory e clique em **Import from Disk** no editor de scripts do Flow.

---

## Publicando uma Nova Release (GitHub Actions)

O repositório conta com automação completa em `.github/workflows/release.yml`. Para lançar uma nova versão com o `.zip` pronto para a pasta `Community`:

```bash
git tag v1.0.0
git push origin v1.0.0
```

O GitHub Actions executará os testes, compilará o pacote `p42-util-airspace-acars` com `manifest.json` e `layout.json` atualizados e publicará automaticamente a **GitHub Release** com o arquivo `p42-util-airspace-acars.zip` anexado.

