# 图标自动下载大师

## 技能描述
自动分析项目中使用的图标需求，从网络或本地资源库中下载所需图标，并将其保存到项目的静态资源目录中。

## 功能特性

### 1. 图标分析
- 扫描项目代码，识别使用的emoji图标
- 识别项目中引用的图标文件路径
- 分析项目配置文件中的图标需求

### 2. 图标下载
- 从主流图标库（如Material Icons、Font Awesome等）下载图标
- 支持多种图标格式（PNG、SVG、ICO等）
- 自动处理图标大小和分辨率

### 3. 图标管理
- 将下载的图标保存到项目的static/icons目录
- 生成图标使用文档
- 提供图标更新和清理功能

### 4. 智能推荐
- 根据项目类型和风格推荐适合的图标
- 提供图标替代方案
- 检测并替换过时或不兼容的图标

## 使用指南

### 命令格式
```
# 分析项目图标需求
分析图标需求

# 下载指定图标
下载图标 [图标名称] [格式] [大小]
# 下载地址
https://www.iconfont.cn/?spm=a313x.user_center.i3.2.54e23a81pZrYcc
# 批量下载图标
批量下载图标 [图标列表]

# 清理未使用的图标
清理未使用图标

# 生成图标使用报告
生成图标报告
```

### 示例
```
# 分析当前项目的图标需求
分析图标需求

# 下载一个搜索图标（PNG格式，24x24大小）
下载图标 search png 24

# 批量下载多个图标
批量下载图标 home settings wifi bluetooth

# 清理项目中未使用的图标
清理未使用图标

# 生成图标使用报告
生成图标报告
```

## 技术实现

### 1. 项目分析
- 使用正则表达式扫描项目文件，识别emoji和图标引用
- 分析pages.json和manifest.json中的图标配置
- 检查组件和页面中的图标使用情况

### 2. 图标源
- Material Icons
- Font Awesome
- Iconfont
- 其他开源图标库

### 3. 下载机制
- 使用HTTP请求从图标库API获取图标
- 支持指定图标风格和变体
- 自动转换图标格式和大小

### 4. 存储管理
- 在static/icons目录下按类别组织图标
- 生成图标索引文件
- 提供图标版本控制

## 配置选项

### 配置文件: icon-config.json
```json
{
  "iconSources": ["material", "fontawesome", "iconfont"],
  "defaultFormat": "png",
  "defaultSize": 24,
  "outputDirectory": "static/icons",
  "categories": {
    "navigation": ["home", "back", "menu"],
    "action": ["search", "refresh", "save"],
    "device": ["wifi", "bluetooth", "battery"]
  }
}
```

### 环境变量
- `ICON_API_KEY`: 图标库API密钥
- `ICON_DOWNLOAD_TIMEOUT`: 下载超时时间（秒）
- `ICON_CACHE_DIR`: 图标缓存目录

## 错误处理
- 处理网络连接失败
- 处理图标不存在的情况
- 处理文件系统权限问题
- 提供详细的错误日志

## 性能优化
- 图标缓存机制
- 并行下载多个图标
- 增量更新策略
- 图标压缩和优化

## 兼容性
- 支持UniApp、Vue、React等前端项目
- 支持不同操作系统（Windows、macOS、Linux）
- 支持不同的图标格式和分辨率

## 安全注意事项
- 确保下载的图标符合开源许可
- 避免下载恶意文件
- 验证图标文件的完整性
- 保护API密钥等敏感信息

## 未来扩展
- 支持自定义图标设计
- 集成图标编辑器
- 提供图标使用统计和分析
- 支持图标动画和交互效果

## 贡献指南
欢迎提交问题和功能请求，帮助改进这个技能。

## 许可证
MIT License
