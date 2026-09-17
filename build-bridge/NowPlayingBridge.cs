using System;
using System.Collections.Generic;
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
            var timeline = session.GetTimelineProperties();
            long positionMs = (long)timeline.Position.TotalMilliseconds;
            long durationMs = (long)(timeline.EndTime - timeline.StartTime).TotalMilliseconds;

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
            AppendJsonString(sb, "thumbMime", thumbMime); sb.Append(',');
            sb.Append("\"positionMs\":").Append(positionMs).Append(',');
            sb.Append("\"durationMs\":").Append(durationMs);
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

// --- Volume d'Apple Music via le mixeur de volume Windows (Core Audio) ---
// On pilote le volume/mute de la session audio du process AppleMusic via
// ISimpleAudioVolume (meme controle que la tranche de l'app dans le mixeur
// de volume Windows), plutot que le curseur interne de l'app.

public static class AppleMusicVolume
{
    // Apple Music (UWP) ouvre plusieurs sessions audio pour un seul process
    // (ex: une tranche "reelle" et une tranche silencieuse/inactive) : il faut
    // agir sur toutes celles du process, sinon on risque de piloter celle qui
    // ne produit aucun son pendant que l'autre reste audible.
    private static List<ISimpleAudioVolume> FindSessionVolumes()
    {
        var result = new List<ISimpleAudioVolume>();
        var procs = System.Diagnostics.Process.GetProcessesByName("AppleMusic");
        if (procs.Length == 0) return result;
        var pids = new HashSet<int>();
        foreach (var p in procs) pids.Add(p.Id);

        var enumeratorType = Type.GetTypeFromCLSID(new Guid("BCDE0395-E52F-467C-8E3D-C4579291692E"));
        var enumerator = (IMMDeviceEnumerator)Activator.CreateInstance(enumeratorType);

        IMMDevice device;
        enumerator.GetDefaultAudioEndpoint(0 /* eRender */, 1 /* eMultimedia */, out device);

        object sessionManagerObj;
        var iidSessionManager2 = typeof(IAudioSessionManager2).GUID;
        device.Activate(ref iidSessionManager2, 0x17 /* CLSCTX_ALL */, IntPtr.Zero, out sessionManagerObj);
        var sessionManager = (IAudioSessionManager2)sessionManagerObj;

        IAudioSessionEnumerator sessionEnumerator;
        sessionManager.GetSessionEnumerator(out sessionEnumerator);
        int count;
        sessionEnumerator.GetCount(out count);

        for (int i = 0; i < count; i++)
        {
            IAudioSessionControl control;
            sessionEnumerator.GetSession(i, out control);
            var control2 = control as IAudioSessionControl2;
            if (control2 == null) continue;
            int pid;
            control2.GetProcessId(out pid);
            if (!pids.Contains(pid)) continue;
            var vol = control as ISimpleAudioVolume;
            if (vol != null) result.Add(vol);
        }
        return result;
    }

    public static void Adjust(float delta)
    {
        try
        {
            var vols = FindSessionVolumes();
            foreach (var vol in vols)
            {
                float current;
                vol.GetMasterVolume(out current);
                var next = Math.Max(0f, Math.Min(1f, current + delta));
                var eventContext = Guid.Empty;
                vol.SetMasterVolume(next, ref eventContext);
            }
        }
        catch { }
    }

    /// <summary>Bascule le mute et renvoie le nouvel etat (true = muet), ou null en cas d'echec.</summary>
    public static bool? ToggleMute()
    {
        try
        {
            var vols = FindSessionVolumes();
            if (vols.Count == 0) return null;

            // Si au moins une session est encore audible, on mute tout.
            // Sinon (tout est deja muet), on demute tout.
            bool anyUnmuted = false;
            foreach (var v in vols)
            {
                bool m;
                v.GetMute(out m);
                if (!m) { anyUnmuted = true; break; }
            }
            var next = anyUnmuted;
            var eventContext = Guid.Empty;
            foreach (var v in vols) v.SetMute(next, ref eventContext);
            return next;
        }
        catch
        {
            return null;
        }
    }
}

[ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IMMDeviceEnumerator
{
    int EnumAudioEndpoints(int dataFlow, int stateMask, out IntPtr devices);
    int GetDefaultAudioEndpoint(int dataFlow, int role, [MarshalAs(UnmanagedType.Interface)] out IMMDevice device);
    int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, [MarshalAs(UnmanagedType.Interface)] out IMMDevice device);
    int RegisterEndpointNotificationCallback(IntPtr client);
    int UnregisterEndpointNotificationCallback(IntPtr client);
}

[ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IMMDevice
{
    int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object interfacePointer);
    int OpenPropertyStore(int stgmAccess, out IntPtr properties);
    int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
    int GetState(out int state);
}

[ComImport, Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioSessionManager2
{
    int GetAudioSessionControl(ref Guid audioSessionGuid, int streamFlags, [MarshalAs(UnmanagedType.Interface)] out object session);
    int GetSimpleAudioVolume(ref Guid audioSessionGuid, int streamFlags, [MarshalAs(UnmanagedType.Interface)] out object simpleAudioVolume);
    int GetSessionEnumerator([MarshalAs(UnmanagedType.Interface)] out IAudioSessionEnumerator sessionEnum);
    int RegisterSessionNotification(IntPtr client);
    int UnregisterSessionNotification(IntPtr client);
    int RegisterDuckNotification([MarshalAs(UnmanagedType.LPWStr)] string sessionId, IntPtr client);
    int UnregisterDuckNotification(IntPtr client);
}

[ComImport, Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioSessionEnumerator
{
    int GetCount(out int count);
    int GetSession(int index, [MarshalAs(UnmanagedType.Interface)] out IAudioSessionControl session);
}

[ComImport, Guid("F4B1A599-7266-4319-A8CA-E70ACB11E8CD"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioSessionControl
{
    int GetState(out int state);
    int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string name);
    int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string name, ref Guid eventContext);
    int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string path);
    int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string path, ref Guid eventContext);
    int GetGroupingParam(out Guid groupingParam);
    int SetGroupingParam(ref Guid groupingParam, ref Guid eventContext);
    int RegisterAudioSessionNotification(IntPtr client);
    int UnregisterAudioSessionNotification(IntPtr client);
}

[ComImport, Guid("BFB7FF88-7239-4FC9-8FA2-07C950BE9C6D"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioSessionControl2
{
    int GetState(out int state);
    int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string name);
    int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string name, ref Guid eventContext);
    int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string path);
    int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string path, ref Guid eventContext);
    int GetGroupingParam(out Guid groupingParam);
    int SetGroupingParam(ref Guid groupingParam, ref Guid eventContext);
    int RegisterAudioSessionNotification(IntPtr client);
    int UnregisterAudioSessionNotification(IntPtr client);
    int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string id);
    int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string id);
    int GetProcessId(out int pid);
    int IsSystemSoundsSession();
    int SetDuckingPreference(bool optOut);
}

[ComImport, Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface ISimpleAudioVolume
{
    int SetMasterVolume(float level, ref Guid eventContext);
    int GetMasterVolume(out float level);
    int SetMute(bool mute, ref Guid eventContext);
    int GetMute(out bool mute);
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
