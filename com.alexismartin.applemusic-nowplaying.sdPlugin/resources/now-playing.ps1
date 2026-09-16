<#
    Bridge entre le Stream Deck plugin (Node.js) et l'API Windows
    "System Media Transport Controls" (SMTC), qui expose le titre en
    cours de lecture de n'importe quelle app media (dont Apple Music).

    Deux modes :
      - Mode "watch" (par defaut) : boucle infinie, imprime une ligne
        JSON sur stdout a chaque intervalle avec l'etat courant.
      - Mode "-Action Toggle|Next|Previous" : envoie une commande de
        controle a la session ciblee puis se termine (one-shot).
#>

param(
    [string]$Filter = "Apple",
    [int]$IntervalMs = 1500,
    [ValidateSet("Toggle", "Next", "Previous")]
    [string]$Action
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime

# Charge les types WinRT necessaires dans la session PowerShell.
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]
$asTaskGenericProgress = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperationWithProgress`2'
})[0]

function Wait-WinRtOperation {
    param($AsyncOp, [Type]$ResultType)
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $task = $asTask.Invoke($null, @($AsyncOp))
    $task.Wait(-1) | Out-Null
    return $task.Result
}

function Wait-WinRtOperationWithProgress {
    param($AsyncOp, [Type]$ResultType, [Type]$ProgressType)
    $asTask = $asTaskGenericProgress.MakeGenericMethod(@($ResultType, $ProgressType))
    $task = $asTask.Invoke($null, @($AsyncOp))
    $task.Wait(-1) | Out-Null
    return $task.Result
}

function Get-SessionManager {
    Wait-WinRtOperation `
        ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) `
        ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
}

function Get-TargetSession {
    param($Manager, [string]$NameFilter)

    $sessions = @($Manager.GetSessions())
    if ($sessions.Count -eq 0) { return $null }

    $match = $sessions | Where-Object { $_.SourceAppUserModelId -match [regex]::Escape($NameFilter) } | Select-Object -First 1
    if ($match) { return $match }

    $playing = $sessions | Where-Object {
        try { $_.GetPlaybackInfo().PlaybackStatus -eq [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing }
        catch { $false }
    } | Select-Object -First 1
    if ($playing) { return $playing }

    try { return $Manager.GetCurrentSession() } catch { return $null }
}

function Get-ThumbnailData {
    param($Properties)

    if (-not $Properties.Thumbnail) { return $null, $null }
    try {
        $stream = Wait-WinRtOperation `
            ($Properties.Thumbnail.OpenReadAsync()) `
            ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])

        $size = [uint64]$stream.Size
        if ($size -le 0 -or $size -gt 5MB) { return $null, $null }

        $reader = [Windows.Storage.Streams.DataReader]::new($stream)
        Wait-WinRtOperationWithProgress ($reader.LoadAsync([uint32]$size)) ([uint32]) ([uint32]) | Out-Null

        $bytes = New-Object byte[] ($size)
        $reader.ReadBytes($bytes)
        $reader.DetachStream() | Out-Null

        $mime = "image/jpeg"
        if ($bytes.Length -ge 8 -and $bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x4E -and $bytes[3] -eq 0x47) {
            $mime = "image/png"
        }
        return [Convert]::ToBase64String($bytes), $mime
    }
    catch {
        return $null, $null
    }
}

function Write-NowPlayingJson {
    param($Session)

    if (-not $Session) {
        [Console]::Out.WriteLine(([ordered]@{ hasSession = $false } | ConvertTo-Json -Compress))
        return
    }

    try {
        $props = Wait-WinRtOperation `
            ($Session.TryGetMediaPropertiesAsync()) `
            ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
        $playback = $Session.GetPlaybackInfo()
        $thumbBase64, $thumbMime = Get-ThumbnailData -Properties $props

        $result = [ordered]@{
            hasSession = $true
            appId      = $Session.SourceAppUserModelId
            title      = $props.Title
            artist     = $props.Artist
            album      = $props.AlbumTitle
            status     = $playback.PlaybackStatus.ToString()
            thumbnail  = $thumbBase64
            thumbMime  = $thumbMime
        }
        [Console]::Out.WriteLine(($result | ConvertTo-Json -Compress -Depth 3))
    }
    catch {
        [Console]::Out.WriteLine(([ordered]@{ hasSession = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress))
    }
}

function Invoke-Control {
    param($Session, [string]$ControlAction)

    if (-not $Session) { return }
    try {
        switch ($ControlAction) {
            "Toggle"   { Wait-WinRtOperation ($Session.TryTogglePlayPauseAsync()) ([bool]) | Out-Null }
            "Next"     { Wait-WinRtOperation ($Session.TrySkipNextAsync()) ([bool]) | Out-Null }
            "Previous" { Wait-WinRtOperation ($Session.TrySkipPreviousAsync()) ([bool]) | Out-Null }
        }
    }
    catch { }
}

$manager = Get-SessionManager

if ($Action) {
    $session = Get-TargetSession -Manager $manager -NameFilter $Filter
    Invoke-Control -Session $session -ControlAction $Action
    exit 0
}

while ($true) {
    $session = Get-TargetSession -Manager $manager -NameFilter $Filter
    Write-NowPlayingJson -Session $session
    Start-Sleep -Milliseconds $IntervalMs
}
