using System;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using Windows.Foundation;
using Windows.Media.Control;
using Windows.Storage.Streams;

public static class NowPlayingBridge
{
    private static T Await<T>(IAsyncOperation<T> op)
    {
        while (op.Status == AsyncStatus.Started) System.Threading.Thread.Sleep(5);
        if (op.Status == AsyncStatus.Error) throw op.ErrorCode;
        return op.GetResults();
    }

    private static T AwaitProgress<T, P>(IAsyncOperationWithProgress<T, P> op)
    {
        while (op.Status == AsyncStatus.Started) System.Threading.Thread.Sleep(5);
        if (op.Status == AsyncStatus.Error) throw op.ErrorCode;
        return op.GetResults();
    }

    public static string GetSnapshot(string filter)
    {
        try
        {
            var manager = Await(GlobalSystemMediaTransportControlsSessionManager.RequestAsync());
            var session = PickSession(manager, filter);
            if (session == null) return "{\"hasSession\":false}";

            var props = Await(session.TryGetMediaPropertiesAsync());
            var playback = session.GetPlaybackInfo();

            string thumbB64 = null, thumbMime = null;
            if (props.Thumbnail != null)
            {
                try
                {
                    using (var stream = Await(props.Thumbnail.OpenReadAsync()))
                    {
                        uint size = (uint)stream.Size;
                        if (size > 0 && size < 5 * 1024 * 1024)
                        {
                            IBuffer buffer = new Windows.Storage.Streams.Buffer(size);
                            buffer = AwaitProgress(stream.ReadAsync(buffer, size, InputStreamOptions.None));
                            var reader = DataReader.FromBuffer(buffer);
                            var bytes = new byte[buffer.Length];
                            reader.ReadBytes(bytes);
                            thumbB64 = Convert.ToBase64String(bytes);
                            thumbMime = (bytes.Length >= 4 && bytes[0] == 0x89 && bytes[1] == 0x50)
                                ? "image/png"
                                : "image/jpeg";
                        }
                    }
                }
                catch { }
            }

            var sb = new StringBuilder();
            sb.Append('{');
            sb.Append("\"hasSession\":true,");
            AppendJsonString(sb, "appId", session.SourceAppUserModelId); sb.Append(',');
            AppendJsonString(sb, "title", props.Title); sb.Append(',');
            AppendJsonString(sb, "artist", props.Artist); sb.Append(',');
            AppendJsonString(sb, "album", props.AlbumTitle); sb.Append(',');
            AppendJsonString(sb, "status", playback.PlaybackStatus.ToString()); sb.Append(',');
            AppendJsonString(sb, "thumbnail", thumbB64); sb.Append(',');
            AppendJsonString(sb, "thumbMime", thumbMime);
            sb.Append('}');
            return sb.ToString();
        }
        catch (Exception ex)
        {
            var sb = new StringBuilder();
            sb.Append("{\"hasSession\":false,");
            AppendJsonString(sb, "error", ex.Message);
            sb.Append('}');
            return sb.ToString();
        }
    }

