using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace AirspaceACARS.Updater
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            try
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new MainForm());
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error starting Airspace ACARS Updater:\n\n" + ex.Message,
                    "Airspace ACARS", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }

    public class MainForm : Form
    {
        [DllImport("dwmapi.dll")]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

        private const int DWMWA_USE_IMMERSIVE_DARK_MODE_BEFORE_20H1 = 19;
        private const int DWMWA_USE_IMMERSIVE_DARK_MODE = 20;

        private enum ViewMode { Main, Progress }
        private ViewMode _viewMode = ViewMode.Main;

        // Path and versions
        private string _packageDir = "";
        private string _installedVersion = "1.0.0";
        private string _latestVersion = "";
        private string _latestTag = "";
        private string _releaseUrl = "https://github.com/GordelaG/p42-util-airspace-acars/releases";
        private string _downloadUrl = "";
        private bool _isZipAsset = true;

        // State
        private bool _isChecking = true;
        private bool _hasUpdate = false;
        private bool _checkFailed = false;
        private string _checkErrorMsg = "";
        private bool _isSimRunning = false;

        // Progress view state
        private bool _isUpdating = false;
        private bool _updateFinished = false;
        private bool _updateFailed = false;
        private string _statusHeadline = "Starting update...";
        private string _detailText = "Connecting to GitHub...";
        private int _targetProgress = 0;
        private float _displayProgress = 0f;
        private float _spinnerAngle = 0f;

        // Interactive button states
        private bool _hoverGreen = false;
        private bool _pressedGreen = false;
        private bool _hoverRed = false;
        private bool _pressedRed = false;
        private bool _hoverClose = false;
        private bool _pressedClose = false;
        private bool _hoverReleaseNotes = false;

        // Layout rects
        private readonly Rectangle _greenBtnRect = new Rectangle(24, 348, 232, 54);
        private readonly Rectangle _redBtnRect = new Rectangle(264, 348, 132, 54);
        private readonly Rectangle _notesLinkRect = new Rectangle(24, 416, 372, 22);
        private readonly Rectangle _closeBtnRect = new Rectangle(32, 400, 356, 52);
        private readonly Rectangle _channelCardRect = new Rectangle(24, 184, 372, 68);
        private readonly Rectangle _statusCardRect = new Rectangle(24, 262, 372, 72);

        private System.Windows.Forms.Timer _animTimer;
        private Image _bannerImage;
        private Icon _formIcon;

        public MainForm()
        {
            InitializeComponent();
            ApplyDarkTitleBar();
            LoadEmbeddedAssets();
            LocatePackageDirectory();
            ReadInstalledVersion();
            CheckSimulatorProcess();

            _animTimer = new System.Windows.Forms.Timer();
            _animTimer.Interval = 30; // ~33 FPS
            _animTimer.Tick += AnimTimer_Tick;
            _animTimer.Start();

            // Check GitHub asynchronously on launch
            ThreadPool.QueueUserWorkItem(delegate { CheckGitHubReleases(); });
        }

        private void InitializeComponent()
        {
            this.SuspendLayout();
            this.ClientSize = new Size(420, 520);
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Text = "Airspace ACARS Manager";
            this.BackColor = Color.FromArgb(12, 16, 24);
            this.ForeColor = Color.White;

            // Enable double buffering for flicker-free custom rendering
            this.SetStyle(ControlStyles.AllPaintingInWmPaint |
                          ControlStyles.UserPaint |
                          ControlStyles.OptimizedDoubleBuffer |
                          ControlStyles.ResizeRedraw, true);
            this.UpdateStyles();

            this.MouseMove += MainForm_MouseMove;
            this.MouseDown += MainForm_MouseDown;
            this.MouseUp += MainForm_MouseUp;
            this.MouseLeave += MainForm_MouseLeave;
            this.ResumeLayout(false);
        }

        private void ApplyDarkTitleBar()
        {
            try
            {
                int useDarkMode = 1;
                if (DwmSetWindowAttribute(this.Handle, DWMWA_USE_IMMERSIVE_DARK_MODE, ref useDarkMode, sizeof(int)) != 0)
                {
                    DwmSetWindowAttribute(this.Handle, DWMWA_USE_IMMERSIVE_DARK_MODE_BEFORE_20H1, ref useDarkMode, sizeof(int));
                }
            }
            catch { }
        }

        private void LoadEmbeddedAssets()
        {
            try
            {
                var asm = Assembly.GetExecutingAssembly();
                string[] names = asm.GetManifestResourceNames();
                foreach (string name in names)
                {
                    if (name.EndsWith("Thumbnail.jpg", StringComparison.OrdinalIgnoreCase) ||
                        name.EndsWith("banner.jpg", StringComparison.OrdinalIgnoreCase))
                    {
                        using (var stream = asm.GetManifestResourceStream(name))
                        {
                            if (stream != null) _bannerImage = Image.FromStream(stream);
                        }
                    }
                    else if (name.EndsWith(".ico", StringComparison.OrdinalIgnoreCase))
                    {
                        using (var stream = asm.GetManifestResourceStream(name))
                        {
                            if (stream != null) _formIcon = new Icon(stream);
                        }
                    }
                }
            }
            catch { }

            // Fallback load from disk if running in development
            if (_bannerImage == null)
            {
                string localThumb = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ContentInfo", "p42-util-airspace-acars", "Thumbnail.jpg");
                if (File.Exists(localThumb))
                {
                    try { _bannerImage = Image.FromFile(localThumb); } catch { }
                }
            }
            if (_bannerImage == null)
            {
                string assetThumb = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "assets", "Thumbnail.jpg");
                if (File.Exists(assetThumb))
                {
                    try { _bannerImage = Image.FromFile(assetThumb); } catch { }
                }
            }

            if (_formIcon != null)
            {
                this.Icon = _formIcon;
            }
        }

        private void LocatePackageDirectory()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

            // 1. Is this executable running directly inside the package folder?
            if (File.Exists(Path.Combine(baseDir, "manifest.json")) ||
                File.Exists(Path.Combine(baseDir, "Flow", "templates", "p42-util-airspace-acars.json")))
            {
                _packageDir = baseDir;
                return;
            }

            // 2. Scan standard MSFS 2024 and 2020 Community locations
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

            string[] candidateLocations = new string[]
            {
                // MSFS 2024
                Path.Combine(appData, "Microsoft Flight Simulator 2024", "Packages", "Community", "p42-util-airspace-acars"),
                Path.Combine(localAppData, "Packages", "Microsoft.Limitless_8wekyb3d8bbwe", "LocalCache", "Packages", "Community", "p42-util-airspace-acars"),
                // MSFS 2020
                Path.Combine(appData, "Microsoft Flight Simulator", "Packages", "Community", "p42-util-airspace-acars"),
                Path.Combine(localAppData, "Packages", "Microsoft.FlightSimulator_8wekyb3d8bbwe", "LocalCache", "Packages", "Community", "p42-util-airspace-acars")
            };

            foreach (string candidate in candidateLocations)
            {
                if (Directory.Exists(candidate))
                {
                    _packageDir = candidate;
                    return;
                }
            }

            // Check UserCfg.opt for custom Community path
            string userCfg2024 = Path.Combine(appData, "Microsoft Flight Simulator 2024", "UserCfg.opt");
            string userCfg2020 = Path.Combine(appData, "Microsoft Flight Simulator", "UserCfg.opt");
            foreach (string cfg in new string[] { userCfg2024, userCfg2020 })
            {
                if (File.Exists(cfg))
                {
                    try
                    {
                        foreach (string line in File.ReadAllLines(cfg))
                        {
                            if (line.Trim().StartsWith("InstalledPackagesPath", StringComparison.OrdinalIgnoreCase))
                            {
                                int idx = line.IndexOf('"');
                                int lastIdx = line.LastIndexOf('"');
                                if (idx >= 0 && lastIdx > idx)
                                {
                                    string rootPkg = line.Substring(idx + 1, lastIdx - idx - 1);
                                    string commPkg = Path.Combine(rootPkg, "Community", "p42-util-airspace-acars");
                                    if (Directory.Exists(commPkg))
                                    {
                                        _packageDir = commPkg;
                                        return;
                                    }
                                }
                            }
                        }
                    }
                    catch { }
                }
            }

            // Fallback default
            _packageDir = Path.Combine(appData, "Microsoft Flight Simulator 2024", "Packages", "Community", "p42-util-airspace-acars");
        }

        private void ReadInstalledVersion()
        {
            if (string.IsNullOrEmpty(_packageDir)) return;

            string manifestPath = Path.Combine(_packageDir, "manifest.json");
            if (File.Exists(manifestPath))
            {
                try
                {
                    string content = File.ReadAllText(manifestPath);
                    Match m = Regex.Match(content, @"""package_version""\s*:\s*""([^""]+)""");
                    if (m.Success)
                    {
                        _installedVersion = m.Groups[1].Value.Trim().TrimStart('v', 'V');
                        return;
                    }
                }
                catch { }
            }

            string templatePath = Path.Combine(_packageDir, "Flow", "templates", "p42-util-airspace-acars.json");
            if (File.Exists(templatePath))
            {
                try
                {
                    string content = File.ReadAllText(templatePath);
                    Match m = Regex.Match(content, @"""app_version""\s*:\s*""2024\.([^""]+)""");
                    if (m.Success)
                    {
                        _installedVersion = m.Groups[1].Value.Trim().TrimStart('v', 'V');
                        return;
                    }
                }
                catch { }
            }
        }

        private void CheckSimulatorProcess()
        {
            try
            {
                Process[] p24 = Process.GetProcessesByName("FlightSimulator2024");
                Process[] p20 = Process.GetProcessesByName("FlightSimulator");
                _isSimRunning = (p24.Length > 0 || p20.Length > 0);
            }
            catch
            {
                _isSimRunning = false;
            }
        }

        private void CheckGitHubReleases()
        {
            _isChecking = true;
            _checkFailed = false;
            _checkErrorMsg = "";
            CheckSimulatorProcess();

            try
            {
                ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; // TLS 1.2
                using (var wc = new WebClient())
                {
                    wc.Headers.Add("User-Agent", "Airspace-ACARS-Updater");
                    string json = wc.DownloadString("https://api.github.com/repos/GordelaG/p42-util-airspace-acars/releases/latest");
                    var serializer = new JavaScriptSerializer();
                    var data = serializer.Deserialize<Dictionary<string, object>>(json);

                    if (data != null)
                    {
                        if (data.ContainsKey("tag_name") && data["tag_name"] != null)
                        {
                            _latestTag = data["tag_name"].ToString().Trim();
                            _latestVersion = _latestTag.TrimStart('v', 'V');
                        }

                        if (data.ContainsKey("html_url") && data["html_url"] != null)
                        {
                            _releaseUrl = data["html_url"].ToString();
                        }

                        // Inspect assets
                        object[] assets = data.ContainsKey("assets") ? (data["assets"] as object[]) : null;
                        if (assets != null)
                        {
                            string zipUrl = "";
                            string exeUrl = "";

                            foreach (object a in assets)
                            {
                                Dictionary<string, object> assetDict = a as Dictionary<string, object>;
                                if (assetDict != null)
                                {
                                    string name = assetDict.ContainsKey("name") ? assetDict["name"].ToString() : "";
                                    string downloadUrl = assetDict.ContainsKey("browser_download_url") ? assetDict["browser_download_url"].ToString() : "";

                                    if (name.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
                                    {
                                        zipUrl = downloadUrl;
                                    }
                                    else if (name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                                    {
                                        exeUrl = downloadUrl;
                                    }
                                }
                            }

                            if (!string.IsNullOrEmpty(zipUrl))
                            {
                                _downloadUrl = zipUrl;
                                _isZipAsset = true;
                            }
                            else if (!string.IsNullOrEmpty(exeUrl))
                            {
                                _downloadUrl = exeUrl;
                                _isZipAsset = false;
                            }
                        }

                        _hasUpdate = CompareVersions(_latestVersion, _installedVersion) > 0;
                    }
                }
            }
            catch (Exception ex)
            {
                _checkFailed = true;
                _checkErrorMsg = ex.Message;
            }
            finally
            {
                _isChecking = false;
                this.BeginInvoke(new Action(this.Invalidate));
            }
        }

        private static int CompareVersions(string vA, string vB)
        {
            try
            {
                Version a = NormalizeVersion(vA);
                Version b = NormalizeVersion(vB);
                return a.CompareTo(b);
            }
            catch
            {
                return string.Compare(vA, vB, StringComparison.OrdinalIgnoreCase);
            }
        }

        private static Version NormalizeVersion(string raw)
        {
            if (string.IsNullOrEmpty(raw)) return new Version(1, 0, 0);
            string clean = raw.Trim().TrimStart('v', 'V');
            Match m = Regex.Match(clean, @"^(\d+)\.(\d+)(\.(\d+))?");
            if (m.Success)
            {
                int major = int.Parse(m.Groups[1].Value);
                int minor = int.Parse(m.Groups[2].Value);
                int build = m.Groups[4].Success ? int.Parse(m.Groups[4].Value) : 0;
                return new Version(major, minor, build);
            }
            return new Version(1, 0, 0);
        }

        private void AnimTimer_Tick(object sender, EventArgs e)
        {
            bool needRepaint = false;

            if (_viewMode == ViewMode.Progress)
            {
                _spinnerAngle = (_spinnerAngle + 12f) % 360f;
                needRepaint = true;

                if (Math.Abs(_displayProgress - _targetProgress) > 0.4f)
                {
                    _displayProgress += (_targetProgress - _displayProgress) * 0.25f;
                    needRepaint = true;
                }
                else
                {
                    _displayProgress = _targetProgress;
                }
            }

            if (needRepaint)
            {
                this.Invalidate();
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

            // 1. Vertical background gradient
            using (var bgBrush = new LinearGradientBrush(new Point(0, 0), new Point(0, this.ClientSize.Height),
                Color.FromArgb(10, 14, 22), Color.FromArgb(17, 24, 38)))
            {
                g.FillRectangle(bgBrush, this.ClientRectangle);
            }

            // 2. Top Banner (Thumbnail.jpg or Airspace vector)
            DrawTopBanner(g);

            if (_viewMode == ViewMode.Main)
            {
                DrawMainView(g);
            }
            else
            {
                DrawProgressView(g);
            }
        }

        private void DrawTopBanner(Graphics g)
        {
            int bannerHeight = 160;
            if (_bannerImage != null)
            {
                // Draw banner smoothly
                g.DrawImage(_bannerImage, new Rectangle(0, 0, this.ClientSize.Width, bannerHeight));

                // Smooth bottom fade into dark form background
                using (var fadeBrush = new LinearGradientBrush(new Point(0, bannerHeight - 45), new Point(0, bannerHeight + 1),
                    Color.FromArgb(0, 10, 14, 22), Color.FromArgb(255, 10, 14, 22)))
                {
                    g.FillRectangle(fadeBrush, new Rectangle(0, bannerHeight - 45, this.ClientSize.Width, 47));
                }
            }
            else
            {
                // Elegant vector fallback
                using (var brush = new LinearGradientBrush(new Point(0, 0), new Point(0, bannerHeight),
                    Color.FromArgb(15, 23, 42), Color.FromArgb(10, 14, 22)))
                {
                    g.FillRectangle(brush, new Rectangle(0, 0, this.ClientSize.Width, bannerHeight));
                }

                // Title & Subtitle
                using (var titleFont = new Font("Segoe UI", 20f, FontStyle.Bold))
                using (var brush = new SolidBrush(Color.White))
                {
                    g.DrawString("Airspace ACARS", titleFont, brush, new PointF(24, 45));
                }
            }

            // Subtitle text below banner
            using (var subFont = new Font("Segoe UI", 9.5f, FontStyle.Bold))
            using (var subBrush = new SolidBrush(Color.FromArgb(148, 163, 184)))
            {
                string text = "For MSFS 2024 & MSFS 2020";
                g.DrawString(text, subFont, subBrush, new PointF(24, 156));
            }

            // Version tag on the right
            string verText = "v" + _installedVersion;
            using (var verFont = new Font("Segoe UI", 9f, FontStyle.Regular))
            using (var verBrush = new SolidBrush(Color.FromArgb(100, 116, 139)))
            {
                SizeF size = g.MeasureString(verText, verFont);
                g.DrawString(verText, verFont, verBrush, new PointF(this.ClientSize.Width - 24 - size.Width, 156));
            }
        }

        private void DrawMainView(Graphics g)
        {
            // 1. Channel Card (Image 1 style)
            DrawRoundedCard(g, _channelCardRect, Color.FromArgb(20, 28, 44), Color.FromArgb(35, 50, 75));

            using (var lblFont = new Font("Segoe UI", 8f, FontStyle.Bold))
            using (var titleFont = new Font("Segoe UI", 11f, FontStyle.Bold))
            using (var descFont = new Font("Segoe UI", 8.5f, FontStyle.Regular))
            {
                using (var b = new SolidBrush(Color.FromArgb(148, 163, 184)))
                    g.DrawString("BRANCH / CHANNEL", lblFont, b, new PointF(_channelCardRect.X + 16, _channelCardRect.Y + 12));

                using (var b = new SolidBrush(Color.FromArgb(248, 250, 252)))
                    g.DrawString("Official", titleFont, b, new PointF(_channelCardRect.X + 16, _channelCardRect.Y + 28));

                using (var b = new SolidBrush(Color.FromArgb(100, 116, 139)))
                    g.DrawString("The most stable build of Airspace ACARS.", descFont, b, new PointF(_channelCardRect.X + 16, _channelCardRect.Y + 48));

                // Little dropdown indicator on the right
                using (var b = new SolidBrush(Color.FromArgb(100, 116, 139)))
                    g.DrawString("▼", lblFont, b, new PointF(_channelCardRect.Right - 28, _channelCardRect.Y + 30));
            }

            // 2. Status Card
            DrawRoundedCard(g, _statusCardRect, Color.FromArgb(20, 28, 44), Color.FromArgb(35, 50, 75));

            if (_isChecking)
            {
                using (var f = new Font("Segoe UI", 10.5f, FontStyle.Regular))
                using (var b = new SolidBrush(Color.FromArgb(203, 213, 225)))
                {
                    g.DrawString("Checking GitHub for updates...", f, b, new PointF(_statusCardRect.X + 16, _statusCardRect.Y + 16));
                }
                using (var f = new Font("Segoe UI", 8.5f, FontStyle.Regular))
                using (var b = new SolidBrush(Color.FromArgb(100, 116, 139)))
                {
                    g.DrawString("Please wait a moment", f, b, new PointF(_statusCardRect.X + 16, _statusCardRect.Y + 40));
                }
            }
            else if (_checkFailed)
            {
                using (var f = new Font("Segoe UI", 10f, FontStyle.Bold))
                using (var b = new SolidBrush(Color.FromArgb(248, 113, 113)))
                {
                    g.DrawString("Could not check for updates", f, b, new PointF(_statusCardRect.X + 16, _statusCardRect.Y + 14));
                }
                using (var f = new Font("Segoe UI", 8.5f, FontStyle.Regular))
                using (var b = new SolidBrush(Color.FromArgb(148, 163, 184)))
                {
                    string err = string.IsNullOrEmpty(_checkErrorMsg) ? "Network error" : _checkErrorMsg;
                    if (err.Length > 42) err = err.Substring(0, 40) + "...";
                    g.DrawString(err + " (Click Reinstall/Update to retry)", f, b, new PointF(_statusCardRect.X + 16, _statusCardRect.Y + 38));
                }
            }
            else if (_hasUpdate)
            {
                // Amber/Cyan update alert
                using (var f = new Font("Segoe UI", 11f, FontStyle.Bold))
                using (var b = new SolidBrush(Color.FromArgb(56, 189, 248)))
                {
                    g.DrawString("⚡ New version available: v" + _latestVersion, f, b, new PointF(_statusCardRect.X + 16, _statusCardRect.Y + 14));
                }
                using (var f = new Font("Segoe UI", 8.5f, FontStyle.Regular))
                using (var b = new SolidBrush(Color.FromArgb(148, 163, 184)))
                {
                    g.DrawString("Installed: v" + _installedVersion + " • Ready to download from GitHub", f, b, new PointF(_statusCardRect.X + 16, _statusCardRect.Y + 40));
                }
            }
            else
            {
                // Up to date
                using (var f = new Font("Segoe UI", 11f, FontStyle.Bold))
                using (var b = new SolidBrush(Color.FromArgb(16, 185, 129)))
                {
                    g.DrawString("✔ Up to date (v" + _installedVersion + ")", f, b, new PointF(_statusCardRect.X + 16, _statusCardRect.Y + 14));
                }
                using (var f = new Font("Segoe UI", 8.5f, FontStyle.Regular))
                using (var b = new SolidBrush(Color.FromArgb(148, 163, 184)))
                {
                    g.DrawString("You have the latest stable version installed.", f, b, new PointF(_statusCardRect.X + 16, _statusCardRect.Y + 40));
                }
            }

            // MSFS Running notice
            if (_isSimRunning)
            {
                using (var warnFont = new Font("Segoe UI", 8f, FontStyle.Bold))
                using (var warnBrush = new SolidBrush(Color.FromArgb(251, 191, 36)))
                {
                    g.DrawString("⚠️ MSFS is running (restart simulator after updating)", warnFont, warnBrush,
                        new PointF(24, 332));
                }
            }

            // 3. Green Button: Reinstall/Update or Update Now
            string greenBtnText = _hasUpdate ? ("Update to v" + _latestVersion) : "Reinstall/Update";
            Color greenBg = _pressedGreen ? Color.FromArgb(4, 120, 87) :
                            (_hoverGreen ? Color.FromArgb(5, 150, 105) : Color.FromArgb(16, 185, 129));
            DrawRoundedButton(g, _greenBtnRect, greenBg, greenBtnText, true);

            // 4. Red Button: Uninstall
            Color redBg = _pressedRed ? Color.FromArgb(105, 19, 19) :
                          (_hoverRed ? Color.FromArgb(153, 27, 27) : Color.FromArgb(127, 29, 29));
            DrawRoundedButton(g, _redBtnRect, redBg, "Uninstall", false);

            // 5. Release notes link
            using (var linkFont = new Font("Segoe UI", 9.5f, FontStyle.Regular))
            using (var linkBrush = new SolidBrush(_hoverReleaseNotes ? Color.FromArgb(125, 211, 252) : Color.FromArgb(56, 189, 248)))
            {
                string text = "View Release Notes on GitHub »";
                SizeF s = g.MeasureString(text, linkFont);
                float x = (this.ClientSize.Width - s.Width) / 2f;
                g.DrawString(text, linkFont, linkBrush, new PointF(x, _notesLinkRect.Y));
            }

            // 6. Community folder indicator
            using (var pathFont = new Font("Segoe UI", 7.5f, FontStyle.Regular))
            using (var pathBrush = new SolidBrush(Color.FromArgb(71, 85, 105)))
            {
                string p = _packageDir;
                if (p.Length > 55) p = "..." + p.Substring(p.Length - 52);
                string text = "Target: " + p;
                SizeF s = g.MeasureString(text, pathFont);
                float x = (this.ClientSize.Width - s.Width) / 2f;
                g.DrawString(text, pathFont, pathBrush, new PointF(x, this.ClientSize.Height - 26));
            }
        }

        private void DrawProgressView(Graphics g)
        {
            // Center spinner or status icon
            int centerX = this.ClientSize.Width / 2;
            int centerY = 230;

            if (_updateFinished)
            {
                // Green checkmark
                using (var brush = new SolidBrush(Color.FromArgb(16, 185, 129)))
                {
                    g.FillEllipse(brush, centerX - 24, centerY - 24, 48, 48);
                }
                using (var pen = new Pen(Color.White, 3.5f))
                {
                    pen.StartCap = LineCap.Round;
                    pen.EndCap = LineCap.Round;
                    g.DrawLines(pen, new Point[] {
                        new Point(centerX - 12, centerY),
                        new Point(centerX - 3, centerY + 9),
                        new Point(centerX + 13, centerY - 7)
                    });
                }
            }
            else if (_updateFailed)
            {
                // Red cross
                using (var brush = new SolidBrush(Color.FromArgb(239, 68, 68)))
                {
                    g.FillEllipse(brush, centerX - 24, centerY - 24, 48, 48);
                }
                using (var pen = new Pen(Color.White, 3.5f))
                {
                    pen.StartCap = LineCap.Round;
                    pen.EndCap = LineCap.Round;
                    g.DrawLine(pen, centerX - 10, centerY - 10, centerX + 10, centerY + 10);
                    g.DrawLine(pen, centerX + 10, centerY - 10, centerX - 10, centerY + 10);
                }
            }
            else
            {
                // Rotating spinner ring (Image 2 style)
                using (var trackPen = new Pen(Color.FromArgb(35, 48, 70), 4f))
                {
                    g.DrawEllipse(trackPen, centerX - 24, centerY - 24, 48, 48);
                }
                using (var arcPen = new Pen(Color.FromArgb(245, 158, 11), 4f))
                {
                    arcPen.StartCap = LineCap.Round;
                    arcPen.EndCap = LineCap.Round;
                    g.DrawArc(arcPen, centerX - 24, centerY - 24, 48, 48, _spinnerAngle, 110f);
                }
            }

            // Headline
            using (var headFont = new Font("Segoe UI", 13f, FontStyle.Bold))
            using (var headBrush = new SolidBrush(Color.FromArgb(248, 250, 252)))
            {
                SizeF s = g.MeasureString(_statusHeadline, headFont);
                g.DrawString(_statusHeadline, headFont, headBrush, new PointF((this.ClientSize.Width - s.Width) / 2f, 275));
            }

            // Custom Smooth Progress Bar (Image 2 style)
            int barX = _closeBtnRect.X;
            int barY = 320;
            int barW = _closeBtnRect.Width;
            int barH = 12;

            // Track
            using (var trackPath = GetRoundedPath(new Rectangle(barX, barY, barW, barH), 6))
            using (var trackBrush = new SolidBrush(Color.FromArgb(30, 41, 59)))
            {
                g.FillPath(trackBrush, trackPath);
            }

            // Fill
            float pct = Math.Max(0f, Math.Min(100f, _displayProgress));
            int fillW = (int)((barW * pct) / 100f);
            if (fillW > 6)
            {
                Color cStart = _updateFinished ? Color.FromArgb(16, 185, 129) : Color.FromArgb(245, 158, 11);
                Color cEnd = _updateFinished ? Color.FromArgb(5, 150, 105) : Color.FromArgb(234, 179, 8);

                using (var fillPath = GetRoundedPath(new Rectangle(barX, barY, fillW, barH), 6))
                using (var fillBrush = new LinearGradientBrush(new Point(barX, barY), new Point(barX + fillW, barY), cStart, cEnd))
                {
                    g.FillPath(fillBrush, fillPath);
                }
            }

            // Detail text below progress bar
            using (var detFont = new Font("Segoe UI", 9f, FontStyle.Regular))
            using (var detBrush = new SolidBrush(Color.FromArgb(148, 163, 184)))
            {
                SizeF s = g.MeasureString(_detailText, detFont);
                g.DrawString(_detailText, detFont, detBrush, new PointF((this.ClientSize.Width - s.Width) / 2f, 344));
            }

            // Close button at bottom
            Color closeBg;
            Color closeFg;
            if (_isUpdating)
            {
                closeBg = Color.FromArgb(25, 33, 48);
                closeFg = Color.FromArgb(71, 85, 105);
            }
            else
            {
                closeBg = _pressedClose ? Color.FromArgb(4, 120, 87) :
                          (_hoverClose ? Color.FromArgb(5, 150, 105) : Color.FromArgb(16, 185, 129));
                closeFg = Color.White;
            }

            using (var path = GetRoundedPath(_closeBtnRect, 10))
            using (var b = new SolidBrush(closeBg))
            {
                g.FillPath(b, path);
            }

            using (var btnFont = new Font("Segoe UI", 11f, FontStyle.Bold))
            using (var btnBrush = new SolidBrush(closeFg))
            {
                string t = _updateFinished ? "DONE" : "CLOSE";
                SizeF s = g.MeasureString(t, btnFont);
                g.DrawString(t, btnFont, btnBrush,
                    new PointF(_closeBtnRect.X + (_closeBtnRect.Width - s.Width) / 2f,
                               _closeBtnRect.Y + (_closeBtnRect.Height - s.Height) / 2f));
            }
        }

        private void DrawRoundedCard(Graphics g, Rectangle rect, Color fillColor, Color borderColor)
        {
            using (var path = GetRoundedPath(rect, 10))
            {
                using (var b = new SolidBrush(fillColor))
                    g.FillPath(b, path);
                using (var p = new Pen(borderColor, 1f))
                    g.DrawPath(p, path);
            }
        }

        private void DrawRoundedButton(Graphics g, Rectangle rect, Color bgColor, string text, bool isGreen)
        {
            using (var path = GetRoundedPath(rect, 10))
            {
                using (var b = new SolidBrush(bgColor))
                    g.FillPath(b, path);
            }

            using (var font = new Font("Segoe UI", 10.5f, FontStyle.Bold))
            using (var brush = new SolidBrush(Color.White))
            {
                SizeF s = g.MeasureString(text, font);
                float tx = rect.X + 18;
                float ty = rect.Y + (rect.Height - s.Height) / 2f;
                g.DrawString(text, font, brush, new PointF(tx, ty));

                // Draw icon on the right
                int iconRight = rect.Right - 26;
                int iconCenterY = rect.Y + rect.Height / 2;

                if (isGreen)
                {
                    // Refresh icon (circular arrows)
                    using (var pen = new Pen(Color.White, 2.4f))
                    {
                        pen.StartCap = LineCap.Round;
                        pen.EndCap = LineCap.Round;
                        g.DrawArc(pen, iconRight - 10, iconCenterY - 10, 20, 20, 45, 270);
                        // Arrowhead
                        PointF[] arrow = new PointF[] {
                            new PointF(iconRight + 3, iconCenterY - 9),
                            new PointF(iconRight + 7, iconCenterY - 2),
                            new PointF(iconRight, iconCenterY - 4)
                        };
                        using (var ab = new SolidBrush(Color.White))
                            g.FillPolygon(ab, arrow);
                    }
                }
                else
                {
                    // Minus in circle
                    using (var pen = new Pen(Color.White, 2.4f))
                    {
                        g.DrawEllipse(pen, iconRight - 10, iconCenterY - 10, 20, 20);
                        g.DrawLine(pen, iconRight - 5, iconCenterY, iconRight + 5, iconCenterY);
                    }
                }
            }
        }

        private static GraphicsPath GetRoundedPath(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            int d = radius * 2;
            path.AddArc(rect.X, rect.Y, d, d, 180, 90);
            path.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
            path.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
            path.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }

        private void MainForm_MouseMove(object sender, MouseEventArgs e)
        {
            if (_viewMode == ViewMode.Main)
            {
                bool oldHg = _hoverGreen;
                bool oldHr = _hoverRed;
                bool oldHn = _hoverReleaseNotes;

                _hoverGreen = _greenBtnRect.Contains(e.Location);
                _hoverRed = _redBtnRect.Contains(e.Location);
                _hoverReleaseNotes = _notesLinkRect.Contains(e.Location);

                if (_hoverGreen || _hoverRed || _hoverReleaseNotes)
                    this.Cursor = Cursors.Hand;
                else
                    this.Cursor = Cursors.Default;

                if (oldHg != _hoverGreen || oldHr != _hoverRed || oldHn != _hoverReleaseNotes)
                    this.Invalidate();
            }
            else
            {
                bool oldHc = _hoverClose;
                _hoverClose = !_isUpdating && _closeBtnRect.Contains(e.Location);
                this.Cursor = _hoverClose ? Cursors.Hand : Cursors.Default;
                if (oldHc != _hoverClose) this.Invalidate();
            }
        }

        private void MainForm_MouseDown(object sender, MouseEventArgs e)
        {
            if (e.Button != MouseButtons.Left) return;

            if (_viewMode == ViewMode.Main)
            {
                if (_greenBtnRect.Contains(e.Location))
                {
                    _pressedGreen = true;
                    this.Invalidate();
                }
                else if (_redBtnRect.Contains(e.Location))
                {
                    _pressedRed = true;
                    this.Invalidate();
                }
            }
            else
            {
                if (!_isUpdating && _closeBtnRect.Contains(e.Location))
                {
                    _pressedClose = true;
                    this.Invalidate();
                }
            }
        }

        private void MainForm_MouseUp(object sender, MouseEventArgs e)
        {
            if (_viewMode == ViewMode.Main)
            {
                bool wasGreen = _pressedGreen;
                bool wasRed = _pressedRed;
                _pressedGreen = false;
                _pressedRed = false;
                this.Invalidate();

                if (wasGreen && _greenBtnRect.Contains(e.Location))
                {
                    StartUpdateProcess();
                }
                else if (wasRed && _redBtnRect.Contains(e.Location))
                {
                    ConfirmAndUninstall();
                }
                else if (_notesLinkRect.Contains(e.Location))
                {
                    OpenUrl(_releaseUrl);
                }
            }
            else
            {
                bool wasClose = _pressedClose;
                _pressedClose = false;
                this.Invalidate();

                if (wasClose && !_isUpdating && _closeBtnRect.Contains(e.Location))
                {
                    if (_updateFinished)
                    {
                        // Refresh state and switch back to main
                        ReadInstalledVersion();
                        _hasUpdate = false;
                        _viewMode = ViewMode.Main;
                        this.Invalidate();
                    }
                    else
                    {
                        this.Close();
                    }
                }
            }
        }

        private void MainForm_MouseLeave(object sender, EventArgs e)
        {
            _hoverGreen = false;
            _hoverRed = false;
            _hoverClose = false;
            _hoverReleaseNotes = false;
            _pressedGreen = false;
            _pressedRed = false;
            _pressedClose = false;
            this.Cursor = Cursors.Default;
            this.Invalidate();
        }

        private void StartUpdateProcess()
        {
            _viewMode = ViewMode.Progress;
            _isUpdating = true;
            _updateFinished = false;
            _updateFailed = false;
            _targetProgress = 5;
            _displayProgress = 0f;
            _statusHeadline = "Connecting to GitHub...";
            _detailText = "Querying latest release packages...";
            this.Invalidate();

            ThreadPool.QueueUserWorkItem(delegate { PerformUpdateWork(); });
        }

        private void PerformUpdateWork()
        {
            try
            {
                CheckSimulatorProcess();

                // If download URL is empty or need refresh, query GitHub
                if (string.IsNullOrEmpty(_downloadUrl))
                {
                    UpdateProgress(10, "Connecting to GitHub...", "Fetching download links...");
                    CheckGitHubReleases();
                }

                if (string.IsNullOrEmpty(_downloadUrl))
                {
                    throw new Exception("No download asset found in the latest release.");
                }

                string ext = _isZipAsset ? ".zip" : ".exe";
                string tempFile = Path.Combine(Path.GetTempPath(), "airspace_update_" + Guid.NewGuid().ToString("N") + ext);

                UpdateProgress(15, "Downloading update...", "Starting download from GitHub...");

                ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
                using (var wc = new WebClient())
                {
                    wc.Headers.Add("User-Agent", "Airspace-ACARS-Updater");

                    DateTime lastReport = DateTime.MinValue;
                    wc.DownloadProgressChanged += (s, ev) =>
                    {
                        if ((DateTime.UtcNow - lastReport).TotalMilliseconds > 80 || ev.ProgressPercentage == 100)
                        {
                            lastReport = DateTime.UtcNow;
                            // Scale download progress into 15% -> 70%
                            int mapped = 15 + (int)(ev.ProgressPercentage * 0.55f);
                            double mbReceived = ev.BytesReceived / 1048576.0;
                            double mbTotal = ev.TotalBytesToReceive / 1048576.0;
                            string detail = string.Format("Downloading: {0:F1} MB / {1:F1} MB ({2}%)",
                                mbReceived, mbTotal, ev.ProgressPercentage);
                            UpdateProgress(mapped, "Downloading update...", detail);
                        }
                    };

                    wc.DownloadFile(new Uri(_downloadUrl), tempFile);
                }

                UpdateProgress(72, "Verifying files...", "Download complete. Extracting packages...");

                if (_isZipAsset)
                {
                    InstallZipPackage(tempFile);
                }
                else
                {
                    InstallExeInstaller(tempFile);
                }

                // Cleanup download
                try { if (File.Exists(tempFile)) File.Delete(tempFile); } catch { }

                // Finish
                ReadInstalledVersion();
                UpdateProgress(100, "Update completed successfully!", "All files are up to date.");
                _isUpdating = false;
                _updateFinished = true;
                _hasUpdate = false;
            }
            catch (Exception ex)
            {
                _isUpdating = false;
                _updateFailed = true;
                _statusHeadline = "Update failed";
                _detailText = ex.Message;
            }
            finally
            {
                this.BeginInvoke(new Action(this.Invalidate));
            }
        }

        private void InstallZipPackage(string zipPath)
        {
            string tempExtract = Path.Combine(Path.GetTempPath(), "airspace_extracted_" + Guid.NewGuid().ToString("N"));
            try
            {
                ZipFile.ExtractToDirectory(zipPath, tempExtract);

                // Locate the root folder containing manifest.json or Flow
                string sourceRoot = tempExtract;
                string subDir = Path.Combine(tempExtract, "p42-util-airspace-acars");
                if (Directory.Exists(subDir))
                {
                    sourceRoot = subDir;
                }

                if (!Directory.Exists(_packageDir))
                {
                    Directory.CreateDirectory(_packageDir);
                }

                string currentExePath = Assembly.GetExecutingAssembly().Location;
                string[] files = Directory.GetFiles(sourceRoot, "*.*", SearchOption.AllDirectories);
                int count = 0;

                foreach (string file in files)
                {
                    count++;
                    int progress = 72 + (int)((count / (float)files.Length) * 26f);
                    string relPath = file.Substring(sourceRoot.Length).TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                    string targetFile = Path.Combine(_packageDir, relPath);

                    UpdateProgress(progress, "Extracting files...", relPath);

                    string parentDir = Path.GetDirectoryName(targetFile);
                    if (!Directory.Exists(parentDir))
                    {
                        Directory.CreateDirectory(parentDir);
                    }

                    // Handle self-updating executable
                    if (string.Equals(Path.GetFullPath(targetFile), Path.GetFullPath(currentExePath), StringComparison.OrdinalIgnoreCase))
                    {
                        string oldPath = targetFile + ".old";
                        try { if (File.Exists(oldPath)) File.Delete(oldPath); } catch { }
                        try { File.Move(targetFile, oldPath); } catch { }
                    }

                    File.Copy(file, targetFile, true);
                }
            }
            finally
            {
                try { if (Directory.Exists(tempExtract)) Directory.Delete(tempExtract, true); } catch { }
            }
        }

        private void InstallExeInstaller(string exePath)
        {
            UpdateProgress(80, "Running installer...", "Applying update silently...");
            string communityParent = Path.GetDirectoryName(_packageDir);
            if (string.IsNullOrEmpty(communityParent)) communityParent = _packageDir;

            var psi = new ProcessStartInfo
            {
                FileName = exePath,
                Arguments = "/VERYSILENT /SUPPRESSMSGBOXES /DIR=\"" + communityParent + "\"",
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using (var proc = Process.Start(psi))
            {
                proc.WaitForExit();
                if (proc.ExitCode != 0)
                {
                    throw new Exception("Installer exited with code " + proc.ExitCode);
                }
            }
        }

        private void UpdateProgress(int pct, string headline, string detail)
        {
            _targetProgress = pct;
            _statusHeadline = headline;
            _detailText = detail;
            this.BeginInvoke(new Action(this.Invalidate));
        }

        private void ConfirmAndUninstall()
        {
            DialogResult res = MessageBox.Show(
                "Are you sure you want to uninstall Airspace ACARS from Microsoft Flight Simulator?\n\nTarget: " + _packageDir,
                "Uninstall Airspace ACARS",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question);

            if (res != DialogResult.Yes) return;

            try
            {
                string uninstaller = Path.Combine(_packageDir, "unins000.exe");
                if (File.Exists(uninstaller))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = uninstaller,
                        Arguments = "/SILENT",
                        UseShellExecute = true
                    });
                    this.Close();
                    return;
                }

                // If running inside the directory being deleted, schedule delete on exit
                if (Directory.Exists(_packageDir))
                {
                    string flowDir = Path.Combine(_packageDir, "Flow");
                    string contentInfoDir = Path.Combine(_packageDir, "ContentInfo");
                    if (Directory.Exists(flowDir)) Directory.Delete(flowDir, true);
                    if (Directory.Exists(contentInfoDir)) Directory.Delete(contentInfoDir, true);
                    foreach (string f in Directory.GetFiles(_packageDir, "*.*"))
                    {
                        if (!f.EndsWith("Update.exe", StringComparison.OrdinalIgnoreCase))
                        {
                            try { File.Delete(f); } catch { }
                        }
                    }
                }

                MessageBox.Show("Airspace ACARS has been uninstalled successfully.",
                    "Airspace ACARS", MessageBoxButtons.OK, MessageBoxIcon.Information);
                this.Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Could not remove all files:\n" + ex.Message,
                    "Uninstall Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private static void OpenUrl(string url)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = url,
                    UseShellExecute = true
                });
            }
            catch { }
        }
    }
}
