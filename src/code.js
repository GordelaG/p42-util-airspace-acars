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
  const APP_VERSION = "1.0.14";
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
        vocc: "vOCC & Mensagens",
        docs: "Aeroportos & Documentos",
        flight: "Voo Ativo & NOTAMs",
        settings: "Configuracoes",
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
        open: "Abrir no vOCC / Responder",
        dismiss: "Marcar Lida",
        close_title: "Dispensar",
      },
      update: {
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
        vocc: "vOCC & Messages",
        docs: "Airports & Documents",
        flight: "Active Flight & NOTAMs",
        settings: "Settings",
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
        open: "Open in vOCC / Reply",
        dismiss: "Mark Read",
        close_title: "Dismiss",
      },
      update: {
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
        vocc: "vOCC & Mensajes",
        docs: "Aeropuertos & Documentos",
        flight: "Vuelo Activo & NOTAMs",
        settings: "Configuracion",
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
        open: "Abrir en vOCC / Responder",
        dismiss: "Marcar Leido",
        close_title: "Descartar",
      },
      update: {
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
        vocc: "vOCC & Messages",
        docs: "Aeroports & Documents",
        flight: "Vol Actif & NOTAMs",
        settings: "Parametres",
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
        open: "Ouvrir dans vOCC / Repondre",
        dismiss: "Marquer comme Lu",
        close_title: "Ignorer",
      },
      update: {
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
    activeTab: "vocc",     // "vocc" | "docs" | "flight"

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

    // vOCC & Messages
    messages: [],
    sendingMessage: false,
    toastMessage: null,

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
  let rootEl = null;
  let activeInputEl = null;
  let toastTimerId = null;

  function clearToastTimer() {
    if (toastTimerId) {
      clearTimeout(toastTimerId);
      toastTimerId = null;
    }
  }

  function startToastTimer() {
    clearToastTimer();
    const rawSec = typeof store.toast_duration === "number" ? store.toast_duration : parseInt(store.toast_duration, 10);
    const durSec = isNaN(rawSec) || rawSec < 0 ? 15 : rawSec;
    if (durSec > 0) {
      toastTimerId = setTimeout(function () {
        dismissToast();
      }, durSec * 1000);
    }
  }

  function dismissToast() {
    clearToastTimer();
    stateData.toastMessage = null;
    renderToast();
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

  function unfocusCoherentInput() {
    activeInputEl = null;
    try {
      if (typeof Coherent !== "undefined" && Coherent && typeof Coherent.trigger === "function") {
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

  function openExternalUrl(rawUrl) {
    if (!rawUrl) return false;
    let target = String(rawUrl).trim();
    if (!/^https?:\/\//i.test(target)) {
      const base = getTenantBaseUrl();
      if (!base) return false;
      target = base + (target.startsWith("/") ? "" : "/") + target;
    }
    if (!/^https?:\/\//i.test(target)) return false;

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
    renderAll();
    refreshAllAuthenticatedData();
  }

  function refreshAllAuthenticatedData() {
    if (!getActiveToken()) return;
    fetchPilotAndBooking();
    fetchMessages();
    fetchDocuments();
    fetchNotams();
  }

  // --- Pilot & Active Booking ---
  async function fetchPilotAndBooking() {
    if (!getActiveToken()) return;
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

    renderHeader();
    renderBriefingShortcuts();
    renderFlightTab();
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

  async function fetchMessages() {
    if (!getActiveToken()) return;
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
        renderToast();
      }

      renderTabsBadge();
      const isChatOpen = stateData.panelOpen && stateData.activeView === "main" && stateData.activeTab === "vocc";
      renderChatTab(isChatOpen);
      if (isChatOpen) {
        scrollChatToBottom();
      }
    } catch (_e) {
      // Ignore transient polling error
    }
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

  async function fetchDocuments() {
    if (!getActiveToken()) return;
    stateData.docsLoading = true;
    stateData.docsError = "";
    renderDocsTab();

    try {
      const res = await apiRequest("GET", "/api/v2/acars/documents?page=1&per_page=100&sort=sort_order&sort_dir=asc");
      if (!res.ok || !res.data) {
        throw new Error("HTTP " + res.status);
      }
      const rawItems = Array.isArray(res.data.data) ? res.data.data : [];
      let allDocs = rawItems.map(normalizeDocWire).filter(Boolean);

      const lastPage = (res.data.meta && res.data.meta.last_page) || res.data.last_page || 1;
      for (let p = 2; p <= lastPage && p <= 5; p++) {
        const pageRes = await apiRequest(
          "GET",
          "/api/v2/acars/documents?page=" + p + "&per_page=100&sort=sort_order&sort_dir=asc"
        );
        if (pageRes.ok && pageRes.data && Array.isArray(pageRes.data.data)) {
          allDocs = allDocs.concat(pageRes.data.data.map(normalizeDocWire).filter(Boolean));
        }
      }

      stateData.documents = allDocs;
      if (!stateData.selectedDocId && allDocs.length > 0) {
        const firstReadable = allDocs.find(function (d) {
          return d.type !== "folder";
        }) || allDocs[0];
        selectDocument(firstReadable.id);
      }
    } catch (_e) {
      stateData.docsError = "Nao foi possivel carregar os documentos da companhia.";
    } finally {
      stateData.docsLoading = false;
      renderDocsTab();
    }
  }

  async function selectDocument(docId) {
    if (!docId) {
      stateData.selectedDocId = null;
      stateData.detailDoc = null;
      renderDocsTab();
      return;
    }
    stateData.selectedDocId = String(docId);
    const cached = stateData.documents.find(function (d) {
      return d.id === stateData.selectedDocId;
    });
    stateData.detailDoc = cached || null;
    stateData.detailDocLoading = true;
    renderDocsTab();

    try {
      const res = await apiRequest("GET", "/api/v2/acars/documents/" + encodeURIComponent(stateData.selectedDocId));
      if (res.ok && res.data) {
        const raw = res.data.data ? res.data.data : res.data;
        const parsed = normalizeDocWire(raw);
        if (parsed) {
          stateData.detailDoc = parsed;
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
      const titleLower = doc.title.toLowerCase();
      const sourceLower = (doc.source || "").toLowerCase();

      if (cat === "briefing") {
        const isBriefing =
          doc.source_type === "airport" ||
          titleLower.indexOf("briefing") !== -1 ||
          titleLower.indexOf("airport") !== -1 ||
          titleLower.indexOf("aeroporto") !== -1 ||
          sourceLower.indexOf("airport") !== -1;
        if (!isBriefing) return false;
      } else if (cat === "fdm") {
        const isFdm =
          doc.source_type === "fdm_profile" ||
          titleLower.indexOf("fdm") !== -1 ||
          titleLower.indexOf("safety") !== -1 ||
          sourceLower.indexOf("fdm") !== -1;
        if (!isFdm) return false;
      } else if (cat === "load") {
        const isLoad =
          doc.source_type === "load_profile" ||
          titleLower.indexOf("load") !== -1 ||
          titleLower.indexOf("carga") !== -1 ||
          sourceLower.indexOf("load") !== -1;
        if (!isLoad) return false;
      } else if (cat === "manuals") {
        const isManual =
          titleLower.indexOf("sop") !== -1 ||
          titleLower.indexOf("manual") !== -1 ||
          titleLower.indexOf("guide") !== -1 ||
          titleLower.indexOf("procedimento") !== -1 ||
          (!doc.is_auto_generated && doc.type !== "folder");
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

  // --- Company NOTAMs ---
  async function fetchNotams() {
    if (!getActiveToken()) return;
    try {
      const res = await apiRequest("GET", "/api/v2/acars/notams?page=1&per_page=25&filter[is_active]=1&sort=created_at&sort_dir=desc");
      if (!res.ok || !res.data) return;
      const list = Array.isArray(res.data.data) ? res.data.data : [];
      stateData.notams = list.map(function (n) {
        return {
          id: String(n.id || ""),
          title: String(n.title || "NOTAM"),
          content: String(n.content || n.body || n.description || ""),
          created_at: String(n.created_at || ""),
        };
      });
      if (!stateData.selectedNotamId && stateData.notams.length > 0) {
        stateData.selectedNotamId = stateData.notams[0].id;
        stateData.detailNotam = stateData.notams[0];
      }
      renderFlightTab();
    } catch (_e) {}
  }

  // --- DOM Rendering ---
  function q(selector) {
    return rootEl ? rootEl.querySelector(selector) : null;
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

      if (senderEl) {
        senderEl.textContent = (msg.senderName || t("toast.header")) + (msg.senderRole ? " (" + msg.senderRole.toUpperCase() + ")" : "");
      }
      if (textEl) {
        textEl.textContent = msg.text || "";
      }
      if (openBtn) {
        openBtn.textContent = t("toast.open");
      }
      if (dismissBtn) {
        dismissBtn.textContent = t("toast.dismiss");
      }
      startToastTimer();
    } else {
      clearToastTimer();
    }
  }

  function renderHeader() {
    if (!rootEl) return;
    const vaBadge = q("#as-acars-va-badge");
    const routePill = q("#as-acars-route-pill");
    const btnRefresh = q("#as-acars-btn-refresh");
    const btnSwitchVa = q("#as-acars-btn-switch-va");

    const isAuthed = Boolean(getActiveToken() && store.activeTenant);
    setVisible(vaBadge, Boolean(store.activeTenant && store.activeTenant.name));
    if (vaBadge && store.activeTenant) {
      vaBadge.textContent = store.activeTenant.name;
    }

    setVisible(btnRefresh, isAuthed && stateData.activeView === "main");
    setVisible(btnSwitchVa, isAuthed || stateData.activeView === "auth");

    const b = stateData.booking;
    const dep = b && b.departure_airport && b.departure_airport.icao ? b.departure_airport.icao : "";
    const arr =
      b && b.alternate_airport && b.alternate_airport.icao
        ? b.alternate_airport.icao
        : b && b.arrival_airport && b.arrival_airport.icao
          ? b.arrival_airport.icao
          : "";
    const cs = b ? b.callsign || b.flight_number || "" : "";

    setVisible(routePill, Boolean(isAuthed && (cs || dep || arr)));
    if (routePill && (cs || dep || arr)) {
      routePill.textContent = (cs ? cs + " | " : "") + (dep || "----") + " -> " + (arr || "----");
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
      urlEl.href = fullAuthUrl;
      urlEl.textContent =
        baseUrl + "/acars/authorize?code=" + (stateData.deviceCode || "------");
    }
    if (openAuthBtn) {
      openAuthBtn.href = fullAuthUrl;
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
    const tabs = ["vocc", "docs", "flight", "settings"];
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

    renderTabsBadge();
    renderChatTab();
    renderBriefingShortcuts();
    renderDocsTab();
    renderFlightTab();
    renderSettingsTab();
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
  }

  function renderTabsBadge() {
    if (!rootEl) return;
    const badge = q("#as-acars-unread-badge");
    const unreadCount = getUnreadMessages().length;
    setVisible(badge, unreadCount > 0);
    if (badge && unreadCount > 0) {
      badge.textContent = String(unreadCount);
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

    if (titleEl) titleEl.textContent = activeDoc.title;
    if (metaEl) {
      const mParts = [];
      if (activeDoc.source) mParts.push(activeDoc.source);
      const dt = formatDate(activeDoc.updated_at || activeDoc.created_at);
      if (dt) mParts.push("Atualizado em " + dt);
      metaEl.textContent = mParts.join(" | ");
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

    if (activeDoc.content) {
      bodyEl.innerHTML = '<div class="as-acars-doc-html">' + sanitizeDocumentHtml(activeDoc.content) + "</div>";
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

  function renderFlightTab() {
    if (!rootEl) return;
    const bookingEl = q("#as-acars-booking-content");
    const pilotEl = q("#as-acars-pilot-content");
    const notamsListEl = q("#as-acars-notams-list");
    const notamDetailEl = q("#as-acars-notam-detail");

    if (bookingEl) {
      const b = stateData.booking;
      if (!b) {
        bookingEl.innerHTML = '<div class="as-acars-empty-state">' + escapeHtml(t("flight.no_booking")) + '</div>';
      } else {
        const depIcao = (b.departure_airport && b.departure_airport.icao) || "----";
        const arrIcao = (b.arrival_airport && b.arrival_airport.icao) || "----";
        const acReg = (b.aircraft && b.aircraft.registration) || "-";
        const acType = (b.aircraft && (b.aircraft.type || b.aircraft.name)) || "-";
        bookingEl.innerHTML =
          '<div class="as-acars-kv-grid">' +
          '<div class="as-acars-kv"><span class="as-acars-kv-label">Callsign</span><span class="as-acars-kv-val">' +
          escapeHtml(b.callsign || b.flight_number || "-") +
          "</span></div>" +
          '<div class="as-acars-kv"><span class="as-acars-kv-label">Voo</span><span class="as-acars-kv-val">' +
          escapeHtml(b.flight_number || "-") +
          "</span></div>" +
          '<div class="as-acars-kv"><span class="as-acars-kv-label">Rota</span><span class="as-acars-kv-val">' +
          escapeHtml(depIcao + " -> " + arrIcao) +
          "</span></div>" +
          '<div class="as-acars-kv"><span class="as-acars-kv-label">Aeronave</span><span class="as-acars-kv-val">' +
          escapeHtml(acReg + " (" + acType + ")") +
          "</span></div>" +
          "</div>";
      }
    }

    if (pilotEl) {
      const p = stateData.pilot;
      if (!p) {
        pilotEl.innerHTML = '<div class="as-acars-empty-state">' + escapeHtml(t("flight.loading_pilot")) + '</div>';
      } else {
        const pName = p.name || (p.profile && p.profile.name) || "Piloto";
        const pCallsign = p.callsign || (p.profile && p.profile.callsign) || "-";
        const pRank = (p.rank && p.rank.name) || (p.profile && p.profile.rank && p.profile.rank.name) || "-";
        const pHours =
          p.flight_hours !== undefined
            ? p.flight_hours
            : p.profile && p.profile.flight_hours !== undefined
              ? p.profile.flight_hours
              : "-";
        pilotEl.innerHTML =
          '<div class="as-acars-kv-grid">' +
          '<div class="as-acars-kv"><span class="as-acars-kv-label">Nome</span><span class="as-acars-kv-val">' +
          escapeHtml(pName) +
          "</span></div>" +
          '<div class="as-acars-kv"><span class="as-acars-kv-label">Callsign</span><span class="as-acars-kv-val">' +
          escapeHtml(pCallsign) +
          "</span></div>" +
          '<div class="as-acars-kv"><span class="as-acars-kv-label">Patente</span><span class="as-acars-kv-val">' +
          escapeHtml(pRank) +
          "</span></div>" +
          '<div class="as-acars-kv"><span class="as-acars-kv-label">Horas</span><span class="as-acars-kv-val">' +
          escapeHtml(String(pHours)) +
          "</span></div>" +
          "</div>";
      }
    }

    const notamTitleEl = q("#as-acars-notams-title");
    if (notamTitleEl) {
      notamTitleEl.textContent = "NOTAMs (" + stateData.notams.length + ")";
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
              escapeHtml(n.title) +
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
          '<h4 style="margin:0 0 6px 0;color:#fff;">' +
          escapeHtml(n.title) +
          "</h4>" +
          '<div style="font-size:12px;color:#e4e4e7;">' +
          escapeHtml(stripHtmlToText(n.content)) +
          "</div>";
      }
    }
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

      // Refresh data
      if (findClosest(target, "#as-acars-btn-refresh")) {
        refreshAllAuthenticatedData();
        return;
      }

      // Switch VA
      if (findClosest(target, "#as-acars-btn-switch-va") || findClosest(target, "#as-acars-btn-back-tenants")) {
        stopAuthPolling();
        stateData.activeView = "tenants";
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

      // Main Navigation Tabs
      const tabBtn = findClosest(target, ".as-acars-tab[data-tab]");
      if (tabBtn) {
        const tabName = tabBtn.getAttribute("data-tab");
        if (tabName) {
          stateData.activeTab = tabName;
          if (tabName === "vocc" && store.auto_confirm_read) {
            confirmAllUnreadMessages();
          }
          renderMainView();
          if (tabName === "vocc") {
            scrollChatToBottom();
          }
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
        const input = q("#as-acars-chat-input");
        if (input && input.value.trim()) {
          const val = input.value;
          input.value = "";
          sendChatMessage(val);
          scrollChatToBottom();
        }
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
        renderDocsTab();
        return;
      }

      // Document Category Pills
      const catBtn = findClosest(target, "[data-cat]");
      if (catBtn) {
        const cat = catBtn.getAttribute("data-cat");
        if (cat) {
          stateData.docCategory = cat;
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

      // Select NOTAM
      const notamBtn = findClosest(target, "[data-notam-id]");
      if (notamBtn) {
        const nid = notamBtn.getAttribute("data-notam-id");
        stateData.selectedNotamId = nid;
        stateData.detailNotam =
          stateData.notams.find(function (n) {
            return n.id === nid;
          }) || null;
        renderFlightTab();
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
    const inputs = ["#as-acars-tenant-search", "#as-acars-doc-search", "#as-acars-chat-input"];
    for (let i = 0; i < inputs.length; i++) {
      const inp = q(inputs[i]);
      if (!inp) continue;

      inp.addEventListener("focus", function () {
        focusCoherentInput(inp);
      });

      inp.addEventListener("blur", function () {
        if (activeInputEl === inp) {
          unfocusCoherentInput();
        }
      });

      inp.addEventListener("input", function () {
        handleInputValueChange(inp);
      });

      inp.addEventListener("keyup", function () {
        handleInputValueChange(inp);
      });
    }

    const chatInput = q("#as-acars-chat-input");
    if (chatInput) {
      chatInput.addEventListener("keydown", function (e) {
        e.stopPropagation();
        if (e.key === "Enter" || e.keyCode === 13) {
          e.preventDefault();
          const val = chatInput.value.trim();
          if (val) {
            chatInput.value = "";
            sendChatMessage(val);
          }
        }
      });
    }

    const toastEl = q("#as-acars-toast");
    if (toastEl) {
      toastEl.addEventListener("mouseenter", function () {
        clearToastTimer();
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
  }

  // --- Flow Lifecycle Hooks ---

  // 1. HTML Created
  if (typeof html_created === "function") {
    html_created(function (el) {
      rootEl = el;
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
      if (!getActiveToken() || !store.activeTenant) return;

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
    const searchPrefixes = ["airspace", "acars", "vocc", "doc", "docs", "briefing", "apt", "notam"];
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
              stateData.activeTab = "flight";
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
      fetchDocuments: fetchDocuments,
      selectDocument: selectDocument,
      getFilteredDocuments: getFilteredDocuments,
      searchAirportDocumentByIcao: searchAirportDocumentByIcao,
      findNearestSimAirportAndSearch: findNearestSimAirportAndSearch,
      fetchNotams: fetchNotams,
      renderAll: renderAll,
      findClosest: findClosest,
      openExternalUrl: openExternalUrl,
      copyToClipboard: copyToClipboard,
    };
  }
}).call(typeof this !== "undefined" ? this : null);