    // Ouvre un lien music.apple.com dans l'app Apple Music (pas le navigateur)
    // puis appuie sur son bouton "Play" via UI Automation, pour demarrer
    // reellement la lecture de la playlist/album cible.
    public static void PlayUrl(string url)
    {
        try
        {
            var appUrl = System.Text.RegularExpressions.Regex.Replace(url, "^https?://", "music://");
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(appUrl) { UseShellExecute = true });

            System.Windows.Automation.AutomationElement window = null;
            System.Windows.Automation.AutomationElement playBtn = null;
            for (int i = 0; i < 30 && playBtn == null; i++)
            {
                System.Threading.Thread.Sleep(200);
                var procs = System.Diagnostics.Process.GetProcessesByName("AppleMusic");
                if (procs.Length == 0 || procs[0].MainWindowHandle == IntPtr.Zero) continue;
                window = System.Windows.Automation.AutomationElement.FromHandle(procs[0].MainWindowHandle);

                playBtn = window.FindFirst(
                    System.Windows.Automation.TreeScope.Descendants,
                    new System.Windows.Automation.PropertyCondition(System.Windows.Automation.AutomationElement.AutomationIdProperty, "PlayButtonElement"));
                if (playBtn == null)
                {
                    playBtn = window.FindFirst(
                        System.Windows.Automation.TreeScope.Descendants,
                        new System.Windows.Automation.PropertyCondition(System.Windows.Automation.AutomationElement.AutomationIdProperty, "PlayButton"));
                }
            }

            object p;
            if (playBtn != null && playBtn.TryGetCurrentPattern(System.Windows.Automation.InvokePattern.Pattern, out p))
            {
                ((System.Windows.Automation.InvokePattern)p).Invoke();
            }
        }
        catch { }
    }

    public static void Control(string filter, string action)
    {
        try
        {
            if (action == "VolumeUp") { AppleMusicVolume.Adjust(0.05f); return; }
            if (action == "VolumeDown") { AppleMusicVolume.Adjust(-0.05f); return; }

            var manager = Await(GlobalSystemMediaTransportControlsSessionManager.RequestAsync());
            var session = PickSession(manager, filter);
            if (session == null) return;
            switch (action)
            {
                case "Toggle": Await(session.TryTogglePlayPauseAsync()); break;
                case "Next": Await(session.TrySkipNextAsync()); break;
                case "Previous": Await(session.TrySkipPreviousAsync()); break;
            }
        }
        catch { }
    }

    private static GlobalSystemMediaTransportControlsSession PickSession(
        GlobalSystemMediaTransportControlsSessionManager manager, string filter)
    {
        var sessions = manager.GetSessions().ToList();
        if (sessions.Count == 0) return null;

        var match = sessions.FirstOrDefault(s =>
            s.SourceAppUserModelId.IndexOf(filter, StringComparison.OrdinalIgnoreCase) >= 0);
        if (match != null) return match;

        var playing = sessions.FirstOrDefault(s =>
        {
            try { return s.GetPlaybackInfo().PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing; }
            catch { return false; }
        });
        if (playing != null) return playing;

        try { return manager.GetCurrentSession(); } catch { return null; }
    }

    private static void AppendJsonString(StringBuilder sb, string key, string value)
    {
        sb.Append('"').Append(key).Append("\":");
        if (value == null) { sb.Append("null"); return; }
        sb.Append('"');
        foreach (char c in value)
        {
            switch (c)
            {
                case '"': sb.Append("\\\""); break;
                case '\\': sb.Append("\\\\"); break;
                case '\n': sb.Append("\\n"); break;
                case '\r': sb.Append("\\r"); break;
                case '\t': sb.Append("\\t"); break;
                default:
                    if (c < 0x20) sb.Append("\\u").Append(((int)c).ToString("x4"));
                    else sb.Append(c);
                    break;
            }
        }
        sb.Append('"');
    }
}

// --- Volume interne d'Apple Music, via le curseur de sa propre interface ---
// Apple Music n'expose ni API ni commande SMTC pour son volume : on pilote
// directement le slider de son flyout "Volume" avec UI Automation, comme le
// ferait un utilisateur (clic pour ouvrir le flyout, puis lecture/ecriture
// du RangeValuePattern).

