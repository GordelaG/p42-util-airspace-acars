; ==============================================================================
; Inno Setup Script for Airspace ACARS (Parallel 42 Flow Pro for MSFS 2024 / 2020)
; ==============================================================================

#define MyAppName "Airspace ACARS"
#ifndef MyAppVersion
#define MyAppVersion "1.0.21"
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
AlwaysShowDirOnMerges=yes
LicenseFile=installer\TERMOS-DE-USO.txt
OutputDir=installer_output
OutputBaseFilename=AirspaceACARS-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
DirExistsWarning=no
EnableDirDoesntExistWarning=yes
CloseApplications=yes
UninstallFilesDir={app}\{#MyPackageName}

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[CustomMessages]
brazilianportuguese.SimSelectTitle=Identificacao do Simulador
brazilianportuguese.SimSelectDesc=Escolha a versao do Microsoft Flight Simulator onde o Flow Pro esta instalado.
brazilianportuguese.SimSelectSub=Selecione uma opcao abaixo para configurar a pasta Community correta:
brazilianportuguese.SimMSFS2024=Microsoft Flight Simulator 2024
brazilianportuguese.SimMSFS2020=Microsoft Flight Simulator 2020
brazilianportuguese.SimManual=Identificar pasta Community manualmente (escolher outro disco ou pasta personalizada)
brazilianportuguese.Detected=Detectado
brazilianportuguese.NotDetected=Nao detectado automaticamente
brazilianportuguese.FoundCommunitySubdir=Foi detectada a subpasta Community em:%n%n%1%n%nDeseja instalar nesta pasta Community recomendada?
brazilianportuguese.WarnNotCommunityDir=ATENCAO: A pasta selecionada nao parece ser a pasta "Community" do simulador:%n%n%1%n%nO Airspace ACARS e o Flow Pro devem ser instalados dentro da pasta Community para que o widget apareca no simulador.%n%nDicas para Microsoft Store / Game Pass:%n- MSFS 2024: %%LOCALAPPDATA%%\Packages\Microsoft.Limitless_8wekyb3d8bbwe\LocalCache\Packages\Community%n- MSFS 2020: %%LOCALAPPDATA%%\Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalCache\Packages\Community%n- Caso tenha instalado em outro disco (D:\, E:\, etc), consulte no arquivo UserCfg.opt o caminho da linha InstalledPackagesPath.%n%nDeseja realmente continuar com esta pasta?
brazilianportuguese.ReadyDirLabel=Pasta de Destino (Community do Simulador):
brazilianportuguese.ReadyPackageLabel=Destino do Pacote Airspace ACARS:
brazilianportuguese.ReadyChangeTip=Importante: Se o caminho acima nao for a pasta Community do seu simulador, clique em "Alterar Pasta..." ou no botao "Voltar" abaixo para selecionar a pasta correta.
brazilianportuguese.BtnChangeDir=Alterar Pasta...

english.SimSelectTitle=Simulator Identification
english.SimSelectDesc=Choose the version of Microsoft Flight Simulator where Flow Pro is installed.
english.SimSelectSub=Select an option below to configure the target Community folder:
english.SimMSFS2024=Microsoft Flight Simulator 2024
english.SimMSFS2020=Microsoft Flight Simulator 2020
english.SimManual=Identify Community folder manually (choose another drive or custom folder)
english.Detected=Detected
english.NotDetected=Not detected automatically
english.FoundCommunitySubdir=The Community subfolder was detected in:%n%n%1%n%nDo you want to install into this recommended Community folder?
english.WarnNotCommunityDir=WARNING: The selected folder does not seem to be the simulator's "Community" folder:%n%n%1%n%nAirspace ACARS and Flow Pro must be installed inside the Community folder to be recognized by the simulator.%n%nMicrosoft Store / Game Pass tips:%n- MSFS 2024: %%LOCALAPPDATA%%\Packages\Microsoft.Limitless_8wekyb3d8bbwe\LocalCache\Packages\Community%n- MSFS 2020: %%LOCALAPPDATA%%\Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalCache\Packages\Community%n- If installed on another drive, check the InstalledPackagesPath line in UserCfg.opt.%n%nDo you really want to continue with this destination?
english.ReadyDirLabel=Destination Folder (Simulator Community):
english.ReadyPackageLabel=Airspace ACARS Package Location:
english.ReadyChangeTip=Important: If the path above is not your simulator Community folder, click "Change Folder..." or the "Back" button below to select the correct location.
english.BtnChangeDir=Change Folder...

spanish.SimSelectTitle=Identificacion del Simulador
spanish.SimSelectDesc=Elija la version de Microsoft Flight Simulator donde esta instalado Flow Pro.
spanish.SimSelectSub=Seleccione una opcion para definir la carpeta Community de destino:
spanish.SimMSFS2024=Microsoft Flight Simulator 2024
spanish.SimMSFS2020=Microsoft Flight Simulator 2020
spanish.SimManual=Identificar carpeta Community manualmente (elegir otra unidad o carpeta personalizada)
spanish.Detected=Detectado
spanish.NotDetected=No detectado automaticamente
spanish.FoundCommunitySubdir=Se ha detectado la subcarpeta Community en:%n%n%1%n%nDesea instalar en esta carpeta Community recomendada?
spanish.WarnNotCommunityDir=ATENCION: La carpeta seleccionada no parece ser la carpeta "Community" del simulador:%n%n%1%n%nAirspace ACARS y Flow Pro deben instalarse dentro de la carpeta Community.%n%nDesea continuar con este destino?
spanish.ReadyDirLabel=Carpeta de Destino (Community del Simulador):
spanish.ReadyPackageLabel=Ubicacion del Paquete Airspace ACARS:
spanish.ReadyChangeTip=Importante: Si la ruta anterior no es la carpeta Community de su simulador, haga clic en "Cambiar Carpeta..." o en "Atras" para seleccionar la carpeta correcta.
spanish.BtnChangeDir=Cambiar Carpeta...

french.SimSelectTitle=Identification du Simulateur
french.SimSelectDesc=Choisissez la version de Microsoft Flight Simulator ou Flow Pro est installe.
french.SimSelectSub=Selectionnez une option pour definir le dossier Community cible:
french.SimMSFS2024=Microsoft Flight Simulator 2024
french.SimMSFS2020=Microsoft Flight Simulator 2020
french.SimManual=Identifier le dossier Community manuellement (choisir un autre disque ou dossier personnalise)
french.Detected=Detecte
french.NotDetected=Non detecte automatiquement
french.FoundCommunitySubdir=Le sous-dossier Community a ete detecte dans:%n%n%1%n%nSouhaitez-vous installer dans ce dossier Community recommande?
french.WarnNotCommunityDir=ATTENTION: Le dossier selectionne ne semble pas etre le dossier "Community" du simulateur:%n%n%1%n%nAirspace ACARS et Flow Pro doivent etre installes dans le dossier Community.%n%nSouhaitez-vous vraiment continuer avec cette destination?
french.ReadyDirLabel=Dossier de Destination (Community du Simulateur):
french.ReadyPackageLabel=Emplacement du Paquet Airspace ACARS:
french.ReadyChangeTip=Important: Si le chemin ci-dessus n'est pas le dossier Community de votre simulateur, cliquez sur "Changer de Dossier..." ou sur "Retour" pour selectionner le bon dossier.
french.BtnChangeDir=Changer de Dossier...

[Messages]
brazilianportuguese.SelectDirLabel3=Confirme ou selecione a pasta 'Community' do seu Microsoft Flight Simulator. O pacote '{#MyPackageName}' sera instalado dentro dela.%n%nCaso use Microsoft Store e tenha instalado os pacotes em outro disco (ex: D:\, E:\), clique em 'Procurar...' para selecionar manualmente sua pasta Community.
english.SelectDirLabel3=Confirm or select your Microsoft Flight Simulator 'Community' directory. The '{#MyPackageName}' package will be installed inside it.%n%nIf you purchased on Microsoft Store and installed packages on a custom drive, click 'Browse...' to select your Community folder manually.

[Files]
Source: "dist\p42-util-airspace-acars\*"; DestDir: "{app}\{#MyPackageName}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "installer\TERMOS-DE-USO.txt"; DestDir: "{app}\{#MyPackageName}"; Flags: ignoreversion

[Code]
var
  SimSelectPage: TInputOptionWizardPage;
  ChangeDirButton: TNewButton;
  Detected2024: string;
  Detected2020: string;

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

// Remove barras finais e espacos em branco de caminhos
function CleanPath(const P: string): string;
var
  S: string;
begin
  S := Trim(P);
  while (Length(S) > 0) and ((S[Length(S)] = '\') or (S[Length(S)] = '/')) do
    Delete(S, Length(S), 1);
  Result := S;
end;

// Leitura robusta de UserCfg.opt para localizar caminhos customizados da Community
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
                if (Uppercase(ExtractFileName(RawPath)) = 'COMMUNITY') and DirExists(RawPath) then
                  Result := RawPath
                else if DirExists(RawPath + '\Community') then
                  Result := RawPath + '\Community'
                else if DirExists(RawPath + '\Packages\Community') then
                  Result := RawPath + '\Packages\Community'
                else if DirExists(RawPath) then
                  Result := RawPath + '\Community'
                else
                  Result := RawPath;
                Exit;
              end;
            end;
          end;
        end;
      end;
    end;
  end;
end;

// Localiza instalacao do MSFS 2024 (Microsoft Store, Game Pass e Steam)
function FindMSFS2024CommunityDir(): string;
var
  LocalAppDataDir, AppDataDir, Candidate: string;
  FindRec: TFindRec;
begin
  Result := '';
  LocalAppDataDir := ExpandConstant('{localappdata}');
  AppDataDir := ExpandConstant('{userappdata}');

  // 1. MSFS 2024 Microsoft Store (UserCfg.opt no LocalCache)
  Candidate := ParseUserCfgOpt(LocalAppDataDir + '\Packages\Microsoft.Limitless_8wekyb3d8bbwe\LocalCache\UserCfg.opt');
  if (Candidate <> '') and (DirExists(Candidate) or DirExists(ExtractFilePath(Candidate))) then begin Result := Candidate; Exit; end;

  // 2. MSFS 2024 Microsoft Store (UserCfg.opt no LocalState)
  Candidate := ParseUserCfgOpt(LocalAppDataDir + '\Packages\Microsoft.Limitless_8wekyb3d8bbwe\LocalState\UserCfg.opt');
  if (Candidate <> '') and (DirExists(Candidate) or DirExists(ExtractFilePath(Candidate))) then begin Result := Candidate; Exit; end;

  // 3. Scan generico em Packages\Microsoft.Limitless*
  if FindFirst(LocalAppDataDir + '\Packages\Microsoft.Limitless*', FindRec) then
  begin
    try
      repeat
        if ((FindRec.Attributes and 16) <> 0) and (FindRec.Name <> '.') and (FindRec.Name <> '..') then
        begin
          Candidate := ParseUserCfgOpt(LocalAppDataDir + '\Packages\' + FindRec.Name + '\LocalCache\UserCfg.opt');
          if (Candidate <> '') and (DirExists(Candidate) or DirExists(ExtractFilePath(Candidate))) then begin Result := Candidate; Exit; end;
          Candidate := LocalAppDataDir + '\Packages\' + FindRec.Name + '\LocalCache\Packages\Community';
          if DirExists(Candidate) then begin Result := Candidate; Exit; end;
        end;
      until not FindNext(FindRec);
    finally
      FindClose(FindRec);
    end;
  end;

  // 4. MSFS 2024 Microsoft Store (Caminho padrao de pacotes)
  Candidate := LocalAppDataDir + '\Packages\Microsoft.Limitless_8wekyb3d8bbwe\LocalCache\Packages\Community';
  if DirExists(Candidate) then begin Result := Candidate; Exit; end;

  // 5. MSFS 2024 Steam (UserCfg.opt em Roaming)
  Candidate := ParseUserCfgOpt(AppDataDir + '\Microsoft Flight Simulator 2024\UserCfg.opt');
  if (Candidate <> '') and (DirExists(Candidate) or DirExists(ExtractFilePath(Candidate))) then begin Result := Candidate; Exit; end;

  // 6. MSFS 2024 Steam (Caminho padrao de pacotes)
  Candidate := AppDataDir + '\Microsoft Flight Simulator 2024\Packages\Community';
  if DirExists(Candidate) then begin Result := Candidate; Exit; end;
end;

// Localiza instalacao do MSFS 2020 (Microsoft Store, Game Pass e Steam)
function FindMSFS2020CommunityDir(): string;
var
  LocalAppDataDir, AppDataDir, Candidate: string;
  FindRec: TFindRec;
begin
  Result := '';
  LocalAppDataDir := ExpandConstant('{localappdata}');
  AppDataDir := ExpandConstant('{userappdata}');

  // 1. MSFS 2020 Microsoft Store (UserCfg.opt no LocalCache)
  Candidate := ParseUserCfgOpt(LocalAppDataDir + '\Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalCache\UserCfg.opt');
  if (Candidate <> '') and (DirExists(Candidate) or DirExists(ExtractFilePath(Candidate))) then begin Result := Candidate; Exit; end;

  // 2. MSFS 2020 Microsoft Store (UserCfg.opt no LocalState)
  Candidate := ParseUserCfgOpt(LocalAppDataDir + '\Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalState\UserCfg.opt');
  if (Candidate <> '') and (DirExists(Candidate) or DirExists(ExtractFilePath(Candidate))) then begin Result := Candidate; Exit; end;

  // 3. Scan generico em Packages\Microsoft.FlightSimulator*
  if FindFirst(LocalAppDataDir + '\Packages\Microsoft.FlightSimulator*', FindRec) then
  begin
    try
      repeat
        if ((FindRec.Attributes and 16) <> 0) and (FindRec.Name <> '.') and (FindRec.Name <> '..') then
        begin
          Candidate := ParseUserCfgOpt(LocalAppDataDir + '\Packages\' + FindRec.Name + '\LocalCache\UserCfg.opt');
          if (Candidate <> '') and (DirExists(Candidate) or DirExists(ExtractFilePath(Candidate))) then begin Result := Candidate; Exit; end;
          Candidate := LocalAppDataDir + '\Packages\' + FindRec.Name + '\LocalCache\Packages\Community';
          if DirExists(Candidate) then begin Result := Candidate; Exit; end;
        end;
      until not FindNext(FindRec);
    finally
      FindClose(FindRec);
    end;
  end;

  // 4. MSFS 2020 Microsoft Store (Caminho padrao de pacotes)
  Candidate := LocalAppDataDir + '\Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalCache\Packages\Community';
  if DirExists(Candidate) then begin Result := Candidate; Exit; end;

  // 5. MSFS 2020 Steam (UserCfg.opt em Roaming)
  Candidate := ParseUserCfgOpt(AppDataDir + '\Microsoft Flight Simulator\UserCfg.opt');
  if (Candidate <> '') and (DirExists(Candidate) or DirExists(ExtractFilePath(Candidate))) then begin Result := Candidate; Exit; end;

  // 6. MSFS 2020 Steam (Caminho padrao de pacotes)
  Candidate := AppDataDir + '\Microsoft Flight Simulator\Packages\Community';
  if DirExists(Candidate) then begin Result := Candidate; Exit; end;
end;

// Retorna o melhor caminho detectado automaticamente para preencher o instalador
function GetDefaultCommunityDir(Param: string): string;
var
  Dir2024, Dir2020: string;
begin
  Dir2024 := FindMSFS2024CommunityDir();
  if Dir2024 <> '' then
  begin
    Result := Dir2024;
    Exit;
  end;

  Dir2020 := FindMSFS2020CommunityDir();
  if Dir2020 <> '' then
  begin
    Result := Dir2020;
    Exit;
  end;

  // Fallback sugerido caso nenhum simulador seja detectado automaticamente
  Result := ExpandConstant('{localappdata}') + '\Packages\Microsoft.Limitless_8wekyb3d8bbwe\LocalCache\Packages\Community';
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

// Cria pagina visual para escolha do simulador ou identificacao manual
procedure InitializeWizard();
var
  Opt2024, Opt2020, OptManual: string;
begin
  Detected2024 := FindMSFS2024CommunityDir();
  Detected2020 := FindMSFS2020CommunityDir();

  // 1. Pagina de escolha do simulador / identificacao manual
  SimSelectPage := CreateInputOptionPage(
    wpLicense,
    CustomMessage('SimSelectTitle'),
    CustomMessage('SimSelectDesc'),
    CustomMessage('SimSelectSub'),
    True,
    False
  );

  if Detected2024 <> '' then
    Opt2024 := CustomMessage('SimMSFS2024') + '  [' + CustomMessage('Detected') + ': ' + Detected2024 + ']'
  else
    Opt2024 := CustomMessage('SimMSFS2024') + '  [' + CustomMessage('NotDetected') + ']';

  if Detected2020 <> '' then
    Opt2020 := CustomMessage('SimMSFS2020') + '  [' + CustomMessage('Detected') + ': ' + Detected2020 + ']'
  else
    Opt2020 := CustomMessage('SimMSFS2020') + '  [' + CustomMessage('NotDetected') + ']';

  OptManual := CustomMessage('SimManual');

  SimSelectPage.Add(Opt2024);
  SimSelectPage.Add(Opt2020);
  SimSelectPage.Add(OptManual);

  if Detected2024 <> '' then
    SimSelectPage.SelectedValueIndex := 0
  else if Detected2020 <> '' then
    SimSelectPage.SelectedValueIndex := 1
  else
    SimSelectPage.SelectedValueIndex := 2;

  // 2. Botao customizado "Alterar Pasta..." na tela wpReady (canto inferior esquerdo)
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

// Valida transicao entre paginas e a pasta Community selecionada
function NextButtonClick(CurPageID: Integer): Boolean;
var
  SelectedPath: string;
begin
  Result := True;

  // Ao avancar da tela de identificacao do simulador, atualiza o caminho da pagina de diretorio
  if (SimSelectPage <> nil) and (CurPageID = SimSelectPage.ID) then
  begin
    case SimSelectPage.SelectedValueIndex of
      0:
      begin
        if Detected2024 <> '' then
          WizardForm.DirEdit.Text := Detected2024
        else
          WizardForm.DirEdit.Text := ExpandConstant('{localappdata}') + '\Packages\Microsoft.Limitless_8wekyb3d8bbwe\LocalCache\Packages\Community';
      end;
      1:
      begin
        if Detected2020 <> '' then
          WizardForm.DirEdit.Text := Detected2020
        else
          WizardForm.DirEdit.Text := ExpandConstant('{localappdata}') + '\Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalCache\Packages\Community';
      end;
      2:
      begin
        // Modo manual: mantem o campo aberto para o usuario clicar em Procurar
        if (WizardForm.DirEdit.Text = '') then
          WizardForm.DirEdit.Text := 'C:\';
      end;
    end;
    Exit;
  end;

  // Validacao na pagina de selecao de diretorio
  if CurPageID = wpSelectDir then
  begin
    SelectedPath := CleanPath(WizardDirValue());

    // Se o usuario selecionou a pasta terminando com o nome do proprio pacote, ajusta
    if Uppercase(ExtractFileName(SelectedPath)) = Uppercase('{#MyPackageName}') then
    begin
      SelectedPath := CleanPath(ExtractFilePath(SelectedPath));
      WizardForm.DirEdit.Text := SelectedPath;
    end;

    // Se o usuario selecionou uma pasta pai que possui subpasta Community, sugere a correcao
    if (Uppercase(ExtractFileName(SelectedPath)) <> 'COMMUNITY') then
    begin
      if DirExists(SelectedPath + '\Community') then
      begin
        if MsgBox(
          FmtMessage(CustomMessage('FoundCommunitySubdir'), [SelectedPath + '\Community']),
          mbConfirmation, MB_YESNO) = IDYES then
        begin
          WizardForm.DirEdit.Text := SelectedPath + '\Community';
          Result := True;
          Exit;
        end;
      end
      else if DirExists(SelectedPath + '\Packages\Community') then
      begin
        if MsgBox(
          FmtMessage(CustomMessage('FoundCommunitySubdir'), [SelectedPath + '\Packages\Community']),
          mbConfirmation, MB_YESNO) = IDYES then
        begin
          WizardForm.DirEdit.Text := SelectedPath + '\Packages\Community';
          Result := True;
          Exit;
        end;
      end;
    end;

    // Alerta se a pasta selecionada nao parecer ser uma pasta Community
    if Pos('community', Lowercase(SelectedPath)) = 0 then
    begin
      if MsgBox(
        FmtMessage(CustomMessage('WarnNotCommunityDir'), [SelectedPath]),
        mbConfirmation, MB_YESNO) <> IDYES then
      begin
        Result := False;
        Exit;
      end;
    end;
  end;
end;
