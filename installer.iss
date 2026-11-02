; ==============================================================================
; Inno Setup Script for Airspace ACARS (Parallel 42 Flow Pro for MSFS 2024 / 2020)
; ==============================================================================

#define MyAppName "Airspace ACARS"
#ifndef MyAppVersion
#define MyAppVersion "1.0.24"
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

english.ReadyDirLabel=Destination Folder (Community or Custom):
english.ReadyPackageLabel=Airspace ACARS Package Location:
english.ReadyChangeTip=If you want to change the installation folder, click "Change Folder..." or the "Back" button below.
english.BtnChangeDir=Change Folder...

spanish.ReadyDirLabel=Carpeta de Destino (Community o Personalizada):
spanish.ReadyPackageLabel=Ubicacion del Paquete Airspace ACARS:
spanish.ReadyChangeTip=Si desea cambiar la carpeta de instalacion, haga clic en "Cambiar Carpeta..." o en "Atras".
spanish.BtnChangeDir=Cambiar Carpeta...

french.ReadyDirLabel=Dossier de Destination (Community ou Personnalise):
french.ReadyPackageLabel=Emplacement du Paquet Airspace ACARS:
french.ReadyChangeTip=Si vous souhaitez modifier le dossier d'installation, cliquez sur "Changer de Dossier..." ou sur "Retour".
french.BtnChangeDir=Changer de Dossier...

[Messages]
brazilianportuguese.SelectDirLabel3=Confirme ou selecione a pasta onde deseja instalar o Airspace ACARS (recomendado: pasta Community do seu simulador). O pacote '{#MyPackageName}' sera instalado dentro dela.%n%nCaso deseje instalar em outro disco ou pasta personalizada, clique em 'Procurar...'.
english.SelectDirLabel3=Confirm or select the folder where you want to install Airspace ACARS (recommended: simulator Community folder). The '{#MyPackageName}' package will be installed inside it.%n%nIf you want to install on another drive or custom folder, click 'Browse...'.

[Files]
Source: "dist\p42-util-airspace-acars\*"; DestDir: "{app}\{#MyPackageName}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "installer\TERMOS-DE-USO.txt"; DestDir: "{app}\{#MyPackageName}"; Flags: ignoreversion

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
  end;
end;