public static class AppleMusicVolume
{
    [DllImport("user32.dll")] private static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] private static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
    private const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    private const uint MOUSEEVENTF_LEFTUP = 0x0004;

    private static System.Windows.Automation.AutomationElement FindSlider(System.Windows.Automation.AutomationElement window)
    {
        return window.FindFirst(
            System.Windows.Automation.TreeScope.Descendants,
            new System.Windows.Automation.PropertyCondition(System.Windows.Automation.AutomationElement.AutomationIdProperty, "VolumeSlider"));
    }

    // Le bouton Volume est un toggle : cliquer alors que le flyout est deja
    // ouvert le REFERME (et corrompt la lecture qui suit). On ne clique donc
    // que si le slider n'est pas deja trouvable.
    private static System.Windows.Automation.AutomationElement OpenVolumeSlider()
    {
        var procs = System.Diagnostics.Process.GetProcessesByName("AppleMusic");
        if (procs.Length == 0 || procs[0].MainWindowHandle == IntPtr.Zero) return null;

        var window = System.Windows.Automation.AutomationElement.FromHandle(procs[0].MainWindowHandle);

        var existing = FindSlider(window);
        if (existing != null) return existing;

        var volBtn = window.FindFirst(
            System.Windows.Automation.TreeScope.Descendants,
            new System.Windows.Automation.PropertyCondition(System.Windows.Automation.AutomationElement.AutomationIdProperty, "VolumeButton"));
        if (volBtn == null) return null;

        var rect = volBtn.Current.BoundingRectangle;
        var x = (int)(rect.X + rect.Width / 2);
        var y = (int)(rect.Y + rect.Height / 2);
        SetCursorPos(x, y);
        System.Threading.Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(350);

        return FindSlider(window);
    }

    public static void Adjust(float delta)
    {
        try
        {
            var slider = OpenVolumeSlider();
            object p;
            if (slider == null || !slider.TryGetCurrentPattern(System.Windows.Automation.RangeValuePattern.Pattern, out p)) return;
            var rvp = (System.Windows.Automation.RangeValuePattern)p;
            var next = Math.Max(0.0, Math.Min(1.0, rvp.Current.Value + delta));
            rvp.SetValue(next);
        }
        catch { }
    }

    private static string MuteStateFile
    {
        get { return System.IO.Path.Combine(System.IO.Path.GetTempPath(), "applemusic-nowplaying-lastvolume.txt"); }
    }

    /// <summary>Bascule le mute et renvoie le nouvel etat (true = muet), ou null en cas d'echec.</summary>
    public static bool? ToggleMute()
    {
        try
        {
            var slider = OpenVolumeSlider();
            object p;
            if (slider == null || !slider.TryGetCurrentPattern(System.Windows.Automation.RangeValuePattern.Pattern, out p)) return null;
            var rvp = (System.Windows.Automation.RangeValuePattern)p;
            var current = rvp.Current.Value;

            if (current > 0.001)
            {
                System.IO.File.WriteAllText(MuteStateFile, current.ToString(System.Globalization.CultureInfo.InvariantCulture));
                rvp.SetValue(0);
                return true;
            }
            else
            {
                double restore = 0.5;
                if (System.IO.File.Exists(MuteStateFile))
                {
                    double.TryParse(
                        System.IO.File.ReadAllText(MuteStateFile),
                        System.Globalization.NumberStyles.Any,
                        System.Globalization.CultureInfo.InvariantCulture,
                        out restore);
                }
                rvp.SetValue(restore);
                return false;
            }
        }
        catch
        {
            return null;
        }
    }
}

public static class EntryPoint
{
    public static int Main(string[] args)
    {
        Console.OutputEncoding = Encoding.UTF8;

        string filter = "Apple";
        string action = null;
        int intervalMs = 1500;

        string url = null;
        for (int i = 0; i < args.Length; i++)
        {
            if (args[i] == "-Filter" && i + 1 < args.Length) filter = args[++i];
            else if (args[i] == "-Action" && i + 1 < args.Length) action = args[++i];
            else if (args[i] == "-IntervalMs" && i + 1 < args.Length) intervalMs = int.Parse(args[++i]);
            else if (args[i] == "-Url" && i + 1 < args.Length) url = args[++i];
        }

        if (action == "PlayMedia")
        {
            if (url != null) NowPlayingBridge.PlayUrl(url);
            return 0;
        }

        if (action == "VolumeMute")
        {
            var muted = AppleMusicVolume.ToggleMute();
            Console.WriteLine(muted.HasValue ? (muted.Value ? "true" : "false") : "unknown");
            return 0;
        }

        if (action != null)
        {
            NowPlayingBridge.Control(filter, action);
            return 0;
        }

        while (true)
        {
            Console.WriteLine(NowPlayingBridge.GetSnapshot(filter));
            System.Threading.Thread.Sleep(intervalMs);
        }
    }
}
