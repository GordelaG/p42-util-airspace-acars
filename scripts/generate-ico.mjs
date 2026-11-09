import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const csc = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const csPath = path.join(os.tmpdir(), 'make_ico.cs');
const exePath = path.join(os.tmpdir(), 'make_ico.exe');
const icoPath = path.resolve('assets', 'app.ico');

const code = `
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;

class MakeIco {
    static void Main() {
        int size = 256;
        using (var bmp = new Bitmap(size, size, System.Drawing.Imaging.PixelFormat.Format32bppArgb))
        using (var g = Graphics.FromImage(bmp)) {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            // Rounded dark background
            using (var path = new GraphicsPath()) {
                int r = 48;
                path.AddArc(8, 8, r, r, 180, 90);
                path.AddArc(size - 8 - r, 8, r, r, 270, 90);
                path.AddArc(size - 8 - r, size - 8 - r, r, r, 0, 90);
                path.AddArc(8, size - 8 - r, r, r, 90, 90);
                path.CloseFigure();
                using (var brush = new LinearGradientBrush(new Point(0, 0), new Point(0, size), Color.FromArgb(14, 18, 28), Color.FromArgb(8, 11, 18))) {
                    g.FillPath(brush, path);
                }
                using (var pen = new Pen(Color.FromArgb(40, 56, 80), 3f)) {
                    g.DrawPath(pen, path);
                }
            }

            // Airspace red & white emblem
            // Red wing polygon
            PointF[] redWing = new PointF[] {
                new PointF(204f, 105f),
                new PointF(204f, 146f),
                new PointF(124f, 146f),
                new PointF(124f, 134f),
                new PointF(154f, 105f)
            };
            using (var brush = new SolidBrush(Color.FromArgb(252, 26, 2))) {
                g.FillPolygon(brush, redWing);
            }

            // White chevron
            PointF[] whiteChevron = new PointF[] {
                new PointF(62f, 192f),
                new PointF(0f, 192f),
                new PointF(67f, 143f),
                new PointF(109f, 112f),
                new PointF(155f, 78f),
                new PointF(211f, 37f),
                new PointF(217f, 32f),
                new PointF(235f, 19f),
                new PointF(217f, 37f),
                new PointF(216f, 37f)
            };
            // Offset and scale chevron to center
            Matrix m = new Matrix();
            m.Translate(18f, 28f);
            m.Scale(0.85f, 0.85f);
            g.Transform = m;
            using (var brush = new SolidBrush(Color.White)) {
                g.FillPolygon(brush, whiteChevron);
            }
            g.ResetTransform();

            IntPtr hIcon = bmp.GetHicon();
            using (var icon = Icon.FromHandle(hIcon))
            using (var fs = new FileStream(@"${icoPath.replace(/\\/g, '\\\\')}", FileMode.Create)) {
                icon.Save(fs);
            }
        }
        Console.WriteLine("ICO_CREATED");
    }
}
`;

fs.writeFileSync(csPath, code);
try {
  execSync(`"${csc}" /nologo /reference:System.dll /reference:System.Drawing.dll /out:"${exePath}" "${csPath}"`);
  const out = execSync(`"${exePath}"`).toString();
  console.log('Result:', out.trim());
} finally {
  if (fs.existsSync(csPath)) fs.unlinkSync(csPath);
  if (fs.existsSync(exePath)) fs.unlinkSync(exePath);
}
