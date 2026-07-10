发版流程：

1. 运行发版脚本（自动更新 manifest/version/changelog + git commit）

.\scripts\release.ps1 2.7.0 270 "新功能; bug修复"
2. 推送代码到 Gitee

git push gitee app/ui
3. HBuilder 打包 WGT

发行 → 制作应用 WGT 包
4. 上传 WGT 到 Gitee Release

仓库 → Releases → v2.7.0 → 上传生成的 .wgt 文件（自动命名如 __UNI__8D9B28D.wgt）
注意：步骤 4 上传时文件名必须与 version.json 中 wgtUrl 一致，当前是 __UNI__8D9B28D.wgt。