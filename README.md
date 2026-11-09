# Airspace ACARS — Parallel 42 Flow Pro (MSFS 2024 / MSFS 2020)

<div align="center">

![Airspace ACARS](assets/Thumbnail.jpg)

**Widget e Integração Oficial do Airspace ACARS para o Parallel 42 Flow Pro no Microsoft Flight Simulator**

[![GitHub Release](https://img.shields.io/github/v/release/GordelaG/p42-util-airspace-acars?color=10b981&label=Release&logo=github)](https://github.com/GordelaG/p42-util-airspace-acars/releases/latest)
[![Tests](https://img.shields.io/badge/tests-19%20passed-10b981.svg)](test/widget.test.mjs)
[![MSFS Compatibility](https://img.shields.io/badge/MSFS-2024%20%7C%202020-0284c7.svg)](#compatibilidade)
[![Flow Compatibility](https://img.shields.io/badge/Flow-Pro-f59e0b.svg)](https://parallel42.com/products/flow)
[![License](https://img.shields.io/badge/license-Proprietary-64748b.svg)](installer/TERMOS-DE-USO.txt)

</div>

---

## 📥 Download e Instalação

### 🚀 Método 1: Instalador Automático Oficial (Recomendado)

A forma mais simples, rápida e segura de instalar o **Airspace ACARS** no seu simulador é através do instalador oficial em formato executável.

1. Acesse a página da [**Última Versão no GitHub Releases**](https://github.com/GordelaG/p42-util-airspace-acars/releases/latest).
2. Na seção **Assets**, clique e faça o download do arquivo:
   ```text
   📦 AirspaceACARS-Setup.exe
   ```
3. Feche o Microsoft Flight Simulator caso ele esteja aberto.
4. Execute o arquivo **`AirspaceACARS-Setup.exe`**.
5. O assistente detectará automaticamente a sua pasta **`Community`** tanto para a versão **Microsoft Store (Xbox App)** quanto para a versão **Steam** do **MSFS 2024** e **MSFS 2020**.
   - *Possui Addon Linker?* O instalador reconhece links simbólicos (junctions) e permite escolher se deseja instalar direto na pasta de addons ou na Community.
6. Clique em **Avançar** e finalize a instalação.
7. Abra o simulador, acione a roda do **Parallel 42 Flow Pro**, entre no modo de edição e adicione o widget **Airspace ACARS**.

> [!TIP]
> O instalador também adiciona o **Airspace ACARS Manager** ao seu Menu Iniciar do Windows para verificar atualizações futuras com apenas um clique!

---

### 📦 Método 2: Instalação Manual via Arquivo ZIP

Caso você prefira instalar manualmente ou utilize gerenciadores externos:

1. Acesse o [**GitHub Releases**](https://github.com/GordelaG/p42-util-airspace-acars/releases/latest) e baixe o arquivo **`p42-util-airspace-acars.zip`**.
2. Extraia o conteúdo e coloque a pasta **`p42-util-airspace-acars`** diretamente dentro da pasta **`Community`** do seu simulador:
   - **MSFS 2024 (MS Store)**: `%LOCALAPPDATA%\Packages\Microsoft.Limitless_8wekyb3d8bbwe\LocalCache\Packages\Community\`
   - **MSFS 2024 (Steam)**: `%APPDATA%\Microsoft Flight Simulator 2024\Packages\Community\`
   - **MSFS 2020 (MS Store)**: `%LOCALAPPDATA%\Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalCache\Packages\Community\`
   - **MSFS 2020 (Steam)**: `%APPDATA%\Microsoft Flight Simulator\Packages\Community\`
3. Inicie o simulador e ative o widget no Flow Pro.

---

## ⚡ Airspace ACARS Manager (`Update.exe`) — Atualizações com 1 Clique

Esqueça a necessidade de baixar e reinstalar arquivos manualmente a cada atualização. O pacote inclui um utilitário exclusivo de gerenciamento:

- **Localização**: `%Community%\p42-util-airspace-acars\Update.exe` (ou pelo atalho *"Airspace ACARS Manager"* no Menu Iniciar).
- **Design Moderno FluxUI**: Interface escura construída sob medida com o logotipo oficial da Airspace e padrão de cores corporativo.
- **Detecção Automática**: Compara a versão instalada no seu simulador com a versão mais recente publicada no GitHub.
- **Atualização Direta no Simulador**: Basta clicar no botão verde **`Update to vX.X.X`** — o utilitário baixa o pacote compactado em segundo plano, extrai os arquivos no local correto e atualiza o simulador em poucos segundos.
- **Desinstalação Segura**: Inclui botão de desinstalação que remove os arquivos do addon caso deseje limpar o ambiente.

---

## ✈️ Funcionalidades em Destaque

### 1. Conexão Multi-VA (Device Code OAuth)
- **Seleção de Companhias Aéreas**: Conecte-se facilmente a qualquer Virtual Airline da rede Airspace.
- **Autenticação Segura sem Digitação de Senha**: Use o fluxo de autenticação por código de dispositivo (Device Code). Basta acessar o link exibido no navegador do seu celular ou PC secundário e autorizar.
- **Armazenamento de Sessão Persistente**: Salva os dados de acesso no datastore interno do Flow Pro, permitindo alternar entre companhias salvas sem precisar reconectar todas as vezes.

### 2. vOCC & Mensagens ACARS em Tempo Real
- **Comunicação Direta com o Despacho**: Envie e receba mensagens do Centro de Controle Operacional Virtual (vOCC) diretamente na cabine.
- **Alertas Flutuantes no Cockpit (Toast)**: Notificações inteligentes que aparecem na tela quando uma mensagem chega enquanto o painel principal está fechado.
- **Resposta Rápida & Confirmação de Leitura**: Responda diretamente do popup ou clique em **WILCO** para dar ciente imediato ao despacho.
- **Watchdog Anti-Travamento**: Arquitetura imune a perdas de foco do simulador, garantindo que o fechamento do popup ou o uso da tecla `ESC` nunca trave os comandos ou joysticks de voo.

### 3. Aeroportos, Briefings & Documentos
- **Busca Rápida por ICAO**: Digite o código de qualquer aeroporto (ex: `SBGR`, `SBRJ`, `SBSP`, `KJFK`, `EGLL`) para carregar briefings operacionais, cartas e manuais.
- **Atalhos Inteligentes da Rota**: Reconhece automaticamente o voo ativo e adiciona botões rápidos para os aeroportos de Origem (`DEP`), Destino (`ARR`) e Alternativa (`ALT`).
- **Aeroporto Mais Próximo via GPS**: Botão dedicado que consulta a latitude e longitude da sua aeronave no MSFS e abre os briefings do aeroporto mais próximo de você.
- **Leitor Integrado**: Visualizador seguro e limpo de documentos com navegação por categorias (`Manuais`, `FDM`, `Load`, `Briefings`).

### 4. Painel de Voo Ativo & Telemetria
- Exibição em tempo real de dados da aeronave, callsign, rota, registro e progresso do voo.
- Monitoramento contínuo de altitude, velocidade, proa, razão de subida/descida e toque na pista (landing rate).
- Barra de progresso dinâmica que reflete cada fase operacional do voo.

### 5. NOTAMs & Meteorologia (METAR)
- **NOTAMs**: Consulta aos avisos oficiais aos aeronavegantes emitidos para a sua rota ou companhia aérea, com excelente contraste visual.
- **METAR em Tempo Real**: Consulta meteorológica instantânea integrada às APIs do simulador e da Airspace.

### 6. Suporte Multilíngue & Temas Visuais
- Suporte nativo completo a 4 idiomas:
  - 🇧🇷 Português (pt-BR)
  - 🇺🇸 Inglês (en)
  - 🇪🇸 Espanhol (es)
  - 🇫🇷 Francês (fr)
- Alternância instantânea entre **Dark Mode** e **White Mode** diretamente na aba de configurações.

---

## 🔍 Integração com a Barra Otto (Flow Pro)

Com a propriedade `can_otto: true`, você pode realizar ações digitando diretamente na barra de comando **Otto** do Flow:

| Comando | Descrição da Ação |
| :--- | :--- |
| `acars` ou `airspace` | Abre o painel principal do Airspace ACARS |
| `doc SBGR` ou `docs SBGR` | Pesquisa e abre os documentos e briefings de `SBGR` |
| `briefing SBRJ` | Filtra especificamente os briefings operacionais de `SBRJ` |
| `vocc` | Exibe as mensagens recentes do vOCC e abre o chat |
| `vocc WILCO` | Envia imediatamente a mensagem "WILCO" para o despacho |
| `notam` | Abre a listagem de NOTAMs ativos |
| `metar SBSP` | Exibe as condições meteorológicas de `SBSP` |

---

## 🛠️ Arquitetura e Estrutura Técnica

```text
p42-util-airspace-acars/
├── .github/workflows/
│   ├── ci.yml                # Validação contínua, linters e testes unitários
│   └── release.yml           # Compilação do Inno Setup (.exe) e do .zip em cada release
├── assets/
│   ├── app.ico               # Ícone oficial multi-resolução para o executável
│   └── Thumbnail.jpg         # Miniatura oficial do pacote para o MSFS 2024
├── installer/
│   ├── TERMOS-DE-USO.txt     # Termos de uso em português
│   └── TERMS-OF-USE.txt      # Termos de uso em inglês
├── scripts/
│   ├── build.mjs             # Empacotador do MSFS (gera manifest.json, layout.json e template JSON)
│   ├── compile-updater.mjs   # Compilador C# (.NET Framework 4.8) para o Update.exe
│   └── generate-ico.mjs      # Utilitário de geração de ícones multi-resolução
├── src/
│   ├── code.js               # Código principal do widget (100% 7-bit ASCII para Coherent GT)
│   ├── code.html             # Estrutura HTML do tablet, abas, briefings e popups
│   └── code.css              # Estilos escopados (.as-acars-*) com suporte a temas
├── test/
│   └── widget.test.mjs       # Suíte completa de testes automatizados (Node.js Test Runner)
├── updater/
│   └── Program.cs            # Código-fonte em C# do Airspace ACARS Manager (Update.exe)
├── installer.iss             # Script de compilação do instalador oficial Inno Setup
└── package.json
```

---

## 🧪 Desenvolvimento e Testes

### Pré-requisitos
- **Node.js 20+**
- Compilador C# nativo do Windows (`csc.exe` do .NET Framework 4.8 incluído no Windows 10 e 11).

### Comandos
```bash
# Executa a suíte de testes unitários e de integração (19 testes)
npm test

# Compila o Update.exe e gera o pacote completo em dist/p42-util-airspace-acars/
npm run build
```

---

## 📄 Termos de Uso e Licença

Este software é fornecido gratuitamente para uso pessoal em simuladores de voo por membros e pilotos de companhias aéreas virtuais parceiras da rede **Airspace / FerrLab**. Para maiores detalhes, consulte o arquivo [TERMOS-DE-USO.txt](installer/TERMOS-DE-USO.txt).

---

<div align="center">
Desenvolvido com excelência para a comunidade de simulação de voo. Bons voos! ✈️
</div>
