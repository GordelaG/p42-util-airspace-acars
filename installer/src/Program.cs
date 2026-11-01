using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Text.RegularExpressions;
using System.Windows.Forms;

namespace AirspaceACARS.Installer
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm(args));
        }
    }

    public class MainForm : Form
    {
        private const string AppVersion = "1.0.13";
        private const string PackageName = "p42-util-airspace-acars";

        // Controls
        private Panel headerPanel;
        private Label lblTitle;
        private Label lblSubtitle;
        private Label lblVersion;
        private Panel warningPanel;
        private Label lblWarning;
        private Button btnRecheckSim;

        private GroupBox grpTerms;
        private TextBox txtTerms;
        private CheckBox chkAccept;

        private GroupBox grpDest;
        private Panel calloutPanel;
        private Label lblCallout;
        private TextBox txtPath;
        private Button btnBrowse;
        private Label lblValidation;

        private Panel progressPanel;
        private Label lblStatus;
        private ProgressBar progressBar;
        private TextBox txtLog;

        private Panel footerPanel;
        private Button btnOpenComm;
        private Button btnCancel;
        private Button btnInstall;

        public MainForm(string[] args)
        {
            InitializeComponent();
            LoadInitialState(args);
        }

        private void InitializeComponent()
        {
            this.Text = "Airspace ACARS — Instalador & Atualizador Oficial";
            this.Size = new Size(720, 690);
            this.MinimumSize = new Size(680, 620);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(9, 9, 11);
            this.ForeColor = Color.FromArgb(244, 244, 245);
            this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            // HEADER PANEL
            headerPanel = new Panel();
            headerPanel.Dock = DockStyle.Top;
            headerPanel.Height = 70;
            headerPanel.Padding = new Padding(20, 14, 20, 10);
            headerPanel.Paint += (s, e) => {
                using (var pen = new Pen(Color.FromArgb(39, 39, 42))) {
                    e.Graphics.DrawLine(pen, 20, headerPanel.Height - 1, headerPanel.Width - 20, headerPanel.Height - 1);
                }
            };

            var badgeAcars = new Label();
            badgeAcars.Text = "ACARS";
            badgeAcars.BackColor = Color.White;
            badgeAcars.ForeColor = Color.FromArgb(9, 9, 11);
            badgeAcars.Font = new Font("Segoe UI", 8.5f, FontStyle.Bold);
            badgeAcars.Size = new Size(50, 22);
            badgeAcars.TextAlign = ContentAlignment.MiddleCenter;
            badgeAcars.Location = new Point(20, 14);

            lblTitle = new Label();
            lblTitle.Text = "Airspace ACARS";
            lblTitle.Font = new Font("Segoe UI", 15f, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.AutoSize = true;
            lblTitle.Location = new Point(76, 10);

            lblSubtitle = new Label();
            lblSubtitle.Text = "Instalador Oficial para Parallel 42 Flow Pro (MSFS 2024 / MSFS 2020)";
            lblSubtitle.Font = new Font("Segoe UI", 8.5f, FontStyle.Regular);
            lblSubtitle.ForeColor = Color.FromArgb(161, 161, 170);
            lblSubtitle.AutoSize = true;
            lblSubtitle.Location = new Point(78, 38);

            lblVersion = new Label();
            lblVersion.Text = "v" + AppVersion;
            lblVersion.BackColor = Color.FromArgb(24, 24, 27);
            lblVersion.ForeColor = Color.FromArgb(228, 228, 231);
            lblVersion.Font = new Font("Segoe UI", 9f, FontStyle.Bold);
            lblVersion.Size = new Size(70, 26);
            lblVersion.TextAlign = ContentAlignment.MiddleCenter;
            lblVersion.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            lblVersion.Location = new Point(this.ClientSize.Width - 90, 20);

            headerPanel.Controls.Add(badgeAcars);
            headerPanel.Controls.Add(lblTitle);
            headerPanel.Controls.Add(lblSubtitle);
            headerPanel.Controls.Add(lblVersion);

            // WARNING PANEL (Sim running)
            warningPanel = new Panel();
            warningPanel.Dock = DockStyle.Top;
            warningPanel.Height = 56;
            warningPanel.BackColor = Color.FromArgb(69, 10, 10);
            warningPanel.Visible = false;
            warningPanel.Padding = new Padding(20, 8, 20, 8);
            warningPanel.Paint += (s, e) => {
                using (var pen = new Pen(Color.FromArgb(220, 38, 38), 1)) {
                    e.Graphics.DrawRectangle(pen, 20, 4, warningPanel.Width - 40, warningPanel.Height - 8);
                }
            };

            lblWarning = new Label();
            lblWarning.Text = "AVISO: O Microsoft Flight Simulator esta em execucao! Feche o simulador antes de prosseguir com a instalacao.";
            lblWarning.ForeColor = Color.FromArgb(254, 202, 202);
            lblWarning.Font = new Font("Segoe UI", 8.5f, FontStyle.Bold);
            lblWarning.Location = new Point(28, 10);
            lblWarning.Size = new Size(510, 36);

            btnRecheckSim = CreateButton("Verificar Fechamento", Color.FromArgb(127, 29, 29), Color.White);
            btnRecheckSim.Size = new Size(130, 28);
            btnRecheckSim.Location = new Point(550, 14);
            btnRecheckSim.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            btnRecheckSim.Click += (s, e) => UpdateFormState();

            warningPanel.Controls.Add(lblWarning);
            warningPanel.Controls.Add(btnRecheckSim);

            // FOOTER PANEL
            footerPanel = new Panel();
            footerPanel.Dock = DockStyle.Bottom;
            footerPanel.Height = 56;
            footerPanel.Padding = new Padding(20, 8, 20, 10);
            footerPanel.Paint += (s, e) => {
                using (var pen = new Pen(Color.FromArgb(39, 39, 42))) {
                    e.Graphics.DrawLine(pen, 20, 0, footerPanel.Width - 20, 0);
                }
            };

            btnOpenComm = CreateButton("Abrir Pasta Community", Color.FromArgb(24, 24, 27), Color.FromArgb(161, 161, 170));
            btnOpenComm.Size = new Size(160, 34);
            btnOpenComm.Location = new Point(20, 10);
            btnOpenComm.Click += BtnOpenComm_Click;

            btnCancel = CreateButton("Cancelar", Color.FromArgb(39, 39, 42), Color.White);
            btnCancel.Size = new Size(90, 34);
            btnCancel.Anchor = AnchorStyles.Bottom | AnchorStyles.Right;
            btnCancel.Location = new Point(this.ClientSize.Width - 310, 10);
            btnCancel.Click += (s, e) => this.Close();

            btnInstall = CreateButton("Instalar / Atualizar Agora", Color.FromArgb(34, 197, 94), Color.FromArgb(9, 9, 11));
            btnInstall.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            btnInstall.Size = new Size(190, 34);
            btnInstall.Anchor = AnchorStyles.Bottom | AnchorStyles.Right;
            btnInstall.Location = new Point(this.ClientSize.Width - 210, 10);
            btnInstall.Click += BtnInstall_Click;

            footerPanel.Controls.Add(btnOpenComm);
            footerPanel.Controls.Add(btnCancel);
            footerPanel.Controls.Add(btnInstall);

            // BODY CONTENT PANEL
            var bodyPanel = new Panel();
            bodyPanel.Dock = DockStyle.Fill;
            bodyPanel.AutoScroll = true;
            bodyPanel.Padding = new Padding(20, 10, 20, 10);

            // GROUP 1: TERMOS DE USO
            grpTerms = CreateCardGroup("1. Termos de Uso e Licenca", 20, 10, 660, 210);

            txtTerms = new TextBox();
            txtTerms.Multiline = true;
            txtTerms.ReadOnly = true;
            txtTerms.ScrollBars = ScrollBars.Vertical;
            txtTerms.BackColor = Color.FromArgb(15, 15, 18);
            txtTerms.ForeColor = Color.FromArgb(212, 212, 216);
            txtTerms.Font = new Font("Consolas", 8.5f);
            txtTerms.Location = new Point(14, 26);
            txtTerms.Size = new Size(630, 140);
            txtTerms.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;

            chkAccept = new CheckBox();
            chkAccept.Text = "Li e concordo com os Termos de Uso do Airspace ACARS";
            chkAccept.ForeColor = Color.White;
            chkAccept.Font = new Font("Segoe UI", 9f, FontStyle.Bold);
            chkAccept.AutoSize = true;
            chkAccept.Location = new Point(14, 176);
            chkAccept.CheckedChanged += (s, e) => UpdateFormState();

            grpTerms.Controls.Add(txtTerms);
            grpTerms.Controls.Add(chkAccept);
            bodyPanel.Controls.Add(grpTerms);

            // GROUP 2: DESTINATION COMMUNITY
            grpDest = CreateCardGroup("2. Pasta de Destino (Community do Simulador)", 20, 230, 660, 160);

            calloutPanel = new Panel();
            calloutPanel.BackColor = Color.FromArgb(30, 27, 75);
            calloutPanel.Location = new Point(14, 26);
            calloutPanel.Size = new Size(630, 36);
            calloutPanel.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            calloutPanel.Paint += (s, e) => {
                using (var pen = new Pen(Color.FromArgb(99, 102, 241), 1)) {
                    e.Graphics.DrawRectangle(pen, 0, 0, calloutPanel.Width - 1, calloutPanel.Height - 1);
                }
            };

            lblCallout = new Label();
            lblCallout.Text = "ATENCAO OBRIGATORIA: A pasta selecionada DEVE ser a pasta 'Community' do seu Microsoft Flight Simulator. O instalador colocara a pasta 'p42-util-airspace-acars' dentro dela.";
            lblCallout.ForeColor = Color.FromArgb(224, 231, 255);
            lblCallout.Font = new Font("Segoe UI", 8f, FontStyle.Bold);
            lblCallout.Dock = DockStyle.Fill;
            lblCallout.Padding = new Padding(8, 4, 8, 4);
            calloutPanel.Controls.Add(lblCallout);

            txtPath = new TextBox();
            txtPath.BackColor = Color.FromArgb(15, 15, 18);
            txtPath.ForeColor = Color.White;
            txtPath.Font = new Font("Segoe UI", 9f);
            txtPath.Location = new Point(14, 72);
            txtPath.Size = new Size(520, 28);
            txtPath.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            txtPath.TextChanged += (s, e) => UpdateFormState();

            btnBrowse = CreateButton("Procurar...", Color.FromArgb(39, 39, 42), Color.White);
            btnBrowse.Size = new Size(100, 26);
            btnBrowse.Location = new Point(544, 72);
            btnBrowse.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            btnBrowse.Click += BtnBrowse_Click;

            lblValidation = new Label();
            lblValidation.Text = "Pasta Community verificada com sucesso.";
            lblValidation.ForeColor = Color.FromArgb(34, 197, 94);
            lblValidation.Font = new Font("Segoe UI", 8.5f);
            lblValidation.AutoSize = true;
            lblValidation.Location = new Point(14, 106);

            grpDest.Controls.Add(calloutPanel);
            grpDest.Controls.Add(txtPath);
            grpDest.Controls.Add(btnBrowse);
            grpDest.Controls.Add(lblValidation);
            bodyPanel.Controls.Add(grpDest);

            // PROGRESS CARD
            progressPanel = new Panel();
            progressPanel.Location = new Point(20, 400);
            progressPanel.Size = new Size(660, 110);
            progressPanel.BackColor = Color.FromArgb(24, 24, 27);
            progressPanel.Visible = false;
            progressPanel.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            progressPanel.Paint += (s, e) => {
                using (var pen = new Pen(Color.FromArgb(39, 39, 42), 1)) {
                    e.Graphics.DrawRectangle(pen, 0, 0, progressPanel.Width - 1, progressPanel.Height - 1);
                }
            };

            lblStatus = new Label();
            lblStatus.Text = "Instalando Airspace ACARS...";
            lblStatus.ForeColor = Color.White;
            lblStatus.Font = new Font("Segoe UI", 9f, FontStyle.Bold);
            lblStatus.Location = new Point(14, 8);
            lblStatus.AutoSize = true;

            progressBar = new ProgressBar();
            progressBar.Location = new Point(14, 30);
            progressBar.Size = new Size(630, 12);
            progressBar.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;

            txtLog = new TextBox();
            txtLog.Multiline = true;
            txtLog.ReadOnly = true;
            txtLog.ScrollBars = ScrollBars.Vertical;
            txtLog.BackColor = Color.FromArgb(15, 15, 18);
            txtLog.ForeColor = Color.FromArgb(161, 161, 170);
            txtLog.Font = new Font("Consolas", 8f);
            txtLog.Location = new Point(14, 48);
            txtLog.Size = new Size(630, 52);
            txtLog.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;

            progressPanel.Controls.Add(lblStatus);
            progressPanel.Controls.Add(progressBar);
            progressPanel.Controls.Add(txtLog);
            bodyPanel.Controls.Add(progressPanel);

            this.Controls.Add(bodyPanel);
            this.Controls.Add(warningPanel);
            this.Controls.Add(headerPanel);
            this.Controls.Add(footerPanel);
        }

        private void LoadInitialState(string[] args)
        {
            // Carrega termos de uso do recurso embutido ou arquivo local
            string terms = LoadResourceText("TERMOS-DE-USO.txt");
            if (string.IsNullOrEmpty(terms))
            {
                string localFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "TERMOS-DE-USO.txt");
                if (File.Exists(localFile))
                {
                    try { terms = File.ReadAllText(localFile); } catch {}
                }
            }
            if (string.IsNullOrEmpty(terms))
            {
                terms = "Termos de Uso do Airspace ACARS: Este add-on destina-se exclusivamente para simulacao de voo virtual no Microsoft Flight Simulator atraves do Parallel 42 Flow Pro. O simulador deve estar fechado durante a instalacao e o destino DEVE ser a pasta Community.";
            }
            txtTerms.Text = terms;

            // Define caminho de destino
            string target = (args != null && args.Length > 0 && !string.IsNullOrEmpty(args[0])) ? args[0] : FindCommunityFolder();
            txtPath.Text = target ?? "";

            UpdateFormState();
        }

        private void UpdateFormState()
        {
            bool simRunning = CheckSimulatorRunning();
            warningPanel.Visible = simRunning;

            string path = (txtPath.Text ?? "").Trim();
            bool exists = !string.IsNullOrEmpty(path) && Directory.Exists(path);
            bool isCommunity = Regex.IsMatch(path, @"(?i)Community$");

            if (!exists)
            {
                lblValidation.Text = "Aviso: A pasta informada nao existe no computador.";
                lblValidation.ForeColor = Color.FromArgb(239, 68, 68);
            }
            else if (!isCommunity)
            {
                lblValidation.Text = "Atencao: A pasta nao termina com 'Community'. Certifique-se de que e a pasta Community correta.";
                lblValidation.ForeColor = Color.FromArgb(234, 179, 8);
            }
            else
            {
                lblValidation.Text = "Pasta Community valida pronta para instalacao.";
                lblValidation.ForeColor = Color.FromArgb(34, 197, 94);
            }

            bool canInstall = chkAccept.Checked && exists && !simRunning;
            btnInstall.Enabled = canInstall;
        }

        private bool CheckSimulatorRunning()
        {
            try
            {
                var p1 = Process.GetProcessesByName("FlightSimulator");
                var p2 = Process.GetProcessesByName("FlightSimulator2024");
                return (p1.Length > 0 || p2.Length > 0);
            }
            catch
            {
                return false;
            }
        }

        private string FindCommunityFolder()
        {
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

            // 1. MSFS 2024 Padrao
            string p2024 = Path.Combine(appData, @"Microsoft Flight Simulator 2024\Packages\Community");
            if (Directory.Exists(p2024)) return p2024;

            // 2. MSFS 2024 UserCfg.opt
            string opt2024 = ParseUserCfgOpt(Path.Combine(appData, @"Microsoft Flight Simulator 2024\UserCfg.opt"));
            if (!string.IsNullOrEmpty(opt2024) && Directory.Exists(opt2024)) return opt2024;

            // 3. MSFS 2020 Store
            string p2020Store = Path.Combine(localAppData, @"Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalCache\Packages\Community");
            if (Directory.Exists(p2020Store)) return p2020Store;

            // 4. MSFS 2020 Store UserCfg.opt
            string opt2020 = ParseUserCfgOpt(Path.Combine(localAppData, @"Packages\Microsoft.FlightSimulator_8wekyb3d8bbwe\LocalCache\UserCfg.opt"));
            if (!string.IsNullOrEmpty(opt2020) && Directory.Exists(opt2020)) return opt2020;

            // 5. MSFS 2020 Steam
            string pSteam = Path.Combine(appData, @"Microsoft Flight Simulator\Packages\Community");
            if (Directory.Exists(pSteam)) return pSteam;

            return p2024;
        }

        private string ParseUserCfgOpt(string optPath)
        {
            try
            {
                if (File.Exists(optPath))
                {
                    string[] lines = File.ReadAllLines(optPath);
                    foreach (string line in lines)
                    {
                        var match = Regex.Match(line, @"InstalledPackagesPath\s+""([^""]+)""");
                        if (match.Success)
                        {
                            string baseDir = match.Groups[1].Value;
                            string comm = Path.Combine(baseDir, "Community");
                            if (Directory.Exists(comm)) return comm;
                            if (Directory.Exists(baseDir)) return baseDir;
                        }
                    }
                }
            }
            catch {}
            return null;
        }

        private void BtnBrowse_Click(object sender, EventArgs e)
        {
            using (var dialog = new FolderBrowserDialog())
            {
                dialog.Description = "Selecione a pasta 'Community' do seu Microsoft Flight Simulator:";
                dialog.ShowNewFolderButton = true;
                if (!string.IsNullOrEmpty(txtPath.Text) && Directory.Exists(txtPath.Text))
                {
                    dialog.SelectedPath = txtPath.Text;
                }
                if (dialog.ShowDialog(this) == DialogResult.OK)
                {
                    txtPath.Text = dialog.SelectedPath;
                    UpdateFormState();
                }
            }
        }

        private void BtnOpenComm_Click(object sender, EventArgs e)
        {
            string p = (txtPath.Text ?? "").Trim();
            if (!string.IsNullOrEmpty(p) && Directory.Exists(p))
            {
                try { Process.Start("explorer.exe", "\"" + p + "\""); } catch {}
            }
            else
            {
                MessageBox.Show(this, "Pasta Community ainda nao localizada ou inexistente.", "Airspace ACARS", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void BtnInstall_Click(object sender, EventArgs e)
        {
            if (CheckSimulatorRunning())
            {
                MessageBox.Show(this,
                    "O Microsoft Flight Simulator esta aberto!\n\nFeche o simulador completamente para que os arquivos do Flow Pro possam ser atualizados sem bloqueio do Windows.",
                    "Simulador Aberto", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                UpdateFormState();
                return;
            }

            string comm = (txtPath.Text ?? "").Trim();
            if (!Directory.Exists(comm))
            {
                MessageBox.Show(this, "A pasta Community selecionada nao existe.", "Erro de Caminho", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            if (!Regex.IsMatch(comm, @"(?i)Community$"))
            {
                var res = MessageBox.Show(this,
                    "A pasta selecionada nao termina com 'Community':\n\n" + comm + "\n\nTem certeza absoluta de que esta e a pasta Community correta?",
                    "Confirmacao de Pasta", MessageBoxButtons.YesNo, MessageBoxIcon.Question);
                if (res != DialogResult.Yes) return;
            }

            btnInstall.Enabled = false;
            btnBrowse.Enabled = false;
            chkAccept.Enabled = false;
            progressPanel.Visible = true;
            progressBar.Value = 15;
            txtLog.Clear();

            AppendLog("Iniciando instalacao do Airspace ACARS v" + AppVersion + "...");
            AppendLog("Pasta Community: " + comm);

            string targetPackageDir = Path.Combine(comm, PackageName);

            try
            {
                // Remove versao anterior se existente
                if (Directory.Exists(targetPackageDir))
                {
                    AppendLog("Removendo versao anterior de " + targetPackageDir + "...");
                    Directory.Delete(targetPackageDir, true);
                    AppendLog("Versao anterior removida com sucesso.");
                }
                progressBar.Value = 40;

                // Extrai pacote embutido ou copia de dist local
                bool extracted = false;
                Stream resStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("package.zip");
                if (resStream != null)
                {
                    AppendLog("Extraindo pacote embutido do instalador...");
                    using (var zip = new ZipArchive(resStream, ZipArchiveMode.Read))
                    {
                        Directory.CreateDirectory(targetPackageDir);
                        foreach (var entry in zip.Entries)
                        {
                            string rawName = entry.FullName.Replace('/', '\\');
                            // Remove prefixo p42-util-airspace-acars se existente
                            if (rawName.StartsWith(PackageName + "\\", StringComparison.OrdinalIgnoreCase))
                            {
                                rawName = rawName.Substring(PackageName.Length + 1);
                            }
                            if (string.IsNullOrEmpty(rawName)) continue;

                            string outPath = Path.Combine(targetPackageDir, rawName);
                            if (entry.FullName.EndsWith("/"))
                            {
                                Directory.CreateDirectory(outPath);
                            }
                            else
                            {
                                Directory.CreateDirectory(Path.GetDirectoryName(outPath));
                                entry.ExtractToFile(outPath, true);
                            }
                        }
                    }
                    extracted = true;
                }

                // Fallback: se nao houver zip embutido, procura pasta local no disco
                if (!extracted)
                {
                    string localSource = FindLocalPackageSource();
                    if (!string.IsNullOrEmpty(localSource))
                    {
                        AppendLog("Copiando arquivos da pasta local: " + localSource);
                        CopyDirectory(localSource, targetPackageDir);
                        extracted = true;
                    }
                }

                if (!extracted)
                {
                    throw new Exception("Arquivos do pacote nao encontrados (nem no instalador nem no disco local).");
                }

                progressBar.Value = 90;

                // Validacao de integridade
                string jsonCheck = Path.Combine(targetPackageDir, @"Flow\templates\" + PackageName + ".json");
                if (!File.Exists(jsonCheck))
                {
                    throw new Exception("Arquivo essencial Flow/templates/" + PackageName + ".json nao encontrado apos a instalacao.");
                }

                progressBar.Value = 100;
                lblStatus.Text = "Instalacao Concluida!";
                AppendLog("Instalacao validada com sucesso!");
                AppendLog("O Airspace ACARS v" + AppVersion + " esta pronto para uso no MSFS.");

                MessageBox.Show(this,
                    "Airspace ACARS v" + AppVersion + " instalado com sucesso!\n\nComo usar:\n1. Abra o Microsoft Flight Simulator.\n2. No cockpit, abra a roda do Parallel 42 Flow Pro.\n3. Entre no modo de edicao e adicione o widget 'Airspace ACARS'.",
                    "Instalacao Concluida", MessageBoxButtons.OK, MessageBoxIcon.Information);

                btnInstall.Text = "Reinstalar / Atualizar";
                btnInstall.Enabled = true;
            }
            catch (Exception ex)
            {
                AppendLog("ERRO: " + ex.Message);
                MessageBox.Show(this, "Falha na instalacao:\n" + ex.Message, "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                btnInstall.Enabled = true;
            }
        }

        private string FindLocalPackageSource()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string[] candidates = new string[] {
                Path.Combine(baseDir, @"dist\" + PackageName),
                Path.Combine(baseDir, PackageName),
                Path.Combine(baseDir, @"..\dist\" + PackageName),
                Path.Combine(baseDir, @"..\..\dist\" + PackageName)
            };
            foreach (var c in candidates)
            {
                string json = Path.Combine(c, @"Flow\templates\" + PackageName + ".json");
                if (File.Exists(json)) return c;
            }
            return null;
        }

        private void CopyDirectory(string sourceDir, string targetDir)
        {
            Directory.CreateDirectory(targetDir);
            foreach (string file in Directory.GetFiles(sourceDir, "*", SearchOption.AllDirectories))
            {
                string relative = file.Substring(sourceDir.Length).TrimStart('\\');
                string dest = Path.Combine(targetDir, relative);
                Directory.CreateDirectory(Path.GetDirectoryName(dest));
                File.Copy(file, dest, true);
            }
        }

        private void AppendLog(string message)
        {
            string time = DateTime.Now.ToString("HH:mm:ss");
            txtLog.AppendText(string.Format("[{0}] {1}\r\n", time, message));
            txtLog.SelectionStart = txtLog.Text.Length;
            txtLog.ScrollToCaret();
            Application.DoEvents();
        }

        private string LoadResourceText(string resourceName)
        {
            try
            {
                using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName))
                {
                    if (stream != null)
                    {
                        using (var reader = new StreamReader(stream))
                        {
                            return reader.ReadToEnd();
                        }
                    }
                }
            }
            catch {}
            return null;
        }

        private Button CreateButton(string text, Color backColor, Color foreColor)
        {
            var btn = new Button();
            btn.Text = text;
            btn.BackColor = backColor;
            btn.ForeColor = foreColor;
            btn.FlatStyle = FlatStyle.Flat;
            btn.FlatAppearance.BorderSize = 0;
            btn.Cursor = Cursors.Hand;
            btn.Font = new Font("Segoe UI", 9f, FontStyle.Bold);
            return btn;
        }

        private GroupBox CreateCardGroup(string title, int x, int y, int width, int height)
        {
            var grp = new GroupBox();
            grp.Text = title;
            grp.ForeColor = Color.White;
            grp.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            grp.Location = new Point(x, y);
            grp.Size = new Size(width, height);
            grp.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            grp.BackColor = Color.FromArgb(24, 24, 27);
            return grp;
        }
    }
}
