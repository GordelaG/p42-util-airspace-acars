import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const csc = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const csPath = path.join(os.tmpdir(), 'make_multi_ico.cs');
const exePath = path.join(os.tmpdir(), 'make_multi_ico.exe');
const icoPath = path.resolve('assets', 'app.ico');

const code = `
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Collections.Generic;

class MakeMultiIco {
    static Bitmap RenderLogo(int size) {
        Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp)) {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            // Rounded dark container
            using (GraphicsPath path = new GraphicsPath()) {
                int pad = Math.Max(1, size / 16);
                int r = Math.Max(2, size / 5);
                int w = size - pad * 2;
                int h = size - pad * 2;
                path.AddArc(pad, pad, r, r, 180, 90);
                path.AddArc(pad + w - r, pad, r, r, 270, 90);
                path.AddArc(pad + w - r, pad + h - r, r, r, 0, 90);
                path.AddArc(pad, pad + h - r, r, r, 90, 90);
                path.CloseFigure();

                using (SolidBrush brush = new SolidBrush(Color.FromArgb(16, 17, 22))) {
                    g.FillPath(brush, path);
                }
                using (Pen pen = new Pen(Color.FromArgb(39, 39, 42), Math.Max(1f, size / 64f))) {
                    g.DrawPath(pen, path);
                }
            }

            // Airspace Logo
            // Official Airspace Logo Paths scaled to size
            float scale = size / 380f;
            Matrix m = new Matrix();
            m.Translate(size * 0.08f, size * 0.12f);
            m.Scale(scale * 0.84f, scale * 0.84f);
            g.Transform = m;

            // Red parts (#FC1A02)
            using (SolidBrush redBrush = new SolidBrush(Color.FromArgb(252, 26, 2))) {
                PointF[] redP1 = new PointF[] {
                    new PointF(300.95f, 154.574f),
                    new PointF(300.95f, 215.038f),
                    new PointF(183.849f, 215.038f),
                    new PointF(183.849f, 198.265f),
                    new PointF(227.643f, 154.574f)
                };
                g.FillPolygon(redBrush, redP1);

                PointF[] redP2 = new PointF[] {
                    new PointF(98.8591f, 283.051f),
                    new PointF(160.586f, 221.46f),
                    new PointF(160.586f, 303f),
                    new PointF(98.8591f, 303f)
                };
                g.FillPolygon(redBrush, redP2);

                PointF[] redP3 = new PointF[] {
                    new PointF(321.207f, 54.1096f),
                    new PointF(238.847f, 114.607f),
                    new PointF(199.939f, 114.607f),
                    new PointF(160.621f, 149.348f),
                    new PointF(160.621f, 172.064f),
                    new PointF(98.8591f, 217.395f),
                    new PointF(98.8591f, 152.73f),
                    new PointF(128.408f, 82.9748f),
                    new PointF(161.03f, 61.3515f),
                    new PointF(199.871f, 54.1437f),
                    new PointF(321.173f, 54.1437f)
                };
                g.FillPolygon(redBrush, redP3);
            }

            // White parts
            using (SolidBrush whiteBrush = new SolidBrush(Color.White)) {
                PointF[] whiteChevron = new PointF[] {
                    new PointF(91.6174f, 282.846f),
                    new PointF(0f, 282.846f),
                    new PointF(98.8593f, 210.255f),
                    new PointF(160.587f, 164.959f),
                    new PointF(229.146f, 114.607f),
                    new PointF(311.54f, 54.1096f),
                    new PointF(346.93f, 28.1479f),
                    new PointF(320.9f, 54.1096f)
                };
                g.FillPolygon(whiteBrush, whiteChevron);
            }
        }
        return bmp;
    }

    static void Main() {
        int[] sizes = new int[] { 16, 24, 32, 48, 64, 128, 256 };
        List<byte[]> pngImages = new List<byte[]>();

        foreach (int sz in sizes) {
            using (Bitmap b = RenderLogo(sz))
            using (MemoryStream ms = new MemoryStream()) {
                b.Save(ms, ImageFormat.Png);
                pngImages.Add(ms.ToArray());
            }
        }

        using (FileStream fs = new FileStream(@"${icoPath.replace(/\\/g, '\\\\')}", FileMode.Create))
        using (BinaryWriter bw = new BinaryWriter(fs)) {
            // ICO Header
            bw.Write((short)0); // reserved
            bw.Write((short)1); // icon type
            bw.Write((short)sizes.Length); // number of images

            int offset = 6 + (16 * sizes.Length);
            for (int i = 0; i < sizes.Length; i++) {
                int sz = sizes[i];
                byte w = sz >= 256 ? (byte)0 : (byte)sz;
                byte h = sz >= 256 ? (byte)0 : (byte)sz;
                bw.Write(w);
                bw.Write(h);
                bw.Write((byte)0); // colors
                bw.Write((byte)0); // reserved
                bw.Write((short)1); // planes
                bw.Write((short)32); // bit count
                bw.Write(pngImages[i].Length); // bytes in res
                bw.Write(offset); // image offset
                offset += pngImages[i].Length;
            }

            for (int i = 0; i < sizes.Length; i++) {
                bw.Write(pngImages[i]);
            }
        }
        Console.WriteLine("MULTI_ICO_CREATED");
    }
}
`;

fs.writeFileSync(csPath, code);
try {
  execSync(`"${csc}" /nologo /reference:System.dll /reference:System.Drawing.dll /out:"${exePath}" "${csPath}"`);
  const out = execSync(`"${exePath}"`).toString();
  console.log(out.trim());
} finally {
  if (fs.existsSync(csPath)) fs.unlinkSync(csPath);
  if (fs.existsSync(exePath)) fs.unlinkSync(exePath);
}
