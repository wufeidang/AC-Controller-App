# 空调温控 App 发布脚本
param(
    [string]$Version,
    [string]$VersionCode,
    [string]$ChangelogLines
)

$ProjectRoot = "E:\esp8266_work\GT-project\app\空调温控"
$WgtDir = "$ProjectRoot\unpackage\release\wgt"
$Today = Get-Date -Format "yyyy-MM-dd"

# 1. 更新 manifest.json
$json = Get-Content "$ProjectRoot\manifest.json" -Raw
$json = $json -replace '"versionName"\s*:\s*"[^"]*"', "`"versionName`": `"$Version`""
$json = $json -replace '"versionCode"\s*:\s*\d+', "`"versionCode`": $VersionCode"
Set-Content "$ProjectRoot\manifest.json" -Value $json
Write-Host "OK manifest.json v$Version (build $VersionCode)"

# 2. 更新 version.json
if ($ChangelogLines) {
    $cv = $ChangelogLines.Split(';')[0].Trim()
} else {
    $cv = ""
}
$vj = @{}
$vj.version = $Version
$vj.versionCode = [int]$VersionCode
$vj.wgtUrl = "https://github.com/wufeidang/AC-Controller-App/releases/download/v$Version/app.wgt"
$vj.changelog = $cv
$vj | ConvertTo-Json | Set-Content "$ProjectRoot\version.json"
Write-Host "OK version.json"

# 3. 更新 changelog.json
if ($ChangelogLines) {
    $parts = $ChangelogLines.Split(';')
    $title = $parts[0].Trim()
    $lines = @()
    foreach ($p in $parts) {
        $lines += "· $($p.Trim())"
    }
    $old = Get-Content "$ProjectRoot\changelog.json" -Raw | ConvertFrom-Json
    $entry = @{}
    $entry.ver = "v$Version"
    $entry.date = $Today
    $entry.title = $title
    $entry.lines = $lines
    $new = @($entry) + $old
    $new | ConvertTo-Json -Depth 5 | Set-Content "$ProjectRoot\changelog.json"
    Write-Host "OK changelog.json v$Version"
}

# 4. 提交
$oldLoc = Get-Location
Set-Location $ProjectRoot
git add -A
git commit -m "release: v$Version"
Set-Location $oldLoc
Write-Host "OK committed"

Write-Host ""
Write-Host "=== Hou Xu Shou Dong Cao Zuo ==="
Write-Host "1. HBuilder: Fa Xing > Zhi Zuo Ying Yong WGT Bao"
Write-Host "2. Shang Chuan app.wgt dao GitHub Releases"
Write-Host "3. git push"