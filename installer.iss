; ==============================================================================
; Inno Setup Script for Airspace ACARS (Parallel 42 Flow Pro for MSFS 2024 / 2020)
; ==============================================================================

#define MyAppName "Airspace ACARS"
#ifndef MyAppVersion
#define MyAppVersion "1.0.15"
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

[Messages]
brazilianportuguese.SelectDirLabel3=ATENCAO: Selecione a pasta 'Community' do seu Microsoft Flight Simulator (MSFS). O pacote '{#MyPackageName}' sera instalado dentro dela.
english.SelectDirLabel3=IMPORTANT: Select your Microsoft Flight Simulator (MSFS) 'Community' directory. The '{#MyPackageName}' package will be installed inside it.

[Files]
Source: "dist\p42-util-airspace-acars\*"; DestDir: "{app}\{#MyPackageName}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "installer\TERMOS-DE-USO.txt"; DestDir: "{app}\{#MyPackageName}"; Flags: ignoreversion

[Code]
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

// Leitura de UserCfg.opt para localizar caminhos customizados da Community
function ParseUserCfgOpt(const OptPath: string): string;
var
  Lines: TArrayOfString;
  I: Integer;
  Line: string;
  PStart, PEnd: Integer;
  BaseDir: string;
begin
  Result := '';
  if FileExists(OptPath) then
  begin
    if LoadStringsFromFile(OptPath, Lines) then
    begin
      for I := 0 to GetArrayLength(Lines) - 1 do
      begin
        Line := Lines[I];
        if Pos('InstalledPackagesPath', Line) > 0 then
        begin
          PStart := Pos('"', Line);
          if PStart > 0 then
          begin
            Delete(Line, 1, PStart);
            PEnd := Pos('"', Line);
            if PEnd > 0 then
            begin
              BaseDir := Copy(Line, 1, PEnd - 1);
              if DirExists(BaseDir + '\Community') then
                Result := BaseDir + '\Community'
              else if DirExists(BaseDir) then
                Result := BaseDir;
              Exit;
            end;
          end;
        end;
      end;
    end;
  end;
end;

// Localiza automaticamente a pasta Community do MSFS
function GetDefaultCommunityDir(Param: string): string;
var
  Candidate: string;
  AppDataDir: string;
  LocalAppDataDir: string;
begin
  AppDataDir := ExpandConstant('{userappdata}');
  LocalAppDataDir := ExpandConstant('{localappdata}');

  // 1. MSFS 2024 Padrao
  Candidate := AppDataDir + '\Microsoft Flight Simulator 2024\Packages\Community';
  if DirExists(Candidate) then begin Result := Candidate; Exit; end;

  // 2. MSFS 2024 UserCfg.opt
  Candidate := ParseUserCfgOpt(AppDataDir + '\Microsoft Flight Simulator 2024\UserCfg.opt');
  if (Candidate <> '') and DirExists(Candidate) then begin Result := Candidate; Exit; end;

  // 3. MSFS 2020 MS Store
  Candidate := LocalAppDataDir + '\Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalCache\Packages\Community';
  if DirExists(Candidate) then begin Result := Candidate; Exit; end;

  // 4. MSFS 2020 Steam
  Candidate := AppDataDir + '\Microsoft Flight Simulator\Packages\Community';
  if DirExists(Candidate) then begin Result := Candidate; Exit; end;

  // 5. MSFS 2020 UserCfg.opt (Store)
  Candidate := ParseUserCfgOpt(LocalAppDataDir + '\Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalCache\UserCfg.opt');
  if (Candidate <> '') and DirExists(Candidate) then begin Result := Candidate; Exit; end;

  // 6. MSFS 2020 UserCfg.opt (Steam)
  Candidate := ParseUserCfgOpt(AppDataDir + '\Microsoft Flight Simulator\UserCfg.opt');
  if (Candidate <> '') and DirExists(Candidate) then begin Result := Candidate; Exit; end;

  // Fallback padrao
  Result := AppDataDir + '\Microsoft Flight Simulator 2024\Packages\Community';
end;

// Valida se o usuario selecionou de fato a pasta Community
function NextButtonClick(CurPageID: Integer): Boolean;
var
  SelectedPath: string;
begin
  Result := True;
  if CurPageID = wpSelectDir then
  begin
    SelectedPath := WizardDirValue();
    if (ExtractFileName(SelectedPath) = '{#MyPackageName}') then
    begin
      WizardForm.DirEdit.Text := ExtractFilePath(SelectedPath);
      SelectedPath := WizardDirValue();
    end;

    if Pos('Community', SelectedPath) = 0 then
    begin
      if MsgBox(
        'A pasta selecionada nao parece ser a pasta "Community" do simulador:' + #13#10 + #13#10 +
        SelectedPath + #13#10 + #13#10 +
        'O Airspace ACARS deve ser instalado dentro da pasta Community para que o Flow Pro o reconheca.' + #13#10 + #13#10 +
        'Deseja realmente continuar com este destino?',
        mbConfirmation, MB_YESNO) <> IDYES then
      begin
        Result := False;
      end;
    end;
  end;
end;

