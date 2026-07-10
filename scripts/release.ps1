# 空调温控 App 发布脚本
# 用法: .\scripts\release.ps1 <新版本> <新版本号> ["更新内容1; 更新内容2"]
# 示例: .\scripts\release.ps1 2.5.0 250 "优化连接速度; 修复超时bug"

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    [Parameter(Mandatory=$true)]
    [string]$VersionCode,
    [string]$ChangelogLines
)

$ProjectRoot = "E:\esp8266_work\GT-project\app\空调温控"
$WgtDir = "$ProjectRoot\unpackage\release\wgt"
$Today = Get-Date -Format "yyyy-MM-dd"

# 1. 更新 manifest.json 版本号
$manifest = Get-Content "$ProjectRoot\manifest.json" -Raw | ConvertFrom-Json
$manifest.versionName = $Version
$manifest.versionCode = [int]$VersionCode
$manifest | ConvertTo-Json -Depth 10 | Set-Content "$ProjectRoot\manifest.json"
Write-Host "✔ manifest.json 已更新至 v$Version (build $VersionCode)"

# 2. 更新 version.json
$verJson = @{
    version     = $Version
    versionCode = [int]$VersionCode
    wgtUrl      = "https://github.com/wufeidang/AC-Controller-App/releases/download/v$Version/app.wgt"
    changelog   = $ChangelogLines -replace ';', '；'
} | ConvertTo-Json
$verJson | Set-Content "$ProjectRoot\version.json"
Write-Host "✔ version.json 已更新"

# 3. 更新 changelog.json（追加新版本条目）
if ($ChangelogLines) {
    $lines = $ChangelogLines -split ';' | ForEach-Object { "· $($_.Trim())" }
    $title = $ChangelogLines -replace ';.*', ''
    $changelog = Get-Content "$ProjectRoot\changelog.json" -Raw | ConvertFrom-Json
    $newEntry = @{
        ver   = "v$Version"
        date  = $Today
        title = $title
        lines = $lines
    }
    $changelog = @($newEntry) + $changelog
    $changelog | ConvertTo-Json -Depth 5 | Set-Content "$ProjectRoot\changelog.json"
    Write-Host "✔ changelog.json 已追加 v$Version"
}

# 4. 提交代码
git -C $ProjectRoot add -A
git -C $ProjectRoot commit -m "release: v$Version"
Write-Host "✔ 代码已提交"

# 5. 提示后续操作
Write-Host ""
Write-Host "======= 下一步操作 ======="
Write-Host "1. 在 HBuilder 中：发行 → 制作应用WGT包"
Write-Host "2. WGT 文件生成到: $WgtDir"
Write-Host "3. 上传到 GitHub Releases："
Write-Host "   https://github.com/wufeidang/AC-Controller-App/releases/new"
Write-Host "   - Tag: v$Version"
Write-Host "   - 上传 $WgtDir\app.wgt"
Write-Host "4. 推送：git push"
Write-Host "=========================="