# Recompile NowPlayingBridge.exe et le copie dans le plugin.
# Windows.WinMD vient du package NuGet Microsoft.Windows.SDK.Contracts
# (evite d'installer le Windows SDK complet juste pour ce fichier).
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$dir = $PSScriptRoot
$wpf = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\WPF"

& $csc /nologo /target:exe /platform:x64 /out:"$dir\NowPlayingBridge.exe" `
	/reference:"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\System.Runtime.dll" `
	/reference:"C:\Windows\System32\WinMetadata\Windows.Foundation.winmd" `
	/reference:"C:\Windows\System32\WinMetadata\Windows.Media.winmd" `
	/reference:"C:\Windows\System32\WinMetadata\Windows.Storage.winmd" `
	/reference:"$wpf\UIAutomationClient.dll" `
	/reference:"$wpf\UIAutomationTypes.dll" `
	/reference:"$wpf\WindowsBase.dll" `
	"$dir\NowPlayingBridge.cs"

if ($LASTEXITCODE -eq 0) {
	Copy-Item "$dir\NowPlayingBridge.exe" "$dir\..\com.alexismartin.applemusic-nowplaying.sdPlugin\resources\NowPlayingBridge.exe" -Force
	Write-Host "OK: bridge recompile et copie dans le plugin."
}
