<#
.SYNOPSIS
    Instalador & Atualizador Oficial do Airspace ACARS para Parallel 42 Flow Pro (MSFS 2024 / MSFS 2020).
.DESCRIPTION
    Interface grafica moderna em WPF que gerencia a verificacao do simulador em execucao,
    aceitacao dos Termos de Uso, deteccao automatica da pasta Community do MSFS e instalacao limpa.
#>

param(
    [string]$TargetCommunityPath = "",
    [switch]$Silent = $false
)

[CmdletBinding()]

# Garante suporte a threads STA para interface grafica WPF
if ([System.Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') {
    $powershellExe = (Get-Process -Id $PID).Path
    $scriptPath = $MyInvocation.MyCommand.Path
    $argsList = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-STA", "-File", "`"$scriptPath`"")
    if ($TargetCommunityPath) { $argsList += @("-TargetCommunityPath", "`"$TargetCommunityPath`"") }
    if ($Silent) { $argsList += "-Silent" }
    Start-Process -FilePath $powershellExe -ArgumentList $argsList -Wait
    exit
}

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Windows.Forms, System.Drawing

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRootDir = Split-Path -Parent $ScriptDir
$PackageName = "p42-util-airspace-acars"
$AppVersion = "1.0.12"
$GitHubRepo = "GordelaG/p42-util-airspace-acars"
$DownloadZipUrl = "https://github.com/$GitHubRepo/releases/latest/download/p42-util-airspace-acars.zip"

# Carrega Termos de Uso
$TermsFile = Join-Path $ScriptDir "TERMOS-DE-USO.txt"
$TermsText = if (Test-Path $TermsFile) {
    Get-Content $TermsFile -Raw -Encoding UTF8
} else {
    "Termos de Uso do Airspace ACARS: Este add-on e destinado exclusivamente para simulacao de voo virtual no Microsoft Flight Simulator (MSFS 2024 / MSFS 2020) atraves do Parallel 42 Flow Pro. O simulador deve estar fechado durante a instalacao e o pacote deve ser instalado na pasta Community."
}

# --- Funcoes de Deteccao da Pasta Community ---

function Find-MSFSCommunityFolder {
    $candidates = @()

    # 1. MSFS 2024 (MS Store / Game Pass / Steam Padrao)
    $msfs2024Path = "$env:APPDATA\Microsoft Flight Simulator 2024\Packages\Community"
    if (Test-Path $msfs2024Path) { $candidates += $msfs2024Path }

    # 2. Leitura de UserCfg.opt do MSFS 2024
    $opt2024 = "$env:APPDATA\Microsoft Flight Simulator 2024\UserCfg.opt"
    if (Test-Path $opt2024) {
        $custom = Parse-UserCfgOpt $opt2024
        if ($custom -and (Test-Path $custom)) { $candidates += $custom }
    }

    # 3. MSFS 2020 (MS Store / Game Pass)
    $msfs2020Store = "$env:LOCALAPPDATA\Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalCache\Packages\Community"
    if (Test-Path $msfs2020Store) { $candidates += $msfs2020Store }

    # 4. Leitura de UserCfg.opt do MSFS 2020 Store
    $opt2020Store = "$env:LOCALAPPDATA\Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalCache\UserCfg.opt"
    if (Test-Path $opt2020Store) {
        $custom = Parse-UserCfgOpt $opt2020Store
        if ($custom -and (Test-Path $custom)) { $candidates += $custom }
    }

    # 5. MSFS 2020 (Steam)
    $msfs2020Steam = "$env:APPDATA\Microsoft Flight Simulator\Packages\Community"
    if (Test-Path $msfs2020Steam) { $candidates += $msfs2020Steam }

    # 6. Leitura de UserCfg.opt do MSFS 2020 Steam
    $opt2020Steam = "$env:APPDATA\Microsoft Flight Simulator\UserCfg.opt"
    if (Test-Path $opt2020Steam) {
        $custom = Parse-UserCfgOpt $opt2020Steam
        if ($custom -and (Test-Path $custom)) { $candidates += $custom }
    }

    if ($candidates.Count -gt 0) {
        return $candidates[0]
    }
    return ""
}

function Parse-UserCfgOpt([string]$optPath) {
    try {
        $lines = Get-Content $optPath -ErrorAction SilentlyContinue
        foreach ($line in $lines) {
            if ($line -match 'InstalledPackagesPath\s+"([^"]+)"') {
                $base = $matches[1]
                $comm = Join-Path $base "Community"
                if (Test-Path $comm) { return $comm }
                return $base
            }
        }
    } catch {}
    return $null
}

# --- Funcoes de Verificacao do Processo do Simulador ---

function Test-SimulatorRunning {
    $procs = Get-Process -Name "FlightSimulator", "FlightSimulator2024" -ErrorAction SilentlyContinue
    return ($procs -ne $null -and $procs.Count -gt 0)
}

# --- Definicao XAML da Interface Grafica WPF ---

[xml]$xaml = @"
<Window
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="Airspace ACARS — Instalador &amp; Atualizador"
    Width="720" Height="680"
    MinWidth="680" MinHeight="620"
    WindowStartupLocation="CenterScreen"
    Background="#09090b"
    Foreground="#f4f4f5"
    FontFamily="Segoe UI, Arial, sans-serif">

    <Window.Resources>
        <Style TargetType="Button">
            <Setter Property="FontWeight" Value="SemiBold"/>
            <Setter Property="FontSize" Value="13"/>
            <Setter Property="Padding" Value="14,8"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="BorderThickness" Value="1"/>
            <Setter Property="SnapsToDevicePixels" Value="True"/>
        </Style>
    </Window.Resources>

    <Grid Margin="24">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/> <!-- Header -->
            <RowDefinition Height="Auto"/> <!-- Simulator Alert Warning -->
            <RowDefinition Height="*"/>    <!-- Main Body Cards -->
            <RowDefinition Height="Auto"/> <!-- Footer Actions -->
        </Grid.RowDefinitions>

        <!-- HEADER -->
        <Border Grid.Row="0" Margin="0,0,0,16" Padding="0,0,0,14" BorderBrush="#27272a" BorderThickness="0,0,0,1">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="Auto"/>
                </Grid.ColumnDefinitions>
                <StackPanel Grid.Column="0">
                    <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                        <Border Background="#ffffff" CornerRadius="4" Padding="6,2" Margin="0,0,10,0">
                            <TextBlock Text="ACARS" Foreground="#09090b" FontWeight="Bold" FontSize="11"/>
                        </Border>
                        <TextBlock Text="Airspace ACARS" Foreground="#ffffff" FontSize="20" FontWeight="Bold"/>
                    </StackPanel>
                    <TextBlock Text="Instalador Oficial para Parallel 42 Flow Pro (MSFS 2024 / MSFS 2020)" Foreground="#a1a1aa" FontSize="12" Margin="0,4,0,0"/>
                </StackPanel>
                <Border Grid.Column="1" Background="#18181b" BorderBrush="#3f3f46" BorderThickness="1" CornerRadius="4" Padding="8,4" VerticalAlignment="Center">
                    <TextBlock Name="TxtVersionBadge" Text="v1.0.11" Foreground="#e4e4e7" FontSize="11" FontWeight="Bold"/>
                </Border>
            </Grid>
        </Border>

        <!-- SIMULATOR PROCESS WARNING BANNER -->
        <Border Name="SimWarningBanner" Grid.Row="1" Background="#450a0a" BorderBrush="#dc2626" BorderThickness="1" CornerRadius="6" Padding="14,10" Margin="0,0,0,14" Visibility="Collapsed">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="Auto"/>
                </Grid.ColumnDefinitions>
                <StackPanel Grid.Column="0">
                    <TextBlock Text="⚠️ MICROSOFT FLIGHT SIMULATOR EM EXECUÇÃO!" Foreground="#fca5a5" FontWeight="Bold" FontSize="13"/>
                    <TextBlock Text="Feche o simulador antes de continuar para que os arquivos do Flow Pro possam ser atualizados sem bloqueio do Windows." Foreground="#fecaca" FontSize="11" TextWrapping="Wrap" Margin="0,2,0,0"/>
                </StackPanel>
                <Button Name="BtnRecheckSim" Grid.Column="1" Content="Verificar Fechamento" Background="#7f1d1d" Foreground="#ffffff" BorderBrush="#dc2626" Margin="10,0,0,0" Padding="10,4"/>
            </Grid>
        </Border>

        <!-- MAIN BODY (Scrollable Cards) -->
        <ScrollViewer Grid.Row="2" VerticalScrollBarVisibility="Auto" Margin="0,0,0,16">
            <StackPanel>
                <!-- CARD 1: Termos de Uso (EULA) -->
                <Border Background="#18181b" BorderBrush="#27272a" BorderThickness="1" CornerRadius="6" Padding="16" Margin="0,0,0,12">
                    <StackPanel>
                        <TextBlock Text="1. Termos de Uso e Licença" Foreground="#ffffff" FontWeight="SemiBold" FontSize="14" Margin="0,0,0,4"/>
                        <TextBlock Text="Leia atentamente antes de prosseguir com a instalação do add-on." Foreground="#a1a1aa" FontSize="11" Margin="0,0,0,8"/>
                        <TextBox Name="TxtTerms" Height="140" IsReadOnly="True" VerticalScrollBarVisibility="Vertical"
                                 Background="#09090b" Foreground="#d4d4d8" BorderBrush="#27272a" BorderThickness="1"
                                 Padding="8" FontSize="11" FontFamily="Consolas, monospace" TextWrapping="Wrap"/>
                        <CheckBox Name="ChkAcceptTerms" Content="Li e concordo com os Termos de Uso do Airspace ACARS"
                                  Foreground="#ffffff" FontWeight="SemiBold" FontSize="12" Margin="0,10,0,0"/>
                    </StackPanel>
                </Border>

                <!-- CARD 2: Seleção da Pasta Community -->
                <Border Background="#18181b" BorderBrush="#27272a" BorderThickness="1" CornerRadius="6" Padding="16" Margin="0,0,0,12">
                    <StackPanel>
                        <TextBlock Text="2. Pasta de Destino (Community do Simulador)" Foreground="#ffffff" FontWeight="SemiBold" FontSize="14" Margin="0,0,0,4"/>
                        <TextBlock Text="O instalador criará a pasta 'p42-util-airspace-acars' dentro da sua pasta Community." Foreground="#a1a1aa" FontSize="11" Margin="0,0,0,8"/>

                        <!-- Highlight Callout -->
                        <Border Background="#1e1b4b" BorderBrush="#6366f1" BorderThickness="1" CornerRadius="4" Padding="10,8" Margin="0,0,0,10">
                            <TextBlock Text="📌 ATENÇÃO OBRIGATÓRIA: A pasta selecionada DEVE ser a pasta 'Community' do seu Microsoft Flight Simulator. Não selecione pastas aleatórias."
                                       Foreground="#e0e7ff" FontSize="11" FontWeight="SemiBold" TextWrapping="Wrap"/>
                        </Border>

                        <Grid Margin="0,4,0,0">
                            <Grid.ColumnDefinitions>
                                <ColumnDefinition Width="*"/>
                                <ColumnDefinition Width="Auto"/>
                            </Grid.ColumnDefinitions>
                            <TextBox Name="TxtCommunityPath" Grid.Column="0" Height="34" VerticalContentAlignment="Center"
                                     Background="#09090b" Foreground="#ffffff" BorderBrush="#3f3f46" BorderThickness="1"
                                     Padding="8,4" FontSize="12"/>
                            <Button Name="BtnBrowseCommunity" Grid.Column="1" Content="Procurar..." Margin="8,0,0,0"
                                    Background="#27272a" Foreground="#ffffff" BorderBrush="#3f3f46"/>
                        </Grid>
                        <TextBlock Name="TxtPathValidation" Foreground="#22c55e" FontSize="11" Margin="0,6,0,0" Text="Pasta Community válida localizada automaticamente."/>
                    </StackPanel>
                </Border>

                <!-- CARD 3: Status da Instalação / Log -->
                <Border Name="CardProgress" Background="#18181b" BorderBrush="#27272a" BorderThickness="1" CornerRadius="6" Padding="16" Visibility="Collapsed">
                    <StackPanel>
                        <TextBlock Name="TxtStatusTitle" Text="Instalando..." Foreground="#ffffff" FontWeight="SemiBold" FontSize="14" Margin="0,0,0,6"/>
                        <ProgressBar Name="ProgressBar" Height="10" Minimum="0" Maximum="100" Value="0" Background="#27272a" Foreground="#22c55e" BorderThickness="0" Margin="0,0,0,8"/>
                        <TextBox Name="TxtLog" Height="90" IsReadOnly="True" VerticalScrollBarVisibility="Vertical"
                                 Background="#09090b" Foreground="#a1a1aa" BorderBrush="#27272a" BorderThickness="1"
                                 Padding="6" FontSize="11" FontFamily="Consolas, monospace" TextWrapping="Wrap"/>
                    </StackPanel>
                </Border>
            </StackPanel>
        </ScrollViewer>

        <!-- FOOTER ACTIONS -->
        <Border Grid.Row="3" Padding="0,12,0,0" BorderBrush="#27272a" BorderThickness="0,1,0,0">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="Auto"/>
                    <ColumnDefinition Width="Auto"/>
                </Grid.ColumnDefinitions>

                <Button Name="BtnOpenCommunity" Grid.Column="0" Content="Abrir Pasta Community" HorizontalAlignment="Left"
                        Background="Transparent" Foreground="#a1a1aa" BorderBrush="#3f3f46" Padding="10,6" FontSize="12"/>

                <Button Name="BtnCancel" Grid.Column="1" Content="Cancelar" Margin="0,0,8,0"
                        Background="#27272a" Foreground="#e4e4e7" BorderBrush="#3f3f46" MinWidth="90"/>

                <Button Name="BtnInstall" Grid.Column="2" Content="Instalar / Atualizar Agora"
                        Background="#22c55e" Foreground="#09090b" BorderBrush="#16a34a" FontWeight="Bold" MinWidth="180"/>
            </Grid>
        </Border>
    </Grid>
</Window>
"@

$reader = (New-Object System.Xml.XmlNodeReader $xaml)
$window = [System.Windows.Markup.XamlReader]::Load($reader)

# Elementos
$txtVersionBadge   = $window.FindName("TxtVersionBadge")
$simWarningBanner  = $window.FindName("SimWarningBanner")
$btnRecheckSim     = $window.FindName("BtnRecheckSim")
$txtTerms          = $window.FindName("TxtTerms")
$chkAcceptTerms    = $window.FindName("ChkAcceptTerms")
$txtCommunityPath  = $window.FindName("TxtCommunityPath")
$btnBrowseCommunity= $window.FindName("BtnBrowseCommunity")
$txtPathValidation = $window.FindName("TxtPathValidation")
$cardProgress      = $window.FindName("CardProgress")
$txtStatusTitle    = $window.FindName("TxtStatusTitle")
$progressBar       = $window.FindName("ProgressBar")
$txtLog            = $window.FindName("TxtLog")
$btnOpenCommunity  = $window.FindName("BtnOpenCommunity")
$btnCancel         = $window.FindName("BtnCancel")
$btnInstall        = $window.FindName("BtnInstall")

$txtVersionBadge.Text = "v$AppVersion"
$txtTerms.Text = $TermsText

# Inicializacao do caminho da Community
$initialPath = if ($TargetCommunityPath) { $TargetCommunityPath } else { Find-MSFSCommunityFolder }
$txtCommunityPath.Text = $initialPath

function Append-Log([string]$msg) {
    $timestamp = (Get-Date).ToString("HH:mm:ss")
    $txtLog.AppendText("[$timestamp] $msg`r`n")
    $txtLog.ScrollToEnd()
    [System.Windows.Forms.Application]::DoEvents()
}

function Update-FormState {
    $simRunning = Test-SimulatorRunning
    if ($simRunning) {
        $simWarningBanner.Visibility = "Visible"
    } else {
        $simWarningBanner.Visibility = "Collapsed"
    }

    $path = $txtCommunityPath.Text.Trim()
    $hasPath = [bool]$path -and (Test-Path $path)
    $isCommunity = $path -match '(?i)Community$'
    $termsAccepted = $chkAcceptTerms.IsChecked -eq $true

    if (-not $hasPath) {
        $txtPathValidation.Text = "Aviso: A pasta informada nao existe no disco."
        $txtPathValidation.Foreground = [System.Windows.Media.Brushes]::Red
    } elseif (-not $isCommunity) {
        $txtPathValidation.Text = "Atencao: A pasta nao termina com 'Community'. Certifique-se de que e a pasta Community oficial."
        $txtPathValidation.Foreground = [System.Windows.Media.Brushes]::Goldenrod
    } else {
        $txtPathValidation.Text = "Pasta Community valida pronta para instalacao."
        $txtPathValidation.Foreground = [System.Windows.Media.Brushes]::LimeGreen
    }

    $canInstall = $termsAccepted -and $hasPath -and (-not $simRunning)
    $btnInstall.IsEnabled = $canInstall
    if ($simRunning) {
        $btnInstall.ToolTip = "Feche o simulador antes de prosseguir com a instalacao."
    } elseif (-not $termsAccepted) {
        $btnInstall.ToolTip = "Aceite os Termos de Uso para habilitar a instalacao."
    } else {
        $btnInstall.ToolTip = "Clique para instalar ou atualizar o Airspace ACARS na pasta Community selecionada."
    }
}

# Eventos
$btnRecheckSim.Add_Click({ Update-FormState })
$chkAcceptTerms.Add_Checked({ Update-FormState })
$chkAcceptTerms.Add_Unchecked({ Update-FormState })
$txtCommunityPath.Add_TextChanged({ Update-FormState })

$btnBrowseCommunity.Add_Click({
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = "Selecione a pasta 'Community' do seu Microsoft Flight Simulator (MSFS):"
    $dialog.ShowNewFolderButton = $true
    if ($txtCommunityPath.Text -and (Test-Path $txtCommunityPath.Text)) {
        $dialog.SelectedPath = $txtCommunityPath.Text
    }
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $txtCommunityPath.Text = $dialog.SelectedPath
        Update-FormState
    }
})

$btnOpenCommunity.Add_Click({
    $path = $txtCommunityPath.Text.Trim()
    if ($path -and (Test-Path $path)) {
        Start-Process "explorer.exe" -ArgumentList "`"$path`""
    } else {
        [System.Windows.MessageBox]::Show("Pasta Community ainda nao localizada ou inexistente.", "Airspace ACARS", "OK", "Warning")
    }
})

