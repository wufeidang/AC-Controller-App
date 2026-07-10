# 空调温控 App 发布脚本
# 用法: .\scripts\release.ps1 <新版本> <新版本号>
# 示例: .\scripts\release.ps1 2.5.0 250

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    [Parameter(Mandatory=$true)]
    [string]$VersionCode
)

$ProjectRoot = "E:\esp8266_work\GT-project\app\空调温控"
$WgtDir = "$ProjectRoot\unpackage\release\wgt"

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
    changelog   = "请填写更新内容"
} | ConvertTo-Json
$verJson | Set-Content "$ProjectRoot\version.json"
Write-Host "✔ version.json 已更新"

# 3. 提示用户操作
Write-Host ""
Write-Host "======= 下一步操作 ======="
Write-Host "1. 在 HBuilder 中打开项目，选择：发行 → 制作应用WGT包"
Write-Host "2. WGT 文件会生成到: $WgtDir"
Write-Host "3. 将 app.wgt 上传到 GitHub Releases："
Write-Host "   https://github.com/wufeidang/AC-Controller-App/releases/new"
Write-Host "   - Tag: v$Version"
Write-Host "   - 上传 $WgtDir\app.wgt"
Write-Host "4. 提交并推送代码："
Write-Host "   git add -A && git commit -m ""release: v$Version"" && git push"
Write-Host "=========================="