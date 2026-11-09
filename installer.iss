; ==============================================================================
; Inno Setup Script for Airspace ACARS (Parallel 42 Flow Pro for MSFS 2024 / 2020)
; ==============================================================================

#define MyAppName "Airspace ACARS"
#ifndef MyAppVersion
#define MyAppVersion "1.2.1"
#endif
#define MyAppPublisher "Airspace Team (FerrLab)"
#define MyAppURL "https://airspace.ferrlab.com"
#define MyPackageName "p42-util-airspace-acars"

[Setup]
AppId={{8F4E2A10-9C3B-4D7E-B123-AIRSPACEACARS}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL=https://github.com/GordelaG/p42-util-airspace-acars/releases
DefaultDirName={code:GetDefaultCommunityDir}
DisableProgramGroupPage=yes
DisableDirPage=no
UsePreviousAppDir=no
LicenseFile=installer\TERMOS-DE-USO.txt
OutputDir=installer_output
OutputBaseFilename=AirspaceACARS-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
DirExistsWarning=no
EnableDirDoesntExistWarning=no
CloseApplications=yes
UninstallFilesDir={app}\{#MyPackageName}
; Inno Setup 6.7+ ativa o RedirectionGuard por padrao, que bloqueia junctions/symlinks
; criados sem admin (ex.: Addon Linker) e gera "CreateFile failed; code 448".
; Desativado para permitir instalar em pastas Community gerenciadas por links.
RedirectionGuard=no

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[CustomMessages]
brazilianportuguese.ReadyDirLabel=Pasta de Destino (Community ou Personalizada):
brazilianportuguese.ReadyPackageLabel=Destino do Pacote Airspace ACARS:
brazilianportuguese.ReadyChangeTip=Se desejar alterar a pasta de instalacao, clique em "Alterar Pasta..." ou no botao "Voltar".
brazilianportuguese.BtnChangeDir=Alterar Pasta...
brazilianportuguese.LinkedPackageWarning=O Airspace ACARS ja esta instalado nesta pasta Community atraves de um link (junction/symlink), provavelmente criado pelo Addon Linker ou ferramenta similar:%n%n%1%n%nNesse caso, instale na pasta de addons que voce usa no Addon Linker, e nao na pasta Community do simulador. Pasta recomendada:%n%n%2%n%nSim = instalar na pasta recomendada%nNao = instalar na Community mesmo assim%nCancelar = voltar e escolher outra pasta
brazilianportuguese.LinkedCommunityWarning=A pasta Community selecionada e um link (junction/symlink) para outro local:%n%n%1%n%nRecomendamos instalar diretamente no destino real do link.%n%nSim = instalar no destino real (recomendado)%nNao = continuar com a pasta selecionada
brazilianportuguese.LinkedAddonsWarning=Detectamos que sua pasta Community contem addons instalados atraves de links (junction/symlink), o que indica uso do Addon Linker ou ferramenta similar.%n%nSe voce gerencia seus addons pelo Addon Linker, escolha a pasta de addons que voce usa nele (e nao a pasta Community do simulador) e depois ative o Airspace ACARS pelo Addon Linker.%n%nDeseja voltar e escolher outra pasta?%n%nSim = voltar e escolher outra pasta%nNao = instalar na Community mesmo assim
brazilianportuguese.LaunchUpdater=Abrir o Airspace ACARS Manager para verificar atualizacoes

english.ReadyDirLabel=Destination Folder (Community or Custom):
english.ReadyPackageLabel=Airspace ACARS Package Location:
english.ReadyChangeTip=If you want to change the installation folder, click "Change Folder..." or the "Back" button below.
english.BtnChangeDir=Change Folder...
english.LinkedPackageWarning=Airspace ACARS is already installed in this Community folder through a link (junction/symlink), most likely created by Addon Linker or a similar tool:%n%n%1%n%nIn this case, install into the addons folder you use in Addon Linker, not the simulator's Community folder. Recommended folder:%n%n%2%n%nYes = install into the recommended folder%nNo = install into Community anyway%nCancel = go back and choose another folder
english.LinkedCommunityWarning=The selected Community folder is a link (junction/symlink) to another location:%n%n%1%n%nWe recommend installing directly into the link's real target.%n%nYes = install into the real target (recommended)%nNo = continue with the selected folder
english.LinkedAddonsWarning=Your Community folder contains addons installed through links (junction/symlink), which indicates Addon Linker or a similar tool is being used.%n%nIf you manage your addons with Addon Linker, choose the addons folder you use there (not the simulator's Community folder) and then enable Airspace ACARS in Addon Linker.%n%nDo you want to go back and choose another folder?%n%nYes = go back and choose another folder%nNo = install into Community anyway
english.LaunchUpdater=Open Airspace ACARS Manager to check for updates

spanish.ReadyDirLabel=Carpeta de Destino (Community o Personalizada):
spanish.ReadyPackageLabel=Ubicacion del Paquete Airspace ACARS:
spanish.ReadyChangeTip=Si desea cambiar la carpeta de instalacion, haga clic en "Cambiar Carpeta..." o en "Atras".
spanish.BtnChangeDir=Cambiar Carpeta...
spanish.LinkedPackageWarning=Airspace ACARS ya esta instalado en esta carpeta Community a traves de un enlace (junction/symlink), probablemente creado por Addon Linker o una herramienta similar:%n%n%1%n%nEn este caso, instale en la carpeta de addons que usa en Addon Linker, no en la carpeta Community del simulador. Carpeta recomendada:%n%n%2%n%nSi = instalar en la carpeta recomendada%nNo = instalar en Community de todos modos%nCancelar = volver y elegir otra carpeta
spanish.LinkedCommunityWarning=La carpeta Community seleccionada es un enlace (junction/symlink) a otra ubicacion:%n%n%1%n%nRecomendamos instalar directamente en el destino real del enlace.%n%nSi = instalar en el destino real (recomendado)%nNo = continuar con la carpeta seleccionada
spanish.LinkedAddonsWarning=Su carpeta Community contiene addons instalados mediante enlaces (junction/symlink), lo que indica el uso de Addon Linker o una herramienta similar.%n%nSi administra sus addons con Addon Linker, elija la carpeta de addons que usa alli (no la carpeta Community del simulador) y luego active Airspace ACARS en Addon Linker.%n%nDesea volver y elegir otra carpeta?%n%nSi = volver y elegir otra carpeta%nNo = instalar en Community de todos modos
spanish.LaunchUpdater=Abrir Airspace ACARS Manager para verificar actualizaciones

french.ReadyDirLabel=Dossier de Destination (Community ou Personnalise):
french.ReadyPackageLabel=Emplacement du Paquet Airspace ACARS:
french.ReadyChangeTip=Si vous souhaitez modifier le dossier d'installation, cliquez sur "Changer de Dossier..." ou sur "Retour".
french.BtnChangeDir=Changer de Dossier...
french.LinkedPackageWarning=Airspace ACARS est deja installe dans ce dossier Community via un lien (junction/symlink), probablement cree par Addon Linker ou un outil similaire :%n%n%1%n%nDans ce cas, installez-le dans le dossier d'addons que vous utilisez dans Addon Linker, et non dans le dossier Community du simulateur. Dossier recommande :%n%n%2%n%nOui = installer dans le dossier recommande%nNon = installer dans Community quand meme%nAnnuler = revenir et choisir un autre dossier
french.LinkedCommunityWarning=Le dossier Community selectionne est un lien (junction/symlink) vers un autre emplacement :%n%n%1%n%nNous recommandons d'installer directement dans la cible reelle du lien.%n%nOui = installer dans la cible reelle (recommande)%nNon = continuer avec le dossier selectionne
french.LinkedAddonsWarning=Votre dossier Community contient des addons installes via des liens (junction/symlink), ce qui indique l'utilisation d'Addon Linker ou d'un outil similaire.%n%nSi vous gerez vos addons avec Addon Linker, choisissez le dossier d'addons que vous y utilisez (et non le dossier Community du simulateur), puis activez Airspace ACARS dans Addon Linker.%n%nVoulez-vous revenir et choisir un autre dossier ?%n%nOui = revenir et choisir un autre dossier%nNon = installer dans Community quand meme
french.LaunchUpdater=Ouvrir Airspace ACARS Manager pour verifier les mises a jour

[Messages]
brazilianportuguese.SelectDirLabel3=Confirme ou selecione a pasta onde deseja instalar o Airspace ACARS (recomendado: pasta Community do seu simulador). O pacote '{#MyPackageName}' sera instalado dentro dela.%n%nCaso deseje instalar em outro disco ou pasta personalizada, clique em 'Procurar...'.
english.SelectDirLabel3=Confirm or select the folder where you want to install Airspace ACARS (recommended: simulator Community folder). The '{#MyPackageName}' package will be installed inside it.%n%nIf you want to install on another drive or custom folder, click 'Browse...'.

[Files]
Source: "dist\p42-util-airspace-acars\*"; DestDir: "{app}\{#MyPackageName}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "installer\TERMOS-DE-USO.txt"; DestDir: "{app}\{#MyPackageName}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\Airspace ACARS Manager"; Filename: "{app}\{#MyPackageName}\Update.exe"; IconFilename: "{app}\{#MyPackageName}\Update.exe"

[Run]
Filename: "{app}\{#MyPackageName}\Update.exe"; Description: "{cm:LaunchUpdater}"; Flags: nowait postinstall skipifsilent unchecked

[Code]
var
  ChangeDirButton: TNewButton;

// Funcao para verificar se processo do simulador esta rodando
function IsAppRunning(const FileName: string): Boolean;
var
  FSWbemLocator: Variant;
  FWMIService: Variant;
  FWbemObjectSet: Variant;
begin
  Result := False;
  try
    FSWbemLocator := CreateOleObject('WbemScripting.SWbemLocator');
    FWMIService := FSWbemLocator.ConnectServer('', 'root\CIMV2');
    FWbemObjectSet := FWMIService.ExecQuery(Format('SELECT Name FROM Win32_Process WHERE Name="%s"', [FileName]));
    Result := (FWbemObjectSet.Count > 0);
    FWbemObjectSet := Unassigned;
    FWMIService := Unassigned;
    FSWbemLocator := Unassigned;
  except
    Result := False;
  end;
end;

function CheckSimulatorRunning(): Boolean;
begin
  Result := IsAppRunning('FlightSimulator.exe') or IsAppRunning('FlightSimulator2024.exe');
end;

// Impede instalacao se o simulador estiver rodando
function InitializeSetup(): Boolean;
begin
  Result := True;
  while CheckSimulatorRunning() do
  begin
    if MsgBox(
      'O Microsoft Flight Simulator esta em execucao no momento!' + #13#10 + #13#10 +
      'Para evitar conflito de arquivos e bloqueios do Windows, feche o simulador antes de prosseguir com a instalacao.' + #13#10 + #13#10 +
      'Feche o simulador e clique em "Repetir", ou clique em "Cancelar" para sair do instalador.',
      mbConfirmation, MB_RETRYCANCEL) <> IDRETRY then
    begin
      Result := False;
      Exit;
    end;
  end;
end;

// Normaliza barras e remove espacos em branco de caminhos
function CleanPath(const P: string): string;
var
  S: string;
  I: Integer;
begin
  S := Trim(P);
  for I := 1 to Length(S) do
  begin
    if S[I] = '/' then
      S[I] := '\';
  end;
  while (Length(S) > 0) and (S[Length(S)] = '\') do
    Delete(S, Length(S), 1);
  Result := S;
end;

// Resolve a subpasta Community a partir de um caminho base de pacotes
function ResolveCommunityFromBase(const BasePath: string): string;
var
  P: string;
begin
  P := CleanPath(BasePath);
  if P = '' then
  begin
    Result := '';
    Exit;
  end;

  if (Uppercase(ExtractFileName(P)) = 'COMMUNITY') and DirExists(P) then
    Result := P
  else if DirExists(P + '\Community') then
    Result := P + '\Community'
  else if DirExists(P + '\Packages\Community') then
    Result := P + '\Packages\Community'
  else if (Uppercase(ExtractFileName(P)) = 'COMMUNITY') then
    Result := P
  else if (Uppercase(ExtractFileName(P)) = 'PACKAGES') then
    Result := P + '\Community'
  else if DirExists(P) then
    Result := P + '\Community'
  else
    Result := P + '\Community';
end;

// Leitura robusta de UserCfg.opt para extrair o caminho configurado de pacotes
function ParseUserCfgOpt(const OptPath: string): string;
var
  Lines: TArrayOfString;
  I: Integer;
  Line: string;
  PStart, PEnd: Integer;
  RawPath: string;
begin
  Result := '';
  if FileExists(OptPath) then
  begin
    if LoadStringsFromFile(OptPath, Lines) then
    begin
      for I := 0 to GetArrayLength(Lines) - 1 do
      begin
        Line := Trim(Lines[I]);
        if Pos('InstalledPackagesPath', Line) > 0 then
        begin
          PStart := Pos('"', Line);
          if PStart > 0 then
          begin
            Delete(Line, 1, PStart);
            PEnd := Pos('"', Line);
            if PEnd > 0 then
            begin
              RawPath := CleanPath(Copy(Line, 1, PEnd - 1));
              if RawPath <> '' then
              begin
                Result := ResolveCommunityFromBase(RawPath);
                Exit;
              end;
            end;
          end;
        end;
      end;
    end;
  end;
end;

// Retorna o melhor caminho detectado automaticamente para a pasta Community
function GetDefaultCommunityDir(Param: string): string;
var
  LocalAppDataDir, AppDataDir, Candidate: string;
  Drives: array[0..5] of string;
  I: Integer;
begin
  LocalAppDataDir := ExpandConstant('{localappdata}');
  AppDataDir := ExpandConstant('{userappdata}');

  // ==========================================================================
  // FASE 1: Prioridade Maxima - Pastas Community que JA EXISTEM no disco
  // ==========================================================================

  // 1.1 MSFS 2024 Microsoft Store / Game Pass (UserCfg.opt em LocalCache ou LocalState)
  Candidate := ParseUserCfgOpt(LocalAppDataDir + '\Packages\Microsoft.Limitless_8wekyb3d8bbwe\LocalCache\UserCfg.opt');
  if (Candidate <> '') and DirExists(Candidate) then begin Result := Candidate; Exit; end;

  Candidate := ParseUserCfgOpt(LocalAppDataDir + '\Packages\Microsoft.Limitless_8wekyb3d8bbwe\LocalState\UserCfg.opt');
  if (Candidate <> '') and DirExists(Candidate) then begin Result := Candidate; Exit; end;

  // 1.2 MSFS 2024 Steam (UserCfg.opt em Roaming)
  Candidate := ParseUserCfgOpt(AppDataDir + '\Microsoft Flight Simulator 2024\UserCfg.opt');
  if (Candidate <> '') and DirExists(Candidate) then begin Result := Candidate; Exit; end;

  // 1.3 MSFS 2024 Caminhos Padroes Existentes
  Candidate := AppDataDir + '\Microsoft Flight Simulator 2024\Packages\Community';
  if DirExists(Candidate) then begin Result := Candidate; Exit; end;

  Candidate := LocalAppDataDir + '\Packages\Microsoft.Limitless_8wekyb3d8bbwe\LocalCache\Packages\Community';
  if DirExists(Candidate) then begin Result := Candidate; Exit; end;

  Candidate := LocalAppDataDir + '\Packages\Microsoft.Limitless_8wekyb3d8bbwe\LocalState\Packages\Community';
  if DirExists(Candidate) then begin Result := Candidate; Exit; end;

  // 1.4 MSFS 2020 Microsoft Store / Game Pass (UserCfg.opt em LocalCache ou LocalState)
  Candidate := ParseUserCfgOpt(LocalAppDataDir + '\Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalCache\UserCfg.opt');
  if (Candidate <> '') and DirExists(Candidate) then begin Result := Candidate; Exit; end;

  Candidate := ParseUserCfgOpt(LocalAppDataDir + '\Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalState\UserCfg.opt');
  if (Candidate <> '') and DirExists(Candidate) then begin Result := Candidate; Exit; end;

  // 1.5 MSFS 2020 Steam (UserCfg.opt em Roaming)
  Candidate := ParseUserCfgOpt(AppDataDir + '\Microsoft Flight Simulator\UserCfg.opt');
  if (Candidate <> '') and DirExists(Candidate) then begin Result := Candidate; Exit; end;

  // 1.6 MSFS 2020 Caminhos Padroes Existentes
  Candidate := LocalAppDataDir + '\Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalCache\Packages\Community';
  if DirExists(Candidate) then begin Result := Candidate; Exit; end;

  Candidate := AppDataDir + '\Microsoft Flight Simulator\Packages\Community';
  if DirExists(Candidate) then begin Result := Candidate; Exit; end;

  // 1.7 Busca automatica por pasta Community existente em discos secundarios
  Drives[0] := 'D:'; Drives[1] := 'E:'; Drives[2] := 'F:'; Drives[3] := 'G:'; Drives[4] := 'H:'; Drives[5] := 'C:';
  for I := 0 to 5 do
  begin
    if DirExists(Drives[I] + '\MSFS\Community') then begin Result := Drives[I] + '\MSFS\Community'; Exit; end;
    if DirExists(Drives[I] + '\MSFS 2024\Community') then begin Result := Drives[I] + '\MSFS 2024\Community'; Exit; end;
    if DirExists(Drives[I] + '\MSFS 2020\Community') then begin Result := Drives[I] + '\MSFS 2020\Community'; Exit; end;
    if DirExists(Drives[I] + '\Flight Simulator\Community') then begin Result := Drives[I] + '\Flight Simulator\Community'; Exit; end;
    if (Drives[I] <> 'C:') and DirExists(Drives[I] + '\Community') then begin Result := Drives[I] + '\Community'; Exit; end;
  end;

  // ==========================================================================
  // FASE 2: Caso a pasta Community ainda nao exista fisicamente no disco,
  // usar o caminho configurado pelo simulador no arquivo UserCfg.opt
  // ==========================================================================
  Candidate := ParseUserCfgOpt(LocalAppDataDir + '\Packages\Microsoft.Limitless_8wekyb3d8bbwe\LocalCache\UserCfg.opt');
  if Candidate <> '' then begin Result := Candidate; Exit; end;

  Candidate := ParseUserCfgOpt(AppDataDir + '\Microsoft Flight Simulator 2024\UserCfg.opt');
  if Candidate <> '' then begin Result := Candidate; Exit; end;

  Candidate := ParseUserCfgOpt(LocalAppDataDir + '\Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalCache\UserCfg.opt');
  if Candidate <> '' then begin Result := Candidate; Exit; end;

  Candidate := ParseUserCfgOpt(AppDataDir + '\Microsoft Flight Simulator\UserCfg.opt');
  if Candidate <> '' then begin Result := Candidate; Exit; end;

  // ==========================================================================
  // FASE 3: Caso nao haja UserCfg.opt mas haja pasta do simulador no perfil
  // ==========================================================================
  if DirExists(AppDataDir + '\Microsoft Flight Simulator 2024') then
  begin
    Result := AppDataDir + '\Microsoft Flight Simulator 2024\Packages\Community';
    Exit;
  end;

  if DirExists(LocalAppDataDir + '\Packages\Microsoft.Limitless_8wekyb3d8bbwe') then
  begin
    Result := LocalAppDataDir + '\Packages\Microsoft.Limitless_8wekyb3d8bbwe\LocalCache\Packages\Community';
    Exit;
  end;

  if DirExists(AppDataDir + '\Microsoft Flight Simulator') then
  begin
    Result := AppDataDir + '\Microsoft Flight Simulator\Packages\Community';
    Exit;
  end;

  if DirExists(LocalAppDataDir + '\Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe') then
  begin
    Result := LocalAppDataDir + '\Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalCache\Packages\Community';
    Exit;
  end;

  // ==========================================================================
  // FASE 4: Fallback padrao limpo (MSFS 2024 Steam/Roaming)
  // ==========================================================================
  Result := AppDataDir + '\Microsoft Flight Simulator 2024\Packages\Community';
end;

// Evento disparado para alterar o texto de resumo na tela "Pronto pra Instalar" (wpReady)
function UpdateReadyMemo(Space, NewLine, MemoUserInfoInfo, MemoDirInfo, MemoTypeInfo, MemoComponentsInfo, MemoGroupInfo, MemoTasksInfo: String): String;
var
  S: String;
begin
  S := '';
  S := S + CustomMessage('ReadyDirLabel') + NewLine;
  S := S + Space + WizardDirValue() + NewLine + NewLine;
  S := S + CustomMessage('ReadyPackageLabel') + NewLine;
  S := S + Space + WizardDirValue() + '\{#MyPackageName}' + NewLine + NewLine;
  S := S + CustomMessage('ReadyChangeTip') + NewLine;
  Result := S;
end;

// Clique do botao customizado na tela wpReady para voltar e alterar pasta
procedure ChangeDirButtonClick(Sender: TObject);
begin
  WizardForm.BackButton.OnClick(WizardForm.BackButton);
end;

// Cria botao customizado "Alterar Pasta..." na tela wpReady
procedure InitializeWizard();
begin
  ChangeDirButton := TNewButton.Create(WizardForm);
  ChangeDirButton.Parent := WizardForm;
  ChangeDirButton.Caption := CustomMessage('BtnChangeDir');
  ChangeDirButton.Left := ScaleX(16);
  ChangeDirButton.Top := WizardForm.BackButton.Top;
  ChangeDirButton.Width := ScaleX(140);
  ChangeDirButton.Height := WizardForm.BackButton.Height;
  ChangeDirButton.OnClick := @ChangeDirButtonClick;
  ChangeDirButton.Visible := False;
end;

// Atualiza visibilidade dos botoes conforme a pagina atual
procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = wpReady then
  begin
    ChangeDirButton.Visible := True;
  end
  else
  begin
    ChangeDirButton.Visible := False;
  end;
end;

const
  // Quantidade minima de addons vinculados por link na Community para sugerir uso do Addon Linker
  LINKED_ADDONS_THRESHOLD = 3;

// Verifica se a pasta e um link (junction/symlink), sem atravessa-lo
function IsLinkDir(const Path: string): Boolean;
var
  FindRec: TFindRec;
begin
  Result := False;
  if FindFirst(CleanPath(Path), FindRec) then
  begin
    try
      Result := ((FindRec.Attributes and FILE_ATTRIBUTE_DIRECTORY) <> 0) and
                ((FindRec.Attributes and FILE_ATTRIBUTE_REPARSE_POINT) <> 0);
    finally
      FindClose(FindRec);
    end;
  end;
end;

// Conta quantas subpastas da pasta informada sao links (junction/symlink)
function CountLinkedSubDirs(const Path: string): Integer;
var
  FindRec: TFindRec;
begin
  Result := 0;
  if FindFirst(CleanPath(Path) + '\*', FindRec) then
  begin
    try
      repeat
        if (FindRec.Name <> '.') and (FindRec.Name <> '..') and
           ((FindRec.Attributes and FILE_ATTRIBUTE_DIRECTORY) <> 0) and
           ((FindRec.Attributes and FILE_ATTRIBUTE_REPARSE_POINT) <> 0) then
          Result := Result + 1;
      until not FindNext(FindRec);
    finally
      FindClose(FindRec);
    end;
  end;
end;

// Resolve o destino de um link (junction/symlink) via PowerShell; retorna '' se falhar
function GetLinkTarget(const Path: string): string;
var
  TmpFile, Cmd, QuotedPath, QuotedTmp: string;
  Lines: TArrayOfString;
  ResultCode: Integer;
begin
  Result := '';
  TmpFile := ExpandConstant('{tmp}\linktarget.txt');
  DeleteFile(TmpFile);
  QuotedPath := CleanPath(Path);
  StringChangeEx(QuotedPath, '''', '''''', True);
  QuotedTmp := TmpFile;
  StringChangeEx(QuotedTmp, '''', '''''', True);
  Cmd := '-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "' +
         '(Get-Item -LiteralPath ''' + QuotedPath + ''' -Force).Target | Select-Object -First 1 | ' +
         'Out-File -LiteralPath ''' + QuotedTmp + ''' -Encoding utf8"';
  if Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), Cmd, '', SW_HIDE,
          ewWaitUntilTerminated, ResultCode) and (ResultCode = 0) then
  begin
    if LoadStringsFromFile(TmpFile, Lines) and (GetArrayLength(Lines) > 0) then
    begin
      Result := CleanPath(Lines[0]);
      // Symlinks podem retornar caminho relativo ou com prefixo \\?\
      if Copy(Result, 1, 4) = '\\?\' then
        Delete(Result, 1, 4);
      if (Result <> '') and (Pos(':', Result) = 0) and (Copy(Result, 1, 2) <> '\\') then
        Result := CleanPath(ExtractFilePath(CleanPath(Path)) + Result);
    end;
  end;
  DeleteFile(TmpFile);
end;

// Detecta Community gerenciada por links (Addon Linker e similares) e orienta o usuario.
// Retorna False para manter o usuario na pagina de selecao de pasta.
function CheckLinkedCommunity(var SelectedPath: string): Boolean;
var
  PackagePath, Target, Recommended: string;
begin
  Result := True;
  if WizardSilent() then
    Exit;

  PackagePath := SelectedPath + '\{#MyPackageName}';

  // Caso 1: o proprio pacote ja existe na Community como link (ex.: ativado pelo Addon Linker)
  if IsLinkDir(PackagePath) then
  begin
    Target := GetLinkTarget(PackagePath);
    if Target <> '' then
      Recommended := CleanPath(ExtractFilePath(Target))
    else
      Recommended := '';

    if Recommended = '' then
    begin
      Result := MsgBox(CustomMessage('LinkedAddonsWarning'), mbConfirmation, MB_YESNO) = IDNO;
      Exit;
    end;

    case MsgBox(FmtMessage(CustomMessage('LinkedPackageWarning'), [Target, Recommended]),
                mbConfirmation, MB_YESNOCANCEL) of
      IDYES:
        begin
          SelectedPath := Recommended;
          WizardForm.DirEdit.Text := SelectedPath;
        end;
      IDNO:
        Result := True;
    else
      Result := False;
    end;
    Exit;
  end;

  // Caso 2: a propria pasta Community e um link para outro local
  if IsLinkDir(SelectedPath) then
  begin
    Target := GetLinkTarget(SelectedPath);
    if (Target <> '') and
       (MsgBox(FmtMessage(CustomMessage('LinkedCommunityWarning'), [Target]), mbConfirmation, MB_YESNO) = IDYES) then
    begin
      SelectedPath := Target;
      WizardForm.DirEdit.Text := SelectedPath;
    end;
    Exit;
  end;

  // Caso 3: varios addons da Community sao links, indicando uso do Addon Linker
  if CountLinkedSubDirs(SelectedPath) >= LINKED_ADDONS_THRESHOLD then
    Result := MsgBox(CustomMessage('LinkedAddonsWarning'), mbConfirmation, MB_YESNO) = IDNO;
end;

// Ajuste silencioso do destino caso o usuario selecione o proprio pacote
function NextButtonClick(CurPageID: Integer): Boolean;
var
  SelectedPath: string;
begin
  Result := True;

  if CurPageID = wpSelectDir then
  begin
    SelectedPath := CleanPath(WizardDirValue());

    // Se o usuario selecionou a pasta terminando com o nome do proprio pacote, ajusta silenciosamente
    if Uppercase(ExtractFileName(SelectedPath)) = Uppercase('{#MyPackageName}') then
    begin
      SelectedPath := CleanPath(ExtractFilePath(SelectedPath));
      WizardForm.DirEdit.Text := SelectedPath;
    end;

    Result := CheckLinkedCommunity(SelectedPath);
  end;
end;