$btnCancel.Add_Click({
    $window.Close()
})

# Acao de Instalacao
$btnInstall.Add_Click({
    if (Test-SimulatorRunning) {
        [System.Windows.MessageBox]::Show(
            "O Microsoft Flight Simulator esta aberto!`r`n`r`nPor favor, feche o simulador completamente para que os arquivos do Flow Pro possam ser atualizados sem bloqueio do Windows.",
            "Simulador em Execucao", "OK", "Warning")
        Update-FormState
        return
    }

    $community = $txtCommunityPath.Text.Trim()
    if (-not (Test-Path $community)) {
        [System.Windows.MessageBox]::Show("A pasta selecionada nao existe.", "Erro de Caminho", "OK", "Error")
        return
    }

    if ($community -notmatch '(?i)Community$') {
        $resp = [System.Windows.MessageBox]::Show(
            "A pasta selecionada nao termina com 'Community':`r`n`r`n$community`r`n`r`nTem certeza absoluta de que esta e a pasta Community correta?",
            "Confirmacao de Pasta", "YesNo", "Question")
        if ($resp -ne "Yes") { return }
    }

    # Bloqueia botoes durante a instalacao
    $btnInstall.IsEnabled = $false
    $btnBrowseCommunity.IsEnabled = $false
    $chkAcceptTerms.IsEnabled = $false
    $cardProgress.Visibility = "Visible"
    $progressBar.Value = 10
    $txtStatusTitle.Text = "Instalando Airspace ACARS..."
    $txtLog.Text = ""

    Append-Log "Iniciando instalacao do Airspace ACARS v$AppVersion..."
    Append-Log "Destino Community: $community"

    $destFolder = Join-Path $community $PackageName
    $progressBar.Value = 25

    # Localiza arquivos fonte
    $sourcePackageDir = ""
    $possibleLocalSources = @(
        (Join-Path $RepoRootDir "dist\$PackageName"),
        (Join-Path $ScriptDir "$PackageName"),
        (Join-Path $ScriptDir "package\$PackageName"),
        (Join-Path $RepoRootDir $PackageName)
    )

    foreach ($candidate in $possibleLocalSources) {
        $json = Join-Path $candidate "Flow\templates\$PackageName.json"
        if (Test-Path $json) {
            $sourcePackageDir = $candidate
            break
        }
    }

    # Se nao houver pacote local compilado, compila com build.mjs se Node.js estiver presente
    if (-not $sourcePackageDir -and (Test-Path (Join-Path $RepoRootDir "scripts\build.mjs"))) {
        Append-Log "Compilando pacote localmente via scripts/build.mjs..."
        try {
            $nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
            if ($nodeExe) {
                $buildScript = Join-Path $RepoRootDir "scripts\build.mjs"
                $p = Start-Process -FilePath $nodeExe -ArgumentList "`"$buildScript`"" -WorkingDirectory $RepoRootDir -Wait -NoNewWindow -PassThru
                $distCandidate = Join-Path $RepoRootDir "dist\$PackageName"
                if (Test-Path (Join-Path $distCandidate "Flow\templates\$PackageName.json")) {
                    $sourcePackageDir = $distCandidate
                    Append-Log "Compilacao local concluida com sucesso."
                }
            }
        } catch {
            Append-Log "Falha na compilacao local: $_"
        }
    }

    # Se ainda nao encontrou, baixa o zip da release oficial do GitHub
    if (-not $sourcePackageDir) {
        Append-Log "Pacote local nao encontrado. Baixando versao oficial do GitHub Releases..."
        $tempZip = Join-Path $env:TEMP "$PackageName-$AppVersion.zip"
        $tempExtract = Join-Path $env:TEMP "$PackageName-extract"

        try {
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $DownloadZipUrl -OutFile $tempZip -UseBasicParsing
            Append-Log "Download concluido. Extraindo pacote..."
            if (Test-Path $tempExtract) { Remove-Item $tempExtract -Recurse -Force -ErrorAction SilentlyContinue }
            Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force

            $subPkg = Join-Path $tempExtract $PackageName
            if (Test-Path $subPkg) {
                $sourcePackageDir = $subPkg
            } elseif (Test-Path (Join-Path $tempExtract "Flow\templates\$PackageName.json")) {
                $sourcePackageDir = $tempExtract
            }
        } catch {
            Append-Log "ERRO ao baixar release: $_"
            [System.Windows.MessageBox]::Show("Nao foi possivel baixar o pacote da release do GitHub:`r`n$_", "Erro no Download", "OK", "Error")
            $btnInstall.IsEnabled = $true
            return
        }
    }

    if (-not $sourcePackageDir -or -not (Test-Path $sourcePackageDir)) {
        Append-Log "ERRO FATAL: Arquivos do pacote nao localizados."
        [System.Windows.MessageBox]::Show("Nao foi possivel localizar os arquivos fonte do Airspace ACARS.", "Erro de Instalacao", "OK", "Error")
        $btnInstall.IsEnabled = $true
        return
    }

    Append-Log "Origem dos arquivos: $sourcePackageDir"
    $progressBar.Value = 50

    # Remove versao anterior se existente para instalacao limpa
    if (Test-Path $destFolder) {
        Append-Log "Removendo versao anterior de $destFolder..."
        try {
            Remove-Item $destFolder -Recurse -Force
            Append-Log "Versao anterior removida com sucesso."
        } catch {
            Append-Log "AVISO: Falha ao remover versao anterior: $_"
        }
    }

    $progressBar.Value = 70
    Append-Log "Copiando novos arquivos para $destFolder..."

    try {
        New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
        Copy-Item -Path "$sourcePackageDir\*" -Destination $destFolder -Recurse -Force
        $progressBar.Value = 90

        # Validacao de integridade
        $installedJson = Join-Path $destFolder "Flow\templates\$PackageName.json"
        if (-not (Test-Path $installedJson)) {
            throw "Arquivo essencial Flow/templates/$PackageName.json nao foi encontrado apos a copia."
        }

        $progressBar.Value = 100
        $txtStatusTitle.Text = "Instalacao Concluida!"
        Append-Log "Instalacao validada com sucesso!"
        Append-Log "Tudo pronto. O Airspace ACARS v$AppVersion esta ativo no seu MSFS."

        [System.Windows.MessageBox]::Show(
            "Airspace ACARS v$AppVersion instalado com sucesso!`r`n`r`nComo usar:`r`n1. Abra o Microsoft Flight Simulator.`r`n2. No cockpit, abra a roda do Parallel 42 Flow Pro.`r`n3. Entre no modo de edicao e adicione o widget 'Airspace ACARS'.",
            "Instalacao Concluida", "OK", "Information")

        $btnInstall.Content = "Reinstalar / Atualizar"
        $btnInstall.IsEnabled = $true
    } catch {
        Append-Log "ERRO ao copiar arquivos: $_"
        [System.Windows.MessageBox]::Show("Falha ao copiar arquivos para a pasta Community:`r`n$_", "Erro de Gravacao", "OK", "Error")
        $btnInstall.IsEnabled = $true
    }
})

# Inicia estado inicial
Update-FormState

# Exibe janela
$window.ShowDialog() | Out-Null
