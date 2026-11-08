/**
 * Airspace ACARS - Parallel 42 Flow Pro Widget for Microsoft Flight Simulator 2024
 *
 * Features:
 * - Multi-tenant VA Connection via ACARS v2 Device Code OAuth
 * - vOCC & Dispatch ACARS Chat with real-time polling, quick replies & in-sim toast alerts
 * - Airport Briefings & VA Documents Library with search, flight route shortcuts & HTML reader
 * - Active Flight Booking, Pilot Profile & Company NOTAMs
 * - Flow Wheel dynamic state/style/info & Otto Search Bar integration
 */

const __flowContext = typeof this !== "undefined" ? this : null;

(function () {
  const api =
    (__flowContext && __flowContext.$api) ||
    (typeof this !== "undefined" && this && this.$api) ||
    (typeof $api !== "undefined" && $api) ||
    (typeof globalThis !== "undefined" && globalThis.$api) ||
    null;

  // --- Version & Releases ---
  const APP_VERSION = "1.1.1";
  const GITHUB_REPO_OWNER = "GordelaG";
  const GITHUB_REPO_NAME = "p42-util-airspace-acars";
  const REPO_RELEASES_URL = "https://github.com/" + GITHUB_REPO_OWNER + "/" + GITHUB_REPO_NAME + "/releases/latest";
  const GITHUB_API_LATEST_RELEASE = "https://api.github.com/repos/" + GITHUB_REPO_OWNER + "/" + GITHUB_REPO_NAME + "/releases/latest";

  function isNewerVersion(remoteTag, localVersion) {
    if (!remoteTag || !localVersion) return false;
    const parse = function (v) {
      const clean = String(v).replace(/^v/i, "").trim();
      const parts = clean.split(".").map(function (n) { return parseInt(n, 10) || 0; });
      while (parts.length < 3) parts.push(0);
      return parts;
    };
    const r = parse(remoteTag);
    const l = parse(localVersion);
    for (let i = 0; i < 3; i++) {
      if (r[i] > l[i]) return true;
      if (r[i] < l[i]) return false;
    }
    return false;
  }

  // --- Persistent Store ---
  const defaultStore = {
    activeTenant: null, // { id, name, domain, logo_url }
    storedTokens: {},   // { [tenantId]: { token, tenant } }
    myUserId: null,
    seenMessageIds: [],
    vocc_toast_enabled: true,
    auto_confirm_read: true,
    api_base_url: "https://airspace.ferrlab.com",
    language: "en",     // "en" | "pt-br" | "es" | "fr" (Default: English)
    white_mode: false,  // false = Dark Mode (default), true = White Mode / Light Theme
    toast_duration: 15, // seconds (0 to keep visible until clicked)
  };

  let store = Object.assign({}, defaultStore);
  try {
    if (api && api.datastore && typeof api.datastore.import === "function") {
      const imported = api.datastore.import(defaultStore);
      if (imported && typeof imported === "object") {
        store = Object.assign({}, defaultStore, imported);
      }
    }
  } catch (_e) {
    // Ignore datastore import errors on initial load
  }

  function saveStore() {
    try {
      if (api && api.datastore && typeof api.datastore.export === "function") {
        api.datastore.export(store);
      }
    } catch (_e) {
      // Ignore datastore export errors
    }
  }

  // --- Multi-Language i18n Dictionary ---
  const I18N = {
    "pt-br": {
      common: {
        refresh: "Atualizar",
        switch_va: "Trocar VA",
        close: "Fechar",
        reload: "Recarregar",
        send: "Enviar",
        copy: "Copiar",
        copied: "Copiado!",
      },
      header: {
        refresh_title: "Atualizar dados",
        switch_va_title: "Trocar Companhia Aerea (VA)",
        close_title: "Fechar janela",
        lang_title: "Idioma da interface",
      },
      tenants: {
        title: "Selecione sua Companhia Aerea",
        subtitle: "Conecte o Flow (MSFS 2024) diretamente a sua VA no Airspace",
        saved_sessions: "Sessoes Salvas (1-Clique)",
        available_orgs: "Organizacoes Disponiveis",
        search_placeholder: "Buscar companhia aerea por nome ou dominio...",
        loading: "Carregando companhias aereas...",
        empty: "Nenhuma companhia aerea encontrada.",
        btn_reload: "Recarregar Lista de VAs",
        connected_badge: "Conectado",
        saved_badge: "Salva",
      },
      auth: {
        title: "Autorizar Dispositivo",
        connecting_to: "Conectando a {va}",
        connecting_default: "Conectando a VA",
        code_label: "Digite este codigo em /acars/authorize",
        btn_open: "Abrir Pagina de Autorizacao",
        btn_copy: "Copiar Codigo",
        btn_copied: "Codigo Copiado!",
        status_idle: "Gerando codigo de autorizacao...",
        status_waiting: "Aguardando aprovacao no navegador...",
        status_success: "Dispositivo autorizado com sucesso!",
        status_expired: "Codigo expirado. Clique em 'Gerar Novo Codigo'.",
        status_error: "Falha ao solicitar codigo. Tente novamente.",
        btn_retry: "Gerar Novo Codigo",
        btn_back: "Voltar para Lista de VAs",
      },
      tabs: {
        home: "Inicio",
        vocc: "vOCC",
        docs: "Documentos",
        flight: "Voo Ativo",
        flights: "Meus Voos",
        metar: "METAR",
        settings: "Configuracoes",
      },
      tablet: {
        home: "Inicio",
        docs: "Documentos",
        notams: "NOTAMs",
        flight: "Voo Ativo",
        my_flights: "Meus Voos",
        settings: "Configuracoes",
        vocc_sub: "Mensagens & Despacho",
        docs_sub: "Aeroportos & SOPs",
        notams_sub: "Avisos da Companhia",
        flight_sub: "Briefing & Telemetria",
        flights_sub: "Historico & Estatisticas",
        metar_sub: "Meteorologia & Clima",
        settings_sub: "Idioma & Tema",
      },
      notams: {
        title: "NOTAMs da Companhia",
        subtitle: "Avisos e comunicados operacionais aos aeronautas",
        refresh: "Recarregar",
        empty: "Nenhum NOTAM ativo no momento.",
        select_prompt: "Selecione um NOTAM para ler.",
      },
      flights: {
        title: "Meus Voos",
        subtitle: "Historico de voos realizados, estatisticas e auditoria operacional.",
        filter_all: "Todos",
        filter_accepted: "Aprovados",
        filter_pending: "Pendentes",
        search_placeholder: "Buscar por voo, aeroporto, aeronave...",
        total_flights: "Total de Voos",
        total_hours: "Horas de Voo",
        avg_landing: "Media de Pouso",
        total_distance: "Distancia Total",
        avg_score: "Score Medio",
        col_flight: "Voo",
        col_origin: "Origem",
        col_destination: "Destino",
        col_departure: "Partida (UTC)",
        col_aircraft: "Aeronave",
        col_duration: "Duracao",
        col_distance: "Distancia",
        col_landing: "Toque",
        col_score: "Score",
        col_status: "Status",
        col_action: "Acao",
        btn_back: "Voltar",
        touchdown_rate: "Taxa de Toque",
        butter: "Butter",
        good: "Bom",
        firm: "Firme",
        hard: "Duro",
        fuel_burned: "Combustivel Gasto",
        flight_duration: "Duracao do Voo",
        operational_score: "Score Operacional",
        facts_title: "Informacoes da Operacao",
        tab_overview: "Overview",
        tab_landing: "Landing",
        tab_takeoff: "Takeoff",
        tab_telemetry: "Telemetry",
        tab_score: "Score",
        summary_title: "FLIGHT SUMMARY",
        fact_flight: "Numero do Voo",
        fact_flight_number: "Numero do Voo",
        fact_callsign: "Callsign",
        fact_aircraft: "Aeronave",
        fact_registration: "Matricula",
        fact_aircraft_used: "Aeronave Utilizada",
        fact_departure: "Aeroporto de Partida",
        fact_origin: "Origem",
        fact_arrival: "Aeroporto de Chegada",
        fact_destination: "Destino",
        fact_flight_time: "Tempo de Voo",
        fact_dept_time: "Horario de Partida",
        fact_departure_time: "Horario de Partida",
        fact_arr_time: "Horario de Chegada",
        fact_arrival_time: "Horario de Chegada",
        loading: "Carregando voos...",
        empty: "Nenhum voo encontrado.",
        prev_page: "Anterior",
        next_page: "Proxima",
        page_info: "Pagina {page} de {lastPage}",
        status_accepted: "Aprovado",
        status_pending: "Pendente",
        status_rejected: "Rejeitado",
      },
      metar: {
        title: "Meteorologia (METAR)",
        search_placeholder: "Pesquisar ICAO (ex: SBGR, SBRJ, SBKP, KJFK)...",
        btn_search: "Buscar METAR",
        search_result: "Resultado da Pesquisa",
        flight_route_title: "METAR do Voo Ativo (Origem / Destino)",
        origin: "Origem (DEP)",
        destination: "Destino (ARR)",
        alternate: "Alternado (ALT)",
        loading: "Carregando condicoes meteorologicas...",
        no_flight: "Nenhum voo ativo conectado. Pesquise um aeroporto acima.",
        btn_copy: "Copiar",
        copied: "Copiado!",
        wind: "Vento",
        visibility: "Visibilidade",
        clouds: "Nuvens",
        temp: "Temp / PO",
        qnh: "QNH / Altimetro",
        not_found: "METAR nao encontrado para {icao}",
      },
      settings: {
        title: "Configuracoes",
        subtitle: "Personalize idioma, aparencia e alertas do Airspace ACARS",
        language_title: "Idioma da Interface",
        language_sub: "Selecione o idioma de exibicao",
        theme_title: "Modo Claro (White Mode)",
        theme_sub: "Alterne entre o tema escuro padrao e o modo claro",
        switch_enabled: "Ativado",
        switch_disabled: "Desativado",
        toast_title: "Alertas Flutuantes do vOCC",
        toast_sub: "Exibir popup na cabine ao receber mensagens do vOCC",
        toast_duration: "Tempo de Exibicao dos Alertas",
        toast_duration_desc: "Duracao em segundos ate o popup fechar automaticamente (0 = fixo)",
        update_title: "Versao & Atualizacoes",
        update_status_current: "Voce esta utilizando a versao mais recente.",
        btn_check_updates: "Verificar Atualizacoes",
        btn_download_installer: "Baixar Instalador",
        account_title: "Sessao & Companhia Aerea",
        account_desc: "Conectado como piloto. Clique para trocar de VA ou encerrar a sessao.",
        btn_logout: "Trocar VA / Logout",
        connected_as: "Conectado como {pilot} na {va}.",
        connected_va: "Conectado a {va}. Clique para trocar de companhia ou sair.",
      },
      vocc: {
        channel_active: "Canal ACARS / vOCC Dispatch Ativo",
        messages_count: "{count} mensagens",
        single_message: "1 mensagem",
        no_messages: "Nenhuma mensagem do vOCC ou Dispatch recebida ainda.",
        quick_replies: "Respostas Rapidas:",
        input_placeholder: "Enviar mensagem para o vOCC / Dispatch (ex: REQUESTING PUSHBACK)...",
        btn_send: "Enviar",
      },
      docs: {
        shortcuts_label: "Atalhos de Aeroporto:",
        quick_icao: "Pesquisa rapida ICAO",
        btn_nearest: "Aeroporto Proximo (Sim)",
        search_placeholder: "Pesquisar ICAO (ex: SBGR, SBRJ), briefing de aeroporto, SOP ou manual...",
        clear_search: "Limpar pesquisa",
        cat_all: "Todos",
        cat_airports: "Aeroportos",
        cat_manuals: "Manuais & SOPs",
        cat_fdm: "FDM",
        cat_load: "Carga",
        count_label: "Documentos ({count})",
        loading: "Carregando documentos...",
        empty_list: "Nenhum documento encontrado para esta busca.",
        select_prompt: "Selecione um documento",
        btn_parent_folder: "Pasta Acima",
        btn_open_pdf: "Abrir PDF / Externo",
        empty_body: "Selecione um briefing de aeroporto ou manual na lista ao lado, ou digite o codigo ICAO na barra Otto do Flow (ex: doc SBGR).",
        empty_folder: "Esta pasta esta vazia.",
        no_content: "Nenhum conteudo disponivel para este documento.",
      },
      flight: {
        title: "Meu Voo (ACARS)",
        subtitle: "Da preparacao ao toque, acompanhe seu voo em tempo real.",
        departure: "PARTIDA",
        arrival: "CHEGADA",
        elapsed: "DECORRIDO",
        remaining: "RESTANTE",
        duration: "Duracao Est.",
        btn_start: "Iniciar Voo",
        btn_finish: "Finalizar Voo (PIREP)",
        btn_cancel: "Cancelar",
        checklist_title: "Antes da Partida",
        check_sim: "Simulador conectado",
        check_booking: "Reserva ativa",
        check_ground: "Aeronave no solo",
        check_stationary: "Aeronave parada",
        telemetry_alt: "Altitude",
        telemetry_gs: "Velocidade Solo (GS)",
        telemetry_vs: "Velocidade Vertical (VS)",
        telemetry_hdg: "Proa (Heading)",
        telemetry_fuel: "Combustivel Restante",
        map_title: "Mapa da Rota & Posicao ao Vivo",
        cabin_audio: "Audio da Cabine (Cabin Audio)",
        cabin_audio_sub: "Volume dos avisos aos passageiros e tripulacao",
        start_recording: "Gravar Telemetria",
        stop_recording: "Parar Gravacao",
        export_csv: "Exportar CSV",
        booking_title: "Reserva Ativa (Booking)",
        no_booking: "Nenhuma reserva ativa no momento.",
        pilot_title: "Tripulante Conectado",
        loading_pilot: "Carregando dados do piloto...",
        notams_title: "NOTAMs Ativos da Companhia",
        no_notams: "Nenhum NOTAM ativo.",
        select_notam: "Selecione um NOTAM para ler.",
      },
      toast: {
        header: "vOCC DISPATCH",
        open: "Abrir no vOCC",
        dismiss: "Marcar Lida",
        close_title: "Dispensar",
        reply_placeholder: "Responder ao despacho...",
        send_title: "Enviar resposta",
      },
      update: {
        time_now: "agora",
        badge_new: "NOVO",
        banner_title: "Nova versao disponivel:",
        banner_hint: "Feche o simulador antes de executar o instalador.",
        btn_download: "Baixar Atualizador",
        btn_dismiss: "Fechar aviso",
        status_current: "Voce esta utilizando a versao mais recente.",
        status_available: "Nova versao {version} disponivel! Feche o simulador para atualizar.",
        status_checking: "Verificando atualizacoes...",
        status_error: "Nao foi possivel verificar atualizacoes.",
      },
    },
    en: {
      common: {
        refresh: "Refresh",
        switch_va: "Switch VA",
        close: "Close",
        reload: "Reload",
        send: "Send",
        copy: "Copy",
        copied: "Copied!",
      },
      header: {
        refresh_title: "Refresh data",
        switch_va_title: "Switch Virtual Airline (VA)",
        close_title: "Close window",
        lang_title: "Interface language",
      },
      tenants: {
        title: "Select your Virtual Airline",
        subtitle: "Connect Flow (MSFS 2024) directly to your VA on Airspace",
        saved_sessions: "Saved Sessions (1-Click)",
        available_orgs: "Available Organizations",
        search_placeholder: "Search virtual airline by name or domain...",
        loading: "Loading virtual airlines...",
        empty: "No virtual airlines found.",
        btn_reload: "Reload VA List",
        connected_badge: "Connected",
        saved_badge: "Saved",
      },
      auth: {
        title: "Authorize Device",
        connecting_to: "Connecting to {va}",
        connecting_default: "Connecting to VA",
        code_label: "Enter this code at /acars/authorize",
        btn_open: "Open Authorization Page",
        btn_copy: "Copy Code",
        btn_copied: "Code Copied!",
        status_idle: "Generating authorization code...",
        status_waiting: "Waiting for browser approval...",
        status_success: "Device authorized successfully!",
        status_expired: "Code expired. Click 'Generate New Code'.",
        status_error: "Failed to request code. Please retry.",
        btn_retry: "Generate New Code",
        btn_back: "Back to VA List",
      },
      tabs: {
        home: "Home",
        vocc: "vOCC",
        docs: "Documents",
        flight: "Active Flight",
        flights: "My Flights",
        metar: "METAR",
        settings: "Settings",
      },
      tablet: {
        home: "Home",
        docs: "Documents",
        flight: "Active Flight",
        my_flights: "My Flights",
        settings: "Settings",
        vocc_sub: "Messages & Dispatch",
        docs_sub: "Airports & SOPs",
        flight_sub: "Briefing & NOTAMs",
        flights_sub: "History & Statistics",
        metar_sub: "Weather & METAR",
        settings_sub: "Language & Theme",
      },
      flights: {
        title: "My Flights",
        subtitle: "Completed flights history, statistics, and operational audit.",
        filter_all: "All",
        filter_accepted: "Accepted",
        filter_pending: "Pending",
        search_placeholder: "Search by flight, airport, aircraft...",
        total_flights: "Total Flights",
        total_hours: "Flight Hours",
        avg_landing: "Avg Landing Rate",
        total_distance: "Total Distance",
        avg_score: "Avg Score",
        col_flight: "Flight",
        col_origin: "Origin",
        col_destination: "Destination",
        col_departure: "Departure (UTC)",
        col_aircraft: "Aircraft",
        col_duration: "Duration",
        col_distance: "Distance",
        col_landing: "Touchdown",
        col_score: "Score",
        col_status: "Status",
        col_action: "Action",
        btn_back: "Back",
        touchdown_rate: "Touchdown Rate",
        butter: "Butter",
        good: "Good",
        firm: "Firm",
        hard: "Hard",
        fuel_burned: "Fuel Burned",
        flight_duration: "Flight Duration",
        operational_score: "Operational Score",
        facts_title: "Flight Operation Details",
        tab_overview: "Overview",
        tab_landing: "Landing",
        tab_takeoff: "Takeoff",
        tab_telemetry: "Telemetry",
        tab_score: "Score",
        summary_title: "FLIGHT SUMMARY",
        fact_flight: "Flight Number",
        fact_flight_number: "Flight Number",
        fact_callsign: "Callsign",
        fact_aircraft: "Aircraft",
        fact_registration: "Registration",
        fact_aircraft_used: "Aircraft Used",
        fact_departure: "Departure Airport",
        fact_origin: "Origin",
        fact_arrival: "Arrival Airport",
        fact_destination: "Destination",
        fact_flight_time: "Flight Time",
        fact_dept_time: "Departure Time",
        fact_departure_time: "Departure Time",
        fact_arr_time: "Arrival Time",
        fact_arrival_time: "Arrival Time",
        loading: "Loading flights...",
        empty: "No flights found.",
        prev_page: "Previous",
        next_page: "Next",
        page_info: "Page {page} of {lastPage}",
        status_accepted: "Accepted",
        status_pending: "Pending",
        status_rejected: "Rejected",
      },
      metar: {
        title: "Weather (METAR)",
        search_placeholder: "Search ICAO (e.g. SBGR, SBRJ, KJFK)...",
        btn_search: "Search METAR",
        search_result: "Search Result",
        flight_route_title: "Active Flight METAR (Origin / Destination)",
        origin: "Origin (DEP)",
        destination: "Destination (ARR)",
        alternate: "Alternate (ALT)",
        loading: "Loading weather conditions...",
        no_flight: "No active flight connected. Search for an airport above.",
        btn_copy: "Copy",
        copied: "Copied!",
        wind: "Wind",
        visibility: "Visibility",
        clouds: "Clouds",
        temp: "Temp / Dew",
        qnh: "Altimeter / QNH",
        not_found: "METAR not found for {icao}",
      },
      settings: {
        title: "Settings",
        subtitle: "Customize language, appearance, and alerts for Airspace ACARS",
        language_title: "Interface Language",
        language_sub: "Select your preferred display language",
        theme_title: "Light Theme (White Mode)",
        theme_sub: "Toggle between standard dark mode and light theme",
        switch_enabled: "Enabled",
        switch_disabled: "Disabled",
        toast_title: "vOCC Floating Alerts",
        toast_sub: "Show in-cockpit popup alerts when receiving vOCC messages",
        toast_duration: "Alert Display Duration",
        toast_duration_desc: "Duration in seconds before popup auto-closes (0 = fixed)",
        update_title: "Version & Updates",
        update_status_current: "You are running the latest version.",
        btn_check_updates: "Check for Updates",
        btn_download_installer: "Download Installer",
        account_title: "Session & Virtual Airline",
        account_desc: "Connected as pilot. Click to switch airline or log out.",
        btn_logout: "Switch VA / Logout",
        connected_as: "Connected as {pilot} at {va}.",
        connected_va: "Connected to {va}. Click to switch airline or log out.",
      },
      vocc: {
        channel_active: "ACARS / vOCC Dispatch Channel Active",
        messages_count: "{count} messages",
        single_message: "1 message",
        no_messages: "No vOCC or Dispatch messages received yet.",
        quick_replies: "Quick Replies:",
        input_placeholder: "Send message to vOCC / Dispatch (e.g.: REQUESTING PUSHBACK)...",
        btn_send: "Send",
      },
      docs: {
        shortcuts_label: "Airport Shortcuts:",
        quick_icao: "Quick ICAO search",
        btn_nearest: "Nearest Airport (Sim)",
        search_placeholder: "Search ICAO (e.g.: SBGR, KJFK), airport briefing, SOP or manual...",
        clear_search: "Clear search",
        cat_all: "All",
        cat_airports: "Airports",
        cat_manuals: "Manuals & SOPs",
        cat_fdm: "FDM",
        cat_load: "Cargo",
        count_label: "Documents ({count})",
        loading: "Loading documents...",
        empty_list: "No documents found for this search.",
        select_prompt: "Select a document",
        btn_parent_folder: "Parent Folder",
        btn_open_pdf: "Open PDF / External",
        empty_body: "Select an airport briefing or manual from the list on the left, or type the ICAO code into Flow Otto (e.g.: doc KJFK).",
        empty_folder: "This folder is empty.",
        no_content: "No content available for this document.",
      },
      flight: {
        title: "Your flight",
        subtitle: "From preparation to touchdown, follow your flight here.",
        departure: "DEPARTURE",
        arrival: "ARRIVAL",
        elapsed: "ELAPSED",
        remaining: "REMAINING",
        duration: "Est. Duration",
        btn_start: "Start Flight",
        btn_finish: "Finish Flight (PIREP)",
        btn_cancel: "Cancel",
        checklist_title: "Before departure",
        check_sim: "Simulator connected",
        check_booking: "Active booking",
        check_ground: "Aircraft on the ground",
        check_stationary: "Aircraft stationary",
        telemetry_alt: "Altitude",
        telemetry_gs: "Ground Speed (GS)",
        telemetry_vs: "Vertical Speed (VS)",
        telemetry_hdg: "Heading",
        telemetry_fuel: "Fuel Remaining",
        map_title: "Route Map & Live Position",
        cabin_audio: "Cabin Audio",
        cabin_audio_sub: "Adjust passenger and crew announcement volume",
        start_recording: "Start Recording",
        stop_recording: "Stop Recording",
        export_csv: "Export CSV",
        booking_title: "Active Booking",
        no_booking: "No active booking found at the moment.",
        pilot_title: "Connected Crew Member",
        loading_pilot: "Loading pilot data...",
        notams_title: "Active Company NOTAMs",
        no_notams: "No active NOTAMs.",
        select_notam: "Select a NOTAM to read.",
      },
      toast: {
        header: "vOCC DISPATCH",
        open: "Open in vOCC",
        dismiss: "Mark Read",
        close_title: "Dismiss",
        reply_placeholder: "Reply to dispatch...",
        send_title: "Send reply",
      },
      update: {
        time_now: "now",
        badge_new: "NEW",
        banner_title: "New version available:",
        banner_hint: "Close the simulator before running the installer.",
        btn_download: "Download Installer",
        btn_dismiss: "Dismiss notification",
        status_current: "You are running the latest version.",
        status_available: "New version {version} available! Close simulator to update.",
        status_checking: "Checking for updates...",
        status_error: "Unable to check for updates.",
      },
    },
    es: {
      common: {
        refresh: "Actualizar",
        switch_va: "Cambiar VA",
        close: "Cerrar",
        reload: "Recargar",
        send: "Enviar",
        copy: "Copiar",
        copied: "Copiado!",
      },
      header: {
        refresh_title: "Actualizar datos",
        switch_va_title: "Cambiar Aerolinea Virtual (VA)",
        close_title: "Cerrar ventana",
        lang_title: "Idioma de la interfaz",
      },
      tenants: {
        title: "Seleccione su Aerolinea Virtual",
        subtitle: "Conecte Flow (MSFS 2024) directamente a su VA en Airspace",
        saved_sessions: "Sesiones Guardadas (1-Clic)",
        available_orgs: "Organizaciones Disponibles",
        search_placeholder: "Buscar aerolinea por nombre o dominio...",
        loading: "Cargando aerolineas virtuales...",
        empty: "No se encontraron aerolineas virtuales.",
        btn_reload: "Recargar Lista de VAs",
        connected_badge: "Conectado",
        saved_badge: "Guardada",
      },
      auth: {
        title: "Autorizar Dispositivo",
        connecting_to: "Conectando a {va}",
        connecting_default: "Conectando a la VA",
        code_label: "Ingrese este codigo en /acars/authorize",
        btn_open: "Abrir Pagina de Autorizacion",
        btn_copy: "Copiar Codigo",
        btn_copied: "Codigo Copiado!",
        status_idle: "Generando codigo de autorizacion...",
        status_waiting: "Esperando aprobacion en el navegador...",
        status_success: "Dispositivo autorizado con exito!",
        status_expired: "Codigo expirado. Haga clic en 'Generar Nuevo Codigo'.",
        status_error: "Fallo al solicitar codigo. Intente nuevamente.",
        btn_retry: "Generar Nuevo Codigo",
        btn_back: "Volver a la Lista de VAs",
      },
      tabs: {
        home: "Inicio",
        vocc: "vOCC",
        docs: "Documentos",
        flight: "Vuelo Activo",
        flights: "Mis Vuelos",
        metar: "METAR",
        settings: "Configuracion",
      },
      tablet: {
        home: "Inicio",
        docs: "Documentos",
        flight: "Vuelo Activo",
        my_flights: "Mis Vuelos",
        settings: "Configuracion",
        vocc_sub: "Mensajes y Despacho",
        docs_sub: "Aeropuertos y SOPs",
        flight_sub: "Briefing y NOTAMs",
        flights_sub: "Historial y Estadisticas",
        metar_sub: "Meteorologia y Clima",
        settings_sub: "Idioma y Tema",
      },
      flights: {
        title: "Mis Vuelos",
        subtitle: "Historial de vuelos completados, estadisticas y auditoria operativa.",
        filter_all: "Todos",
        filter_accepted: "Aceptados",
        filter_pending: "Pendientes",
        search_placeholder: "Buscar por vuelo, aeropuerto, aeronave...",
        total_flights: "Total de Vuelos",
        total_hours: "Horas de Vuelo",
        avg_landing: "Media de Aterrizaje",
        total_distance: "Distancia Total",
        avg_score: "Score Medio",
        col_flight: "Vuelo",
        col_origin: "Origen",
        col_destination: "Destino",
        col_departure: "Salida (UTC)",
        col_aircraft: "Aeronave",
        col_duration: "Duracion",
        col_distance: "Distancia",
        col_landing: "Contacto",
        col_score: "Score",
        col_status: "Estado",
        col_action: "Accion",
        btn_back: "Volver",
        touchdown_rate: "Tasa de Contacto",
        butter: "Butter",
        good: "Bueno",
        firm: "Firme",
        hard: "Duro",
        fuel_burned: "Combustible Usado",
        flight_duration: "Duracion del Vuelo",
        operational_score: "Score Operativo",
        facts_title: "Informacion del Vuelo",
        fact_flight: "Numero de Vuelo",
        fact_callsign: "Callsign",
        fact_aircraft: "Aeronave",
        fact_departure: "Aeropuerto de Salida",
        fact_arrival: "Aeropuerto de Llegada",
        fact_dept_time: "Hora de Salida",
        fact_arr_time: "Hora de Llegada",
        loading: "Cargando vuelos...",
        empty: "No se encontraron vuelos.",
        prev_page: "Anterior",
        next_page: "Siguiente",
        page_info: "Pagina {page} de {lastPage}",
        status_accepted: "Aceptado",
        status_pending: "Pendiente",
        status_rejected: "Rechazado",
      },
      metar: {
        title: "Meteorologia (METAR)",
        search_placeholder: "Buscar ICAO (ej: SBGR, LEMD, KJFK)...",
        btn_search: "Buscar METAR",
        search_result: "Resultado de la Busqueda",
        flight_route_title: "METAR del Vuelo Activo (Origen / Destino)",
        origin: "Origen (DEP)",
        destination: "Destino (ARR)",
        alternate: "Alternativo (ALT)",
        loading: "Cargando condiciones meteorologicas...",
        no_flight: "Ningun vuelo activo conectado. Busque un aeropuerto arriba.",
        btn_copy: "Copiar",
        copied: "Copiado!",
        wind: "Viento",
        visibility: "Visibilidad",
        clouds: "Nubes",
        temp: "Temp / PR",
        qnh: "QNH / Altimetro",
        not_found: "METAR no encontrado para {icao}",
      },
      settings: {
        title: "Configuracion",
        subtitle: "Personalice idioma, apariencia y alertas de Airspace ACARS",
        language_title: "Idioma de la Interfaz",
        language_sub: "Seleccione el idioma de visualizacion",
        theme_title: "Modo Claro (White Mode)",
        theme_sub: "Alternar entre tema oscuro estandar y modo claro",
        switch_enabled: "Activado",
        switch_disabled: "Desactivado",
        toast_title: "Alertas Flotantes del vOCC",
        toast_sub: "Mostrar avisos en cabina al recibir mensajes de vOCC",
        toast_duration: "Tiempo de Visualizacion",
        toast_duration_desc: "Duracion en segundos hasta cerrar automaticamente (0 = fijo)",
        update_title: "Version & Actualizaciones",
        update_status_current: "Esta utilizando la version mas reciente.",
        btn_check_updates: "Buscar Actualizaciones",
        btn_download_installer: "Descargar Instalador",
        account_title: "Sesion y Aerolinea Virtual",
        account_desc: "Conectado como piloto. Haga clic para cambiar de aerolinea o cerrar sesion.",
        btn_logout: "Cambiar VA / Desconectar",
        connected_as: "Conectado como {pilot} en {va}.",
        connected_va: "Conectado a {va}. Haga clic para cambiar de aerolinea o cerrar sesion.",
      },
      vocc: {
        channel_active: "Canal ACARS / vOCC Dispatch Activo",
        messages_count: "{count} mensajes",
        single_message: "1 mensaje",
        no_messages: "Aun no hay mensajes de vOCC o Despacho recibidos.",
        quick_replies: "Respuestas Rapidas:",
        input_placeholder: "Enviar mensaje al vOCC / Despacho (ej: REQUESTING PUSHBACK)...",
        btn_send: "Enviar",
      },
      docs: {
        shortcuts_label: "Accesos de Aeropuerto:",
        quick_icao: "Busqueda rapida ICAO",
        btn_nearest: "Aeropuerto Cercano (Sim)",
        search_placeholder: "Buscar ICAO (ej: SBGR, LEMD), briefing de aeropuerto, SOP o manual...",
        clear_search: "Limpiar busqueda",
        cat_all: "Todos",
        cat_airports: "Aeropuertos",
        cat_manuals: "Manuales & SOPs",
        cat_fdm: "FDM",
        cat_load: "Carga",
        count_label: "Documentos ({count})",
        loading: "Cargando documentos...",
        empty_list: "No se encontraron documentos para esta busqueda.",
        select_prompt: "Seleccione un documento",
        btn_parent_folder: "Carpeta Superior",
        btn_open_pdf: "Abrir PDF / Externo",
        empty_body: "Seleccione un briefing de aeropuerto o manual en la lista de la izquierda, o escriba el codigo ICAO en la barra Otto de Flow (ej: doc LEMD).",
        empty_folder: "Esta carpeta esta vacia.",
        no_content: "No hay contenido disponible para este documento.",
      },
      flight: {
        title: "Mi Vuelo (ACARS)",
        subtitle: "De la preparacion al aterrizaje, siga su vuelo en tiempo real.",
        departure: "SALIDA",
        arrival: "LLEGADA",
        elapsed: "TRANSCURRIDO",
        remaining: "RESTANTE",
        duration: "Duracion Est.",
        btn_start: "Iniciar Vuelo",
        btn_finish: "Finalizar Vuelo (PIREP)",
        btn_cancel: "Cancelar",
        checklist_title: "Antes de la Salida",
        check_sim: "Simulador conectado",
        check_booking: "Reserva activa",
        check_ground: "Aeronave en tierra",
        check_stationary: "Aeronave parada",
        telemetry_alt: "Altitud",
        telemetry_gs: "Velocidad Tierra (GS)",
        telemetry_vs: "Velocidad Vertical (VS)",
        telemetry_hdg: "Rumbo (Heading)",
        telemetry_fuel: "Combustible Restante",
        map_title: "Mapa de Ruta & Posicion en Vivo",
        cabin_audio: "Audio de Cabina (Cabin Audio)",
        cabin_audio_sub: "Ajustar volumen de anuncios a pasajeros",
        start_recording: "Grabar Telemetria",
        stop_recording: "Detener Grabacion",
        export_csv: "Exportar CSV",
        booking_title: "Reserva Activa (Booking)",
        no_booking: "No se encontro ninguna reserva activa.",
        pilot_title: "Tripulante Conectado",
        loading_pilot: "Cargando datos del piloto...",
        notams_title: "NOTAMs Activos de la Compania",
        no_notams: "Ningun NOTAM activo.",
        select_notam: "Seleccione un NOTAM para leer.",
      },
      toast: {
        header: "vOCC DESPACHO",
        open: "Abrir en vOCC",
        dismiss: "Marcar Leido",
        close_title: "Descartar",
        reply_placeholder: "Responder al despacho...",
        send_title: "Enviar respuesta",
      },
      update: {
        time_now: "ahora",
        badge_new: "NUEVO",
        banner_title: "Nueva version disponible:",
        banner_hint: "Cierre el simulador antes de ejecutar el instalador.",
        btn_download: "Descargar Instalador",
        btn_dismiss: "Cerrar aviso",
        status_current: "Esta utilizando la version mas reciente.",
        status_available: "Nueva version {version} disponible! Cierre el simulador para actualizar.",
        status_checking: "Buscando actualizaciones...",
        status_error: "No se pudieron buscar actualizaciones.",
      },
    },
    fr: {
      common: {
        refresh: "Actualiser",
        switch_va: "Changer de VA",
        close: "Fermer",
        reload: "Recharger",
        send: "Envoyer",
        copy: "Copier",
        copied: "Copie !",
      },
      header: {
        refresh_title: "Actualiser les donnees",
        switch_va_title: "Changer de Compagnie Aerienne (VA)",
        close_title: "Fermer la fenetre",
        lang_title: "Langue de l'interface",
      },
      tenants: {
        title: "Selectionnez votre Compagnie Aerienne",
        subtitle: "Connectez Flow (MSFS 2024) directement a votre VA sur Airspace",
        saved_sessions: "Sessions Enregistrees (1-Clic)",
        available_orgs: "Organisations Disponibles",
        search_placeholder: "Rechercher une compagnie par nom ou domaine...",
        loading: "Chargement des compagnies aeriennes...",
        empty: "Aucune compagnie aerienne trouvee.",
        btn_reload: "Recharger la liste des VAs",
        connected_badge: "Connecte",
        saved_badge: "Enregistree",
      },
      auth: {
        title: "Autoriser l'appareil",
        connecting_to: "Connexion a {va}",
        connecting_default: "Connexion a la VA",
        code_label: "Entrez ce code sur /acars/authorize",
        btn_open: "Ouvrir la page d'autorisation",
        btn_copy: "Copier le code",
        btn_copied: "Code Copie !",
        status_idle: "Generation du code d'autorisation...",
        status_waiting: "En attente d'approbation dans le navigateur...",
        status_success: "Appareil autorise avec succes !",
        status_expired: "Code expire. Cliquez sur 'Generer un nouveau code'.",
        status_error: "Echec de la demande de code. Veuillez reessayer.",
        btn_retry: "Generer un nouveau code",
        btn_back: "Retour a la liste des VAs",
      },
      tabs: {
        home: "Accueil",
        vocc: "vOCC",
        docs: "Documents",
        flight: "Vol Actif",
        flights: "Mes Vols",
        metar: "METAR",
        settings: "Parametres",
      },
      tablet: {
        home: "Accueil",
        docs: "Documents",
        flight: "Vol Actif",
        my_flights: "Mes Vols",
        settings: "Parametres",
        vocc_sub: "Messages & Dispatch",
        docs_sub: "Aeroports & SOPs",
        flight_sub: "Briefing & NOTAMs",
        flights_sub: "Historique & Statistiques",
        metar_sub: "Meteo & METAR",
        settings_sub: "Langue & Theme",
      },
      flights: {
        title: "Mes Vols",
        subtitle: "Historique des vols effectues, statistiques et audit operationnel.",
        filter_all: "Tous",
        filter_accepted: "Acceptes",
        filter_pending: "En attente",
        search_placeholder: "Rechercher par vol, aeroport, appareil...",
        total_flights: "Total des Vols",
        total_hours: "Heures de Vol",
        avg_landing: "Toucher Moyen",
        total_distance: "Distance Totale",
        avg_score: "Score Moyen",
        col_flight: "Vol",
        col_origin: "Origine",
        col_destination: "Destination",
        col_departure: "Depart (UTC)",
        col_aircraft: "Appareil",
        col_duration: "Duree",
        col_distance: "Distance",
        col_landing: "Toucher",
        col_score: "Score",
        col_status: "Statut",
        col_action: "Action",
        btn_back: "Retour",
        touchdown_rate: "Taux de Toucher",
        butter: "Butter",
        good: "Bon",
        firm: "Ferme",
        hard: "Dur",
        fuel_burned: "Carburant Consomme",
        flight_duration: "Duree du Vol",
        operational_score: "Score Operationnel",
        facts_title: "Details de l'Operation",
        fact_flight: "Numero de Vol",
        fact_callsign: "Callsign",
        fact_aircraft: "Appareil",
        fact_departure: "Aeroport de Depart",
        fact_arrival: "Aeroport d'Arrivee",
        fact_dept_time: "Heure de Depart",
        fact_arr_time: "Heure d'Arrivee",
        loading: "Chargement des vols...",
        empty: "Aucun vol trouve.",
        prev_page: "Precedent",
        next_page: "Suivant",
        page_info: "Page {page} sur {lastPage}",
        status_accepted: "Accepte",
        status_pending: "En attente",
        status_rejected: "Rejete",
      },
      metar: {
        title: "Meteorologie (METAR)",
        search_placeholder: "Rechercher ICAO (ex : SBGR, LFPG, KJFK)...",
        btn_search: "Chercher METAR",
        search_result: "Resultat de la recherche",
        flight_route_title: "METAR du Vol Actif (Origine / Destination)",
        origin: "Origine (DEP)",
        destination: "Destination (ARR)",
        alternate: "Degagement (ALT)",
        loading: "Chargement des conditions meteorologiques...",
        no_flight: "Aucun vol actif connecte. Recherchez un aeroport ci-dessus.",
        btn_copy: "Copier",
        copied: "Copie !",
        wind: "Vent",
        visibility: "Visibilite",
        clouds: "Nuages",
        temp: "Temp / PtR",
        qnh: "QNH / Altimetre",
        not_found: "METAR non trouve pour {icao}",
      },
      settings: {
        title: "Parametres",
        subtitle: "Personnalisez la langue, l'apparence et les alertes d'Airspace ACARS",
        language_title: "Langue de l'Interface",
        language_sub: "Selectionnez la langue d'affichage",
        theme_title: "Mode Clair (White Mode)",
        theme_sub: "Basculer entre le theme sombre standard et le mode clair",
        switch_enabled: "Active",
        switch_disabled: "Desactive",
        toast_title: "Alertas Flottantes du vOCC",
        toast_sub: "Afficher des popups dans le cockpit lors de messages vOCC",
        toast_duration: "Duree d'Affichage des Alertes",
        toast_duration_desc: "Duree en secondes avant fermeture automatique (0 = fixe)",
        update_title: "Version & Mises a jour",
        update_status_current: "Vous utilisez la version la plus recente.",
        btn_check_updates: "Verifier les Mises a jour",
        btn_download_installer: "Telecharger l'Installeur",
        account_title: "Session et Compagnie Virtuelle",
        account_desc: "Connecte en tant que pilote. Cliquez pour changer de compagnie ou vous deconnecter.",
        btn_logout: "Changer de VA / Deconnexion",
        connected_as: "Connecte en tant que {pilot} chez {va}.",
        connected_va: "Connecte a {va}. Cliquez pour changer de compagnie ou vous deconnecter.",
      },
      vocc: {
        channel_active: "Canal ACARS / vOCC Dispatch Actif",
        messages_count: "{count} messages",
        single_message: "1 message",
        no_messages: "Aucun message du vOCC ou Dispatch recu pour le moment.",
        quick_replies: "Reponses Rapides :",
        input_placeholder: "Envoyer un message au vOCC / Dispatch (ex : REQUESTING PUSHBACK)...",
        btn_send: "Envoyer",
      },
      docs: {
        shortcuts_label: "Raccourcis Aeroport :",
        quick_icao: "Recherche rapide ICAO",
        btn_nearest: "Aeroport le plus proche (Sim)",
        search_placeholder: "Rechercher ICAO (ex : SBGR, LFPG), briefing d'aeroport, SOP ou manuel...",
        clear_search: "Effacer la recherche",
        cat_all: "Tous",
        cat_airports: "Aeroports",
        cat_manuals: "Manuels & SOPs",
        cat_fdm: "FDM",
        cat_load: "Cargo",
        count_label: "Documents ({count})",
        loading: "Chargement des documents...",
        empty_list: "Aucun document trouve pour cette recherche.",
        select_prompt: "Selectionnez un document",
        btn_parent_folder: "Dossier Parent",
        btn_open_pdf: "Ouvrir PDF / Externe",
        empty_body: "Selectionnez un briefing d'aeroport ou un manuel dans la liste de gauche, ou tapez le code ICAO dans la barre Otto de Flow (ex : doc LFPG).",
        empty_folder: "Ce dossier est vide.",
        no_content: "Aucun contenu disponible pour ce document.",
      },
      flight: {
        title: "Votre Vol (ACARS)",
        subtitle: "De la preparation a l'atterrissage, suivez votre vol en temps reel.",
        departure: "DEPART",
        arrival: "ARRIVEE",
        elapsed: "ECOULE",
        remaining: "RESTANT",
        duration: "Duree Est.",
        btn_start: "Demarrer le Vol",
        btn_finish: "Terminer le Vol (PIREP)",
        btn_cancel: "Annuler",
        checklist_title: "Avant le Depart",
        check_sim: "Simulateur connecte",
        check_booking: "Reservation active",
        check_ground: "Appareil au sol",
        check_stationary: "Appareil a l'arret",
        telemetry_alt: "Altitude",
        telemetry_gs: "Vitesse Sol (GS)",
        telemetry_vs: "Vitesse Verticale (VS)",
        telemetry_hdg: "Cap (Heading)",
        telemetry_fuel: "Carburant Restant",
        map_title: "Carte de la Route & Position en Direct",
        cabin_audio: "Audio Cabine (Cabin Audio)",
        cabin_audio_sub: "Ajuster le volume des annonces passagers",
        start_recording: "Enregistrer Telemetrie",
        stop_recording: "Arreter Enregistrement",
        export_csv: "Exporter CSV",
        booking_title: "Reservation Active (Booking)",
        no_booking: "Aucune reservation active trouvee pour le moment.",
        pilot_title: "Membre d'Equipage Connecte",
        loading_pilot: "Chargement des donnees du pilote...",
        notams_title: "NOTAMs Actifs de la Compagnie",
        no_notams: "Aucun NOTAM actif.",
        select_notam: "Selectionnez un NOTAM pour lire.",
      },
      toast: {
        header: "vOCC DISPATCH",
        open: "Ouvrir dans vOCC",
        dismiss: "Marquer comme Lu",
        close_title: "Ignorer",
        reply_placeholder: "Repondre a la regulation...",
        send_title: "Envoyer reponse",
      },
      update: {
        time_now: "maintenant",
        badge_new: "NOUVEAU",
        banner_title: "Nouvelle version disponible :",
        banner_hint: "Fermez le simulateur avant de lancer l'installeur.",
        btn_download: "Telecharger l'Installeur",
        btn_dismiss: "Fermer l'avis",
        status_current: "Vous utilisez la version la plus recente.",
        status_available: "Nouvelle version {version} disponible ! Fermez le simulateur pour mettre a jour.",
        status_checking: "Verification des mises a jour...",
        status_error: "Impossible de verifier les mises a jour.",
      },
    },
  };

  function getLanguage() {
    const l = String(store.language || "pt-br").toLowerCase().trim();
    if (I18N[l]) return l;
    if (l.startsWith("pt")) return "pt-br";
    if (l.startsWith("es")) return "es";
    if (l.startsWith("fr")) return "fr";
    if (l.startsWith("en")) return "en";
    return "pt-br";
  }

  function t(key, params) {
    const lang = getLanguage();
    const dict = I18N[lang] || I18N["pt-br"];
    const fallback = I18N["pt-br"];

    const parts = key.split(".");
    let val = dict;
    for (let i = 0; i < parts.length; i++) {
      if (val && typeof val === "object" && parts[i] in val) {
        val = val[parts[i]];
      } else {
        val = null;
        break;
      }
    }
    if (typeof val !== "string") {
      let fb = fallback;
      for (let i = 0; i < parts.length; i++) {
        if (fb && typeof fb === "object" && parts[i] in fb) {
          fb = fb[parts[i]];
        } else {
          fb = null;
          break;
        }
      }
      val = typeof fb === "string" ? fb : key;
    }

    if (params && typeof params === "object") {
      for (const k of Object.keys(params)) {
        val = val.replace(new RegExp("\\{" + k + "\\}", "g"), String(params[k]));
      }
    }
    return val;
  }

  function applyTranslations() {
    if (!rootEl) return;
    const currentLang = getLanguage();

    const elList = rootEl.querySelectorAll("[data-i18n]");
    for (let i = 0; i < elList.length; i++) {
      const el = elList[i];
      const k = el.getAttribute("data-i18n");
      if (k) el.textContent = t(k);
    }

    const plList = rootEl.querySelectorAll("[data-i18n-placeholder]");
    for (let i = 0; i < plList.length; i++) {
      const el = plList[i];
      const k = el.getAttribute("data-i18n-placeholder");
      if (k) el.setAttribute("placeholder", t(k));
    }

    const titleList = rootEl.querySelectorAll("[data-i18n-title]");
    for (let i = 0; i < titleList.length; i++) {
      const el = titleList[i];
      const k = el.getAttribute("data-i18n-title");
      if (k) el.setAttribute("title", t(k));
    }

    const langBtns = rootEl.querySelectorAll(".as-acars-lang-btn");
    for (let i = 0; i < langBtns.length; i++) {
      const btn = langBtns[i];
      btn.classList.toggle("as-acars-lang-active", btn.getAttribute("data-lang") === currentLang);
    }

    const langChoices = rootEl.querySelectorAll(".as-acars-lang-choice");
    for (let i = 0; i < langChoices.length; i++) {
      const choice = langChoices[i];
      if (choice.getAttribute("data-lang") === currentLang) {
        choice.classList.add("as-acars-choice-active");
      } else {
        choice.classList.remove("as-acars-choice-active");
      }
    }
  }

  function applyTheme() {
    const root = rootEl || q("#as-acars-root");
    const toast = q("#as-acars-toast");
    const win = q("#as-acars-window");
    const isWhite = Boolean(store.white_mode);
    if (root) {
      if (isWhite) root.classList.add("as-acars-white-mode");
      else root.classList.remove("as-acars-white-mode");
    }
    if (toast) {
      if (isWhite) toast.classList.add("as-acars-white-mode");
      else toast.classList.remove("as-acars-white-mode");
    }
    if (win) {
      if (isWhite) win.classList.add("as-acars-white-mode");
      else win.classList.remove("as-acars-white-mode");
    }
  }

  // --- Runtime State ---
  const stateData = {
    panelOpen: false,
    activeView: "tenants", // "tenants" | "auth" | "main"
    activeTab: "home",     // "home" | "vocc" | "docs" | "flight" | "flights" | "metar" | "settings"

    // My Flights State
    flights: [],
    flightsLoading: false,
    flightsError: "",
    flightFilter: "all",
    flightSearch: "",
    flightPage: 1,
    flightLastPage: 1,
    flightTotal: 0,
    pilotStats: null,
    selectedFlight: null,
    selectedFlightDetail: null,
    selectedFlightTrack: null,
    detailActiveTab: "overview",

    // METAR & Weather State
    metarData: {
      dep: null,
      arr: null,
      alt: null,
      searched: null,
    },
    isFetchingMetar: false,
    metarSearchQuery: "",
    homeLocalWeather: null,
    lastHomeWeatherFetch: 0,
    nearestAirportIcao: null,

    // Tenants / VA list
    tenants: [],
    tenantsLoading: false,
    tenantsError: "",
    tenantSearch: "",

    // Device Code Auth
    pendingTenant: null,
    deviceCode: null,
    authToken: null,
    authStatus: "idle", // "idle" | "polling" | "success" | "expired" | "error"
    pollIntervalMs: 5000,
    pollTimerId: null,

    // Authenticated Data
    pilot: null,
    booking: null,

    // Active Flight / ACARS Dashboard
    flightState: "idle", // "idle" | "active" | "finished"
    flightStartTime: null,
    cabinAudioVolume: 31,
    isRecordingTelemetry: false,
    recordedTelemetry: [],
    telemetry: {
      latitude: 0,
      longitude: 0,
      altitude: 0,
      groundSpeed: 0,
      verticalSpeed: 0,
      heading: 0,
      onGround: true,
      fuelKg: 0,
      aircraftName: "",
    },

    // vOCC & Messages
    messages: [],
    sendingMessage: false,
    toastMessage: null,
    toastShownAt: 0,

    // Documents & Airport Briefings
    documents: [],
    docsLoading: false,
    docsError: "",
    docSearch: "",
    docCategory: "all", // "all" | "briefing" | "manuals" | "fdm" | "load"
    selectedDocId: null,
    detailDoc: null,
    detailDocLoading: false,

    // NOTAMs
    notams: [],
    selectedNotamId: null,
    detailNotam: null,

    // Update Checker
    updateInfo: null,
    updateBannerDismissed: false,
    updateStatusMsg: "",
    isCheckingUpdate: false,

    // Loop counters
    tickCount: 0,
  };

  const seenSet = new Set(Array.isArray(store.seenMessageIds) ? store.seenMessageIds : []);

  // --- In-Memory TTL Caches & Concurrency Guards (Anti-Lag / Zero-Stutter) ---
  const metarCache = new Map();           // icao -> { data, timestamp } (TTL: 5 min)
  const metarPendingPromises = new Map(); // icao -> Promise (request deduplication)
  const docDetailCache = new Map();       // docId -> { data, timestamp } (TTL: 15 min)
  let docsListCache = null;               // { data, timestamp } (TTL: 10 min)
  let notamsCache = null;                 // { data, timestamp } (TTL: 5 min)
  const flightsCache = new Map();         // page -> { flights, curPage, lastPage, totalCount, pilotStats, timestamp } (TTL: 5 min)
  const flightDetailCache = new Map();    // flightId -> { data, timestamp } (TTL: 15 min)
  const flightTrackCache = new Map();     // flightId -> { points, timestamp } (TTL: 15 min)
  const domElementCache = new Map();      // selector -> element (O(1) DOM query cache)

  // In-flight active promise deduplication
  let activePilotBookingPromise = null;
  let activeMessagesPromise = null;
  let activeDocsPromise = null;
  let activeNotamsPromise = null;
  let activeFlightsPromise = null;

  function clearAllCaches() {
    metarCache.clear();
    metarPendingPromises.clear();
    docDetailCache.clear();
    docsListCache = null;
    notamsCache = null;
    flightsCache.clear();
    flightDetailCache.clear();
    flightTrackCache.clear();
    domElementCache.clear();
    activePilotBookingPromise = null;
    activeMessagesPromise = null;
    activeDocsPromise = null;
    activeNotamsPromise = null;
    activeFlightsPromise = null;
  }
  let rootEl = null;
  let activeInputEl = null;
  let toastTimerId = null;
  let activeFlightMapInstance = null;
  let activeFlightPlaneMarker = null;
  let activeFlightRouteLine = null;

  // Window and Toast dragging state
  let isDraggingWindow = false;
  let dragTargetEl = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragInitialLeft = 0;
  let dragInitialTop = 0;
  let dragPendingX = 0;
  let dragPendingY = 0;
  let dragRafId = null;

  function onDragRafTick() {
    dragRafId = null;
    if (!isDraggingWindow || !dragTargetEl) return;
    const dx = dragPendingX - dragStartX;
    const dy = dragPendingY - dragStartY;
    let newLeft = dragInitialLeft + dx;
    let newTop = dragInitialTop + dy;

    const screenW = (typeof window !== "undefined" && window.innerWidth) ? window.innerWidth : 1920;
    const screenH = (typeof window !== "undefined" && window.innerHeight) ? window.innerHeight : 1080;

    if (newLeft < 10) newLeft = 10;
    if (newTop < 10) newTop = 10;
    if (newLeft > screenW - 80) newLeft = screenW - 80;
    if (newTop > screenH - 60) newTop = screenH - 60;

    dragTargetEl.style.left = Math.round(newLeft) + "px";
    dragTargetEl.style.top = Math.round(newTop) + "px";
    dragTargetEl.style.right = "auto";
    dragTargetEl.style.bottom = "auto";
  }

  function handleDragMouseMove(e) {
    if (!isDraggingWindow || !dragTargetEl) return;
    dragPendingX = e.clientX;
    dragPendingY = e.clientY;
    if (!dragRafId) {
      const scheduleRaf = (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function")
        ? window.requestAnimationFrame
        : function (cb) { return setTimeout(cb, 16); };
      dragRafId = scheduleRaf(onDragRafTick);
    }
  }

  function handleDragMouseUp() {
    if (dragRafId) {
      const cancelRaf = (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function")
        ? window.cancelAnimationFrame
        : function (id) { clearTimeout(id); };
      cancelRaf(dragRafId);
      dragRafId = null;
    }
    isDraggingWindow = false;
    if (dragTargetEl) {
      if (dragTargetEl.classList && typeof dragTargetEl.classList.remove === "function") {
        dragTargetEl.classList.remove("as-acars-is-dragging");
      }
      dragTargetEl = null;
    }
    try {
      if (rootEl && typeof rootEl.querySelectorAll === "function") {
        const draggingEls = rootEl.querySelectorAll(".as-acars-is-dragging");
        if (draggingEls && draggingEls.length) {
          for (let i = 0; i < draggingEls.length; i++) {
            draggingEls[i].classList.remove("as-acars-is-dragging");
          }
        }
      }
    } catch (_e) {}
    if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
      document.removeEventListener("mousemove", handleDragMouseMove, true);
      document.removeEventListener("mouseup", handleDragMouseUp, true);
    }
  }

  function clearToastTimer() {
    if (toastTimerId) {
      clearTimeout(toastTimerId);
      toastTimerId = null;
    }
  }

  function startToastTimer(overrideSec) {
    clearToastTimer();
    let durSec = 15;
    if (typeof overrideSec === "number" && !isNaN(overrideSec)) {
      durSec = overrideSec;
    } else {
      const rawSec = typeof store.toast_duration === "number" ? store.toast_duration : parseInt(store.toast_duration, 10);
      durSec = isNaN(rawSec) || rawSec < 0 ? 15 : rawSec;
    }
    if (durSec > 0) {
      toastTimerId = setTimeout(function () {
        dismissToast();
      }, durSec * 1000);
    }
  }

  function dismissToast() {
    clearToastTimer();
    stateData.toastMessage = null;
    stateData.toastShownAt = 0;

    const toastInput = q("#as-acars-toast-input");
    if (toastInput) {
      toastInput.value = "";
      try {
        if (typeof toastInput.blur === "function") {
          toastInput.blur();
        }
      } catch (_e) {}
    }

    handleDragMouseUp();
    unfocusCoherentInput("as-acars-toast-input");
    renderToast();
  }

  async function sendToastReply() {
    const input = q("#as-acars-toast-input");
    const text = input ? input.value.trim() : "";
    if (!text) return false;

    if (stateData.toastMessage && stateData.toastMessage.id) {
      confirmMessageById(stateData.toastMessage.id);
    }

    if (input) {
      input.value = "";
    }
    unfocusCoherentInput("as-acars-toast-input");

    dismissToast();

    return await sendChatMessage(text);
  }

  // --- Flow Settings Definition ---
  if (typeof settings_define === "function") {
    settings_define({
      toast_duration: {
        type: "text",
        label: "Tempo Alerta vOCC (segundos)",
        description: "Tempo em segundos para o alerta do vOCC sumir automaticamente (ex: 15). Use 0 para nao sumir.",
        value: String(store.toast_duration !== undefined ? store.toast_duration : 15),
        changed: (val) => {
          const num = parseInt(val, 10);
          store.toast_duration = isNaN(num) || num < 0 ? 15 : num;
          saveStore();
        },
      },
      vocc_toast_enabled: {
        type: "checkbox",
        label: "Alerta Flutuante do vOCC",
        description: "Exibe uma notificacao no simulador quando uma nova mensagem do vOCC chegar com o painel fechado.",
        value: store.vocc_toast_enabled !== undefined ? !!store.vocc_toast_enabled : true,
        changed: (val) => {
          store.vocc_toast_enabled = !!val;
          saveStore();
          renderToast();
        },
      },
      auto_confirm_read: {
        type: "checkbox",
        label: "Confirmar Leitura Automaticamente",
        description: "Marca mensagens do vOCC como lidas automaticamente ao abrir a aba de mensagens.",
        value: store.auto_confirm_read !== undefined ? !!store.auto_confirm_read : true,
        changed: (val) => {
          store.auto_confirm_read = !!val;
          saveStore();
        },
      },
      api_base_url: {
        type: "text",
        label: "URL Base Airspace",
        description: "Servidor central para listagem de VAs (padrao: https://airspace.ferrlab.com)",
        value: store.api_base_url || "https://airspace.ferrlab.com",
        changed: (val) => {
          store.api_base_url = (val || "https://airspace.ferrlab.com").trim().replace(/\/+$/, "");
          saveStore();
          fetchTenants();
        },
      },
    });
  }

  // --- Coherent GT Input Focus Bridge ---
  function focusCoherentInput(inputEl) {
    if (!inputEl) return;
    activeInputEl = inputEl;
    try {
      if (typeof Coherent !== "undefined" && Coherent && typeof Coherent.trigger === "function") {
        Coherent.trigger(
          "FOCUS_INPUT_FIELD",
          inputEl.id || "as_acars_input",
          "",
          inputEl.getAttribute("placeholder") || "",
          inputEl.value || "",
          false
        );
      }
    } catch (_e) {}
  }

  function unfocusCoherentInput(fieldId) {
    const targetId = fieldId || (activeInputEl && activeInputEl.id) || "as_acars_input";
    activeInputEl = null;
    try {
      if (typeof document !== "undefined" && document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
      }
    } catch (_e) {}
    try {
      if (typeof Coherent !== "undefined" && Coherent && typeof Coherent.trigger === "function") {
        Coherent.trigger("UNFOCUS_INPUT_FIELD", targetId);
        Coherent.trigger("UNFOCUS_INPUT_FIELD");
      }
    } catch (_e) {}
  }

  // --- Helper Utilities ---
  function getActiveToken() {
    if (!store.activeTenant || !store.activeTenant.id) return null;
    const entry = store.storedTokens && store.storedTokens[store.activeTenant.id];
    return entry && entry.token ? entry.token : null;
  }

  function getTenantBaseUrl(tenantObj) {
    const t = tenantObj || stateData.pendingTenant || store.activeTenant;
    if (!t || !t.domain) return "";
    const dom = String(t.domain).trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    return dom ? "https://" + dom : "";
  }

  let lastOpenUrlTime = 0;
  let lastOpenedUrl = "";

  function openExternalUrl(rawUrl) {
    if (!rawUrl) return false;
    let target = String(rawUrl).trim();
    if (!/^https?:\/\//i.test(target)) {
      const base = getTenantBaseUrl();
      if (!base) return false;
      target = base + (target.startsWith("/") ? "" : "/") + target;
    }
    if (!/^https?:\/\//i.test(target)) return false;

    // Strict debounce: do not open the same URL multiple times within 2 seconds
    const now = Date.now();
    if (target === lastOpenedUrl && (now - lastOpenUrlTime < 2000)) {
      return true;
    }
    lastOpenUrlTime = now;
    lastOpenedUrl = target;

    let opened = false;
    try {
      if (typeof OpenBrowser === "function") {
        OpenBrowser(target);
        opened = true;
      } else if (typeof window !== "undefined" && typeof window.OpenBrowser === "function") {
        window.OpenBrowser(target);
        opened = true;
      }
    } catch (_e) {}

    if (!opened) {
      try {
        if (api && api.command && typeof api.command.open_browser === "function") {
          api.command.open_browser(target);
          opened = true;
        } else if (typeof Coherent !== "undefined" && Coherent && typeof Coherent.trigger === "function") {
          Coherent.trigger("OPEN_BROWSER", target);
          opened = true;
        } else if (typeof window !== "undefined" && typeof window.open === "function") {
          window.open(target, "_blank");
          opened = true;
        }
      } catch (_e) {}
    }

    return opened;
  }

  function copyToClipboard(text) {
    if (!text) return false;
    const str = String(text);
    let copied = false;
    try {
      if (api && api.command && typeof api.command.copy_text === "function") {
        api.command.copy_text(str);
        copied = true;
      }
    } catch (_e) {}

    if (!copied) {
      try {
        if (typeof document !== "undefined" && typeof document.createElement === "function" && document.body) {
          const ta = document.createElement("textarea");
          ta.value = str;
          document.body.appendChild(ta);
          if (typeof ta.select === "function") ta.select();
          if (typeof document.execCommand === "function") {
            copied = Boolean(document.execCommand("copy"));
          }
          if (typeof document.body.removeChild === "function") {
            document.body.removeChild(ta);
          } else if (typeof ta.remove === "function") {
            ta.remove();
          }
        }
      } catch (_e) {}
    }

    if (!copied) {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          navigator.clipboard.writeText(str);
          copied = true;
        }
      } catch (_e) {}
    }

    return copied;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderTextWithEmojis(raw) {
    if (raw === null || raw === undefined) return "";
    let str = String(raw);

    // 1. Normalize typographic characters that cause missing glyph tofu boxes in Coherent GT
    str = str
      .replace(/\u2026/g, "...")
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\u00A0/g, " ")
      .replace(/\uFFFD/g, "");

    // 2. Escape HTML entities
    let s = escapeHtml(str);

    // 3. Convert known high-frequency aviation/announcement emojis into clean inline SVGs
    // Megaphone / announcement (U+1F4E2, U+1F4E3)
    s = s.replace(/(?:\uD83D[\uDCE2\uDCE3])/g, '<svg class="as-acars-emoji-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg> ');

    // Warning / alert (U+26A0, U+1F6A8, U+1F514)
    s = s.replace(/(?:\u26A0\uFE0F?|\uD83D[\uDD14\uDEA8])/g, '<svg class="as-acars-emoji-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> ');

    // Airplane / flight (U+2708, U+1F6EB, U+1F6EC, U+1F6E9)
    s = s.replace(/(?:\u2708\uFE0F?|\uD83D[\uDEEB\uDEEC\uDEE9])/g, '<svg class="as-acars-emoji-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"></path></svg> ');

    // Document / clipboard / note (U+1F4CB, U+1F4DD, U+1F4C4, U+1F4D1)
    s = s.replace(/(?:\uD83D[\uDCCB\uDCDD\uDCC4\uDCD1])/g, '<svg class="as-acars-emoji-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg> ');

    // Check / verified (U+2705, U+2714, U+2713)
    s = s.replace(/(?:\u2705|\u2714\uFE0F?|\u2713)/g, '<svg class="as-acars-emoji-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> ');

    // Cross / error (U+274C, U+2716, U+1F6AB, U+26D4)
    s = s.replace(/(?:\u274C|\u2716\uFE0F?|\uD83D\uDEAB|\u26D4)/g, '<svg class="as-acars-emoji-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> ');

    // Info (U+2139)
    s = s.replace(/(?:\u2139\uFE0F?)/g, '<svg class="as-acars-emoji-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> ');

    // Target (U+1F3AF)
    s = s.replace(/(?:\uD83C\uDFAF)/g, '<svg class="as-acars-emoji-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="6" r="6"></circle><circle cx="12" cy="2" r="2"></circle></svg> ');

    // Lightbulb (U+1F4A1)
    s = s.replace(/(?:\uD83D\uDCA1)/g, '<svg class="as-acars-emoji-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"></path></svg> ');

    // Clock (U+1F550 to U+1F567, U+23F0, U+23F1, U+23F3, U+231B)
    s = s.replace(/(?:\uD83D[\uDD50-\uDD67]|\u23F0|\u23F1\uFE0F?|\u23F3|\u231B)/g, '<svg class="as-acars-emoji-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ');

    // Location Pin (U+1F4CD, U+1F4CC)
    s = s.replace(/(?:\uD83D[\uDCCD\uDCCC])/g, '<svg class="as-acars-emoji-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> ');

    // Calendar (U+1F4C5, U+1F4C6)
    s = s.replace(/(?:\uD83D[\uDCC5\uDCC6])/g, '<svg class="as-acars-emoji-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ');

    // Chart / stats (U+1F4CA, U+1F4C8, U+1F4C9)
    s = s.replace(/(?:\uD83D[\uDCCA\uDCC8\uDCC9])/g, '<svg class="as-acars-emoji-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg> ');

    // Fuel (U+26FD)
    s = s.replace(/(?:\u26FD)/g, '<svg class="as-acars-emoji-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22h12"></path><path d="M4 9h10"></path><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"></path><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"></path></svg> ');

    // Weather / Cloud / Sun / Rain (U+2601, U+1F327, U+26C8, U+2600, U+1F324, U+2744)
    s = s.replace(/(?:\u2601\uFE0F?|\uD83C[\uDF24\uDF27]\uFE0F?|\u26C8\uFE0F?|\u2600\uFE0F?|\u2744\uFE0F?)/g, '<svg class="as-acars-emoji-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg> ');

    // Star (U+2B50, U+1F31F, U+2728)
    s = s.replace(/(?:\u2B50\uFE0F?|\uD83C\uDF1F|\u2728)/g, '<svg class="as-acars-emoji-icon" width="14" height="14" viewBox="0 0 24 24" fill="#eab308" stroke="#eab308" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> ');

    // Arrow right (U+27A1, U+2794)
    s = s.replace(/(?:\u27A1\uFE0F?|\u2794)/g, '<svg class="as-acars-emoji-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg> ');

    // Colored circles
    s = s.replace(/(?:\uD83D\uDFE2)/g, '<span class="as-acars-inline-dot as-acars-dot-green"></span>');
    s = s.replace(/(?:\uD83D\uDD34)/g, '<span class="as-acars-inline-dot as-acars-dot-red"></span>');
    s = s.replace(/(?:\uD83D\uDFE1)/g, '<span class="as-acars-inline-dot as-acars-dot-yellow"></span>');
    s = s.replace(/(?:\uD83D\uDD35|\uD83D\uDFE6)/g, '<span class="as-acars-inline-dot as-acars-dot-blue"></span>');
    s = s.replace(/(?:\uD83D\uDFE0)/g, '<span class="as-acars-inline-dot as-acars-dot-orange"></span>');
    s = s.replace(/(?:\uD83D\uDFE3)/g, '<span class="as-acars-inline-dot as-acars-dot-purple"></span>');

    // Bullets (U+2022, U+2023, U+25AA, U+25B6, U+25CF)
    s = s.replace(/(?:[\u2022\u2023\u25AA\u25B6\u25CF])/g, '<span class="as-acars-inline-dot as-acars-dot-bullet"></span>');

    // 4. Strip all remaining unrenderable emojis/surrogates/variation selectors to prevent tofu box [X]
    s = s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\u2300-\u23FF]|[\u2B00-\u2BFF]|[\uFE00-\uFE0F]|[\u200B-\u200F\u202A-\u202E\u2060-\u206F]|\uFFFD/g, "");

    return s;
  }

  /**
   * Sanitizes server-provided HTML for safe rendering inside the MSFS Coherent GT panel.
   * Strips executable/embedded tags, inline event handlers, and overlay positioning classes.
   */
  function sanitizeDocumentHtml(dirty) {
    if (!dirty) return "";
    let html = String(dirty);
    const contentTags = ["script", "style", "iframe", "frame", "frameset", "object", "embed", "applet", "form", "svg", "math", "noscript"];
    for (let i = 0; i < contentTags.length; i++) {
      const tag = contentTags[i];
      const re = new RegExp("<" + tag + "\\b[^>]*>[\\s\\S]*?<\\/" + tag + ">", "gi");
      html = html.replace(re, "");
      const selfRe = new RegExp("<" + tag + "\\b[^>]*\\/?>", "gi");
      html = html.replace(selfRe, "");
    }
    html = html.replace(/<(?:input|button|textarea|select|option|base|link|meta|param)\b[^>]*\/?>/gi, "");
    html = html.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    html = html.replace(/\s+id\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    html = html.replace(/(href|src)\s*=\s*(["'])\s*(?:javascript|vbscript|data:text):[^"']*\2/gi, '$1=$2#$2');
    html = html.replace(/class\s*=\s*(["'])([^"']*)\1/gi, function (_m, q, cls) {
      const kept = cls
        .split(/\s+/)
        .filter(function (c) {
          if (!c) return false;
          const util = c.slice(c.lastIndexOf(":") + 1).replace(/^!/, "").replace(/^-/, "");
          return !/^(?:fixed|absolute|sticky|z-.+|inset-.+|top-.+|right-.+|bottom-.+|left-.+)$/.test(util);
        })
        .join(" ");
      return "class=" + q + kept + q;
    });
    return html;
  }

  function stripHtmlToText(html) {
    if (!html) return "";
    return String(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#0*39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function formatTime(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      return hh + ":" + mm;
    } catch (_e) {
      return String(iso);
    }
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      const dd = String(d.getUTCDate()).padStart(2, "0");
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const yyyy = d.getUTCFullYear();
      return dd + "/" + mm + "/" + yyyy;
    } catch (_e) {
      return "";
    }
  }

  // --- HTTP Client ---
  async function apiRequest(method, path, bodyObj, customBaseUrl) {
    const baseUrl = customBaseUrl || getTenantBaseUrl();
    if (!baseUrl) {
      throw new Error("no tenant selected");
    }
    const token = getActiveToken();
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    const opts = {
      method: method,
      headers: headers,
    };
    if (bodyObj !== undefined && bodyObj !== null) {
      opts.body = JSON.stringify(bodyObj);
    }

    const resp = await fetch(baseUrl + path, opts);
    let data = null;
    const text = await resp.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_e) {
        data = null;
      }
    }

    // Automatic session expiry handling on 401 from /api/v2/acars/*
    if (resp.status === 401 && token && path.indexOf("/api/v2/acars/") === 0) {
      handleSessionExpired();
    }

    return { status: resp.status, ok: resp.ok, data: data, rawText: text };
  }

  function handleSessionExpired() {
    clearAllCaches();
    if (store.activeTenant && store.activeTenant.id && store.storedTokens) {
      delete store.storedTokens[store.activeTenant.id];
    }
    store.activeTenant = null;
    saveStore();
    stopAuthPolling();
    stateData.activeView = "tenants";
    renderAll();
  }

  // --- Authentication & VA Selection ---
  async function fetchTenants() {
    stateData.tenantsLoading = true;
    stateData.tenantsError = "";
    renderTenantsView();

    const base = (store.api_base_url || "https://airspace.ferrlab.com").replace(/\/+$/, "");
    try {
      const resp = await fetch(base + "/api/tenants", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!resp.ok) {
        throw new Error("HTTP " + resp.status);
      }
      const json = await resp.json();
      const list = Array.isArray(json && json.data) ? json.data : [];
      stateData.tenants = list
        .map(function (t) {
          const dom = Array.isArray(t.domains) && t.domains.length > 0 ? t.domains[0] : (t.domain || "");
          return {
            id: String(t.id || ""),
            name: String(t.name || ""),
            domain: String(dom || ""),
            logo_url: t.logo_url || null,
          };
        })
        .filter(function (t) {
          return t.id && t.domain;
        });
    } catch (_err) {
      stateData.tenantsError = "Nao foi possivel carregar a lista de companhias aereas.";
    } finally {
      stateData.tenantsLoading = false;
      renderTenantsView();
    }
  }

  function selectAuthenticatedTenant(tenant) {
    const entry = store.storedTokens && store.storedTokens[tenant.id];
    if (!entry || !entry.token) {
      startDeviceCodeAuth(tenant);
      return;
    }
    stopAuthPolling();
    store.activeTenant = tenant;
    saveStore();
    enterAuthenticatedWorkspace();
  }

  async function startDeviceCodeAuth(tenant) {
    stopAuthPolling();
    stateData.pendingTenant = tenant;
    stateData.deviceCode = null;
    stateData.authToken = null;
    stateData.authStatus = "idle";
    stateData.pollIntervalMs = 5000;
    stateData.activeView = "auth";
    renderAll();

    const baseUrl = getTenantBaseUrl(tenant);
    try {
      const resp = await fetch(baseUrl + "/api/v2/acars/auth/request", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
      });
      if (!resp.ok) {
        throw new Error("HTTP " + resp.status);
      }
      const data = await resp.json();
      if (!data || !data.user_code || !data.authorization_token) {
        throw new Error("Invalid device code response");
      }
      stateData.deviceCode = String(data.user_code);
      stateData.authToken = String(data.authorization_token);
      stateData.pollIntervalMs = Math.max(3, Number(data.poll_interval) || 5) * 1000;
      stateData.authStatus = "polling";
      renderAuthView();
      scheduleNextAuthPoll();
    } catch (_err) {
      stateData.authStatus = "error";
      renderAuthView();
    }
  }

  function stopAuthPolling() {
    if (stateData.pollTimerId !== null) {
      clearTimeout(stateData.pollTimerId);
      stateData.pollTimerId = null;
    }
  }

  function scheduleNextAuthPoll() {
    stopAuthPolling();
    if (stateData.authStatus !== "polling" || !stateData.authToken || !stateData.pendingTenant) {
      return;
    }
    stateData.pollTimerId = setTimeout(pollDeviceTokenOnce, stateData.pollIntervalMs);
  }

  async function pollDeviceTokenOnce() {
    if (stateData.authStatus !== "polling" || !stateData.authToken || !stateData.pendingTenant) {
      return;
    }
    const baseUrl = getTenantBaseUrl(stateData.pendingTenant);
    try {
      const resp = await fetch(baseUrl + "/api/v2/acars/auth/token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ authorization_token: stateData.authToken }),
      });

      if (resp.status === 200) {
        const data = await resp.json();
        if (data && data.access_token) {
          stateData.authStatus = "success";
          const tenant = stateData.pendingTenant;
          if (!store.storedTokens || typeof store.storedTokens !== "object") {
            store.storedTokens = {};
          }
          store.storedTokens[tenant.id] = {
            token: String(data.access_token),
            tenant: tenant,
          };
          store.activeTenant = tenant;
          saveStore();
          renderAuthView();
          stopAuthPolling();
          enterAuthenticatedWorkspace();
          return;
        }
      } else if (resp.status === 410) {
        stateData.authStatus = "expired";
        stopAuthPolling();
        renderAuthView();
        return;
      } else if (resp.status === 429) {
        stateData.pollIntervalMs = Math.min(stateData.pollIntervalMs * 2, 30000);
      }
    } catch (_err) {
      // Network hiccup during poll: continue polling
    }
    scheduleNextAuthPoll();
  }

  function enterAuthenticatedWorkspace() {
    stateData.activeView = "main";
    stateData.messages = [];
    stateData.documents = [];
    stateData.selectedDocId = null;
    stateData.detailDoc = null;
    stateData.notams = [];
    stateData.selectedNotamId = null;
    stateData.detailNotam = null;
    stateData.booking = null;
    stateData.pilot = null;
    stateData.flights = [];
    stateData.selectedFlight = null;
    stateData.pilotStats = null;
    stateData.flightPage = 1;
    renderAll();
    refreshAllAuthenticatedData();
  }

  function refreshAllAuthenticatedData(force) {
    if (!getActiveToken()) return;
    if (force) {
      clearAllCaches();
    }
    fetchPilotAndBooking();
    fetchMessages();
    fetchDocuments(force);
    fetchNotams(force);
    fetchMyFlights(stateData.flightPage || 1, force);
  }

  // --- Pilot & Active Booking ---
  function fetchPilotAndBooking() {
    if (!getActiveToken()) return Promise.resolve();
    if (activePilotBookingPromise) return activePilotBookingPromise;

    activePilotBookingPromise = (async function () {
      try {
        const pilotRes = await apiRequest("GET", "/api/v2/acars/pilot");
        if (pilotRes.ok && pilotRes.data) {
          stateData.pilot = pilotRes.data;
          const pid = pilotRes.data.id || (pilotRes.data.profile && pilotRes.data.profile.id);
          if (pid && !isNaN(Number(pid))) {
            store.myUserId = Number(pid);
            saveStore();
          }
        }
      } catch (_e) {}

      try {
        const bookRes = await apiRequest("GET", "/api/v2/acars/booking");
        if (bookRes.ok && bookRes.data && (bookRes.data.callsign || bookRes.data.flight_number)) {
          stateData.booking = bookRes.data;
        } else if (bookRes.status === 404) {
          stateData.booking = null;
        }
      } catch (_e) {}

      if (stateData.panelOpen) {
        renderHeader();
        renderBriefingShortcuts();
        if (stateData.activeTab === "flight") {
          renderFlightTab();
        }
      }
    })().finally(function () {
      activePilotBookingPromise = null;
    });

    return activePilotBookingPromise;
  }

  // --- vOCC & Dispatch Messages ---
  function mapMessage(raw) {
    const id = Number(raw.id) || 0;
    const senderId = Number(raw.sender_id !== undefined ? raw.sender_id : raw.senderId) || 0;
    const senderName = String(raw.sender_name || raw.senderName || "Dispatch");
    const senderRole = raw.sender_role || raw.senderRole || null;
    const type = String(raw.type || "chat");
    const text = String(raw.message !== undefined ? raw.message : (raw.text || ""));
    const timestamp = String(raw.sent_at || raw.created_at || raw.createdAt || "");
    const read = Boolean(raw.read_at || raw.readAt);
    return { id, senderId, senderName, senderRole, type, text, timestamp, read };
  }

  function classifyMessageSender(msg) {
    if (
      msg.type === "acars" ||
      msg.senderRole === "occ" ||
      msg.senderRole === "dispatcher" ||
      msg.senderRole === "system"
    ) {
      return "acars";
    }
    if ((store.myUserId !== null && msg.senderId === store.myUserId) || msg.senderRole === "user") {
      return "user";
    }
    return "other";
  }

  function getUnreadMessages() {
    return stateData.messages.filter(function (m) {
      return !m.read && classifyMessageSender(m) !== "user";
    });
  }

  function fetchMessages() {
    if (!getActiveToken()) return Promise.resolve();
    if (activeMessagesPromise) return activeMessagesPromise;

    activeMessagesPromise = (async function () {
      try {
        const res = await apiRequest("GET", "/api/v2/acars/messages?page=1");
        if (!res.ok || !res.data) return;

        const list = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        const mapped = list.map(mapMessage).filter(function (m) {
          return m.id > 0;
        });

        const byId = new Map();
        for (let i = 0; i < stateData.messages.length; i++) {
          byId.set(stateData.messages[i].id, stateData.messages[i]);
        }

        let newestUnseenVocc = null;
        for (let i = 0; i < mapped.length; i++) {
          const msg = mapped[i];
          byId.set(msg.id, msg);
          const senderKind = classifyMessageSender(msg);
          if (!seenSet.has(msg.id)) {
            seenSet.add(msg.id);
            if (senderKind !== "user" && !msg.read) {
              newestUnseenVocc = msg;
            }
          }
        }

        store.seenMessageIds = Array.from(seenSet).slice(-200);
        saveStore();

        stateData.messages = Array.from(byId.values()).sort(function (a, b) {
          return a.id - b.id;
        });

        if (stateData.panelOpen && stateData.activeView === "main" && stateData.activeTab === "vocc" && store.auto_confirm_read) {
          confirmAllUnreadMessages();
        } else if (newestUnseenVocc && store.vocc_toast_enabled) {
          stateData.toastMessage = newestUnseenVocc;
          stateData.toastShownAt = Date.now();
          renderToast();
        }

        if (stateData.panelOpen) {
          renderTabsBadge();
          const isChatOpen = stateData.activeView === "main" && stateData.activeTab === "vocc";
          renderChatTab(isChatOpen);
          if (isChatOpen) {
            scrollChatToBottom();
          }
        }
      } catch (_e) {
        // Ignore transient polling error
      }
    })().finally(function () {
      activeMessagesPromise = null;
    });

    return activeMessagesPromise;
  }

  async function confirmMessageById(messageId) {
    if (!messageId || !getActiveToken()) return;
    const target = stateData.messages.find(function (m) {
      return m.id === messageId;
    });
    if (target) target.read = true;
    renderTabsBadge();
    try {
      await apiRequest("PUT", "/api/v2/acars/message/confirm", { message_id: Number(messageId) });
    } catch (_e) {}
  }

  function confirmAllUnreadMessages() {
    const unread = getUnreadMessages();
    for (let i = 0; i < unread.length; i++) {
      confirmMessageById(unread[i].id);
    }
  }

  async function sendChatMessage(rawText) {
    const text = String(rawText || "").trim();
    if (!text || stateData.sendingMessage || !getActiveToken()) return false;

    stateData.sendingMessage = true;
    renderChatTab();

    try {
      const res = await apiRequest("POST", "/api/v2/acars/message", { message: text });
      if (res.ok && res.data) {
        const payload = res.data.data ? res.data.data : res.data;
        const sentMsg = mapMessage(payload);
        if (sentMsg.senderId) {
          store.myUserId = sentMsg.senderId;
          saveStore();
        }
        if (sentMsg.id) {
          seenSet.add(sentMsg.id);
          const exists = stateData.messages.some(function (m) {
            return m.id === sentMsg.id;
          });
          if (!exists) {
            stateData.messages.push(sentMsg);
          }
        }
        return true;
      }
    } catch (_e) {
    } finally {
      stateData.sendingMessage = false;
      renderChatTab(true);
    }
    return false;
  }

  // --- Documents & Airport Briefings ---
  function normalizeDocWire(d) {
    if (!d || d.id === undefined || d.id === null) return null;
    const id = String(d.id).trim();
    if (!id) return null;
    const parentId = d.parent_id !== undefined && d.parent_id !== null ? String(d.parent_id).trim() : "";
    const content = d.content || d.body || "";
    const fileUrl = d.file_url || d.pdf_url || d.download_url || d.url || "";
    let docType = String(d.type || "").toLowerCase().trim();
    if (!docType) {
      docType = fileUrl ? "pdf" : "html";
    }
    const isAuto =
      d.is_auto_generated === true ||
      d.is_auto_generated === 1 ||
      d.is_auto_generated === "1" ||
      String(d.is_auto_generated).toLowerCase() === "true";

    return {
      id: id,
      title: String(d.title || "Sem titulo"),
      type: docType,
      parent_id: parentId,
      visibility: String(d.visibility || "public"),
      is_auto_generated: isAuto,
      source: d.source ? String(d.source) : "",
      source_type: d.source_type ? String(d.source_type) : "",
      content: String(content),
      file_url: String(fileUrl),
      sort_order: Number(d.sort_order) || 0,
      created_at: d.created_at ? String(d.created_at) : "",
      updated_at: d.updated_at ? String(d.updated_at) : "",
    };
  }

  function fetchDocuments(force) {
    if (!getActiveToken()) return Promise.resolve();
    const now = Date.now();
    if (!force && docsListCache && (now - docsListCache.timestamp < 600000) && stateData.documents.length > 0) {
      stateData.documents = docsListCache.data;
      if (!stateData.selectedDocId && stateData.documents.length > 0) {
        const firstReadable = stateData.documents.find(function (d) {
          return d.type !== "folder" && d.id !== "1" && d.id !== "3" && d.id !== "9";
        }) || stateData.documents[0];
        selectDocument(firstReadable.id);
      }
      renderDocsTab();
      return Promise.resolve();
    }

    if (activeDocsPromise) return activeDocsPromise;

    activeDocsPromise = (async function () {
      stateData.docsLoading = true;
      stateData.docsError = "";
      renderDocsTab();

      try {
        const res = await apiRequest("GET", "/api/v2/acars/documents?page=1&per_page=100&sort=sort_order&sort_dir=asc");
        if (!res.ok || !res.data) {
          throw new Error("HTTP " + res.status);
        }
        const rawItems = Array.isArray(res.data.data)
          ? res.data.data
          : Array.isArray(res.data.documents)
          ? res.data.documents
          : Array.isArray(res.data)
          ? res.data
          : [];
        let allDocs = rawItems.map(normalizeDocWire).filter(Boolean);

        const lastPage = (res.data.meta && res.data.meta.last_page) || res.data.last_page || 1;
        for (let p = 2; p <= lastPage && p <= 5; p++) {
          const pageRes = await apiRequest(
            "GET",
            "/api/v2/acars/documents?page=" + p + "&per_page=100&sort=sort_order&sort_dir=asc"
          );
          if (pageRes.ok && pageRes.data) {
            const pageItems = Array.isArray(pageRes.data.data)
              ? pageRes.data.data
              : Array.isArray(pageRes.data.documents)
              ? pageRes.data.documents
              : Array.isArray(pageRes.data)
              ? pageRes.data
              : [];
            allDocs = allDocs.concat(pageItems.map(normalizeDocWire).filter(Boolean));
          }
        }

        stateData.documents = allDocs;
        docsListCache = { data: allDocs, timestamp: Date.now() };

        if (!stateData.selectedDocId && allDocs.length > 0) {
          const firstReadable = allDocs.find(function (d) {
            return d.type !== "folder" && d.id !== "1" && d.id !== "3" && d.id !== "9";
          }) || allDocs[0];
          selectDocument(firstReadable.id);
        }
      } catch (_e) {
        stateData.docsError = "Nao foi possivel carregar os documentos da companhia.";
      } finally {
        stateData.docsLoading = false;
        renderDocsTab();
      }
    })().finally(function () {
      activeDocsPromise = null;
    });

    return activeDocsPromise;
  }

  async function selectDocument(docId, force) {
    if (!docId) {
      stateData.selectedDocId = null;
      stateData.detailDoc = null;
      renderDocsTab();
      return;
    }
    const docIdStr = String(docId);
    stateData.selectedDocId = docIdStr;

    // 1. Check in-memory detail cache (TTL: 15 min)
    const now = Date.now();
    const cachedEntry = docDetailCache.get(docIdStr);
    if (!force && cachedEntry && (now - cachedEntry.timestamp < 900000)) {
      stateData.detailDoc = cachedEntry.data;
      stateData.detailDocLoading = false;
      renderDocsTab();
      return;
    }

    // 2. Pre-populate from list cache if available
    const cachedFromList = stateData.documents.find(function (d) {
      return d.id === docIdStr;
    });
    if (cachedFromList && cachedFromList.content) {
      stateData.detailDoc = cachedFromList;
      stateData.detailDocLoading = false;
      docDetailCache.set(docIdStr, { data: cachedFromList, timestamp: now });
      renderDocsTab();
      return;
    }

    stateData.detailDoc = cachedFromList || null;
    stateData.detailDocLoading = true;
    renderDocsTab();

    try {
      const res = await apiRequest("GET", "/api/v2/acars/documents/" + encodeURIComponent(docIdStr));
      if (res.ok && res.data) {
        const raw = res.data.data ? res.data.data : res.data;
        const parsed = normalizeDocWire(raw);
        if (parsed) {
          stateData.detailDoc = parsed;
          docDetailCache.set(docIdStr, { data: parsed, timestamp: Date.now() });
          const idx = stateData.documents.findIndex(function (d) { return d.id === docIdStr; });
          if (idx !== -1) {
            stateData.documents[idx] = parsed;
          }
        }
      }
    } catch (_e) {
    } finally {
      stateData.detailDocLoading = false;
      renderDocsTab();
    }
  }

  function getFilteredDocuments() {
    const cat = stateData.docCategory;
    const q = stateData.docSearch.toLowerCase().trim();

    return stateData.documents.filter(function (doc) {
      const docIdStr = String(doc.id || "").trim();
      const parentIdStr = String(doc.parent_id || "").trim();
      const titleLower = (doc.title || "").toLowerCase();
      const sourceLower = (doc.source || "").toLowerCase();
      const sourceType = (doc.source_type || "").toLowerCase();

      // Filter out top-level category container folders from direct document listing
      if (
        (!parentIdStr || parentIdStr === "null" || parentIdStr === "0") &&
        (docIdStr === "1" || docIdStr === "3" || docIdStr === "9" ||
         titleLower === "airport briefings" || titleLower === "fdm profiles" || titleLower === "load profiles")
      ) {
        return false;
      }

      const isAirportBriefing =
        parentIdStr === "9" ||
        sourceType === "airport" ||
        /^[a-z0-9]{4}\s*(\u2014|-)/i.test(doc.title || "") ||
        titleLower.indexOf("briefing") !== -1 ||
        titleLower.indexOf("airport") !== -1 ||
        titleLower.indexOf("aeroporto") !== -1 ||
        sourceLower.indexOf("airport") !== -1;

      const isFdm =
        parentIdStr === "3" ||
        sourceType === "fdm_profile" ||
        titleLower.indexOf("fdm") !== -1 ||
        titleLower.indexOf("safety") !== -1 ||
        sourceLower.indexOf("fdm") !== -1;

      const isLoad =
        parentIdStr === "1" ||
        sourceType === "load_profile" ||
        titleLower.indexOf("load") !== -1 ||
        titleLower.indexOf("carga") !== -1 ||
        sourceLower.indexOf("load") !== -1;

      if (cat === "briefing") {
        if (!isAirportBriefing) return false;
      } else if (cat === "fdm") {
        if (!isFdm) return false;
      } else if (cat === "load") {
        if (!isLoad) return false;
      } else if (cat === "manuals") {
        const isManual =
          (!isAirportBriefing && !isFdm && !isLoad) ||
          titleLower.indexOf("sop") !== -1 ||
          titleLower.indexOf("manual") !== -1 ||
          titleLower.indexOf("guide") !== -1 ||
          titleLower.indexOf("guia") !== -1 ||
          titleLower.indexOf("procedimento") !== -1 ||
          titleLower.indexOf("politica") !== -1;
        if (!isManual) return false;
      }

      if (q) {
        return titleLower.indexOf(q) !== -1 || sourceLower.indexOf(q) !== -1;
      }
      return true;
    });
  }

  function searchAirportDocumentByIcao(icao) {
    if (!icao) return;
    const code = String(icao).trim().toUpperCase();
    stateData.activeTab = "docs";
    stateData.docCategory = "all";
    stateData.docSearch = code;
    const filtered = getFilteredDocuments();
    if (filtered.length > 0) {
      selectDocument(filtered[0].id);
    } else if (typeof AIRPORT_BRIEFING_DATABASE !== "undefined" && AIRPORT_BRIEFING_DATABASE[code]) {
      let doc = stateData.documents.find(function (d) {
        return d.id === "briefing-" + code.toLowerCase();
      });
      if (!doc) {
        const b = AIRPORT_BRIEFING_DATABASE[code];
        doc = {
          id: "briefing-" + code.toLowerCase(),
          title: b.icao + " \u2014 " + b.name,
          type: "html",
          parent_id: "",
          visibility: "public",
          is_auto_generated: true,
          source: "Airport briefing",
          source_type: "airport",
          content: "",
          file_url: "",
          sort_order: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        stateData.documents.push(doc);
      }
      selectDocument(doc.id);
    }
    renderMainView();
  }

  function findNearestSimAirportAndSearch() {
    if (!api || !api.variables || !api.airports) return;
    try {
      const lat = api.variables.get("A:PLANE LATITUDE", "degrees");
      const lon = api.variables.get("A:PLANE LONGITUDE", "degrees");
      if (typeof lat !== "number" || typeof lon !== "number") return;
      api.airports.find_airports_by_coords(
        "airspace_acars_nearest_apt",
        lon,
        lat,
        25000,
        5,
        function (added) {
          if (Array.isArray(added) && added.length > 0 && added[0].icao) {
            searchAirportDocumentByIcao(added[0].icao);
          }
        },
        function () {},
        function () {},
        true
      );
    } catch (_e) {}
  }

  function findNearestAirportForMetar() {
    if (!api || !api.variables || !api.airports) return;
    try {
      const lat = api.variables.get("A:PLANE LATITUDE", "degrees");
      const lon = api.variables.get("A:PLANE LONGITUDE", "degrees");
      if (typeof lat !== "number" || typeof lon !== "number") return;
      api.airports.find_airports_by_coords(
        "airspace_acars_nearest_metar",
        lon,
        lat,
        25000,
        5,
        function (added) {
          if (Array.isArray(added) && added.length > 0 && added[0].icao) {
            const icao = added[0].icao;
            const inp = q("#as-acars-metar-search-input");
            if (inp) inp.value = icao;
            searchMetar(icao);
          }
        },
        function () {},
        function () {},
        true
      );
    } catch (_e) {}
  }

  // --- Company NOTAMs ---
  function fetchNotams(force) {
    if (!getActiveToken()) return Promise.resolve();
    const now = Date.now();
    if (!force && notamsCache && (now - notamsCache.timestamp < 300000) && stateData.notams.length > 0) {
      stateData.notams = notamsCache.data;
      if (!stateData.selectedNotamId && stateData.notams.length > 0) {
        stateData.selectedNotamId = stateData.notams[0].id;
        stateData.detailNotam = stateData.notams[0];
      }
      renderNotamsTab();
      renderTabsBadge();
      return Promise.resolve();
    }

    if (activeNotamsPromise) return activeNotamsPromise;

    activeNotamsPromise = (async function () {
      try {
        const res = await apiRequest("GET", "/api/v2/acars/notams?page=1&per_page=25&filter[is_active]=1&sort=created_at&sort_dir=desc");
        if (!res.ok || !res.data) return;
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        const parsedNotams = list.map(function (n) {
          return {
            id: String(n.id || ""),
            title: String(n.title || "NOTAM"),
            content: String(n.content || n.body || n.description || ""),
            created_at: String(n.created_at || ""),
          };
        });
        stateData.notams = parsedNotams;
        notamsCache = { data: parsedNotams, timestamp: Date.now() };

        if (!stateData.selectedNotamId && stateData.notams.length > 0) {
          stateData.selectedNotamId = stateData.notams[0].id;
          stateData.detailNotam = stateData.notams[0];
        }
        renderNotamsTab();
        renderTabsBadge();
      } catch (_e) {
      }
    })().finally(function () {
      activeNotamsPromise = null;
    });

    return activeNotamsPromise;
  }

  // --- My Flights / Logbook (Removed per user request) ---
  function mapFlightLog() { return null; }
  function fetchMyFlights() { return Promise.resolve(); }
  function fetchFlightDetail() { return Promise.resolve(); }

  // --- DOM Rendering ---
  function q(selector) {
    if (!rootEl) return null;
    if (typeof rootEl.contains === "function") {
      let el = domElementCache.get(selector);
      if (el && rootEl.contains(el)) return el;
      el = rootEl.querySelector(selector);
      if (el) domElementCache.set(selector, el);
      return el;
    }
    return rootEl.querySelector(selector);
  }

  function setVisible(el, visible) {
    if (!el) return;
    if (visible) {
      el.classList.remove("as-acars-hidden");
    } else {
      el.classList.add("as-acars-hidden");
    }
  }

  function ensureWindowOnScreen(win) {
    if (!win || typeof window === "undefined") return;
    const vw = Number(window.innerWidth) || 1920;
    const vh = Number(window.innerHeight) || 1080;
    const w = Number(win.offsetWidth) || 820;
    const h = Number(win.offsetHeight) || 550;

    let left = parseFloat(win.style.left);
    let top = parseFloat(win.style.top);

    if (isNaN(left) || isNaN(top) || left + w > vw - 10 || top + h > vh - 10 || left < 10 || top < 10) {
      if (isNaN(left) || left + w > vw - 10 || left < 10) {
        left = Math.max(20, Math.round((vw - w) / 2));
      }
      if (isNaN(top) || top + h > vh - 10 || top < 10) {
        top = Math.max(20, Math.round((vh - h) / 2));
      }
      win.style.left = left + "px";
      win.style.top = top + "px";
    }
  }

  function renderUpdateBanner() {
    if (!rootEl) return;
    const banner = q("#as-acars-update-banner");
    if (!banner) return;
    const shouldShow = !!(stateData.updateInfo && stateData.updateInfo.isNewer && !stateData.updateBannerDismissed);
    setVisible(banner, shouldShow);
    if (shouldShow) {
      const versionEl = q("#as-acars-update-new-version");
      if (versionEl) versionEl.textContent = stateData.updateInfo.version;
    }
  }

  async function checkForUpdates(manual) {
    if (stateData.isCheckingUpdate) return;
    stateData.isCheckingUpdate = true;
    if (manual) {
      stateData.updateStatusMsg = t("update.status_checking", "Verificando atualizacoes...");
      renderSettingsTab();
    }
    try {
      const resp = await fetch(GITHUB_API_LATEST_RELEASE, {
        method: "GET",
        headers: { Accept: "application/vnd.github.v3+json" }
      });
      if (resp && resp.ok) {
        const data = await resp.json();
        if (data && data.tag_name) {
          const remoteTag = String(data.tag_name).trim();
          const newer = isNewerVersion(remoteTag, APP_VERSION);
          stateData.updateInfo = {
            version: remoteTag,
            html_url: data.html_url || REPO_RELEASES_URL,
            isNewer: newer,
            name: data.name || remoteTag,
            body: data.body || ""
          };
          if (newer) {
            stateData.updateBannerDismissed = false;
            stateData.updateStatusMsg = t("update.status_available", "Nova versao {version} disponivel! Feche o simulador para atualizar.")
              .replace("{version}", remoteTag);
          } else {
            stateData.updateStatusMsg = t("update.status_current", "Voce esta utilizando a versao mais recente.");
          }
        } else {
          if (manual) stateData.updateStatusMsg = t("update.status_current", "Voce esta utilizando a versao mais recente.");
        }
      } else {
        if (manual) stateData.updateStatusMsg = t("update.status_error", "Nao foi possivel verificar atualizacoes.");
      }
    } catch (_err) {
      if (manual) stateData.updateStatusMsg = t("update.status_error", "Nao foi possivel verificar atualizacoes.");
    } finally {
      stateData.isCheckingUpdate = false;
      renderUpdateBanner();
      renderSettingsTab();
    }
  }

  function renderAll() {
    if (!rootEl) return;
    cleanParentContainers(rootEl);
    applyTheme();
    applyTranslations();

    const win = q("#as-acars-window");
    setVisible(win, stateData.panelOpen);
    if (stateData.panelOpen && win) {
      ensureWindowOnScreen(win);
    } else if (!stateData.panelOpen) {
      unfocusCoherentInput();
    }

    renderToast();
    renderHeader();
    renderUpdateBanner();

    const isAuthed = Boolean(getActiveToken() && store.activeTenant);
    if (isAuthed && stateData.activeView !== "tenants" && stateData.activeView !== "auth") {
      stateData.activeView = "main";
    } else if (!isAuthed && stateData.activeView === "main") {
      if (stateData.activeTab !== "settings") {
        stateData.activeView = "tenants";
      }
    }

    setVisible(q("#as-acars-view-tenants"), stateData.activeView === "tenants");
    setVisible(q("#as-acars-view-auth"), stateData.activeView === "auth");
    setVisible(q("#as-acars-view-main"), stateData.activeView === "main");

    if (stateData.activeView === "tenants") {
      renderTenantsView();
    } else if (stateData.activeView === "auth") {
      renderAuthView();
    } else {
      renderMainView();
      if (stateData.panelOpen && stateData.activeTab === "vocc") {
        scrollChatToBottom();
      }
    }
  }

  function renderToast() {
    if (!rootEl) return;
    const toastEl = q("#as-acars-toast");
    const msg = stateData.toastMessage;
    const shouldShow = Boolean(msg && !stateData.panelOpen && store.vocc_toast_enabled);
    setVisible(toastEl, shouldShow);
    if (shouldShow && msg) {
      cleanParentContainers(toastEl);
      const senderEl = q("#as-acars-toast-sender");
      const textEl = q("#as-acars-toast-text");
      const openBtn = q("#as-acars-toast-open");
      const dismissBtn = q("#as-acars-toast-dismiss");
      const toastVaLogo = q("#as-acars-toast-va-logo");
      const toastDefaultLogo = q("#as-acars-toast-default-logo");

      // OCC + Logged Company Name header (e.g. OCC - Voe Samba)
      const companyName = (store.activeTenant && store.activeTenant.name)
        ? String(store.activeTenant.name).trim()
        : (stateData.pilot && stateData.pilot.airline && stateData.pilot.airline.name)
          ? String(stateData.pilot.airline.name).trim()
          : "";
      const toastHeaderText = companyName ? ("OCC - " + companyName) : "OCC";
      if (senderEl) {
        senderEl.textContent = toastHeaderText;
      }

      // VA Logo vs Default Logo in Toast Header
      const isAuthed = Boolean(getActiveToken() && store.activeTenant);
      const vaLogoUrl =
        (store.activeTenant && store.activeTenant.logo_url) ||
        (stateData.pilot && (stateData.pilot.airline_logo || (stateData.pilot.airline && stateData.pilot.airline.logo_url))) ||
        null;

      if (toastVaLogo && toastDefaultLogo) {
        if (isAuthed && vaLogoUrl) {
          let fullLogo = String(vaLogoUrl).trim();
          if (!/^https?:\/\//i.test(fullLogo)) {
            const base = getTenantBaseUrl();
            fullLogo = (base ? base.replace(/\/+$/, "") : "https://airspace.ferrlab.com") + (fullLogo.startsWith("/") ? "" : "/") + fullLogo;
          }
          if (toastVaLogo.getAttribute("data-src") !== fullLogo) {
            toastVaLogo.setAttribute("data-src", fullLogo);
            toastVaLogo.setAttribute("src", fullLogo);
            toastVaLogo.src = fullLogo;
            toastVaLogo.onerror = function () {
              setVisible(toastVaLogo, false);
              setVisible(toastDefaultLogo, true);
            };
          }
          setVisible(toastVaLogo, true);
          setVisible(toastDefaultLogo, false);
        } else {
          setVisible(toastVaLogo, false);
          setVisible(toastDefaultLogo, true);
        }
      }

      if (textEl) {
        textEl.innerHTML = renderTextWithEmojis(msg.text || "");
      }
      if (openBtn) {
        openBtn.textContent = t("toast.open");
      }
      if (dismissBtn) {
        dismissBtn.textContent = t("toast.dismiss");
      }
      const toastInput = q("#as-acars-toast-input");
      if (toastInput) {
        toastInput.value = "";
      }
      if (!stateData.toastShownAt) {
        stateData.toastShownAt = Date.now();
      }
      startToastTimer();
    } else {
      clearToastTimer();
      stateData.toastShownAt = 0;
      unfocusCoherentInput("as-acars-toast-input");
    }
  }

  function renderHeader() {
    if (!rootEl) return;
    const vaBadge = q("#as-acars-va-badge");
    const defaultLogo = q("#as-acars-default-logo");
    const vaLogoImg = q("#as-acars-va-logo");

    const isAuthed = Boolean(getActiveToken() && store.activeTenant);
    setVisible(vaBadge, Boolean(store.activeTenant && store.activeTenant.name));
    if (vaBadge && store.activeTenant) {
      vaBadge.textContent = store.activeTenant.name;
    }

    // Logo VA vs Airspace Logo
    const vaLogoUrl =
      (store.activeTenant && store.activeTenant.logo_url) ||
      (stateData.pilot && (stateData.pilot.airline_logo || (stateData.pilot.airline && stateData.pilot.airline.logo_url))) ||
      null;

    if (vaLogoImg && defaultLogo) {
      if (isAuthed && vaLogoUrl) {
        let fullLogo = String(vaLogoUrl).trim();
        if (!/^https?:\/\//i.test(fullLogo)) {
          const base = getTenantBaseUrl();
          fullLogo = (base ? base.replace(/\/+$/, "") : "https://airspace.ferrlab.com") + (fullLogo.startsWith("/") ? "" : "/") + fullLogo;
        }
        if (vaLogoImg.getAttribute("data-src") !== fullLogo) {
          vaLogoImg.setAttribute("data-src", fullLogo);
          vaLogoImg.setAttribute("src", fullLogo);
          vaLogoImg.src = fullLogo;
          vaLogoImg.onerror = function () {
            setVisible(vaLogoImg, false);
            setVisible(defaultLogo, true);
          };
        }
        setVisible(vaLogoImg, true);
        setVisible(defaultLogo, false);
      } else {
        setVisible(vaLogoImg, false);
        setVisible(defaultLogo, true);
      }
    }
  }

  function buildTenantLogoHtml(t) {
    const initial = escapeHtml((t.name || "V").charAt(0).toUpperCase());
    const safeUrl =
      t.logo_url && /^https?:\/\//i.test(String(t.logo_url))
        ? String(t.logo_url).replace(/["'()\\]/g, "")
        : "";
    if (safeUrl) {
      return '<div class="as-acars-tenant-logo" style="background-image:url(\'' + escapeHtml(safeUrl) + '\')"></div>';
    }
    return '<div class="as-acars-tenant-fallback">' + initial + "</div>";
  }

  function renderTenantsView() {
    if (!rootEl) return;
    const savedWrap = q("#as-acars-saved-tenants-wrap");
    const savedListEl = q("#as-acars-saved-tenants-list");
    const listEl = q("#as-acars-tenants-list");
    if (!listEl) return;

    const storedMap = store.storedTokens || {};
    const savedTenants = [];
    for (const tid in storedMap) {
      if (Object.prototype.hasOwnProperty.call(storedMap, tid) && storedMap[tid] && storedMap[tid].tenant) {
        savedTenants.push(storedMap[tid].tenant);
      }
    }

    setVisible(savedWrap, savedTenants.length > 0);
    if (savedListEl && savedTenants.length > 0) {
      savedListEl.innerHTML = savedTenants
        .map(function (tObj) {
          return (
            '<button type="button" class="as-acars-tenant-item" data-saved-tenant-id="' +
            escapeHtml(tObj.id) +
            '">' +
            buildTenantLogoHtml(tObj) +
            '<div class="as-acars-tenant-info">' +
            '<div class="as-acars-tenant-name">' +
            escapeHtml(tObj.name) +
            "</div>" +
            '<div class="as-acars-tenant-domain">' +
            escapeHtml(tObj.domain) +
            "</div>" +
            "</div>" +
            '<span class="as-acars-tenant-check">' +
            escapeHtml(t("tenants.connected_badge")) +
            "</span>" +
            "</button>"
          );
        })
        .join("");
    }

    if (stateData.tenantsLoading) {
      listEl.innerHTML = '<div class="as-acars-empty-state">' + escapeHtml(t("tenants.loading")) + '</div>';
      return;
    }
    if (stateData.tenantsError) {
      listEl.innerHTML = '<div class="as-acars-empty-state">' + escapeHtml(stateData.tenantsError) + "</div>";
      return;
    }

    const searchLower = stateData.tenantSearch.toLowerCase().trim();
    const filtered = stateData.tenants.filter(function (tObj) {
      if (!searchLower) return true;
      return (
        tObj.name.toLowerCase().indexOf(searchLower) !== -1 ||
        tObj.domain.toLowerCase().indexOf(searchLower) !== -1
      );
    });

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="as-acars-empty-state">' + escapeHtml(t("tenants.empty")) + '</div>';
      return;
    }

    listEl.innerHTML = filtered
      .map(function (tObj) {
        const hasSaved = Boolean(storedMap[tObj.id] && storedMap[tObj.id].token);
        return (
          '<button type="button" class="as-acars-tenant-item" data-tenant-id="' +
          escapeHtml(tObj.id) +
          '">' +
          buildTenantLogoHtml(tObj) +
          '<div class="as-acars-tenant-info">' +
          '<div class="as-acars-tenant-name">' +
          escapeHtml(tObj.name) +
          "</div>" +
          '<div class="as-acars-tenant-domain">' +
          escapeHtml(tObj.domain) +
          "</div>" +
          "</div>" +
          (hasSaved ? '<span class="as-acars-tenant-check">' + escapeHtml(t("tenants.saved_badge")) + "</span>" : "") +
          "</button>"
        );
      })
      .join("");
  }

  function renderAuthView() {
    if (!rootEl) return;
    const vaNameEl = q("#as-acars-auth-va-name");
    const codeEl = q("#as-acars-device-code");
    const urlEl = q("#as-acars-auth-url");
    const openAuthBtn = q("#as-acars-btn-open-auth");
    const statusEl = q("#as-acars-auth-status");
    const pending = stateData.pendingTenant;
    const baseUrl = getTenantBaseUrl(pending) || "https://samba.airspace.ferrlab.com";
    const fullAuthUrl =
      baseUrl + "/acars/authorize?code=" + (stateData.deviceCode ? encodeURIComponent(stateData.deviceCode) : "");

    if (vaNameEl) {
      vaNameEl.textContent = pending
        ? t("auth.connecting_to", { va: pending.name + " (" + pending.domain + ")" })
        : t("auth.connecting_default");
    }
    if (codeEl) {
      codeEl.textContent = stateData.deviceCode || "------";
    }
    if (urlEl) {
      urlEl.setAttribute("data-href", fullAuthUrl);
      urlEl.textContent =
        baseUrl + "/acars/authorize?code=" + (stateData.deviceCode || "------");
    }
    if (openAuthBtn) {
      openAuthBtn.setAttribute("data-href", fullAuthUrl);
    }
    if (statusEl) {
      if (stateData.authStatus === "idle") {
        statusEl.textContent = t("auth.status_idle");
      } else if (stateData.authStatus === "polling") {
        statusEl.textContent = t("auth.status_waiting");
      } else if (stateData.authStatus === "success") {
        statusEl.textContent = t("auth.status_success");
      } else if (stateData.authStatus === "expired") {
        statusEl.textContent = t("auth.status_expired");
      } else {
        statusEl.textContent = t("auth.status_error");
      }
    }
  }

  function renderMainView() {
    if (!rootEl) return;
    const tabs = ["home", "vocc", "docs", "notams", "flight", "flights", "metar", "settings"];
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      const btn = q("#as-acars-tab-btn-" + t);
      const panel = q("#as-acars-tab-" + t);
      if (btn) {
        if (stateData.activeTab === t) {
          btn.classList.add("as-acars-tab-active");
        } else {
          btn.classList.remove("as-acars-tab-active");
        }
      }
      setVisible(panel, stateData.activeTab === t);
    }

    const homeBarWrap = q("#as-acars-ios-home-bar-wrap");
    setVisible(homeBarWrap, stateData.activeTab !== "home");

    renderHeader();
    renderTabsBadge();

    if (stateData.activeTab === "home") {
      renderHomeTab();
    } else if (stateData.activeTab === "vocc") {
      renderChatTab();
    } else if (stateData.activeTab === "docs") {
      renderBriefingShortcuts();
      renderDocsTab();
    } else if (stateData.activeTab === "notams") {
      renderNotamsTab();
    } else if (stateData.activeTab === "flight") {
      renderFlightTab();
    } else if (stateData.activeTab === "metar") {
      renderMetarTab();
    } else if (stateData.activeTab === "settings") {
      renderSettingsTab();
    }
  }

  const AIRPORT_CITIES = {
    SBGR: "Guarulhos",
    SBRJ: "Rio de Janeiro",
    SBSP: "Congonhas",
    SBKP: "Campinas",
    SBGL: "Galeao",
    SBBR: "Brasilia",
    SBEG: "Manaus",
    SBBV: "Boa Vista",
    SBCT: "Curitiba",
    SBPA: "Porto Alegre",
    SBFZ: "Fortaleza",
    SBSV: "Salvador",
    SBCF: "Belo Horizonte",
    SBCG: "Campo Grande",
    SBGO: "Goiania",
    SBCR: "Corumba",
    SBCY: "Cuiaba",
    SBFL: "Florianopolis",
    SBVT: "Vitoria",
    SBNF: "Navegantes",
    KJFK: "New York",
    KLAX: "Los Angeles",
    KMIA: "Miami",
    EGLL: "London",
    LFPG: "Paris",
    LEMD: "Madrid",
    EDDF: "Frankfurt"
  };

  function getAirportCityName(icao) {
    if (!icao) return "Aeroporto Local";
    const code = icao.toUpperCase();
    if (AIRPORT_CITIES[code]) {
      return AIRPORT_CITIES[code] + " (" + code + ")";
    }
    const b = stateData.booking;
    if (b && b.departure_airport && b.departure_airport.icao === code) {
      const city = b.departure_airport.city || b.departure_airport.name;
      if (city) return city + " (" + code + ")";
    }
    return code;
  }

  function formatIosDate(d, lang) {
    const l = (lang || getLanguage() || "pt-br").toLowerCase();
    const dayOfWeek = d.getUTCDay();
    const day = d.getUTCDate();
    const month = d.getUTCMonth();

    if (l === "en") {
      const daysShortEn = ["sun.", "mon.", "tue.", "wed.", "thu.", "fri.", "sat."];
      const monthsShortEn = ["jan.", "feb.", "mar.", "apr.", "may", "jun.", "jul.", "aug.", "sep.", "oct.", "nov.", "dec."];
      return daysShortEn[dayOfWeek] + ", " + monthsShortEn[month] + " " + day;
    }
    if (l === "es") {
      const daysShortEs = ["dom.", "lun.", "mar.", "mie.", "jue.", "vie.", "sab."];
      const monthsShortEs = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];
      return daysShortEs[dayOfWeek] + ", " + day + " de " + monthsShortEs[month];
    }
    if (l === "fr") {
      const daysShortFr = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
      const monthsShortFr = ["janv.", "fevr.", "mars", "avr.", "mai", "juin", "juil.", "aout", "sept.", "oct.", "nov.", "dec."];
      return daysShortFr[dayOfWeek] + ", " + day + " " + monthsShortFr[month];
    }
    // Default PT-BR (strict 7-bit ASCII): sex., 6 de nov.
    const daysShortPt = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sab."];
    const monthsShortPt = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
    return daysShortPt[dayOfWeek] + ", " + day + " de " + monthsShortPt[month];
  }

  function isNightTime(icao) {
    const flowApi = (__flowContext && __flowContext.$api) || (typeof window !== "undefined" && window.$api);
    if (flowApi && flowApi.variables) {
      try {
        const tod = flowApi.variables.get("E:TIME OF DAY", "enum");
        if (tod === 3) return true;
        if (tod === 1) return false;
      } catch (_e) {}
    }

    let lon = -46.5;
    if (stateData.booking && stateData.booking.departure_airport && typeof stateData.booking.departure_airport.longitude === "number") {
      lon = stateData.booking.departure_airport.longitude;
    }
    const now = new Date();
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
    const localSolarHour = (utcHours + (lon / 15) + 24) % 24;

    return localSolarHour < 5.5 || localSolarHour >= 18.5;
  }

  function getIosWeatherSvg(type) {
    if (type === "day-partly") {
      return '<svg width="44" height="42" viewBox="0 0 52 48" fill="none"><circle cx="33" cy="20" r="10" fill="#FBBF24"/><path d="M33 6V9M47 20H44M42.9 10.1L40.8 12.2M42.9 29.9L40.8 27.8" stroke="#FBBF24" stroke-width="2.5" stroke-linecap="round"/><path d="M19 40H37C41.4 40 45 36.4 45 32C45 27.8 41.8 24.3 37.7 24.1C36.7 18.4 31.8 14 26 14C19.8 14 14.7 19 14.1 25.1C9.6 25.6 6 29.4 6 34C6 38.4 9.6 40 14 40H19Z" fill="#FFFFFF"/></svg>';
    }
    if (type === "day-sun") {
      return '<svg width="42" height="42" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="11" fill="#FBBF24"/><path d="M24 4V8M24 40V44M4 24H8M40 24H44M9.86 9.86L12.69 12.69M35.31 35.31L38.14 38.14M9.86 38.14L12.69 35.31M35.31 12.69L38.14 9.86" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/></svg>';
    }
    if (type === "night-clear") {
      return '<svg width="42" height="42" viewBox="0 0 48 48" fill="none"><path d="M31 12C23.2 12 17 18.3 17 26C17 33.7 23.2 40 31 40C33.5 40 35.8 39.3 37.8 38.1C30.5 36.7 25 30.5 25 23C25 17.5 28.1 12.8 32.7 10.5C32.1 10.5 31.6 12 31 12Z" fill="#FDE047"/><path d="M14 14L15.5 18L19.5 19.5L15.5 21L14 25L12.5 21L8.5 19.5L12.5 18L14 14Z" fill="#FEF08A"/></svg>';
    }
    if (type === "night-partly") {
      return '<svg width="44" height="42" viewBox="0 0 52 48" fill="none"><path d="M33 11C27.5 11 23 15.5 23 21C23 23.8 24.2 26.3 26.1 28.1C24.5 28 23 26 23 24C23 18.5 27.5 14 33 14C34.2 14 35.3 14.2 36.3 14.7C35.3 12.5 33.3 11 31 11H33Z" fill="#FDE047"/><path d="M19 40H37C41.4 40 45 36.4 45 32C45 27.8 41.8 24.3 37.7 24.1C36.7 18.4 31.8 14 26 14C19.8 14 14.7 19 14.1 25.1C9.6 25.6 6 29.4 6 34C6 38.4 9.6 40 14 40H19Z" fill="#E2E8F0"/></svg>';
    }
    if (type === "rain") {
      return '<svg width="44" height="44" viewBox="0 0 52 50" fill="none"><path d="M17 32H35C39.4 32 43 28.4 43 24C43 19.8 39.8 16.3 35.7 16.1C34.7 10.4 29.8 6 24 6C17.8 6 12.7 11 12.1 17.1C7.6 17.6 4 21.4 4 26C4 30.4 7.6 32 12 32H17Z" fill="#CBD5E1"/><line x1="16" y1="36" x2="13" y2="44" stroke="#60A5FA" stroke-width="2.5" stroke-linecap="round"/><line x1="25" y1="36" x2="22" y2="44" stroke="#60A5FA" stroke-width="2.5" stroke-linecap="round"/><line x1="34" y1="36" x2="31" y2="44" stroke="#60A5FA" stroke-width="2.5" stroke-linecap="round"/></svg>';
    }
    if (type === "storm") {
      return '<svg width="44" height="44" viewBox="0 0 52 50" fill="none"><path d="M17 30H35C39.4 30 43 26.4 43 22C43 17.8 39.8 14.3 35.7 14.1C34.7 8.4 29.8 4 24 4C17.8 4 12.7 9 12.1 15.1C7.6 15.6 4 19.4 4 24C4 28.4 7.6 30 12 30H17Z" fill="#94A3B8"/><polygon points="26,24 19,35 25,35 22,46 32,32 26,32" fill="#FACC15"/></svg>';
    }
    if (type === "fog") {
      return '<svg width="44" height="42" viewBox="0 0 52 48" fill="none"><path d="M17 28H35C39.4 28 43 24.4 43 20C43 15.8 39.8 12.3 35.7 12.1C34.7 6.4 29.8 2 24 2C17.8 2 12.7 7 12.1 13.1C7.6 13.6 4 17.4 4 22C4 26.4 7.6 28 12 28H17Z" fill="#CBD5E1"/><line x1="10" y1="34" x2="40" y2="34" stroke="#E2E8F0" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="40" x2="36" y2="40" stroke="#E2E8F0" stroke-width="2" stroke-linecap="round"/></svg>';
    }
    // Default Overcast Cloud
    return '<svg width="44" height="42" viewBox="0 0 52 48" fill="none"><path d="M22 28H38C42 28 45 25 45 21C45 17 42 14 38 14C37 9 32 5 27 5C21 5 17 9 16 14C12 15 9 18 9 22C9 25 12 28 16 28H22Z" fill="#94A3B8" fill-opacity="0.5"/><path d="M17 40H35C39.4 40 43 36.4 43 32C43 27.8 39.8 24.3 35.7 24.1C34.7 18.4 29.8 14 24 14C17.8 14 12.7 19 12.1 25.1C7.6 25.6 4 29.4 4 34C4 38.4 7.6 40 12 40H17Z" fill="#FFFFFF"/></svg>';
  }

  function getMetarWeatherWidgetState(m, icao) {
    const isNight = isNightTime(icao);
    const raw = m && m.raw ? m.raw.toUpperCase() : "";

    let themeClass = isNight ? "as-acars-ios-widget-night" : "as-acars-ios-widget-day";
    let iconType = isNight ? "night-partly" : "day-partly";
    let cond = "Tempo estavel";

    if (/\b(TS|VCTS|\+TSRA|-TSRA|TSRA|CB)\b/.test(raw)) {
      themeClass = "as-acars-ios-widget-storm";
      iconType = "storm";
      cond = "Tempestade";
    } else if (/\b(\+RA|-RA|RA|DZ|-DZ|SHRA|\+SHRA)\b/.test(raw)) {
      themeClass = "as-acars-ios-widget-rain";
      iconType = "rain";
      cond = "Chuva";
    } else if (/\b(SN|-SN|\+SN)\b/.test(raw)) {
      themeClass = "as-acars-ios-widget-rain";
      iconType = "rain";
      cond = "Neve";
    } else if (/\b(FG|BR|HZ|MIFG|BCFG)\b/.test(raw)) {
      themeClass = isNight ? "as-acars-ios-widget-night" : "as-acars-ios-widget-cloudy";
      iconType = "fog";
      cond = "Nevoeiro";
    } else if (/\b(OVC|BKN)\b/.test(raw)) {
      themeClass = isNight ? "as-acars-ios-widget-night" : "as-acars-ios-widget-cloudy";
      iconType = "cloud";
      cond = "Nublado";
    } else if (/\b(CAVOK|CLR|SKC|NSC)\b/.test(raw)) {
      themeClass = isNight ? "as-acars-ios-widget-night" : "as-acars-ios-widget-day-clear";
      iconType = isNight ? "night-clear" : "day-sun";
      cond = "Ceu limpo";
    } else if (/\b(FEW|SCT)\b/.test(raw)) {
      themeClass = isNight ? "as-acars-ios-widget-night" : "as-acars-ios-widget-day";
      iconType = isNight ? "night-partly" : "day-partly";
      cond = "Poucas nuvens";
    }

    return {
      isNight: isNight,
      themeClass: themeClass,
      iconSvg: getIosWeatherSvg(iconType),
      cond: cond,
    };
  }

  function resolveCurrentSimAirportIcao() {
    const b = stateData.booking;
    if (b && b.departure_airport && b.departure_airport.icao) {
      return b.departure_airport.icao.toUpperCase();
    }
    if (stateData.nearestAirportIcao) {
      return stateData.nearestAirportIcao;
    }
    return "SBGR";
  }

  function renderHomeClockAndDate() {
    if (!rootEl) return;
    const dateEl = q("#as-acars-ios-home-date");
    const timeEl = q("#as-acars-ios-home-time");

    const now = new Date();
    if (dateEl) {
      dateEl.textContent = formatIosDate(now, getLanguage());
    }
    if (timeEl) {
      const hh = String(now.getUTCHours()).padStart(2, "0");
      const mm = String(now.getUTCMinutes()).padStart(2, "0");
      timeEl.textContent = hh + ":" + mm;
    }
  }

  function getSimAmbientTempCelsius() {
    try {
      const flowApi = (__flowContext && __flowContext.$api) || (typeof window !== "undefined" && window.$api);
      if (flowApi && flowApi.variables && typeof flowApi.variables.get === "function") {
        const t = flowApi.variables.get("A:AMBIENT TEMPERATURE", "celsius");
        if (typeof t === "number" && !isNaN(t) && t > -90 && t < 70) {
          return Math.round(t);
        }
      }
    } catch (_e) {}
    try {
      if (typeof SimVar !== "undefined" && typeof SimVar.GetSimVarValue === "function") {
        const v = SimVar.GetSimVarValue("A:AMBIENT TEMPERATURE", "celsius");
        if (typeof v === "number" && !isNaN(v) && v > -90 && v < 70) {
          return Math.round(v);
        }
      }
    } catch (_e) {}
    return null;
  }

  function renderHomeWeatherWidget() {
    if (!rootEl) return;
    const w = stateData.homeLocalWeather;
    const widgetEl = q("#as-acars-ios-home-weather");
    const tempEl = q("#as-acars-ios-weather-temp");
    const locEl = q("#as-acars-ios-weather-loc");
    const iconEl = q("#as-acars-ios-weather-icon");

    const currentIcao = (w && w.icao) || resolveCurrentSimAirportIcao();

    if (!w) {
      const liveSimTemp = getSimAmbientTempCelsius();
      if (tempEl) {
        if (liveSimTemp !== null) {
          tempEl.innerHTML = liveSimTemp + '<span class="as-acars-deg">o</span>';
        } else {
          tempEl.innerHTML = '--<span class="as-acars-deg">o</span>';
        }
      }
      if (locEl) locEl.textContent = getAirportCityName(currentIcao);
      return;
    }

    if (widgetEl && w.themeClass) {
      widgetEl.className = "as-acars-ios-capsule-widget " + w.themeClass;
    }
    if (tempEl) {
      const displayTemp = (w.temp !== null && w.temp !== undefined) ? w.temp : getSimAmbientTempCelsius();
      tempEl.innerHTML = (displayTemp !== null && displayTemp !== undefined ? displayTemp : "--") + '<span class="as-acars-deg">o</span>';
    }
    if (locEl) {
      locEl.textContent = w.locationName || getAirportCityName(currentIcao);
    }
    if (iconEl && w.iconSvg) {
      iconEl.innerHTML = w.iconSvg;
    }
  }

  function fetchHomeLocalWeather(force) {
    const now = Date.now();
    if (!force && stateData.homeLocalWeather && (now - stateData.lastHomeWeatherFetch < 120000)) {
      return;
    }

    const currentIcao = resolveCurrentSimAirportIcao();
    const liveSimTemp = getSimAmbientTempCelsius();

    if (liveSimTemp !== null && !stateData.homeLocalWeather) {
      stateData.homeLocalWeather = {
        icao: currentIcao,
        temp: liveSimTemp,
        locationName: getAirportCityName(currentIcao),
        condition: "VMC",
        themeClass: "as-acars-ios-widget-day",
        iconSvg: getIosWeatherSvg("day-partly"),
        flightCategory: "VFR",
        fetchedAt: Date.now(),
      };
      renderHomeWeatherWidget();
    }

    const flowApi = (__flowContext && __flowContext.$api) || (typeof window !== "undefined" && window.$api);
    if (flowApi && flowApi.airports && flowApi.variables) {
      try {
        const lat = flowApi.variables.get("A:PLANE LATITUDE", "degrees");
        const lon = flowApi.variables.get("A:PLANE LONGITUDE", "degrees");
        if (typeof lat === "number" && typeof lon === "number" && (lat !== 0 || lon !== 0)) {
          let cbFired = false;
          const fallbackTimer = setTimeout(function () {
            if (!cbFired) {
              doFetchHomeWeather(currentIcao);
            }
          }, 1500);

          flowApi.airports.find_airports_by_coords(
            "home_wx_nearest",
            lon,
            lat,
            35000,
            3,
            function (added) {
              cbFired = true;
              clearTimeout(fallbackTimer);
              if (Array.isArray(added) && added.length > 0 && added[0].icao) {
                stateData.nearestAirportIcao = added[0].icao.toUpperCase();
                doFetchHomeWeather(added[0].icao.toUpperCase());
                return;
              }
              doFetchHomeWeather(currentIcao);
            },
            function () {},
            function () {},
            true
          );
          return;
        }
      } catch (_e) {}
    }

    doFetchHomeWeather(currentIcao);
  }

  function doFetchHomeWeather(icao) {
    if (!icao) return;
    stateData.lastHomeWeatherFetch = Date.now();
    fetchMetarForIcao(icao).then(function (metar) {
      const liveSimTemp = getSimAmbientTempCelsius();
      const finalTemp = (metar && metar.tempVal !== null && metar.tempVal !== undefined)
        ? metar.tempVal
        : (liveSimTemp !== null ? liveSimTemp : 22);

      const widgetState = metar ? getMetarWeatherWidgetState(metar, icao) : {
        cond: "VMC",
        themeClass: "as-acars-ios-widget-day",
        iconSvg: getIosWeatherSvg("day-partly")
      };

      stateData.homeLocalWeather = {
        icao: icao,
        temp: finalTemp,
        locationName: getAirportCityName(icao),
        condition: widgetState.cond,
        themeClass: widgetState.themeClass,
        iconSvg: widgetState.iconSvg,
        flightCategory: metar ? metar.flightCategory : "VFR",
        fetchedAt: Date.now(),
      };
      renderHomeWeatherWidget();
    });
  }

  function renderHomeTab() {
    if (!rootEl) return;
    renderHomeClockAndDate();
    renderHomeWeatherWidget();
    fetchHomeLocalWeather(false);
  }

  // --- METAR & Weather Functionality ---
  function parseMetar(rawMetar, defaultIcao) {
    if (!rawMetar) return null;
    const raw = String(rawMetar).trim();
    const parts = raw.split(/\s+/);
    let icao = (defaultIcao || "").toUpperCase();
    for (let i = 0; i < parts.length && i < 4; i++) {
      const p = parts[i].toUpperCase();
      if (p !== "METAR" && p !== "SPECI" && p !== "COR" && /^[A-Z]{4}$/.test(p)) {
        icao = p;
        break;
      }
    }
    if (!icao && parts[0]) icao = parts[0].toUpperCase();

    let flightCategory = "VFR";
    let catClass = "vfr";

    // Wind
    let windText = "--";
    let windDir = null;
    let windSpeed = null;
    let windGust = null;
    const windMatch = raw.match(/\b(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?KT\b/);
    if (windMatch) {
      windDir = windMatch[1] === "VRB" ? "VRB" : parseInt(windMatch[1], 10);
      windSpeed = parseInt(windMatch[2], 10);
      if (windMatch[3]) {
        windGust = parseInt(windMatch[3], 10);
        windText = (windDir === "VRB" ? "VRB" : String(windDir).padStart(3, "0")) + " / " + windSpeed + " kt (G " + windGust + " kt)";
      } else {
        windText = (windDir === "VRB" ? "VRB" : String(windDir).padStart(3, "0")) + " / " + windSpeed + " kt";
      }
    }

    // Visibility
    let visText = "--";
    let visKm = null;
    const visSmMatch = raw.match(/\b(\d+(?:\/\d+)?)SM\b/);
    const visMetresMatch = raw.match(/\b(\d{4})\b/);
    if (visSmMatch) {
      visText = visSmMatch[1] + " SM";
    } else if (visMetresMatch) {
      const v = parseInt(visMetresMatch[1], 10);
      visKm = v;
      if (v >= 9999) {
        visText = "> 10 km (9999)";
      } else {
        visText = v + " m";
      }
    } else if (/\bCAVOK\b/.test(raw)) {
      visText = "CAVOK (> 10 km)";
    }

    // Clouds
    const cloudsList = [];
    let lowestCeiling = 99999;
    const cloudRegex = /\b(FEW|SCT|BKN|OVC|VV)(\d{3})(CB|TCU)?\b/g;
    let cm;
    while ((cm = cloudRegex.exec(raw)) !== null) {
      const type = cm[1];
      const altFt = parseInt(cm[2], 10) * 100;
      const extra = cm[3] ? " " + cm[3] : "";
      cloudsList.push(type + " " + altFt + " ft" + extra);
      if ((type === "BKN" || type === "OVC" || type === "VV") && altFt < lowestCeiling) {
        lowestCeiling = altFt;
      }
    }
    const cloudsText =
      cloudsList.length > 0
        ? cloudsList.join(", ")
        : (/\bCAVOK\b/.test(raw) ? "CAVOK (Ceu limpo)" : (/\bSKC|CLR|NSC\b/.test(raw) ? "Ceu claro" : "--"));

    // Temperature / Dew point
    let tempText = "--";
    let tempVal = null;
    let dewVal = null;
    const tempMatch = raw.match(/\b(M?\d{2})\/(M?\d{2})\b/);
    if (tempMatch) {
      tempVal = parseInt(tempMatch[1].replace("M", "-"), 10);
      dewVal = parseInt(tempMatch[2].replace("M", "-"), 10);
      tempText = tempVal + " C / " + dewVal + " C";
    }

    // Altimeter / QNH
    let qnhText = "--";
    let qnhVal = null;
    const qnhMatch = raw.match(/\bQ(\d{4})\b/);
    const altMatch = raw.match(/\bA(\d{4})\b/);
    if (qnhMatch) {
      qnhVal = parseInt(qnhMatch[1], 10);
      const inHg = (qnhVal * 0.0295299830714).toFixed(2);
      qnhText = qnhVal + " hPa (" + inHg + " inHg)";
    } else if (altMatch) {
      const inHgNum = (parseInt(altMatch[1], 10) / 100).toFixed(2);
      qnhVal = Math.round(parseFloat(inHgNum) * 33.8639);
      qnhText = inHgNum + " inHg (" + qnhVal + " hPa)";
    }

    if (lowestCeiling < 500 || (visKm !== null && visKm < 1600)) {
      flightCategory = "LIFR";
      catClass = "lifr";
    } else if (lowestCeiling < 1000 || (visKm !== null && visKm < 4800)) {
      flightCategory = "IFR";
      catClass = "ifr";
    } else if (lowestCeiling <= 3000 || (visKm !== null && visKm < 8000)) {
      flightCategory = "MVFR";
      catClass = "mvfr";
    } else {
      flightCategory = "VFR";
      catClass = "vfr";
    }

    return {
      raw: raw,
      icao: icao,
      flightCategory: flightCategory,
      catClass: catClass,
      windDir: windDir,
      windSpeed: windSpeed,
      windGust: windGust,
      windText: windText,
      visText: visText,
      cloudsText: cloudsText,
      temp: tempVal,
      dew: dewVal,
      tempText: tempText,
      qnh: qnhVal,
      qnhText: qnhText,
    };
  }

  function fetchMetarForIcao(rawIcao, force) {
    if (!rawIcao) return Promise.resolve(null);
    const icao = String(rawIcao).trim().toUpperCase();
    if (!icao || icao.length < 3) return Promise.resolve(null);

    const now = Date.now();
    const cached = metarCache.get(icao);
    if (!force && cached && (now - cached.timestamp < 300000)) {
      return Promise.resolve(cached.data);
    }

    if (!force && metarPendingPromises.has(icao)) {
      return metarPendingPromises.get(icao);
    }

    const p = new Promise(function (resolve) {
      let resolved = false;

      function finish(result) {
        if (resolved) return;
        resolved = true;
        metarPendingPromises.delete(icao);
        if (result) {
          metarCache.set(icao, { data: result, timestamp: Date.now() });
        }
        resolve(result);
      }

      // 1. Flow native API
      try {
        const flowApi = (__flowContext && __flowContext.$api) || (typeof window !== "undefined" && window.$api);
        if (flowApi && flowApi.weather && typeof flowApi.weather.find_metar_by_icao === "function") {
          const timer = setTimeout(function () {
            if (!resolved) fallbackFetch();
          }, 1500);

          flowApi.weather.find_metar_by_icao(icao, function (flowMetar) {
            if (resolved) return;
            clearTimeout(timer);
            const rawMetarStr = flowMetar && (flowMetar.metarString || flowMetar.raw || flowMetar.metar || (typeof flowMetar === "string" ? flowMetar : ""));
            if (rawMetarStr) {
              finish(parseMetar(rawMetarStr, icao));
              return;
            }
            fallbackFetch();
          });
          return;
        }
      } catch (_e) {}

      fallbackFetch();

      function fallbackFetch() {
        if (resolved) return;
        fetch("https://metar.vatsim.net/metar.php?id=" + encodeURIComponent(icao))
          .then(function (r) {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.text();
          })
          .then(function (txt) {
            const clean = String(txt || "").trim();
            if (!clean || clean.indexOf("No METAR") !== -1 || clean.indexOf("<html>") !== -1) {
              finish(null);
              return;
            }
            finish(parseMetar(clean, icao));
          })
          .catch(function () {
            finish(null);
          });
      }
    });

    metarPendingPromises.set(icao, p);
    return p;
  }

  function buildMetarCardHtml(m, roleLabel) {
    if (!m) return "";
    const icao = escapeHtml(m.icao || "----");
    const role = roleLabel ? '<span class="as-acars-metar-role">' + escapeHtml(roleLabel) + '</span>' : "";
    const cat = m.flightCategory || "VFR";
    const catClass = m.catClass || "vfr";
    const raw = escapeHtml(m.raw || "");

    return (
      '<div class="as-acars-metar-card">' +
        '<div class="as-acars-metar-card-header">' +
          '<div class="as-acars-metar-card-title">' +
            '<span class="as-acars-metar-icao">' + icao + '</span>' +
            role +
          '</div>' +
          '<span class="as-acars-cat-badge as-acars-cat-' + catClass + '">' + escapeHtml(cat) + '</span>' +
        '</div>' +
        '<div class="as-acars-metar-raw-box">' +
          '<span class="as-acars-metar-raw-text">' + raw + '</span>' +
          '<button type="button" class="as-acars-btn as-acars-btn-xs as-acars-btn-outline as-acars-btn-copy-metar" data-raw="' + escapeHtml(m.raw || "") + '">' +
            t("metar.btn_copy", "Copiar") +
          '</button>' +
        '</div>' +
        '<div class="as-acars-metar-params-grid">' +
          '<div class="as-acars-metar-param-item">' +
            '<span class="as-acars-metar-param-label">' + t("metar.wind", "Vento") + '</span>' +
            '<span class="as-acars-metar-param-val">' + escapeHtml(m.windText || "--") + '</span>' +
          '</div>' +
          '<div class="as-acars-metar-param-item">' +
            '<span class="as-acars-metar-param-label">' + t("metar.visibility", "Visibilidade") + '</span>' +
            '<span class="as-acars-metar-param-val">' + escapeHtml(m.visText || "--") + '</span>' +
          '</div>' +
          '<div class="as-acars-metar-param-item">' +
            '<span class="as-acars-metar-param-label">' + t("metar.clouds", "Nuvens") + '</span>' +
            '<span class="as-acars-metar-param-val">' + escapeHtml(m.cloudsText || "--") + '</span>' +
          '</div>' +
          '<div class="as-acars-metar-param-item">' +
            '<span class="as-acars-metar-param-label">' + t("metar.temp", "Temp / PO") + '</span>' +
            '<span class="as-acars-metar-param-val">' + escapeHtml(m.tempText || "--") + '</span>' +
          '</div>' +
          '<div class="as-acars-metar-param-item">' +
            '<span class="as-acars-metar-param-label">' + t("metar.qnh", "QNH / Altimetro") + '</span>' +
            '<span class="as-acars-metar-param-val">' + escapeHtml(m.qnhText || "--") + '</span>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderMetarCards() {
    if (!rootEl) return;
    const flightCardsWrap = q("#as-acars-metar-flight-cards");
    const searchedSection = q("#as-acars-metar-searched-section");
    const searchedCardWrap = q("#as-acars-metar-searched-card-wrap");
    const pillsWrap = q("#as-acars-metar-quick-pills");

    const b = stateData.booking;
    const depIcao = b && b.departure_airport && b.departure_airport.icao ? b.departure_airport.icao.toUpperCase() : "";
    const arrIcao = b && b.arrival_airport && b.arrival_airport.icao ? b.arrival_airport.icao.toUpperCase() : "";
    const altIcao = b && b.alternate_airport && b.alternate_airport.icao ? b.alternate_airport.icao.toUpperCase() : "";

    if (pillsWrap) {
      let pillsHtml = "";
      if (depIcao) {
        pillsHtml += '<button type="button" class="as-acars-metar-pill" data-icao="' + depIcao + '">DEP: ' + depIcao + '</button>';
      }
      if (arrIcao) {
        pillsHtml += '<button type="button" class="as-acars-metar-pill" data-icao="' + arrIcao + '">ARR: ' + arrIcao + '</button>';
      }
      if (altIcao) {
        pillsHtml += '<button type="button" class="as-acars-metar-pill" data-icao="' + altIcao + '">ALT: ' + altIcao + '</button>';
      }
      pillsHtml += '<button type="button" class="as-acars-metar-pill" data-action="nearest">Mais Proximo (Sim)</button>';
      pillsWrap.innerHTML = pillsHtml;
    }

    if (searchedSection && searchedCardWrap) {
      if (stateData.metarData.searched) {
        setVisible(searchedSection, true);
        searchedCardWrap.innerHTML = buildMetarCardHtml(stateData.metarData.searched, "Pesquisa");
      } else {
        setVisible(searchedSection, false);
      }
    }

    if (flightCardsWrap) {
      if (!depIcao && !arrIcao) {
        flightCardsWrap.innerHTML =
          '<div class="as-acars-empty-state">' +
          t("metar.no_flight", "Nenhum voo ativo conectado. Pesquise um aeroporto acima.") +
          '</div>';
      } else {
        let cardsHtml = "";
        if (stateData.metarData.dep) {
          cardsHtml += buildMetarCardHtml(stateData.metarData.dep, t("metar.origin", "Origem (DEP)"));
        } else if (depIcao) {
          cardsHtml +=
            '<div class="as-acars-metar-card"><div class="as-acars-empty-state">' +
            (stateData.isFetchingMetar ? t("metar.loading", "Carregando...") : "METAR nao disponivel para " + depIcao) +
            '</div></div>';
        }

        if (stateData.metarData.arr) {
          cardsHtml += buildMetarCardHtml(stateData.metarData.arr, t("metar.destination", "Destino (ARR)"));
        } else if (arrIcao) {
          cardsHtml +=
            '<div class="as-acars-metar-card"><div class="as-acars-empty-state">' +
            (stateData.isFetchingMetar ? t("metar.loading", "Carregando...") : "METAR nao disponivel para " + arrIcao) +
            '</div></div>';
        }

        if (stateData.metarData.alt) {
          cardsHtml += buildMetarCardHtml(stateData.metarData.alt, t("metar.alternate", "Alternado (ALT)"));
        }

        flightCardsWrap.innerHTML = cardsHtml;
      }
    }
  }

  async function loadRouteMetars(force) {
    const b = stateData.booking;
    const depIcao = b && b.departure_airport && b.departure_airport.icao ? b.departure_airport.icao.toUpperCase() : "";
    const arrIcao = b && b.arrival_airport && b.arrival_airport.icao ? b.arrival_airport.icao.toUpperCase() : "";
    const altIcao = b && b.alternate_airport && b.alternate_airport.icao ? b.alternate_airport.icao.toUpperCase() : "";

    const promises = [];
    if (depIcao && (force || !stateData.metarData.dep || stateData.metarData.dep.icao !== depIcao)) {
      promises.push(fetchMetarForIcao(depIcao, force).then(function (m) { stateData.metarData.dep = m; }));
    }
    if (arrIcao && (force || !stateData.metarData.arr || stateData.metarData.arr.icao !== arrIcao)) {
      promises.push(fetchMetarForIcao(arrIcao, force).then(function (m) { stateData.metarData.arr = m; }));
    }
    if (altIcao && (force || !stateData.metarData.alt || stateData.metarData.alt.icao !== altIcao)) {
      promises.push(fetchMetarForIcao(altIcao, force).then(function (m) { stateData.metarData.alt = m; }));
    }

    if (promises.length > 0) {
      stateData.isFetchingMetar = true;
      renderMetarCards();
      try {
        await Promise.all(promises);
      } finally {
        stateData.isFetchingMetar = false;
        renderMetarCards();
      }
    } else {
      renderMetarCards();
    }
  }

  async function searchMetar(rawIcao) {
    const icao = String(rawIcao || "").trim().toUpperCase();
    if (!icao || icao.length < 3) return;
    stateData.metarSearchQuery = icao;
    stateData.isFetchingMetar = true;
    renderMetarCards();
    try {
      const res = await fetchMetarForIcao(icao);
      stateData.metarData.searched = res || {
        icao: icao,
        raw: "METAR nao disponivel para " + icao,
        flightCategory: "--",
        catClass: "mvfr",
        windText: "--",
        visText: "--",
        cloudsText: "--",
        tempText: "--",
        qnhText: "--",
      };
    } finally {
      stateData.isFetchingMetar = false;
      renderMetarCards();
    }
  }

  function renderMetarTab() {
    renderMetarCards();
    loadRouteMetars(false);
  }

  function renderSettingsTab() {
    if (!rootEl) return;
    const currentLang = getLanguage();
    const langChoices = rootEl.querySelectorAll(".as-acars-lang-choice");
    for (let i = 0; i < langChoices.length; i++) {
      const btn = langChoices[i];
      if (btn.getAttribute("data-lang") === currentLang) {
        btn.classList.add("as-acars-choice-active");
      } else {
        btn.classList.remove("as-acars-choice-active");
      }
    }

    const darkBtn = q("#as-acars-theme-dark");
    const whiteBtn = q("#as-acars-theme-white");
    if (darkBtn) {
      if (!store.white_mode) darkBtn.classList.add("as-acars-choice-active");
      else darkBtn.classList.remove("as-acars-choice-active");
    }
    if (whiteBtn) {
      if (store.white_mode) whiteBtn.classList.add("as-acars-choice-active");
      else whiteBtn.classList.remove("as-acars-choice-active");
    }

    // White Mode Switch
    const whiteSwitch = q("#as-acars-switch-white");
    const whiteStatus = q("#as-acars-switch-white-status");
    const isWhite = !!store.white_mode;
    if (whiteSwitch) {
      whiteSwitch.setAttribute("aria-checked", isWhite ? "true" : "false");
    }
    if (whiteStatus) {
      whiteStatus.textContent = isWhite ? t("settings.switch_enabled", "Ativado") : t("settings.switch_disabled", "Desativado");
    }

    // Toast Switch
    const toastSwitch = q("#as-acars-switch-toast");
    const toastStatus = q("#as-acars-switch-toast-status");
    const isToastEnabled = store.vocc_toast_enabled !== undefined ? !!store.vocc_toast_enabled : true;
    if (toastSwitch) {
      toastSwitch.setAttribute("aria-checked", isToastEnabled ? "true" : "false");
    }
    if (toastStatus) {
      toastStatus.textContent = isToastEnabled ? t("settings.switch_enabled", "Ativado") : t("settings.switch_disabled", "Desativado");
    }

    const toastCheck = q("#as-acars-settings-toast-enable");
    if (toastCheck) {
      toastCheck.checked = isToastEnabled;
    }

    // Toast Duration Presets & Input
    const duration = store.toast_duration !== undefined ? store.toast_duration : 15;
    const toastTime = q("#as-acars-settings-toast-time");
    if (toastTime && document.activeElement !== toastTime) {
      toastTime.value = String(duration);
    }
    const presets = rootEl.querySelectorAll(".as-acars-duration-preset");
    for (let i = 0; i < presets.length; i++) {
      const p = presets[i];
      const sec = parseInt(p.getAttribute("data-sec"), 10);
      if (sec === duration) {
        p.classList.add("as-acars-choice-active");
      } else {
        p.classList.remove("as-acars-choice-active");
      }
    }

    // Version & Updates
    const curBadge = q("#as-acars-current-version-badge");
    if (curBadge) {
      curBadge.textContent = "v" + APP_VERSION;
    }
    const statusEl = q("#as-acars-update-status-text");
    const downloadBtn = q("#as-acars-btn-download-installer");
    const checkBtn = q("#as-acars-btn-check-updates");

    if (stateData.updateInfo && stateData.updateInfo.isNewer) {
      if (statusEl) {
        statusEl.textContent = t("update.status_available", "Nova versao {version} disponivel! Feche o simulador para atualizar.")
          .replace("{version}", stateData.updateInfo.version);
      }
      setVisible(downloadBtn, true);
    } else {
      if (statusEl) {
        statusEl.textContent = stateData.updateStatusMsg || t("settings.update_status_current", "Voce esta utilizando a versao mais recente.");
      }
      setVisible(downloadBtn, false);
    }

    if (checkBtn) {
      checkBtn.textContent = stateData.isCheckingUpdate
        ? t("update.status_checking", "Verificando...")
        : t("settings.btn_check_updates", "Verificar Atualizacoes");
    }

    // Session & Virtual Airline (Switch VA / Logout)
    const vaBadgeEl = q("#as-acars-settings-va-badge");
    if (vaBadgeEl) {
      if (store.activeTenant && store.activeTenant.name) {
        vaBadgeEl.textContent = store.activeTenant.name;
        setVisible(vaBadgeEl, true);
      } else {
        setVisible(vaBadgeEl, false);
      }
    }

    const sessionDesc = q("#as-acars-settings-session-desc");
    if (sessionDesc) {
      if (stateData.pilot && (stateData.pilot.callsign || stateData.pilot.name)) {
        sessionDesc.textContent = t("settings.connected_as", "Conectado como {pilot} na {va}.")
          .replace("{pilot}", stateData.pilot.callsign || stateData.pilot.name)
          .replace("{va}", (store.activeTenant && store.activeTenant.name) || "VA");
      } else if (store.activeTenant && store.activeTenant.name) {
        sessionDesc.textContent = t("settings.connected_va", "Conectado a {va}. Clique para trocar de companhia ou sair.")
          .replace("{va}", store.activeTenant.name);
      }
    }
  }

  function renderTabsBadge() {
    if (!rootEl) return;
    const badge = q("#as-acars-unread-badge");
    const homeBadge = q("#as-acars-home-unread-badge");
    const unreadCount = getUnreadMessages().length;
    setVisible(badge, unreadCount > 0);
    if (badge && unreadCount > 0) {
      badge.textContent = String(unreadCount);
    }
    setVisible(homeBadge, unreadCount > 0);
    if (homeBadge && unreadCount > 0) {
      homeBadge.textContent = String(unreadCount);
    }

    const notamsBadge = q("#as-acars-home-notams-badge");
    const notamsCount = stateData.notams.length;
    setVisible(notamsBadge, notamsCount > 0);
    if (notamsBadge && notamsCount > 0) {
      notamsBadge.textContent = String(notamsCount);
    }
  }

  function scrollChatToBottom() {
    if (!rootEl) return;
    const feedEl = q("#as-acars-chat-list");
    if (!feedEl) return;

    feedEl.scrollTop = feedEl.scrollHeight;
    setTimeout(function () {
      if (feedEl) feedEl.scrollTop = feedEl.scrollHeight;
    }, 20);
    setTimeout(function () {
      if (feedEl) feedEl.scrollTop = feedEl.scrollHeight;
    }, 100);
    setTimeout(function () {
      if (feedEl) feedEl.scrollTop = feedEl.scrollHeight;
    }, 300);
  }

  function renderChatTab(scrollToEnd) {
    if (scrollToEnd === undefined) {
      scrollToEnd = true;
    }
    if (!rootEl) return;
    const countEl = q("#as-acars-msg-count");
    const feedEl = q("#as-acars-chat-list");
    const sendBtn = q("#as-acars-chat-send");

    if (countEl) {
      countEl.textContent =
        stateData.messages.length === 1
          ? t("vocc.single_message")
          : t("vocc.messages_count", { count: stateData.messages.length });
    }
    if (sendBtn) {
      sendBtn.disabled = stateData.sendingMessage;
      sendBtn.textContent = stateData.sendingMessage ? "..." : t("vocc.btn_send");
    }
    if (!feedEl) return;

    if (stateData.messages.length === 0) {
      feedEl.innerHTML =
        '<div class="as-acars-empty-state">' + escapeHtml(t("vocc.no_messages")) + '</div>';
      return;
    }

    feedEl.innerHTML = stateData.messages
      .map(function (msg) {
        const kind = classifyMessageSender(msg);
        const timeStr = formatTime(msg.timestamp);
        if (kind === "user") {
          return (
            '<div class="as-acars-msg-row as-acars-msg-row-user">' +
            '<div class="as-acars-msg-bubble as-acars-msg-bubble-user">' +
            '<div class="as-acars-msg-text">' +
            escapeHtml(msg.text) +
            "</div>" +
            '<span class="as-acars-msg-time">' +
            escapeHtml(timeStr) +
            "</span>" +
            "</div>" +
            "</div>"
          );
        }
        if (kind === "acars") {
          const roleLabel = msg.senderRole ? msg.senderRole.toLowerCase() : "occ";
          return (
            '<div class="as-acars-msg-row as-acars-msg-row-acars">' +
            '<div class="as-acars-msg-bubble as-acars-msg-bubble-acars">' +
            '<div class="as-acars-msg-header">' +
            '<span class="as-acars-msg-sender">' +
            escapeHtml(msg.senderName || "vOCC") +
            "</span>" +
            '<span class="as-acars-msg-role">' +
            escapeHtml(roleLabel) +
            "</span>" +
            "</div>" +
            '<div class="as-acars-msg-text">' +
            escapeHtml(msg.text) +
            "</div>" +
            '<span class="as-acars-msg-time">' +
            escapeHtml(timeStr) +
            "</span>" +
            "</div>" +
            "</div>"
          );
        }
        return (
          '<div class="as-acars-msg-row as-acars-msg-row-other">' +
          '<div class="as-acars-msg-bubble as-acars-msg-bubble-other">' +
          '<div class="as-acars-msg-header">' +
          '<span class="as-acars-msg-sender">' +
          escapeHtml(msg.senderName || "vOCC") +
          "</span>" +
          (msg.senderRole ? '<span class="as-acars-msg-role">' + escapeHtml(msg.senderRole.toLowerCase()) + "</span>" : "") +
          "</div>" +
          '<div class="as-acars-msg-text">' +
          escapeHtml(msg.text) +
          "</div>" +
          '<span class="as-acars-msg-time">' +
          escapeHtml(timeStr) +
          "</span>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    if (scrollToEnd) {
      scrollChatToBottom();
    }
  }

  function renderBriefingShortcuts() {
    if (!rootEl) return;
    const routeLabel = q("#as-acars-briefing-route-label");
    const depBtn = q("#as-acars-btn-dep-icao");
    const arrBtn = q("#as-acars-btn-arr-icao");
    const altBtn = q("#as-acars-btn-alt-icao");

    const b = stateData.booking;
    const dep = b && b.departure_airport && b.departure_airport.icao ? String(b.departure_airport.icao) : "";
    const arr = b && b.arrival_airport && b.arrival_airport.icao ? String(b.arrival_airport.icao) : "";
    const alt = b && b.alternate_airport && b.alternate_airport.icao ? String(b.alternate_airport.icao) : "";

    if (routeLabel) {
      routeLabel.textContent = dep || arr ? (dep || "----") + " -> " + (arr || "----") : t("docs.quick_icao");
    }

    setVisible(depBtn, Boolean(dep));
    if (depBtn && dep) {
      depBtn.textContent = "DEP: " + dep;
      depBtn.setAttribute("data-icao", dep);
    }

    setVisible(arrBtn, Boolean(arr));
    if (arrBtn && arr) {
      arrBtn.textContent = "ARR: " + arr;
      arrBtn.setAttribute("data-icao", arr);
    }

    setVisible(altBtn, Boolean(alt));
    if (altBtn && alt) {
      altBtn.textContent = "ALT: " + alt;
      altBtn.setAttribute("data-icao", alt);
    }
  }

  function getDocBadgeHtml(doc) {
    if (doc.is_auto_generated) {
      return '<span class="as-acars-doc-badge as-acars-doc-badge-auto">Auto</span>';
    }
    if (doc.type === "pdf" || (doc.file_url && !doc.content)) {
      return '<span class="as-acars-doc-badge as-acars-doc-badge-pdf">PDF</span>';
    }
    if (doc.type === "folder") {
      return '<span class="as-acars-doc-badge as-acars-doc-badge-folder">Pasta</span>';
    }
    return '<span class="as-acars-doc-badge as-acars-doc-badge-html">HTML</span>';
  }

  function formatBriefingDate(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return months[d.getUTCMonth()] + " " + d.getUTCDate() + ", " + d.getUTCFullYear();
    } catch (_e) {
      return "";
    }
  }

  const AIRPORT_BRIEFING_DATABASE = {
    SBGR: {
      icao: "SBGR",
      iata: "GRU",
      name: "Guarulhos - Sao Paulo",
      city: "S\u00E3o Paulo",
      country: "Brazil",
      timezone: "UTC-3",
      timezone_sub: "-3",
      operation: "IFR + Night",
      operation_type: "Operation type",
      elevation_ft: 2461,
      transition_altitude: 8000,
      runways: [
        { designator: "10L", length_m: 3700, width_m: 45, heading: 95, ils: true },
        { designator: "28R", length_m: 3700, width_m: 45, heading: 275, ils: true },
        { designator: "10R", length_m: 3000, width_m: 45, heading: 95, ils: true },
        { designator: "28L", length_m: 3000, width_m: 45, heading: 275, ils: true }
      ],
      services: [
        { type: "Fuel (Jet)", provider: "AirBP", dot: "dot-green", notes: "\u2014" },
        { type: "Ground Handling", provider: "Swissport", dot: "dot-red", notes: "\u2014" },
        { type: "Ground Power", provider: "Swissport", dot: "dot-red", notes: "\u2014" },
        { type: "Air Starter", provider: "Swissport", dot: "dot-red", notes: "\u2014" }
      ],
      threats: [
        { type: "Obstacles", severity: "amber" },
        { type: "Wildlife \u2014 P\u00E1ssaros", severity: "emerald" },
        { type: "Runway Incursion", severity: "rose" }
      ],
      stands: [
        { fleets: "A320, A20N, A21N, B738, B737, B38M, E195, E295, B77W, B789, A339", stands: "1 | POS 101-104, 105L, 106, 107L, 108, 109L, 110, 111L, 112, 113L, 114, 115L, 201-209, 217-226" },
        { fleets: "ALL AIRCRAFT", stands: "2 | POS 210-216, 301-304, 401-411, 501-507" },
        { fleets: "B737NG, B737, B38M, E190, E195, E295, A319, A320, A20N, A321, A21N", stands: "3 | POS 601-608" }
      ],
      alternates: [
        { icao: "SBKP", name: "Viracopos - Campinas" },
        { icao: "SBSJ", name: "Sao Jose Dos Campos" },
        { icao: "SBGL", name: "Gale\u00E3o" }
      ],
      operational_notes: [
        {
          context: "Arrival",
          category: "Operation",
          body: "Os pilotos dever\u00E3o livrar a pista de pouso e decolagem nas pistas de t\u00E1xi indicadas abaixo ou informar \u00E0 TWR Guarulhos no primeiro contato caso n\u00E3o estejam configuradas para utilizar as seguintes pistas de t\u00E1xi: Aeronaves CAT C, D ou E: Pista de T\u00E1xi BB ou CC Dist\u00E2ncia dispon\u00EDvel da cabeceira 10R at\u00E9 a Pista de T\u00E1xi CC: 2450m."
        },
        {
          context: "Arrival",
          category: "Operation",
          body: "Os pilotos dever\u00E3o livrar a pista de pouso e decolagem nas pistas de t\u00E1xi indicadas abaixo ou informar \u00E0 TWR Guarulhos no primeiro contato caso n\u00E3o estejam configuradas para utilizar as seguintes pistas de t\u00E1xi: Aeronaves CAT C, D ou E: Pista de T\u00E1xi G Dist\u00E2ncia dispon\u00EDvel da cabeceira 28L at\u00E9 a Pista de T\u00E1xi G: 2487m"
        },
        {
          context: "Departure",
          category: "Operation",
          body: "Os pilotos devem estar prontos para a decolagem quando chegarem ao ponto de espera. Caso contr\u00E1rio, informar o controle de solo."
        },
        {
          context: "Departure",
          category: "Operation",
          body: "Alinhamento deve ser imediato assim que autorizado"
        }
      ]
    },
    SBKP: {
      icao: "SBKP",
      iata: "VCP",
      name: "Viracopos - Campinas",
      city: "Campinas",
      country: "Brazil",
      timezone: "UTC-3",
      timezone_sub: "-3",
      operation: "IFR + Night",
      operation_type: "Operation type",
      elevation_ft: 2170,
      transition_altitude: 8000,
      runways: [
        { designator: "15", length_m: 3240, width_m: 45, heading: 148, ils: true },
        { designator: "33", length_m: 3240, width_m: 45, heading: 328, ils: true }
      ],
      services: [
        { type: "Fuel (Jet)", provider: "BR Aviation", dot: "dot-green", notes: "\u2014" },
        { type: "Ground Handling", provider: "Swissport", dot: "dot-red", notes: "\u2014" },
        { type: "Ground Power", provider: "Swissport", dot: "dot-red", notes: "\u2014" }
      ],
      threats: [
        { type: "Obstacles", severity: "amber" },
        { type: "Wildlife \u2014 P\u00E1ssaros", severity: "emerald" }
      ],
      stands: [
        { fleets: "ALL AIRCRAFT", stands: "POS 01-18, 101-115" }
      ],
      alternates: [
        { icao: "SBGR", name: "Guarulhos - Sao Paulo" },
        { icao: "SBSJ", name: "Sao Jose Dos Campos" },
        { icao: "SBGL", name: "Gale\u00E3o" }
      ],
      operational_notes: [
        {
          context: "General",
          category: "Operation",
          body: "Principal aeroporto alternativo para a TMA Sao Paulo. Operacao 24h sem restricoes de slot."
        },
        {
          context: "Arrival",
          category: "Operation",
          body: "RWY 15 preferencial com procedimentos RNAV/ILS integrados."
        }
      ]
    },
    SBSJ: {
      icao: "SBSJ",
      iata: "SJK",
      name: "Prof. Urbano Ernesto Stumpf",
      city: "Sao Jose dos Campos",
      country: "Brazil",
      timezone: "UTC-3",
      timezone_sub: "-3",
      operation: "IFR + Night",
      operation_type: "Operation type",
      elevation_ft: 2120,
      transition_altitude: 8000,
      runways: [
        { designator: "15", length_m: 2676, width_m: 45, heading: 146, ils: true },
        { designator: "33", length_m: 2676, width_m: 45, heading: 326, ils: false }
      ],
      services: [
        { type: "Fuel (Jet)", provider: "Shell Aviation", dot: "dot-green", notes: "\u2014" },
        { type: "Ground Handling", provider: "Dnata", dot: "dot-red", notes: "\u2014" }
      ],
      threats: [
        { type: "Obstacles", severity: "amber" }
      ],
      stands: [
        { fleets: "ALL AIRCRAFT", stands: "POS 1-6" }
      ],
      alternates: [
        { icao: "SBGR", name: "Guarulhos - Sao Paulo" },
        { icao: "SBKP", name: "Viracopos - Campinas" }
      ],
      operational_notes: [
        {
          context: "General",
          category: "Operation",
          body: "Operacao conjunta civil e militar (DCTA). Coordenacao previa com o controle recomendada."
        }
      ]
    },
    SBGL: {
      icao: "SBGL",
      iata: "GIG",
      name: "Gale\u00E3o - Antonio Carlos Jobim",
      city: "Rio de Janeiro",
      country: "Brazil",
      timezone: "UTC-3",
      timezone_sub: "-3",
      operation: "IFR + Night",
      operation_type: "Operation type",
      elevation_ft: 28,
      transition_altitude: 7000,
      runways: [
        { designator: "10", length_m: 4000, width_m: 45, heading: 96, ils: true },
        { designator: "28", length_m: 4000, width_m: 45, heading: 276, ils: true },
        { designator: "15", length_m: 3180, width_m: 47, heading: 146, ils: true },
        { designator: "33", length_m: 3180, width_m: 47, heading: 326, ils: true }
      ],
      services: [
        { type: "Fuel (Jet)", provider: "AirBP", dot: "dot-green", notes: "\u2014" },
        { type: "Ground Handling", provider: "Swissport", dot: "dot-red", notes: "\u2014" },
        { type: "Ground Power", provider: "Swissport", dot: "dot-red", notes: "\u2014" }
      ],
      threats: [
        { type: "Wildlife \u2014 P\u00E1ssaros", severity: "emerald" },
        { type: "Obstacles", severity: "amber" }
      ],
      stands: [
        { fleets: "ALL AIRCRAFT", stands: "POS 1-60" }
      ],
      alternates: [
        { icao: "SBGR", name: "Guarulhos - Sao Paulo" },
        { icao: "SBKP", name: "Viracopos - Campinas" }
      ],
      operational_notes: [
        {
          context: "Arrival",
          category: "Operation",
          body: "RWY 10/28 preferencial para chegadas IFR com aproximacao sobre a baia de Guanabara."
        }
      ]
    },
    SBEG: {
      icao: "SBEG",
      iata: "MAO",
      name: "Eduardo Gomes",
      city: "Manaus",
      country: "Brazil",
      timezone: "UTC-4",
      timezone_sub: "-4",
      operation: "IFR + Night",
      operation_type: "Operation type",
      elevation_ft: 262,
      transition_altitude: 5000,
      runways: [
        { designator: "11", length_m: 2700, width_m: 45, heading: 106, ils: true },
        { designator: "29", length_m: 2700, width_m: 45, heading: 286, ils: false }
      ],
      services: [
        { type: "Fuel (Jet)", provider: "Ra\u00EDzen", dot: "dot-green", notes: "\u2014" },
        { type: "Ground Handling", provider: "Dnata", dot: "dot-red", notes: "\u2014" },
        { type: "Ground Power", provider: "Dnata", dot: "dot-red", notes: "\u2014" },
        { type: "Air Starter", provider: "Dnata", dot: "dot-red", notes: "\u2014" }
      ],
      threats: [
        { type: "General Aviation", severity: "amber" },
        { type: "Wildlife \u2014 P\u00E1ssaros", severity: "emerald" }
      ],
      stands: [
        { fleets: "A320, A20N, A321, B737MAX", stands: "1 | POS 22-26" },
        { fleets: "ALL AIRCRAFT", stands: "1 | POS 19-21, 19A, 21A, 23A" }
      ],
      alternates: [
        { icao: "SBBV", name: "Boa Vista" },
        { icao: "SBBE", name: "Bel\u00E9m Val De Cans" },
        { icao: "SBSN", name: "Santar\u00E9m" }
      ],
      operational_notes: [
        {
          context: "General",
          category: "Operation",
          body: "Operacao Amazonica: atencao redobrada para formacoes convectivas e chuvas torrenciais no periodo vespertino."
        },
        {
          context: "Arrival",
          category: "Operation",
          body: "RWY 11 preferencial para pouso com procedimento ILS disponivel."
        }
      ]
    },
    SBSP: {
      icao: "SBSP",
      iata: "CGH",
      name: "Congonhas - Sao Paulo",
      city: "S\u00E3o Paulo",
      country: "Brazil",
      timezone: "UTC-3",
      timezone_sub: "-3",
      operation: "IFR + Night",
      operation_type: "Operation type",
      elevation_ft: 2631,
      transition_altitude: 8000,
      runways: [
        { designator: "17R", length_m: 1883, width_m: 45, heading: 169, ils: true },
        { designator: "35L", length_m: 1883, width_m: 45, heading: 349, ils: true },
        { designator: "17L", length_m: 1495, width_m: 45, heading: 169, ils: false },
        { designator: "35R", length_m: 1495, width_m: 45, heading: 349, ils: false }
      ],
      services: [
        { type: "Fuel (Jet)", provider: "BR Aviation", dot: "dot-green", notes: "\u2014" },
        { type: "Ground Handling", provider: "Swissport", dot: "dot-red", notes: "\u2014" },
        { type: "Ground Power", provider: "Swissport", dot: "dot-red", notes: "\u2014" },
        { type: "Air Starter", provider: "Swissport", dot: "dot-red", notes: "\u2014" }
      ],
      threats: [
        { type: "Obstacles \u2014 Edificios circundantes", severity: "rose" },
        { type: "Runway Length / Overrun", severity: "amber" },
        { type: "Wildlife \u2014 Passaros", severity: "emerald" }
      ],
      stands: [
        { fleets: "A320, A20N, B738, B38M, E195", stands: "3 | POS 13-29" },
        { fleets: "ALL AIRCRAFT", stands: "3 | POS 1-12 Remotas" }
      ],
      alternates: [
        { icao: "SBKP", name: "Viracopos - Campinas" },
        { icao: "SBGR", name: "Guarulhos - Sao Paulo" },
        { icao: "SBGL", name: "Gale\u00E3o" }
      ],
      operational_notes: [
        {
          context: "General",
          category: "Operation",
          body: "Operacao restrita a pista seca ou molhada com EMAS ativo. Curva de ruido mandatoria apos a decolagem."
        },
        {
          context: "Arrival",
          category: "Operation",
          body: "RWY 17R/35L preferencial para pouso com procedimento ILS disponivel."
        }
      ]
    },
    SBBR: {
      icao: "SBBR",
      iata: "BSB",
      name: "Brasilia Juscelino Kubitschek",
      city: "Bras\u00EDlia",
      country: "Brazil",
      timezone: "UTC-3",
      timezone_sub: "-3",
      operation: "IFR + Night",
      operation_type: "Operation type",
      elevation_ft: 3497,
      transition_altitude: 7000,
      runways: [
        { designator: "11R", length_m: 3300, width_m: 45, heading: 108, ils: true },
        { designator: "29L", length_m: 3300, width_m: 45, heading: 288, ils: true },
        { designator: "11L", length_m: 3200, width_m: 45, heading: 108, ils: true },
        { designator: "29R", length_m: 3200, width_m: 45, heading: 288, ils: true }
      ],
      services: [
        { type: "Fuel (Jet)", provider: "AirBP", dot: "dot-green", notes: "\u2014" },
        { type: "Ground Handling", provider: "Swissport", dot: "dot-red", notes: "\u2014" },
        { type: "Ground Power", provider: "Swissport", dot: "dot-red", notes: "\u2014" },
        { type: "Air Starter", provider: "Swissport", dot: "dot-red", notes: "\u2014" }
      ],
      threats: [
        { type: "Obstacles", severity: "amber" },
        { type: "General Aviation", severity: "amber" },
        { type: "Terrain / High Elevation", severity: "amber" }
      ],
      stands: [
        { fleets: "A320, A20N, A21N, B38M", stands: "2 | POS 61-66" },
        { fleets: "B737, B747, B777, MD11", stands: "1 | POS 47A, 49A, 52-60" }
      ],
      alternates: [
        { icao: "SBGO", name: "Goiania Santa Genoveva" },
        { icao: "SBCF", name: "Confins Tancredo Neves" },
        { icao: "SBGR", name: "Guarulhos - Sao Paulo" }
      ],
      operational_notes: [
        {
          context: "General",
          category: "Operation",
          body: "Operacoes HIRO aplicadas nos horarios de pico. Chamada imediata ao APP Brasilia apos a decolagem."
        },
        {
          context: "Arrival",
          category: "Operation",
          body: "Configuracao preferencial RWY 11R/11L com vento de cauda ate 7KT."
        }
      ]
    },
    SBRJ: {
      icao: "SBRJ",
      iata: "SDU",
      name: "Santos Dumont",
      city: "Rio de Janeiro",
      country: "Brazil",
      timezone: "UTC-3",
      timezone_sub: "-3",
      operation: "IFR + Night",
      operation_type: "Operation type",
      elevation_ft: 9,
      transition_altitude: 7000,
      runways: [
        { designator: "02R", length_m: 1323, width_m: 42, heading: 24, ils: false },
        { designator: "20L", length_m: 1323, width_m: 42, heading: 204, ils: false },
        { designator: "02L", length_m: 1260, width_m: 30, heading: 24, ils: false },
        { designator: "20R", length_m: 1260, width_m: 30, heading: 204, ils: false }
      ],
      services: [
        { type: "Fuel (Jet)", provider: "BR Aviation", dot: "dot-green", notes: "\u2014" },
        { type: "Ground Handling", provider: "Swissport", dot: "dot-red", notes: "\u2014" }
      ],
      threats: [
        { type: "Terrain / Pao de Acucar", severity: "rose" },
        { type: "Short Runway", severity: "amber" }
      ],
      stands: [
        { fleets: "A320, B737, E195", stands: "POS 1-8" }
      ]
    },
    SBCF: {
      icao: "SBCF",
      iata: "CNF",
      name: "Tancredo Neves - Confins",
      city: "Belo Horizonte",
      country: "Brazil",
      timezone: "UTC-3",
      timezone_sub: "-3",
      operation: "IFR + Night",
      operation_type: "Operation type",
      elevation_ft: 2717,
      transition_altitude: 8000,
      runways: [
        { designator: "16", length_m: 3600, width_m: 45, heading: 160, ils: true },
        { designator: "34", length_m: 3600, width_m: 45, heading: 340, ils: true }
      ],
      services: [
        { type: "Fuel (Jet)", provider: "AirBP / Shell", dot: "dot-green", notes: "\u2014" },
        { type: "Ground Handling", provider: "Swissport", dot: "dot-red", notes: "\u2014" }
      ],
      threats: [
        { type: "Obstacles", severity: "amber" },
        { type: "Bird Activity", severity: "emerald" }
      ],
      stands: [
        { fleets: "ALL AIRCRAFT", stands: "POS 1-32" }
      ]
    },
    SBPA: {
      icao: "SBPA",
      iata: "POA",
      name: "Salgado Filho",
      city: "Porto Alegre",
      country: "Brazil",
      timezone: "UTC-3",
      timezone_sub: "-3",
      operation: "IFR + Night",
      operation_type: "Operation type",
      elevation_ft: 11,
      transition_altitude: 6000,
      runways: [
        { designator: "11", length_m: 3200, width_m: 45, heading: 107, ils: true },
        { designator: "29", length_m: 3200, width_m: 45, heading: 287, ils: true }
      ],
      services: [
        { type: "Fuel (Jet)", provider: "BR Aviation", dot: "dot-green", notes: "\u2014" },
        { type: "Ground Handling", provider: "Swissport", dot: "dot-red", notes: "\u2014" }
      ],
      threats: [
        { type: "Birds / Jacui Delta", severity: "emerald" },
        { type: "Fog / Low Visibility", severity: "amber" }
      ],
      stands: [
        { fleets: "ALL AIRCRAFT", stands: "POS 1-16" }
      ]
    },
    SBRF: {
      icao: "SBRF",
      iata: "REC",
      name: "Guararapes - Gilberto Freyre",
      city: "Recife",
      country: "Brazil",
      timezone: "UTC-3",
      timezone_sub: "-3",
      operation: "IFR + Night",
      operation_type: "Operation type",
      elevation_ft: 33,
      transition_altitude: 5000,
      runways: [
        { designator: "18", length_m: 3007, width_m: 45, heading: 177, ils: true },
        { designator: "36", length_m: 3007, width_m: 45, heading: 357, ils: true }
      ],
      services: [
        { type: "Fuel (Jet)", provider: "BR / Shell", dot: "dot-green", notes: "\u2014" },
        { type: "Ground Handling", provider: "Swissport", dot: "dot-red", notes: "\u2014" }
      ],
      threats: [
        { type: "Obstacles / Urban Area", severity: "amber" }
      ],
      stands: [
        { fleets: "ALL AIRCRAFT", stands: "POS 1-22" }
      ]
    },
    SBSV: {
      icao: "SBSV",
      iata: "SSA",
      name: "Deputado Luis Eduardo Magalhaes",
      city: "Salvador",
      country: "Brazil",
      timezone: "UTC-3",
      timezone_sub: "-3",
      operation: "IFR + Night",
      operation_type: "Operation type",
      elevation_ft: 64,
      transition_altitude: 5000,
      runways: [
        { designator: "10", length_m: 3003, width_m: 45, heading: 101, ils: true },
        { designator: "28", length_m: 3003, width_m: 45, heading: 281, ils: true },
        { designator: "17", length_m: 1520, width_m: 45, heading: 168, ils: false },
        { designator: "35", length_m: 1520, width_m: 45, heading: 348, ils: false }
      ],
      services: [
        { type: "Fuel (Jet)", provider: "BR Aviation", dot: "dot-green", notes: "\u2014" },
        { type: "Ground Handling", provider: "Swissport", dot: "dot-red", notes: "\u2014" }
      ],
      threats: [
        { type: "Birds / Dunes", severity: "emerald" },
        { type: "Windshear on Approach", severity: "amber" }
      ],
      stands: [
        { fleets: "ALL AIRCRAFT", stands: "POS 1-24" }
      ]
    }
  };

  function parseAirportBriefingContent(content, defaultCode, title) {
    const text = String(content || "")
      .replace(/<[^>]+>/g, "\n")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&");

    const icaoMatch = (title || "").match(/\b([A-Z0-9]{4})\b/) || text.match(/\b([A-Z0-9]{4})\s*(\/|-)/);
    const icao = (defaultCode || (icaoMatch ? icaoMatch[1] : "AIRP")).toUpperCase();

    const iataMatch = text.match(/\b[A-Z0-9]{4}\s*\/\s*([A-Z]{3})\b/) || (title || "").match(/\b([A-Z]{3})\b/);
    const iata = iataMatch ? iataMatch[1] : "";

    let name = "";
    if (title && title.indexOf("\u2014") !== -1) {
      name = title.split("\u2014")[1].trim();
    } else if (title && title.indexOf("-") !== -1) {
      name = title.split("-")[1].trim();
    }
    if (!name) name = icao + " Airport";

    let elev = 0;
    const elevMatch = text.match(/Elevation[:\s]*([0-9,]+)\s*ft/i) || text.match(/([0-9,]+)\s*ft\s*AMSL/i);
    if (elevMatch) elev = parseInt(elevMatch[1].replace(/,/g, ""), 10);

    let ta = 8000;
    const taMatch = text.match(/Transition Altitude[:\s]*([0-9,]+)/i) || text.match(/TA[:\s]*([0-9,]+)/i);
    if (taMatch) ta = parseInt(taMatch[1].replace(/,/g, ""), 10);

    let tz = "UTC-3";
    let tzSub = "-3";
    const tzMatch = text.match(/(UTC[+-]\d+)/i);
    if (tzMatch) {
      tz = tzMatch[1];
      tzSub = tz.replace("UTC", "");
    }

    let op = "IFR + Night";
    if (/VFR\s*\+\s*Night/i.test(text)) op = "VFR + Night";
    else if (/IFR/i.test(text)) op = "IFR + Night";

    const runways = [];
    const rwRegex = /\b(\d{1,2}[LRC]?)\b[^\n\d]*(\d{1,2}[0-9,]+)\s*(?:x|\u00D7|\*)\s*(\d{2,3})m?[^\n\d]*(\d{2,3})[^\n]*(ILS)?/gi;
    let rm;
    while ((rm = rwRegex.exec(text)) !== null) {
      runways.push({
        designator: rm[1].toUpperCase(),
        length_m: parseInt(rm[2].replace(/,/g, ""), 10),
        width_m: parseInt(rm[3], 10),
        heading: parseInt(rm[4], 10),
        ils: Boolean(rm[5])
      });
    }

    return {
      icao: icao,
      iata: iata,
      name: name,
      city: name,
      country: "Brazil",
      timezone: tz,
      timezone_sub: tzSub,
      operation: op,
      operation_type: "Operation type",
      elevation_ft: elev || 2461,
      transition_altitude: ta || 8000,
      runways: runways.length > 0 ? runways : [
        { designator: "10L", length_m: 3700, width_m: 45, heading: 95, ils: true },
        { designator: "28R", length_m: 3700, width_m: 45, heading: 275, ils: true }
      ],
      services: [
        { type: "Fuel (Jet)", provider: "AirBP", dot: "dot-green", notes: "\u2014" },
        { type: "Ground Handling", provider: "Swissport", dot: "dot-red", notes: "\u2014" }
      ],
      threats: [
        { type: "Obstacles", severity: "amber" },
        { type: "Wildlife", severity: "emerald" }
      ],
      stands: []
    };
  }

  function buildAirportBriefingHtml(b) {
    if (!b) return "";
    let html = '<div class="as-acars-briefing-doc">';

    // 1. Hero Card
    html +=
      '<div class="as-acars-briefing-hero">' +
        '<div class="as-acars-briefing-hero-title">' +
          '<span class="as-acars-briefing-hero-icao">' + escapeHtml(b.icao || "") + '</span>' +
          (b.iata ? '<span class="as-acars-briefing-hero-iata"> / ' + escapeHtml(b.iata) + '</span>' : "") +
        '</div>' +
        '<div class="as-acars-briefing-hero-name">' + escapeHtml(b.name || "") + '</div>' +
        '<div class="as-acars-briefing-hero-city">' + escapeHtml((b.city || "") + (b.country ? ", " + b.country : "")) + '</div>' +
      '</div>';

    // 2. General Information
    html +=
      '<h3 class="as-acars-briefing-sec-title">General Information</h3>' +
      '<div class="as-acars-briefing-kpi-grid">' +
        '<div class="as-acars-briefing-kpi">' +
          '<div class="as-acars-briefing-kpi-label">TIMEZONE</div>' +
          '<div class="as-acars-briefing-kpi-val">' + escapeHtml(b.timezone || "UTC-3") + '</div>' +
          '<div class="as-acars-briefing-kpi-sub">' + escapeHtml(b.timezone_sub || "-3") + '</div>' +
        '</div>' +
        '<div class="as-acars-briefing-kpi">' +
          '<div class="as-acars-briefing-kpi-label">OPERATION</div>' +
          '<div class="as-acars-briefing-kpi-val">' + escapeHtml(b.operation || "IFR + Night") + '</div>' +
          '<div class="as-acars-briefing-kpi-sub">' + escapeHtml(b.operation_type || "Operation type") + '</div>' +
        '</div>' +
        '<div class="as-acars-briefing-kpi">' +
          '<div class="as-acars-briefing-kpi-label">ELEVATION</div>' +
          '<div class="as-acars-briefing-kpi-val">' + (b.elevation_ft !== undefined ? Number(b.elevation_ft).toLocaleString() : "2,461") + ' <span class="as-acars-unit">ft</span></div>' +
          '<div class="as-acars-briefing-kpi-sub">AMSL</div>' +
        '</div>' +
        '<div class="as-acars-briefing-kpi">' +
          '<div class="as-acars-briefing-kpi-label">TRANSITION ALTITUDE</div>' +
          '<div class="as-acars-briefing-kpi-val">' + (b.transition_altitude !== undefined ? Number(b.transition_altitude).toLocaleString() : "8,000") + ' <span class="as-acars-unit">ft</span></div>' +
          '<div class="as-acars-briefing-kpi-sub">TA</div>' +
        '</div>' +
      '</div>';

    // 3. Runways
    if (Array.isArray(b.runways) && b.runways.length > 0) {
      html +=
        '<h3 class="as-acars-briefing-sec-title">Runways</h3>' +
        '<div class="as-acars-briefing-card-table">' +
          '<table class="as-acars-briefing-table">' +
            '<thead>' +
              '<tr>' +
                '<th>DESIGNATOR</th>' +
                '<th>DIMENSIONS</th>' +
                '<th>HEADING</th>' +
                '<th>ILS</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>';
      for (let i = 0; i < b.runways.length; i++) {
        const rw = b.runways[i];
        const len = rw.length_m || rw.full_length_m || 0;
        const wid = rw.width_m || 45;
        const dimStr = len ? Number(len).toLocaleString() + " \u00D7 " + wid + "m" : "\u2014";
        const rwHdg = rw.heading !== undefined ? rw.heading : rw.magnetic_heading !== undefined ? rw.magnetic_heading : "";
        const hdgStr = rwHdg !== "" ? rwHdg + '<span class="as-acars-deg">o</span>' : "\u2014";
        const ilsBadge = rw.ils ? '<span class="as-acars-badge-ils">ILS</span>' : "\u2014";
        html +=
          '<tr>' +
            '<td><strong>' + escapeHtml(rw.designator || "") + '</strong></td>' +
            '<td>' + escapeHtml(dimStr) + '</td>' +
            '<td>' + hdgStr + '</td>' +
            '<td>' + ilsBadge + '</td>' +
          '</tr>';
      }
      html += '</tbody></table></div>';
    }

    // 4. Services
    if (Array.isArray(b.services) && b.services.length > 0) {
      html +=
        '<h3 class="as-acars-briefing-sec-title">Services</h3>' +
        '<div class="as-acars-briefing-card-table">' +
          '<table class="as-acars-briefing-table">' +
            '<thead>' +
              '<tr>' +
                '<th>SERVICE</th>' +
                '<th>PROVIDER</th>' +
                '<th>NOTES</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>';
      for (let i = 0; i < b.services.length; i++) {
        const s = b.services[i];
        const dotCls = s.dot || (s.type && s.type.indexOf("Fuel") !== -1 ? "dot-green" : "dot-red");
        html +=
          '<tr>' +
            '<td>' + escapeHtml(s.type || "") + '</td>' +
            '<td><span class="as-acars-briefing-provider"><span class="as-acars-provider-dot ' + dotCls + '"></span> ' + escapeHtml(s.provider || "\u2014") + '</span></td>' +
            '<td>' + escapeHtml(s.notes || "\u2014") + '</td>' +
          '</tr>';
      }
      html += '</tbody></table></div>';
    }

    // 5. Threats
    if (Array.isArray(b.threats) && b.threats.length > 0) {
      html +=
        '<h3 class="as-acars-briefing-sec-title">Threats</h3>' +
        '<div class="as-acars-briefing-threats-wrap">';
      for (let i = 0; i < b.threats.length; i++) {
        const th = b.threats[i];
        const thName = th.notes ? th.type + " \u2014 " + th.notes : th.type;
        const thColor = th.severity || (th.type === "Obstacles" ? "amber" : th.type === "Wildlife" ? "emerald" : "rose");
        html += '<span class="as-acars-threat-pill as-acars-threat-' + thColor + '">' + escapeHtml(thName) + '</span>';
      }
      html += '</div>';
    }

    // 6. Stands
    if (Array.isArray(b.stands) && b.stands.length > 0) {
      html +=
        '<h3 class="as-acars-briefing-sec-title">Stands</h3>' +
        '<div class="as-acars-briefing-stands-list">';
      for (let i = 0; i < b.stands.length; i++) {
        const st = b.stands[i];
        html +=
          '<div class="as-acars-briefing-stand-card">' +
            '<div class="as-acars-briefing-stand-fleets">' + escapeHtml(st.fleets || "ALL AIRCRAFT") + '</div>' +
            '<div class="as-acars-briefing-stand-pos">' + escapeHtml(st.stands || st.stand || "") + '</div>' +
          '</div>';
      }
      html += '</div>';
    }

    // 7. Alternates
    if (Array.isArray(b.alternates) && b.alternates.length > 0) {
      html +=
        '<h3 class="as-acars-briefing-sec-title">Alternates</h3>' +
        '<div class="as-acars-briefing-alternates-card">' +
          '<div class="as-acars-briefing-stand-fleets">ALL AIRCRAFT</div>' +
          '<div class="as-acars-briefing-alternates-row">';
      for (let i = 0; i < b.alternates.length; i++) {
        const alt = b.alternates[i];
        const icaoCode = typeof alt === "string" ? alt : alt.icao || "";
        const altName = typeof alt === "object" && alt.name ? alt.name : icaoCode;
        html += '<button type="button" class="as-acars-alternate-pill" data-briefing-icao="' + escapeHtml(icaoCode) + '" title="' + escapeHtml(altName) + '">' + escapeHtml(icaoCode) + '</button>';
      }
      html += '</div></div>';
    }

    // 8. Operational Information
    if (Array.isArray(b.operational_notes) && b.operational_notes.length > 0) {
      html += '<h3 class="as-acars-briefing-sec-title">Operational Information</h3>';
      const contexts = ["Arrival", "Departure", "General"];
      for (let c = 0; c < contexts.length; c++) {
        const ctx = contexts[c];
        const notes = b.operational_notes.filter(function (n) {
          return (n.context || "").toLowerCase() === ctx.toLowerCase();
        });
        if (notes.length > 0) {
          html += '<div class="as-acars-briefing-op-context">' + escapeHtml(ctx.toUpperCase()) + '</div>';
          for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            html +=
              '<div class="as-acars-briefing-op-card">' +
                '<span class="as-acars-op-badge">' + escapeHtml(note.category || "OPERATION") + '</span>' +
                '<div class="as-acars-briefing-op-text">' + escapeHtml(note.body || "") + '</div>' +
              '</div>';
          }
        }
      }
    }

    html += '</div>';
    return html;
  }

  function bindBriefingActions(container) {
    if (!container) return;
    const altBtns = container.querySelectorAll("[data-briefing-icao]");
    for (let i = 0; i < altBtns.length; i++) {
      altBtns[i].onclick = function (e) {
        e.preventDefault();
        const code = this.getAttribute("data-briefing-icao");
        if (code) {
          searchAirportDocumentByIcao(code);
        }
      };
    }
  }

  function renderDocsTab() {
    if (!rootEl) return;
    const clearBtn = q("#as-acars-doc-search-clear");
    const searchInput = q("#as-acars-doc-search");
    if (searchInput && searchInput.value !== stateData.docSearch) {
      searchInput.value = stateData.docSearch;
    }
    setVisible(clearBtn, Boolean(stateData.docSearch));

    const catBtns = rootEl.querySelectorAll("#as-acars-doc-categories [data-cat]");
    for (let i = 0; i < catBtns.length; i++) {
      const btn = catBtns[i];
      if (btn.getAttribute("data-cat") === stateData.docCategory) {
        btn.classList.add("as-acars-cat-active");
      } else {
        btn.classList.remove("as-acars-cat-active");
      }
    }

    const filtered = getFilteredDocuments();
    const countEl = q("#as-acars-docs-count");
    if (countEl) {
      countEl.textContent = t("docs.count_label", { count: filtered.length });
    }

    const listEl = q("#as-acars-doc-list");
    if (listEl) {
      if (stateData.docsLoading) {
        listEl.innerHTML = '<div class="as-acars-empty-state">' + escapeHtml(t("docs.loading")) + '</div>';
      } else if (stateData.docsError) {
        listEl.innerHTML = '<div class="as-acars-empty-state">' + escapeHtml(stateData.docsError) + "</div>";
      } else if (filtered.length === 0) {
        listEl.innerHTML = '<div class="as-acars-empty-state">' + escapeHtml(t("docs.empty_list")) + '</div>';
      } else {
        listEl.innerHTML = filtered
          .map(function (doc) {
            const isSelected = doc.id === stateData.selectedDocId;
            const subParts = [];
            if (doc.source) subParts.push(doc.source);
            const dt = formatDate(doc.created_at);
            if (dt) subParts.push(dt);
            return (
              '<button type="button" class="as-acars-doc-item' +
              (isSelected ? " as-acars-doc-item-active" : "") +
              '" data-doc-id="' +
              escapeHtml(doc.id) +
              '">' +
              '<div class="as-acars-doc-item-top">' +
              '<span class="as-acars-doc-item-title">' +
              escapeHtml(doc.title) +
              "</span>" +
              getDocBadgeHtml(doc) +
              "</div>" +
              (subParts.length > 0
                ? '<div class="as-acars-doc-item-sub">' + escapeHtml(subParts.join(" | ")) + "</div>"
                : "") +
              "</button>"
            );
          })
          .join("");
      }
    }

    const activeDoc =
      stateData.detailDoc ||
      stateData.documents.find(function (d) {
        return d.id === stateData.selectedDocId;
      }) ||
      null;

    const titleEl = q("#as-acars-doc-title");
    const metaEl = q("#as-acars-doc-meta");
    const bodyEl = q("#as-acars-doc-body");
    const openPdfBtn = q("#as-acars-btn-open-pdf");
    const parentBtn = q("#as-acars-btn-parent-folder");

    if (!activeDoc) {
      if (titleEl) titleEl.textContent = t("docs.select_prompt");
      if (metaEl) metaEl.textContent = "";
      setVisible(openPdfBtn, false);
      setVisible(parentBtn, false);
      if (bodyEl) {
        bodyEl.innerHTML =
          '<div class="as-acars-empty-state">' + escapeHtml(t("docs.empty_body")) + '</div>';
      }
      return;
    }

    if (titleEl) {
      let tHtml = renderTextWithEmojis(activeDoc.title);
      if (activeDoc.is_auto_generated) {
        tHtml += ' <span class="as-acars-doc-badge as-acars-doc-badge-auto">Auto</span>';
      }
      titleEl.innerHTML = tHtml;
    }
    if (metaEl) {
      const isBriefing =
        activeDoc.source_type === "airport" ||
        activeDoc.is_auto_generated ||
        (activeDoc.source && activeDoc.source.toLowerCase().indexOf("airport") !== -1) ||
        (activeDoc.title && activeDoc.title.toLowerCase().indexOf("briefing") !== -1) ||
        (activeDoc.title && activeDoc.title.indexOf(" \u2014 ") !== -1);

      if (isBriefing) {
        const dateStr = formatBriefingDate(activeDoc.updated_at || activeDoc.created_at) || "Feb 23, 2026";
        metaEl.innerHTML =
          '<span class="as-acars-doc-meta-item">' +
            '<svg class="as-acars-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>' +
            '<span>Airport briefing</span>' +
          '</span>' +
          '<span class="as-acars-doc-meta-sep">&#8226;</span>' +
          '<span class="as-acars-doc-meta-item">' +
            '<svg class="as-acars-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' +
            '<span>' + escapeHtml(dateStr) + '</span>' +
          '</span>';
      } else {
        const mParts = [];
        if (activeDoc.source) mParts.push(escapeHtml(activeDoc.source));
        const dt = formatDate(activeDoc.updated_at || activeDoc.created_at);
        if (dt) mParts.push("Atualizado em " + escapeHtml(dt));
        metaEl.textContent = mParts.join(" | ");
      }
    }

    const pdfTargetUrl =
      activeDoc.file_url ||
      (activeDoc.type !== "folder" ? getTenantBaseUrl() + "/api/v2/acars/documents/" + encodeURIComponent(activeDoc.id) + "/pdf" : "");
    setVisible(openPdfBtn, Boolean(activeDoc.file_url));
    setVisible(parentBtn, Boolean(activeDoc.parent_id));

    if (!bodyEl) return;

    if (stateData.detailDocLoading && !activeDoc.content && activeDoc.type !== "folder") {
      bodyEl.innerHTML = '<div class="as-acars-empty-state">' + escapeHtml(t("docs.loading")) + '</div>';
      return;
    }

    if (activeDoc.type === "folder") {
      const children = stateData.documents.filter(function (d) {
        return d.parent_id === activeDoc.id;
      });
      if (children.length === 0) {
        bodyEl.innerHTML = '<div class="as-acars-empty-state">' + escapeHtml(t("docs.empty_folder")) + '</div>';
      } else {
        bodyEl.innerHTML =
          '<div class="as-acars-folder-grid">' +
          children
            .map(function (c) {
              return (
                '<button type="button" class="as-acars-folder-card" data-doc-id="' +
                escapeHtml(c.id) +
                '">' +
                "<span>" +
                escapeHtml(c.title) +
                "</span>" +
                getDocBadgeHtml(c) +
                "</button>"
              );
            })
            .join("") +
          "</div>";
      }
      return;
    }

    // Airport Briefings formatting
    const icaoMatch = (activeDoc.title || "").match(/\b([A-Z0-9]{4})\b/);
    const code = icaoMatch ? icaoMatch[1].toUpperCase() : (activeDoc.id && activeDoc.id.length === 4 ? activeDoc.id.toUpperCase() : "");
    const isAutoBriefing =
      (activeDoc.is_auto_generated && (activeDoc.source_type === "airport" || activeDoc.parent_id === "9" || activeDoc.source === "Airport briefing" || Boolean(code))) ||
      (activeDoc.parent_id === "9" && activeDoc.is_auto_generated) ||
      (!activeDoc.content && Boolean(code));

    let briefingData = null;

    if (isAutoBriefing) {
      // 1. Check AIRPORT_BRIEFING_DATABASE (SBGR, SBRJ, SBGL, SBEG, SBKP, SBBR, SBSP, etc.)
      if (code && typeof AIRPORT_BRIEFING_DATABASE !== "undefined" && AIRPORT_BRIEFING_DATABASE[code]) {
        briefingData = AIRPORT_BRIEFING_DATABASE[code];
      }

      // 2. Check JSON content if provided
      if (!briefingData && activeDoc.content && typeof activeDoc.content === "string" && activeDoc.content.trim().indexOf("{") === 0) {
        try {
          const parsed = JSON.parse(activeDoc.content);
          if (parsed && (parsed.icao || parsed.runways || parsed.stands)) {
            briefingData = parsed;
          }
        } catch (_e) {}
      }

      // 3. Parse structured briefing from HTML / text content
      if (!briefingData && activeDoc.content) {
        briefingData = parseAirportBriefingContent(activeDoc.content, code, activeDoc.title);
      }

      // If briefing data was resolved, render with the official Airspace ACARS cards & tables!
      if (briefingData) {
        bodyEl.innerHTML = buildAirportBriefingHtml(briefingData);
        bindBriefingActions(bodyEl);
        return;
      }
    }

    if (activeDoc.content) {
      bodyEl.innerHTML = '<div class="as-acars-doc-html">' + sanitizeDocumentHtml(activeDoc.content) + "</div>";
      return;
    }

    // Fallback if content was empty: check if document title or id matches AIRPORT_BRIEFING_DATABASE
    const fallbackMatch = (activeDoc.title || "").match(/\b([A-Z0-9]{4})\b/);
    const fallbackCode = fallbackMatch ? fallbackMatch[1].toUpperCase() : (activeDoc.id && activeDoc.id.length === 4 ? activeDoc.id.toUpperCase() : "");
    if (fallbackCode && typeof AIRPORT_BRIEFING_DATABASE !== "undefined" && AIRPORT_BRIEFING_DATABASE[fallbackCode]) {
      bodyEl.innerHTML = buildAirportBriefingHtml(AIRPORT_BRIEFING_DATABASE[fallbackCode]);
      bindBriefingActions(bodyEl);
      return;
    }

    if (activeDoc.type === "pdf" || activeDoc.file_url) {
      bodyEl.innerHTML =
        '<div class="as-acars-empty-state">' +
        "<p>Este documento esta em formato <strong>PDF</strong> (" +
        escapeHtml(activeDoc.title) +
        ").</p>" +
        '<button type="button" class="as-acars-btn as-acars-btn-primary" data-open-url="' +
        escapeHtml(pdfTargetUrl) +
        '">' + escapeHtml(t("docs.btn_open_pdf")) + '</button>' +
        "</div>";
      return;
    }

    bodyEl.innerHTML = '<div class="as-acars-empty-state">' + escapeHtml(t("docs.no_content")) + '</div>';
  }

  // --- SimVar & Live Telemetry Polling ---
  function readSimVar(name, unit) {
    try {
      if (typeof flow !== "undefined" && flow.variables && typeof flow.variables.get === "function") {
        let val = flow.variables.get(name, unit);
        if (val === undefined || val === null || (val === 0 && name.indexOf("A:") !== 0)) {
          val = flow.variables.get("A:" + name, unit);
        }
        if (val !== undefined && val !== null) return val;
      }
    } catch (_e) {}

    try {
      if (typeof SimVar !== "undefined" && typeof SimVar.GetSimVarValue === "function") {
        let v = SimVar.GetSimVarValue(name, unit);
        if (v === undefined || v === null || (v === 0 && name.indexOf("A:") !== 0)) {
          v = SimVar.GetSimVarValue("A:" + name, unit);
        }
        if (v !== undefined && v !== null) return v;
      }
    } catch (_e) {}

    try {
      if (typeof window !== "undefined" && window.mockSimVars) {
        const v = window.mockSimVars[name] !== undefined ? window.mockSimVars[name] : window.mockSimVars["A:" + name];
        if (v !== undefined) return v;
      }
    } catch (_e) {}

    return null;
  }

  function pollLiveTelemetry() {
    const custom = (typeof window !== "undefined" && window.__SIM_TELEMETRY__) || null;
    if (custom) {
      if (custom.latitude !== undefined) stateData.telemetry.latitude = Number(custom.latitude);
      if (custom.longitude !== undefined) stateData.telemetry.longitude = Number(custom.longitude);
      if (custom.altitude !== undefined) stateData.telemetry.altitude = Number(custom.altitude);
      if (custom.groundSpeed !== undefined) stateData.telemetry.groundSpeed = Number(custom.groundSpeed);
      if (custom.verticalSpeed !== undefined) stateData.telemetry.verticalSpeed = Number(custom.verticalSpeed);
      if (custom.heading !== undefined) stateData.telemetry.heading = Number(custom.heading);
      if (custom.onGround !== undefined) stateData.telemetry.onGround = Boolean(custom.onGround);
      if (custom.fuelKg !== undefined) stateData.telemetry.fuelKg = Number(custom.fuelKg);
      if (custom.aircraftName) stateData.telemetry.aircraftName = String(custom.aircraftName);
    } else {
      const lat = readSimVar("PLANE LATITUDE", "degrees");
      const lon = readSimVar("PLANE LONGITUDE", "degrees");
      const alt = readSimVar("PLANE ALTITUDE", "feet");
      const gs = readSimVar("GROUND VELOCITY", "knots");
      const vs = readSimVar("VERTICAL SPEED", "feet per minute");
      const hdg = readSimVar("PLANE HEADING DEGREES TRUE", "degrees");
      const onGnd = readSimVar("SIM ON GROUND", "bool");
      const fuelLbs = readSimVar("FUEL TOTAL QUANTITY WEIGHT", "pounds");
      const acTitle = readSimVar("TITLE", "string");

      if (lat !== null) stateData.telemetry.latitude = Number(lat);
      if (lon !== null) stateData.telemetry.longitude = Number(lon);
      if (alt !== null) stateData.telemetry.altitude = Number(alt);
      if (gs !== null) stateData.telemetry.groundSpeed = Number(gs);
      if (vs !== null) stateData.telemetry.verticalSpeed = Number(vs);
      if (hdg !== null) stateData.telemetry.heading = Number(hdg);
      if (onGnd !== null) stateData.telemetry.onGround = Boolean(onGnd);
      if (fuelLbs !== null) stateData.telemetry.fuelKg = Math.round(Number(fuelLbs) * 0.45359237);
      if (acTitle) stateData.telemetry.aircraftName = String(acTitle);
    }

    if (stateData.isRecordingTelemetry) {
      stateData.recordedTelemetry.push({
        timestamp: new Date().toISOString(),
        latitude: stateData.telemetry.latitude,
        longitude: stateData.telemetry.longitude,
        altitude: Math.round(stateData.telemetry.altitude),
        groundSpeed: Math.round(stateData.telemetry.groundSpeed),
        verticalSpeed: Math.round(stateData.telemetry.verticalSpeed),
        heading: Math.round(stateData.telemetry.heading),
        onGround: stateData.telemetry.onGround ? 1 : 0,
        fuelKg: Math.round(stateData.telemetry.fuelKg)
      });
    }
  }

  function calculateDistanceNm(lat1, lon1, lat2, lon2) {
    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 0;
    if (lat1 === lat2 && lon1 === lon2) return 0;
    const toRad = Math.PI / 180;
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(3440.065 * c * 10) / 10;
  }

  function formatFlightDuration(totalMinutes) {
    if (!totalMinutes || totalMinutes <= 0 || isNaN(totalMinutes)) return "0:00";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return hours + ":" + (minutes < 10 ? "0" : "") + minutes;
  }

  function renderFlightTab() {
    if (!rootEl) return;
    pollLiveTelemetry();

    const tData = stateData.telemetry;
    const b = stateData.booking;
    const isSimConnected = tData.latitude !== 0 || tData.longitude !== 0 || tData.altitude !== 0 || tData.groundSpeed !== 0;

    // Auto-flight tracking: active once aircraft moves or is airborne
    if (isSimConnected) {
      if (!tData.onGround || tData.groundSpeed >= 5.0) {
        if (!stateData.flightStartTime) {
          stateData.flightStartTime = Date.now();
        }
        stateData.flightState = "active";
      }
    }

    // 1. Simulator Connection Badge
    const connBadge = q("#as-acars-af-conn-badge");
    const connText = q("#as-acars-af-conn-text");
    if (connBadge && connText) {
      if (isSimConnected) {
        connBadge.classList.remove("as-acars-disconnected");
        connText.textContent = "MSFS Conectado";
      } else {
        connBadge.classList.add("as-acars-disconnected");
        connText.textContent = "Simulador Desconectado";
      }
    }

    // 2. Route & Booking Metadata
    const depIcao = (b && b.departure_airport && b.departure_airport.icao) || "----";
    const depCity = (b && b.departure_airport && (b.departure_airport.city || b.departure_airport.name)) || "";
    const arrIcao = (b && b.arrival_airport && b.arrival_airport.icao) || "----";
    const arrCity = (b && b.arrival_airport && (b.arrival_airport.city || b.arrival_airport.name)) || "";
    const callsign = (b && (b.callsign || b.flight_number)) || "---";

    const depIcaoEl = q("#as-acars-af-dep-icao");
    const depCityEl = q("#as-acars-af-dep-city");
    const arrIcaoEl = q("#as-acars-af-arr-icao");
    const arrCityEl = q("#as-acars-af-arr-city");
    const callsignEl = q("#as-acars-af-callsign");
    const acInfoEl = q("#as-acars-af-aircraft-info");

    if (depIcaoEl) depIcaoEl.textContent = depIcao;
    if (depCityEl) depCityEl.textContent = depCity;
    if (arrIcaoEl) arrIcaoEl.textContent = arrIcao;
    if (arrCityEl) arrCityEl.textContent = arrCity;
    if (callsignEl) callsignEl.textContent = callsign;

    if (acInfoEl) {
      if (b && b.aircraft) {
        const reg = b.aircraft.registration || "";
        const model = b.aircraft.icao_code || b.aircraft.type || b.aircraft.name || "";
        acInfoEl.textContent = reg ? reg + (model ? " . " + model : "") : (tData.aircraftName || "Aguardando aeronave...");
      } else if (tData.aircraftName) {
        acInfoEl.textContent = tData.aircraftName;
      } else {
        acInfoEl.textContent = "Aguardando dados da aeronave...";
      }
    }

    // 3. Coordinates, Distance, Progress, Phase, Times
    const depCoords = (b && b.departure_airport && b.departure_airport.latitude != null && b.departure_airport.longitude != null && (b.departure_airport.latitude !== 0 || b.departure_airport.longitude !== 0))
      ? [b.departure_airport.latitude, b.departure_airport.longitude]
      : (AIRPORT_COORDS[depIcao] ? [AIRPORT_COORDS[depIcao][0], AIRPORT_COORDS[depIcao][1]] : [-3.0358, -60.0497]);

    const arrCoords = (b && b.arrival_airport && b.arrival_airport.latitude != null && b.arrival_airport.longitude != null && (b.arrival_airport.latitude !== 0 || b.arrival_airport.longitude !== 0))
      ? [b.arrival_airport.latitude, b.arrival_airport.longitude]
      : (AIRPORT_COORDS[arrIcao] ? [AIRPORT_COORDS[arrIcao][0], AIRPORT_COORDS[arrIcao][1]] : [2.8464, -60.6922]);

    const curLat = (tData.latitude !== 0 || tData.longitude !== 0) ? tData.latitude : depCoords[0];
    const curLon = (tData.latitude !== 0 || tData.longitude !== 0) ? tData.longitude : depCoords[1];

    const totalDistNm = calculateDistanceNm(depCoords[0], depCoords[1], arrCoords[0], arrCoords[1]);
    const remDistNm = calculateDistanceNm(curLat, curLon, arrCoords[0], arrCoords[1]);
    const flownDistNm = Math.max(0, totalDistNm - remDistNm);

    let progressPct = 0;
    if (totalDistNm > 0) {
      if (tData.onGround && remDistNm < 5 && stateData.flightState === "active") {
        progressPct = 100;
      } else if (tData.onGround && tData.groundSpeed < 40 && remDistNm >= totalDistNm - 5) {
        progressPct = 0;
      } else {
        progressPct = Math.min(100, Math.max(0, Math.round((flownDistNm / totalDistNm) * 100)));
      }
    }

    // Elapsed & Remaining Minutes
    let elapsedMin = 0;
    if (stateData.flightStartTime) {
      elapsedMin = Math.max(0, Math.floor((Date.now() - stateData.flightStartTime) / 60000));
    }

    let remMin = null;
    const estSpeed = tData.groundSpeed > 60 ? tData.groundSpeed : 380;
    if (remDistNm > 0 && estSpeed > 0) {
      remMin = Math.round((remDistNm / estSpeed) * 60);
    }

    // Status Phase Determination
    let phaseName = "Aguardando no Solo";
    let phaseTitle = "Ground / Pre-flight";

    if (tData.onGround && tData.groundSpeed < 1.0) {
      phaseName = "Em Solo";
      phaseTitle = "Ground / Pre-flight";
    } else if (tData.onGround && tData.groundSpeed >= 1.0) {
      phaseName = "Taxiando";
      phaseTitle = "Taxiing";
    } else if (!tData.onGround && remDistNm <= 25) {
      phaseName = "Aproximacao Final";
      phaseTitle = "Final Approach";
    } else if (!tData.onGround && tData.altitude >= 10000) {
      const fl = Math.round(tData.altitude / 100);
      phaseName = "Em Rota";
      phaseTitle = "Cruise FL" + fl;
    } else if (!tData.onGround && tData.verticalSpeed > 300) {
      phaseName = "Subida";
      phaseTitle = "Climb";
    } else if (!tData.onGround && tData.verticalSpeed < -300) {
      phaseName = "Descida";
      phaseTitle = "Descent";
    } else if (!tData.onGround) {
      phaseName = "Em Rota";
      phaseTitle = "En Route";
    }

    const phaseNameEl = q("#as-acars-af-phase-name");
    const phaseTitleEl = q("#as-acars-af-phase-title");
    const trackFillEl = q("#as-acars-af-track-fill");
    const trackPlaneEl = q("#as-acars-af-track-plane");
    const elapsedEl = q("#as-acars-af-elapsed");
    const remEl = q("#as-acars-af-remaining");
    const estDurEl = q("#as-acars-af-est-duration");

    if (phaseNameEl) phaseNameEl.textContent = phaseName;
    if (phaseTitleEl) phaseTitleEl.textContent = phaseTitle;
    if (trackFillEl) trackFillEl.style.width = progressPct + "%";
    if (trackPlaneEl) trackPlaneEl.style.left = progressPct + "%";
    if (elapsedEl) elapsedEl.textContent = formatFlightDuration(elapsedMin);
    if (remEl) remEl.textContent = remMin !== null ? formatFlightDuration(remMin) : "--:--";
    if (estDurEl) {
      const durText = (totalDistNm > 0 && estSpeed > 0)
        ? formatFlightDuration(Math.round((totalDistNm / estSpeed) * 60))
        : "--:--";
      estDurEl.textContent = "Duracao Est: ~" + durText + (totalDistNm > 0 ? " (" + Math.round(totalDistNm) + " NM)" : "");
    }

    // 4. Live Telemetry KPIs
    const telAlt = q("#as-acars-af-telemetry-alt");
    const telGs = q("#as-acars-af-telemetry-gs");
    const telVs = q("#as-acars-af-telemetry-vs");
    const telHdg = q("#as-acars-af-telemetry-hdg");
    const telFuel = q("#as-acars-af-telemetry-fuel");

    if (telAlt) telAlt.textContent = isSimConnected ? Math.round(tData.altitude).toLocaleString() + " ft" : "-- ft";
    if (telGs) telGs.textContent = isSimConnected ? Math.round(tData.groundSpeed) + " kts" : "-- kts";
    if (telVs) {
      const vsVal = Math.round(tData.verticalSpeed);
      telVs.textContent = isSimConnected ? (vsVal >= 0 ? "+" : "") + vsVal + " fpm" : "-- fpm";
    }
    if (telHdg) telHdg.innerHTML = isSimConnected ? Math.round(tData.heading) + '<span class="as-acars-deg">o</span>' : '--<span class="as-acars-deg">o</span>';
    if (telFuel) telFuel.textContent = isSimConnected ? Math.round(tData.fuelKg).toLocaleString() + " kg" : "-- kg";

    // 5. Legacy Containers (hidden)
    const bookingEl = q("#as-acars-booking-content");
    const pilotEl = q("#as-acars-pilot-content");
    if (bookingEl && b) {
      bookingEl.innerHTML = '<span class="font-mono">' + escapeHtml(callsign) + '</span>';
    }
    if (pilotEl && stateData.pilot) {
      pilotEl.innerHTML = '<span class="font-mono">' + escapeHtml(stateData.pilot.callsign || "") + '</span>';
    }

  }

  // --- Dedicated Company NOTAMs Rendering ---
  function renderNotamsTab() {
    if (!rootEl) return;
    const countEl = q("#as-acars-notams-count");
    const companySubEl = q("#as-acars-notams-company-name");
    const notamsListEl = q("#as-acars-notams-list");
    const notamDetailEl = q("#as-acars-notam-detail");

    if (countEl) {
      countEl.textContent = String(stateData.notams.length);
    }

    if (companySubEl) {
      const company = (store.activeTenant && store.activeTenant.name) ? store.activeTenant.name : "Companhia Aerea";
      companySubEl.textContent = company + " - Avisos e comunicados operacionais ativos aos tripulantes";
    }

    if (notamsListEl) {
      if (stateData.notams.length === 0) {
        notamsListEl.innerHTML = '<div class="as-acars-empty-state">' + escapeHtml(t("flight.no_notams")) + '</div>';
      } else {
        notamsListEl.innerHTML = stateData.notams
          .map(function (n) {
            const active = n.id === stateData.selectedNotamId;
            return (
              '<button type="button" class="as-acars-doc-item' +
              (active ? " as-acars-doc-item-active" : "") +
              '" data-notam-id="' +
              escapeHtml(n.id) +
              '">' +
              '<div class="as-acars-doc-item-title">' +
              renderTextWithEmojis(escapeHtml(n.title)) +
              "</div>" +
              '<div class="as-acars-doc-item-sub">' +
              escapeHtml(formatDate(n.created_at)) +
              "</div>" +
              "</button>"
            );
          })
          .join("");
      }
    }

    if (notamDetailEl) {
      const n =
        stateData.detailNotam ||
        stateData.notams.find(function (item) {
          return item.id === stateData.selectedNotamId;
        });
      if (!n) {
        notamDetailEl.innerHTML = '<div class="as-acars-empty-state">' + escapeHtml(t("flight.select_notam")) + '</div>';
      } else {
        notamDetailEl.innerHTML =
          '<h4 class="as-acars-notam-detail-title">' +
          renderTextWithEmojis(n.title) +
          "</h4>" +
          '<div class="as-acars-notam-detail-body">' +
          renderTextWithEmojis(stripHtmlToText(n.content)) +
          "</div>";
      }
    }
  }

  // --- My Flights / Logbook Rendering ---
  // --- My Flights / Logbook Rendering (Removed per user request) ---
  function renderFlightsTab() {}
  function renderFlightDetail() {}
  function getLandingRateBand() {
    return { band: "good", className: "as-acars-rate-good", label: "Good" };
  }

  // --- Coherent GT Safe DOM Selector Matching (Chrome 49 / WebKit 604) ---
  function matchesSelectorSafe(node, selector) {
    if (!node || (node.nodeType && node.nodeType !== 1)) return false;
    if (typeof node.matches === "function") {
      try {
        return node.matches(selector);
      } catch (_e) {}
    }
    if (typeof node.webkitMatchesSelector === "function") {
      try {
        return node.webkitMatchesSelector(selector);
      } catch (_e) {}
    }
    if (typeof node.matchesSelector === "function") {
      try {
        return node.matchesSelector(selector);
      } catch (_e) {}
    }

    const s = String(selector || "").trim();
    if (!s) return false;
    if (s.charAt(0) === "#") {
      return node.id === s.slice(1);
    }
    if (s.charAt(0) === "[" && s.charAt(s.length - 1) === "]") {
      const attrName = s.slice(1, -1).split("=")[0].trim();
      return Boolean(node.getAttribute && node.getAttribute(attrName) !== null);
    }
    if (s.charAt(0) === ".") {
      const bracketIdx = s.indexOf("[");
      const clsName = bracketIdx !== -1 ? s.slice(1, bracketIdx) : s.slice(1);
      if (!node.classList || !node.classList.contains(clsName)) return false;
      if (bracketIdx !== -1) {
        const attrName = s.slice(bracketIdx + 1, -1).split("=")[0].trim();
        return Boolean(node.getAttribute && node.getAttribute(attrName) !== null);
      }
      return true;
    }
    return String(node.tagName || "").toLowerCase() === s.toLowerCase();
  }

  function findClosest(startNode, selector) {
    if (!startNode) return null;
    if (typeof startNode.closest === "function") {
      try {
        const res = startNode.closest(selector);
        if (res) return res;
      } catch (_e) {}
    }
    let curr = startNode;
    if (curr.nodeType === 3) {
      curr = curr.parentNode;
    }
    while (curr && curr !== rootEl) {
      if (matchesSelectorSafe(curr, selector)) {
        return curr;
      }
      curr = curr.parentNode;
    }
    return null;
  }

  function handleInputValueChange(inputEl) {
    if (!inputEl) return;
    if (inputEl.id === "as-acars-tenant-search") {
      stateData.tenantSearch = inputEl.value || "";
      renderTenantsView();
    } else if (inputEl.id === "as-acars-doc-search") {
      stateData.docSearch = inputEl.value || "";
      const filtered = getFilteredDocuments();
      if (
        filtered.length > 0 &&
        !filtered.some(function (d) {
          return d.id === stateData.selectedDocId;
        })
      ) {
        selectDocument(filtered[0].id);
      } else {
        renderDocsTab();
      }
    } else if (inputEl.id === "as-acars-metar-search-input") {
      stateData.metarSearchQuery = inputEl.value || "";
    } else if (inputEl.id === "as-acars-flight-search-input") {
      stateData.flightSearch = inputEl.value || "";
      const clearBtn = q("#as-acars-flight-search-clear");
      if (clearBtn) setVisible(clearBtn, Boolean(stateData.flightSearch));
      renderFlightsTab();
    }
  }

  // --- Container Cleanup (Strip Flow Pro component frame & blur artifacts) ---
  function cleanParentContainers(el) {
    if (!el || !el.parentElement) return;
    try {
      let curr = el.parentElement;
      while (curr && curr !== document.body) {
        if (curr.classList) {
          curr.classList.add("as-acars-clean-parent");
        }
        if (curr.style) {
          curr.style.setProperty("background", "transparent", "important");
          curr.style.setProperty("background-color", "transparent", "important");
          curr.style.setProperty("border-color", "transparent", "important");
          curr.style.setProperty("border-width", "0", "important");
          curr.style.setProperty("box-shadow", "none", "important");
          curr.style.setProperty("-webkit-box-shadow", "none", "important");
          curr.style.setProperty("filter", "none", "important");
          curr.style.setProperty("-webkit-filter", "none", "important");
          curr.style.setProperty("backdrop-filter", "none", "important");
          curr.style.setProperty("-webkit-backdrop-filter", "none", "important");
        }
        curr = curr.parentElement;
      }
    } catch (_err) {
      // Ignore in mock/non-DOM environments
    }
  }

  // --- Event Binding inside Coherent GT ---
  function bindDomEvents(el) {
    // Listen for OS input bridge text updates in MSFS Coherent GT
    try {
      if (typeof Coherent !== "undefined" && Coherent && typeof Coherent.on === "function") {
        Coherent.on("SetInputTextFromOS", function (textFromOs) {
          if (activeInputEl) {
            activeInputEl.value = String(textFromOs || "");
            handleInputValueChange(activeInputEl);
          }
        });
      }
    } catch (_e) {}

    // Stop keyboard events inside inputs from triggering MSFS simulator shortcuts
    const stopSimKeys = function (e) {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
        e.stopPropagation();
      }
    };
    el.addEventListener("keydown", stopSimKeys, false);
    el.addEventListener("keyup", stopSimKeys, false);
    el.addEventListener("keypress", stopSimKeys, false);

    const isEnterKeyEvent = function (e) {
      if (!e) return false;
      const k = e.key;
      const c = e.code;
      const kc = e.keyCode || e.which || e.charCode || 0;
      return (
        k === "Enter" ||
        k === "Return" ||
        c === "Enter" ||
        c === "NumpadEnter" ||
        kc === 13
      );
    };

    const triggerToastReply = function () {
      sendToastReply();
    };

    const triggerChatSend = function () {
      const input = q("#as-acars-chat-input");
      if (input && input.value.trim()) {
        const val = input.value.trim();
        input.value = "";
        sendChatMessage(val);
        scrollChatToBottom();
      }
    };

    const isInteractiveControl = function (node) {
      if (!node) return false;
      const tag = String(node.tagName || "").toUpperCase();
      if (tag === "BUTTON" || tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "A") {
        return true;
      }
      return Boolean(
        findClosest(node, "button") ||
        findClosest(node, "input") ||
        findClosest(node, "select") ||
        findClosest(node, "textarea") ||
        findClosest(node, "a") ||
        findClosest(node, ".as-acars-icon-btn") ||
        findClosest(node, ".as-acars-lang-btn") ||
        findClosest(node, ".as-acars-header-actions") ||
        findClosest(node, ".as-acars-toast-actions-header")
      );
    };

    // Safety: clicking anywhere inside the document that is not an input drops input capture
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("mousedown", function (e) {
        if (!e || !e.target) return;
        const isInput = findClosest(e.target, "input, textarea, select");
        if (!isInput && activeInputEl) {
          unfocusCoherentInput();
        }
      }, true);
    }

    // Safety: global Escape key handler across Coherent GT
    const onGlobalKeyDown = function (e) {
      if (!e) return;
      if (e.key === "Escape" || e.keyCode === 27) {
        let handled = false;
        if (stateData.toastMessage) {
          dismissToast();
          handled = true;
        } else if (stateData.panelOpen) {
          stateData.panelOpen = false;
          unfocusCoherentInput();
          renderAll();
          handled = true;
        } else if (activeInputEl) {
          unfocusCoherentInput();
          handled = true;
        }
        if (handled && typeof e.stopPropagation === "function") {
          e.stopPropagation();
        }
      }
    };

    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("keydown", onGlobalKeyDown, true);
      window.addEventListener("blur", function () {
        handleDragMouseUp();
        unfocusCoherentInput();
      });
    }
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("keydown", onGlobalKeyDown, true);
      document.addEventListener("mouseleave", handleDragMouseUp, true);
    }

    // Ensure mousedown on inputs or buttons focuses properly without triggering parent drag
    el.addEventListener("mousedown", function (e) {
      const inputTarget = findClosest(e.target, "input");
      if (inputTarget) {
        e.stopPropagation();
        if (typeof inputTarget.focus === "function") {
          inputTarget.focus();
        }
        focusCoherentInput(inputTarget);
        return;
      }
      if (activeInputEl && e.target !== activeInputEl) {
        unfocusCoherentInput();
      }

      // Check if user clicked on a drag area (Header brand or Toast header)
      const dragArea = findClosest(e.target, "[data-dragarea]");
      if (dragArea) {
        if (isInteractiveControl(e.target)) return;
        const areaName = dragArea.getAttribute("data-dragarea");
        if (!areaName) return;
        const targetEl = q("[data-dragtarget='" + areaName + "']");
        if (!targetEl) return;

        // Prevent text selection and stop Flow Pro unthrottled drag
        if (typeof e.preventDefault === "function") e.preventDefault();
        if (typeof e.stopPropagation === "function") e.stopPropagation();

        isDraggingWindow = true;
        dragTargetEl = targetEl;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        const rect = (typeof targetEl.getBoundingClientRect === "function")
          ? targetEl.getBoundingClientRect()
          : { left: targetEl.offsetLeft || 0, top: targetEl.offsetTop || 0 };
        dragInitialLeft = rect.left;
        dragInitialTop = rect.top;
        dragPendingX = e.clientX;
        dragPendingY = e.clientY;

        if (targetEl.classList && typeof targetEl.classList.add === "function") {
          targetEl.classList.add("as-acars-is-dragging");
        }
        if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
          document.addEventListener("mousemove", handleDragMouseMove, true);
          document.addEventListener("mouseup", handleDragMouseUp, true);
        }
      }
    });

    // Delegate click events cleanly across Coherent GT
    el.addEventListener("click", function (e) {
      const target = e.target;
      if (!target) return;

      // Close main window
      if (findClosest(target, "#as-acars-btn-close")) {
        stateData.panelOpen = false;
        renderAll();
        return;
      }

      // Language choices inside Settings tab
      const langChoiceBtn = findClosest(target, ".as-acars-lang-choice");
      if (langChoiceBtn) {
        const chosen = langChoiceBtn.getAttribute("data-lang");
        if (chosen && I18N[chosen]) {
          store.language = chosen;
          saveStore();
          applyTranslations();
          renderAll();
        }
        return;
      }

      // Switch White Mode Toggle
      if (findClosest(target, "#as-acars-switch-white")) {
        store.white_mode = !store.white_mode;
        saveStore();
        applyTheme();
        renderSettingsTab();
        return;
      }

      // Theme choice inside Settings tab (White Mode toggle for backwards compatibility)
      const themeChoiceBtn = findClosest(target, ".as-acars-theme-choice");
      if (themeChoiceBtn) {
        const theme = themeChoiceBtn.getAttribute("data-theme");
        store.white_mode = theme === "white";
        saveStore();
        applyTheme();
        renderAll();
        return;
      }

      // Switch Toast Alerts Toggle
      if (findClosest(target, "#as-acars-switch-toast")) {
        const currentEnabled = store.vocc_toast_enabled !== undefined ? !!store.vocc_toast_enabled : true;
        store.vocc_toast_enabled = !currentEnabled;
        saveStore();
        renderSettingsTab();
        renderToast();
        return;
      }

      // Toast Duration Preset Buttons
      const presetBtn = findClosest(target, ".as-acars-duration-preset");
      if (presetBtn) {
        const sec = parseInt(presetBtn.getAttribute("data-sec"), 10);
        store.toast_duration = isNaN(sec) ? 15 : sec;
        saveStore();
        renderSettingsTab();
        return;
      }

      // Update Actions
      if (findClosest(target, "#as-acars-btn-update-download") || findClosest(target, "#as-acars-btn-download-installer")) {
        const url = (stateData.updateInfo && stateData.updateInfo.html_url) || REPO_RELEASES_URL;
        openExternalUrl(url);
        return;
      }

      if (findClosest(target, "#as-acars-btn-update-dismiss")) {
        stateData.updateBannerDismissed = true;
        renderUpdateBanner();
        return;
      }

      if (findClosest(target, "#as-acars-btn-check-updates")) {
        checkForUpdates(true);
        return;
      }

      // Open Settings button in Header
      if (findClosest(target, "#as-acars-btn-open-settings")) {
        stateData.activeView = "main";
        stateData.activeTab = "settings";
        renderAll();
        return;
      }

      // Return to Tablet Home Screen (iOS Home Indicator Bar or Header Home)
      if (
        findClosest(target, "#as-acars-btn-ios-home") ||
        findClosest(target, "#as-acars-ios-home-bar-wrap") ||
        findClosest(target, "#as-acars-btn-header-home")
      ) {
        stateData.activeTab = "home";
        renderMainView();
        return;
      }

      // Toast actions
      if (findClosest(target, "#as-acars-toast-close") || findClosest(target, "#as-acars-toast-dismiss")) {
        if (findClosest(target, "#as-acars-toast-dismiss") && stateData.toastMessage) {
          confirmMessageById(stateData.toastMessage.id);
        }
        dismissToast();
        return;
      }
      if (findClosest(target, "#as-acars-toast-open")) {
        if (stateData.toastMessage) {
          confirmMessageById(stateData.toastMessage.id);
        }
        dismissToast();
        stateData.panelOpen = true;
        stateData.activeView = "main";
        stateData.activeTab = "vocc";
        renderAll();
        scrollChatToBottom();
        return;
      }
      if (findClosest(target, "#as-acars-toast-send")) {
        sendToastReply();
        return;
      }

      // Refresh data
      if (findClosest(target, "#as-acars-btn-refresh")) {
        refreshAllAuthenticatedData(true);
        return;
      }

      // Switch VA / Logout
      if (findClosest(target, "#as-acars-btn-switch-va") || findClosest(target, "#as-acars-btn-back-tenants")) {
        clearAllCaches();
        stopAuthPolling();
        stateData.activeView = "tenants";
        stateData.activeTab = "home";
        if (stateData.tenants.length === 0) {
          fetchTenants();
        }
        renderAll();
        return;
      }

      // Reload tenants
      if (findClosest(target, "#as-acars-btn-reload-tenants")) {
        fetchTenants();
        return;
      }

      // Select saved tenant
      const savedBtn = findClosest(target, "[data-saved-tenant-id]");
      if (savedBtn) {
        const tid = savedBtn.getAttribute("data-saved-tenant-id");
        const entry = store.storedTokens && store.storedTokens[tid];
        if (entry && entry.tenant) {
          selectAuthenticatedTenant(entry.tenant);
        }
        return;
      }

      // Select tenant from list
      const tenantBtn = findClosest(target, "[data-tenant-id]");
      if (tenantBtn) {
        const tid = tenantBtn.getAttribute("data-tenant-id");
        const found = stateData.tenants.find(function (t) {
          return t.id === tid;
        });
        if (found) {
          const saved = store.storedTokens && store.storedTokens[found.id];
          if (saved && saved.token) {
            selectAuthenticatedTenant(found);
          } else {
            startDeviceCodeAuth(found);
          }
        }
        return;
      }

      // Device Code Auth buttons
      if (findClosest(target, "#as-acars-btn-open-auth") || findClosest(target, "#as-acars-auth-url")) {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();

        const base = getTenantBaseUrl(stateData.pendingTenant) || "https://samba.airspace.ferrlab.com";
        const codeParam = stateData.deviceCode ? "?code=" + encodeURIComponent(stateData.deviceCode) : "";
        const url = base + "/acars/authorize" + codeParam;
        if (stateData.deviceCode) {
          copyToClipboard(stateData.deviceCode);
        }
        openExternalUrl(url);
        const statusEl = q("#as-acars-auth-status");
        if (statusEl) {
          statusEl.textContent = stateData.deviceCode
            ? "Navegador aberto em " + url + " (codigo " + stateData.deviceCode + " copiado!)"
            : "Navegador aberto em " + url;
        }
        return;
      }
      if (findClosest(target, "#as-acars-btn-copy-code")) {
        if (stateData.deviceCode) {
          copyToClipboard(stateData.deviceCode);
          const statusEl = q("#as-acars-auth-status");
          if (statusEl) {
            statusEl.textContent = "Codigo " + stateData.deviceCode + " copiado! Acesse " + getTenantBaseUrl(stateData.pendingTenant) + "/acars/authorize";
          }
        }
        return;
      }
      if (findClosest(target, "#as-acars-btn-retry-auth")) {
        if (stateData.pendingTenant) {
          startDeviceCodeAuth(stateData.pendingTenant);
        }
        return;
      }

      // iOS Home Weather Pill Click (opens METAR tab)
      if (findClosest(target, "#as-acars-ios-home-weather")) {
        const icao = (stateData.homeLocalWeather && stateData.homeLocalWeather.icao) || resolveCurrentSimAirportIcao();
        stateData.activeTab = "metar";
        renderMainView();
        if (icao) {
          const inp = q("#as-acars-metar-search-input");
          if (inp) inp.value = icao;
          searchMetar(icao);
        }
        return;
      }

      // Main Navigation Tabs & Tablet Tiles
      const tabBtn = findClosest(target, ".as-acars-tab[data-tab]") || findClosest(target, ".as-acars-tablet-tile[data-tab]");
      if (tabBtn) {
        const tabName = tabBtn.getAttribute("data-tab");
        if (tabName) {
          stateData.activeTab = tabName;
          if (tabName === "vocc" && store.auto_confirm_read) {
            confirmAllUnreadMessages();
          }
          if (tabName === "notams" && stateData.notams.length === 0) {
            fetchNotams();
          }
          renderMainView();
          if (tabName === "vocc") {
            scrollChatToBottom();
          }
        }
        return;
      }

      // METAR Search Button
      if (findClosest(target, "#as-acars-btn-search-metar")) {
        const inp = q("#as-acars-metar-search-input");
        if (inp && inp.value.trim()) {
          searchMetar(inp.value.trim());
        }
        return;
      }

      // METAR Refresh Active Route Button
      if (findClosest(target, "#as-acars-btn-refresh-metar")) {
        loadRouteMetars(true);
        return;
      }

      // METAR Quick Airport Pills
      const metarPill = findClosest(target, ".as-acars-metar-pill");
      if (metarPill) {
        const action = metarPill.getAttribute("data-action");
        if (action === "nearest") {
          findNearestAirportForMetar();
        } else {
          const icao = metarPill.getAttribute("data-icao");
          if (icao) {
            const inp = q("#as-acars-metar-search-input");
            if (inp) inp.value = icao;
            searchMetar(icao);
          }
        }
        return;
      }

      // METAR Copy Raw Text Button
      const copyMetarBtn = findClosest(target, ".as-acars-btn-copy-metar");
      if (copyMetarBtn) {
        const raw = copyMetarBtn.getAttribute("data-raw");
        if (raw) {
          copyToClipboard(raw);
          const orig = copyMetarBtn.textContent;
          copyMetarBtn.textContent = t("metar.copied", "Copiado!");
          setTimeout(function () {
            copyMetarBtn.textContent = orig;
          }, 2000);
        }
        return;
      }

      // Quick Reply Chips in vOCC Chat
      const replyChip = findClosest(target, "[data-reply]");
      if (replyChip) {
        const replyText = replyChip.getAttribute("data-reply");
        if (replyText) {
          sendChatMessage(replyText);
          scrollChatToBottom();
        }
        return;
      }

      // Send Chat Message Button
      if (findClosest(target, "#as-acars-chat-send")) {
        triggerChatSend();
        return;
      }

      // Briefing ICAO Shortcut Chips
      const icaoBtn = findClosest(target, "[data-icao]");
      if (icaoBtn) {
        const code = icaoBtn.getAttribute("data-icao");
        if (code && code !== "----") {
          searchAirportDocumentByIcao(code);
        }
        return;
      }

      // Nearest Airport in Sim Button
      if (findClosest(target, "#as-acars-btn-near-icao")) {
        findNearestSimAirportAndSearch();
        return;
      }

      // Clear Document Search
      if (findClosest(target, "#as-acars-doc-search-clear")) {
        stateData.docSearch = "";
        const searchInput = q("#as-acars-doc-search");
        if (searchInput) searchInput.value = "";
        const clearBtn = q("#as-acars-doc-search-clear");
        if (clearBtn) setVisible(clearBtn, false);
        renderDocsTab();
        return;
      }

      // Document Category Pills
      const catBtn = findClosest(target, "[data-cat]");
      if (catBtn) {
        const cat = catBtn.getAttribute("data-cat");
        if (cat) {
          stateData.docCategory = cat;
          if (cat === "all") {
            stateData.docSearch = "";
            const searchInput = q("#as-acars-doc-search");
            if (searchInput) searchInput.value = "";
            const clearBtn = q("#as-acars-doc-search-clear");
            if (clearBtn) setVisible(clearBtn, false);
          }
          const filtered = getFilteredDocuments();
          if (
            filtered.length > 0 &&
            !filtered.some(function (d) {
              return d.id === stateData.selectedDocId;
            })
          ) {
            selectDocument(filtered[0].id);
          } else {
            renderDocsTab();
          }
        }
        return;
      }

      // Select Document Item or Folder Child
      const docBtn = findClosest(target, "[data-doc-id]");
      if (docBtn) {
        const docId = docBtn.getAttribute("data-doc-id");
        if (docId) {
          selectDocument(docId);
        }
        return;
      }

      // Parent Folder Button
      if (findClosest(target, "#as-acars-btn-parent-folder")) {
        const activeDoc =
          stateData.detailDoc ||
          stateData.documents.find(function (d) {
            return d.id === stateData.selectedDocId;
          });
        if (activeDoc && activeDoc.parent_id) {
          selectDocument(activeDoc.parent_id);
        }
        return;
      }

      // Open PDF / External URL Button
      if (findClosest(target, "#as-acars-btn-open-pdf")) {
        const activeDoc =
          stateData.detailDoc ||
          stateData.documents.find(function (d) {
            return d.id === stateData.selectedDocId;
          });
        if (activeDoc && activeDoc.file_url) {
          openExternalUrl(activeDoc.file_url);
        }
        return;
      }

      const extUrlBtn = findClosest(target, "[data-open-url]");
      if (extUrlBtn) {
        openExternalUrl(extUrlBtn.getAttribute("data-open-url"));
        return;
      }

      // ACARS Active Flight Actions
      if (findClosest(target, "#as-acars-btn-start-flight")) {
        stateData.flightState = "active";
        stateData.flightStartTime = Date.now();
        renderFlightTab();
        return;
      }

      if (findClosest(target, "#as-acars-btn-finish-flight")) {
        stateData.flightState = "finished";
        renderFlightTab();
        return;
      }

      if (findClosest(target, "#as-acars-btn-cancel-flight")) {
        stateData.flightState = "idle";
        stateData.flightStartTime = null;
        renderFlightTab();
        return;
      }

      if (findClosest(target, "#as-acars-btn-refresh-booking")) {
        fetchPilotAndBooking();
        return;
      }

      // Refresh NOTAMs Button
      if (findClosest(target, "#as-acars-btn-refresh-notams")) {
        fetchNotams(true);
        return;
      }

      // Select NOTAM
      const notamBtn = findClosest(target, "[data-notam-id]");
      if (notamBtn) {
        const nid = notamBtn.getAttribute("data-notam-id");
        stateData.selectedNotamId = nid;
        stateData.detailNotam =
          stateData.notams.find(function (n) {
            return n.id === nid;
          }) || null;
        renderNotamsTab();
        return;
      }

      // Intercept any <a href> inside document HTML body
      const anchor = findClosest(target, "a");
      if (anchor && anchor.getAttribute("href")) {
        const href = anchor.getAttribute("href");
        if (href && href.indexOf("#") !== 0) {
          e.preventDefault();
          openExternalUrl(href);
        }
      }
    });

    // Bind focus, blur, and input handlers on all text inputs
    const inputs = ["#as-acars-tenant-search", "#as-acars-doc-search", "#as-acars-chat-input", "#as-acars-metar-search-input", "#as-acars-flight-search-input", "#as-acars-toast-input"];
    for (let i = 0; i < inputs.length; i++) {
      const inp = q(inputs[i]);
      if (!inp) continue;

      inp.addEventListener("focus", function () {
        focusCoherentInput(inp);
      });

      inp.addEventListener("blur", function () {
        if (activeInputEl === inp) {
          unfocusCoherentInput(inp.id);
        }
      });

      inp.addEventListener("keydown", function (e) {
        if (e && (e.key === "Escape" || e.keyCode === 27)) {
          unfocusCoherentInput(inp.id);
        }
      });

      inp.addEventListener("input", function () {
        handleInputValueChange(inp);
      });

      inp.addEventListener("keyup", function () {
        handleInputValueChange(inp);
      });
    }

    const toastForm = q("#as-acars-toast-form");
    if (toastForm) {
      toastForm.addEventListener("submit", function (e) {
        if (e) {
          if (typeof e.preventDefault === "function") e.preventDefault();
          if (typeof e.stopPropagation === "function") e.stopPropagation();
        }
        triggerToastReply();
        return false;
      });
    }

    const toastInput = q("#as-acars-toast-input");
    if (toastInput) {
      const onToastKey = function (e) {
        if (isEnterKeyEvent(e)) {
          if (typeof e.preventDefault === "function") e.preventDefault();
          if (typeof e.stopPropagation === "function") e.stopPropagation();
          triggerToastReply();
        } else if (e && (e.key === "Escape" || e.keyCode === 27)) {
          if (typeof e.preventDefault === "function") e.preventDefault();
          if (typeof e.stopPropagation === "function") e.stopPropagation();
          dismissToast();
        }
      };
      toastInput.addEventListener("keydown", onToastKey);
      toastInput.addEventListener("keypress", onToastKey);
      toastInput.addEventListener("keyup", function (e) {
        if (isEnterKeyEvent(e) || (e && (e.key === "Escape" || e.keyCode === 27))) {
          if (typeof e.preventDefault === "function") e.preventDefault();
          if (typeof e.stopPropagation === "function") e.stopPropagation();
        }
      });
      toastInput.addEventListener("focus", function () {
        startToastTimer(30);
      });
      toastInput.addEventListener("input", function () {
        startToastTimer(20);
      });
      toastInput.addEventListener("blur", function () {
        unfocusCoherentInput("as-acars-toast-input");
        if (stateData.toastMessage && !stateData.panelOpen && store.vocc_toast_enabled) {
          startToastTimer(6);
        }
      });
    }

    const toastSendBtn = q("#as-acars-toast-send");
    if (toastSendBtn) {
      toastSendBtn.addEventListener("mousedown", function (e) {
        e.stopPropagation();
      });
      toastSendBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        e.preventDefault();
        triggerToastReply();
      });
    }

    const chatForm = q("#as-acars-chat-form");
    if (chatForm) {
      chatForm.addEventListener("submit", function (e) {
        if (e) {
          if (typeof e.preventDefault === "function") e.preventDefault();
          if (typeof e.stopPropagation === "function") e.stopPropagation();
        }
        triggerChatSend();
        return false;
      });
    }

    const chatInput = q("#as-acars-chat-input");
    if (chatInput) {
      const onChatKey = function (e) {
        if (isEnterKeyEvent(e)) {
          if (typeof e.preventDefault === "function") e.preventDefault();
          if (typeof e.stopPropagation === "function") e.stopPropagation();
          triggerChatSend();
        }
      };
      chatInput.addEventListener("keydown", onChatKey);
      chatInput.addEventListener("keypress", onChatKey);
      chatInput.addEventListener("keyup", function (e) {
        if (isEnterKeyEvent(e)) {
          if (typeof e.preventDefault === "function") e.preventDefault();
          if (typeof e.stopPropagation === "function") e.stopPropagation();
        }
      });
    }

    const metarInput = q("#as-acars-metar-search-input");
    if (metarInput) {
      const onMetarKey = function (e) {
        if (isEnterKeyEvent(e)) {
          if (typeof e.preventDefault === "function") e.preventDefault();
          if (typeof e.stopPropagation === "function") e.stopPropagation();
          const val = metarInput.value.trim();
          if (val) {
            searchMetar(val);
          }
        }
      };
      metarInput.addEventListener("keydown", onMetarKey);
      metarInput.addEventListener("keypress", onMetarKey);
    }

    const toastEl = q("#as-acars-toast");
    if (toastEl) {
      toastEl.addEventListener("mouseenter", function () {
        // Refresh and extend timer by 8s rather than cancelling it forever,
        // preventing stuck toasts when MSFS drops mouseleave
        startToastTimer(8);
      });
      toastEl.addEventListener("mouseleave", function () {
        if (stateData.toastMessage && !stateData.panelOpen && store.vocc_toast_enabled) {
          startToastTimer();
        }
      });
    }

    const toastCloseBtn = q("#as-acars-toast-close");
    if (toastCloseBtn) {
      toastCloseBtn.addEventListener("mousedown", function (e) {
        e.stopPropagation();
      });
      toastCloseBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        e.preventDefault();
        dismissToast();
      });
    }

    const toastDismissBtn = q("#as-acars-toast-dismiss");
    if (toastDismissBtn) {
      toastDismissBtn.addEventListener("mousedown", function (e) {
        e.stopPropagation();
      });
      toastDismissBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        e.preventDefault();
        if (stateData.toastMessage) {
          confirmMessageById(stateData.toastMessage.id);
        }
        dismissToast();
      });
    }

    const toastOpenBtn = q("#as-acars-toast-open");
    if (toastOpenBtn) {
      toastOpenBtn.addEventListener("mousedown", function (e) {
        e.stopPropagation();
      });
      toastOpenBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        e.preventDefault();
        if (stateData.toastMessage) {
          confirmMessageById(stateData.toastMessage.id);
        }
        dismissToast();
        stateData.panelOpen = true;
        stateData.activeView = "main";
        stateData.activeTab = "vocc";
        renderAll();
        scrollChatToBottom();
      });
    }

    const toastCheck = q("#as-acars-settings-toast-enable");
    if (toastCheck) {
      toastCheck.addEventListener("change", function () {
        store.vocc_toast_enabled = !!toastCheck.checked;
        saveStore();
        renderToast();
      });
    }

    const toastTime = q("#as-acars-settings-toast-time");
    if (toastTime) {
      const onTimeChange = function () {
        const val = parseInt(toastTime.value, 10);
        store.toast_duration = isNaN(val) || val < 0 ? 15 : val;
        saveStore();
        if (rootEl) {
          const presets = rootEl.querySelectorAll(".as-acars-duration-preset");
          for (let i = 0; i < presets.length; i++) {
            const p = presets[i];
            const sec = parseInt(p.getAttribute("data-sec"), 10);
            if (sec === store.toast_duration) {
              p.classList.add("as-acars-choice-active");
            } else {
              p.classList.remove("as-acars-choice-active");
            }
          }
        }
      };
      toastTime.addEventListener("change", onTimeChange);
      toastTime.addEventListener("input", onTimeChange);
    }

    const volSlider = q("#as-acars-af-volume-slider");
    if (volSlider) {
      volSlider.addEventListener("input", function (e) {
        stateData.cabinAudioVolume = parseInt(e.target.value, 10) || 0;
        const volVal = q("#as-acars-af-volume-val");
        if (volVal) {
          volVal.textContent = stateData.cabinAudioVolume + "%";
        }
      });
    }
  }

  // --- Flow Lifecycle Hooks ---

  // 1. HTML Created
  if (typeof html_created === "function") {
    html_created(function (el) {
      rootEl = el;
      clearAllCaches();
      cleanParentContainers(el);
      bindDomEvents(el);
      applyTranslations();
      fetchTenants();
      if (getActiveToken() && store.activeTenant) {
        enterAuthenticatedWorkspace();
      } else {
        renderAll();
      }
      setTimeout(function () {
        checkForUpdates(false);
      }, 2000);
    });
  }

  // 2. Run (Tile Clicked on Wheel or Executed via Otto)
  if (typeof run === "function") {
    run(function () {
      stateData.panelOpen = !stateData.panelOpen;
      if (stateData.panelOpen) {
        dismissToast();
        if (getUnreadMessages().length > 0) {
          stateData.activeTab = "vocc";
          if (store.auto_confirm_read) {
            confirmAllUnreadMessages();
          }
        }
        if (stateData.activeView === "tenants" && stateData.tenants.length === 0) {
          fetchTenants();
        }
        cleanParentContainers(rootEl);
        if (stateData.activeTab === "vocc") {
          scrollChatToBottom();
        }
      }
      renderAll();
      return false; // Close the Flow wheel when toggling the floating window
    });
  }

  // 3. State (Tile Icon & Overlay Text every 500ms)
  if (typeof state === "function") {
    state(function () {
      if (!getActiveToken() || !store.activeTenant) {
        return "mdi:airplane-alert:Airspace";
      }
      const unread = getUnreadMessages().length;
      if (unread > 0) {
        return "mdi:message-badge:vOCC (" + unread + ")";
      }
      if (stateData.booking && (stateData.booking.callsign || stateData.booking.flight_number)) {
        return "mdi:airplane-check:" + (stateData.booking.callsign || stateData.booking.flight_number);
      }
      return "mdi:airplane:Airspace";
    });
  }

  // 4. Style (Tile Highlight State every 500ms)
  if (typeof style === "function") {
    style(function () {
      if (getUnreadMessages().length > 0) {
        return "armed";
      }
      if (stateData.panelOpen) {
        return "active";
      }
      return null;
    });
  }

  // 5. Info (Wheel Center Hover Description every 500ms)
  if (typeof info === "function") {
    info(function () {
      if (!getActiveToken() || !store.activeTenant) {
        return "Airspace ACARS - Clique para conectar a sua VA";
      }
      const unread = getUnreadMessages();
      if (unread.length > 0) {
        const last = unread[unread.length - 1];
        const preview = last.text.length > 42 ? last.text.slice(0, 42) + "..." : last.text;
        return "vOCC (" + unread.length + "): " + preview;
      }
      if (stateData.booking) {
        const cs = stateData.booking.callsign || stateData.booking.flight_number || "";
        const dep = (stateData.booking.departure_airport && stateData.booking.departure_airport.icao) || "";
        const arr = (stateData.booking.arrival_airport && stateData.booking.arrival_airport.icao) || "";
        return store.activeTenant.name + " | " + cs + (dep || arr ? " (" + dep + " -> " + arr + ")" : "");
      }
      return store.activeTenant.name + " | Airspace ACARS";
    });
  }

  // 6. 1Hz Background Loop (Polls vOCC messages every 5s, Booking every 30s)
  if (typeof loop_1hz === "function") {
    loop_1hz(function () {
      stateData.tickCount = (stateData.tickCount + 1) % 3600;

      // Fail-safe watchdog: auto-dismiss toast if elapsed duration exceeded
      if (stateData.toastMessage && !stateData.panelOpen && store.vocc_toast_enabled) {
        const rawSec = typeof store.toast_duration === "number" ? store.toast_duration : parseInt(store.toast_duration, 10);
        const durSec = isNaN(rawSec) || rawSec < 0 ? 15 : rawSec;
        if (durSec > 0) {
          const now = Date.now();
          const shownAt = stateData.toastShownAt || now;
          const elapsedSec = (now - shownAt) / 1000;
          const tInput = q("#as-acars-toast-input");
          const isTyping = tInput && typeof document !== "undefined" && document.activeElement === tInput && tInput.value.length > 0;
          if (!isTyping && elapsedSec >= durSec) {
            dismissToast();
          } else if (elapsedSec >= Math.max(durSec + 20, 45)) {
            dismissToast();
          }
        }
      }

      if (!getActiveToken() || !store.activeTenant) return;

      // Zero DOM work if panel is closed: keep sim FPS 100% smooth
      if (stateData.panelOpen) {
        if (stateData.activeTab === "home") {
          renderHomeClockAndDate();
          if (stateData.tickCount % 60 === 0) {
            fetchHomeLocalWeather(false);
          }
        } else if (stateData.activeTab === "flight") {
          renderFlightTab();
        }
      } else if (stateData.isRecordingTelemetry) {
        pollLiveTelemetry();
      }

      // Background network polling (independent of UI)
      if (stateData.tickCount % 5 === 0) {
        fetchMessages();
      }
      if (stateData.tickCount % 30 === 0) {
        fetchPilotAndBooking();
      }
    });
  }

  // 7. Otto Search Bar Integration
  if (typeof search === "function") {
    const searchPrefixes = ["airspace", "acars", "vocc", "doc", "docs", "briefing", "apt", "notam", "metar", "wx", "clima"];
    search(searchPrefixes, function (query, callback) {
      const raw = String(query || "").trim();
      const parts = raw.split(/\s+/);
      const prefix = (parts[0] || "").toLowerCase();
      const term = parts.slice(1).join(" ").trim();
      const termLower = term.toLowerCase();

      if (!getActiveToken() || !store.activeTenant) {
        callback([
          {
            uid: "airspace_acars_connect",
            label: "Conectar ao Airspace ACARS",
            subtext: "Clique para selecionar sua companhia aerea (VA) e autenticar via codigo",
            execute: function () {
              stateData.panelOpen = true;
              stateData.activeView = "tenants";
              renderAll();
              return false;
            },
          },
        ]);
        return;
      }

      const results = [];

      // vOCC Search / Quick Send via Otto
      if (prefix === "vocc") {
        if (term) {
          results.push({
            uid: "airspace_vocc_send",
            label: "Enviar ao vOCC: " + term.toUpperCase(),
            subtext: "Envia mensagem ACARS para o vOCC (" + store.activeTenant.name + ")",
            execute: function () {
              sendChatMessage(term);
              stateData.panelOpen = true;
              stateData.activeView = "main";
              stateData.activeTab = "vocc";
              renderAll();
              return false;
            },
          });
        }
        const recent = stateData.messages.slice(-3).reverse();
        for (let i = 0; i < recent.length; i++) {
          const m = recent[i];
          results.push({
            uid: "airspace_vocc_msg_" + m.id,
            label: (m.senderName || "vOCC") + " (" + formatTime(m.timestamp) + ")",
            subtext: m.text,
            is_note: true,
            execute: function () {
              stateData.panelOpen = true;
              stateData.activeView = "main";
              stateData.activeTab = "vocc";
              if (store.auto_confirm_read) confirmAllUnreadMessages();
              renderAll();
              return false;
            },
          });
        }
        if (results.length === 0) {
          results.push({
            uid: "airspace_vocc_open",
            label: "Abrir Chat vOCC (" + store.activeTenant.name + ")",
            subtext: "Nenhuma mensagem recente - Digite 'vocc <mensagem>' para enviar",
            execute: function () {
              stateData.panelOpen = true;
              stateData.activeView = "main";
              stateData.activeTab = "vocc";
              renderAll();
              return false;
            },
          });
        }
        callback(results);
        return;
      }

      // NOTAM Search via Otto
      if (prefix === "notam") {
        const matchingNotams = stateData.notams.filter(function (n) {
          if (!termLower) return true;
          return (
            n.title.toLowerCase().indexOf(termLower) !== -1 ||
            n.content.toLowerCase().indexOf(termLower) !== -1
          );
        });
        for (let i = 0; i < Math.min(matchingNotams.length, 6); i++) {
          const n = matchingNotams[i];
          results.push({
            uid: "airspace_notam_" + n.id,
            label: "NOTAM: " + n.title,
            subtext: stripHtmlToText(n.content).slice(0, 120),
            execute: function () {
              stateData.panelOpen = true;
              stateData.activeView = "main";
              stateData.activeTab = "notams";
              stateData.selectedNotamId = n.id;
              stateData.detailNotam = n;
              renderAll();
              return false;
            },
          });
        }
        callback(results);
        return;
      }

      // METAR / Weather Search via Otto
      if (prefix === "metar" || prefix === "wx" || prefix === "clima") {
        const icaoTerm = (term || "").toUpperCase().slice(0, 4);
        if (icaoTerm) {
          results.push({
            uid: "airspace_metar_" + icaoTerm,
            label: "METAR: " + icaoTerm,
            subtext: "Consultar informacoes meteorologicas para " + icaoTerm,
            execute: function () {
              stateData.panelOpen = true;
              stateData.activeView = "main";
              stateData.activeTab = "metar";
              renderAll();
              searchMetar(icaoTerm);
              return false;
            },
          });
        } else {
          results.push({
            uid: "airspace_metar_open",
            label: "Abrir Meteorologia (METAR)",
            subtext: "Digite 'metar <ICAO>' para buscar condicoes meteorologicas",
            execute: function () {
              stateData.panelOpen = true;
              stateData.activeView = "main";
              stateData.activeTab = "metar";
              renderAll();
              return false;
            },
          });
        }
        callback(results);
        return;
      }

      // Documents & Airport Briefings Search via Otto (doc, docs, briefing, apt, airspace, acars)
      const docsPool = stateData.documents.filter(function (d) {
        if (prefix === "briefing" || prefix === "apt") {
          const isApt =
            d.source_type === "airport" ||
            d.title.toLowerCase().indexOf("briefing") !== -1 ||
            d.title.toLowerCase().indexOf("airport") !== -1 ||
            (d.source && d.source.toLowerCase().indexOf("airport") !== -1);
          if (!isApt && termLower.length !== 4) return false;
        }
        if (!termLower) return true;
        return (
          d.title.toLowerCase().indexOf(termLower) !== -1 ||
          (d.source && d.source.toLowerCase().indexOf(termLower) !== -1)
        );
      });

      for (let i = 0; i < Math.min(docsPool.length, 8); i++) {
        const doc = docsPool[i];
        results.push({
          uid: "airspace_doc_" + doc.id,
          label: doc.title,
          subtext: (doc.source || doc.type.toUpperCase()) + " | Clique para ler no painel Airspace ACARS",
          execute: function () {
            stateData.panelOpen = true;
            stateData.activeView = "main";
            stateData.activeTab = "docs";
            stateData.docCategory = "all";
            stateData.docSearch = term;
            selectDocument(doc.id);
            renderAll();
            return false;
          },
        });
      }

      if (results.length === 0) {
        results.push({
          uid: "airspace_open_docs",
          label: "Pesquisar '" + (term || "Documentos") + "' no Airspace ACARS",
          subtext: store.activeTenant.name + " | Abrir biblioteca de aeroportos e manuais",
          execute: function () {
            stateData.panelOpen = true;
            stateData.activeView = "main";
            stateData.activeTab = "docs";
            stateData.docSearch = term;
            renderAll();
            return false;
          },
        });
      }

      callback(results);
    });
  }

  // 8. Exit Cleanup
  if (typeof exit === "function") {
    exit(function () {
      stopAuthPolling();
      unfocusCoherentInput();
    });
  }

  // Expose internal controller for automated testing and diagnostics
  if (typeof globalThis !== "undefined") {
    globalThis.__AIRSPACE_ACARS_FLOW__ = {
      store: store,
      state: stateData,
      saveStore: saveStore,
      getActiveToken: getActiveToken,
      getTenantBaseUrl: getTenantBaseUrl,
      renderTextWithEmojis: renderTextWithEmojis,
      sanitizeDocumentHtml: sanitizeDocumentHtml,
      fetchTenants: fetchTenants,
      selectAuthenticatedTenant: selectAuthenticatedTenant,
      startDeviceCodeAuth: startDeviceCodeAuth,
      pollDeviceTokenOnce: pollDeviceTokenOnce,
      stopAuthPolling: stopAuthPolling,
      fetchPilotAndBooking: fetchPilotAndBooking,
      fetchMessages: fetchMessages,
      getUnreadMessages: getUnreadMessages,
      confirmMessageById: confirmMessageById,
      confirmAllUnreadMessages: confirmAllUnreadMessages,
      sendChatMessage: sendChatMessage,
      sendToastReply: sendToastReply,
      dismissToast: dismissToast,
      fetchDocuments: fetchDocuments,
      selectDocument: selectDocument,
      getFilteredDocuments: getFilteredDocuments,
      searchAirportDocumentByIcao: searchAirportDocumentByIcao,
      findNearestSimAirportAndSearch: findNearestSimAirportAndSearch,
      findNearestAirportForMetar: findNearestAirportForMetar,
      parseMetar: parseMetar,
      fetchMetarForIcao: fetchMetarForIcao,
      searchMetar: searchMetar,
      loadRouteMetars: loadRouteMetars,
      renderHomeTab: renderHomeTab,
      renderHomeClockAndDate: renderHomeClockAndDate,
      renderHomeWeatherWidget: renderHomeWeatherWidget,
      fetchHomeLocalWeather: fetchHomeLocalWeather,
      formatIosDate: formatIosDate,
      renderMetarTab: renderMetarTab,
      renderNotamsTab: renderNotamsTab,
      fetchNotams: fetchNotams,
      fetchMyFlights: fetchMyFlights,
      renderFlightsTab: renderFlightsTab,
      renderFlightDetail: renderFlightDetail,
      mapFlightLog: mapFlightLog,
      getLandingRateBand: getLandingRateBand,
      renderAll: renderAll,
      findClosest: findClosest,
      openExternalUrl: openExternalUrl,
      copyToClipboard: copyToClipboard,
    };
  }
}).call(typeof this !== "undefined" ? this : null);
