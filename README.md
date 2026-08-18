# Forge Shading Language for VS Code

基于 VS Code 官方 Language Server Protocol sample 扩展而成的 The-Forge Shading Language (FSL) 语言支持。

## 能力

- FSL、HLSL 风格关键字、标量/向量/矩阵/资源类型、预处理器和 The-Forge 宏的语法高亮
- 从 The-Forge `includes/*.h` 自动提取宏、类型和内置函数
- `STRUCT`、`DATA`、`CBUFFER`、`PUSH_CONSTANT`、`RES` 和普通声明的容错解析
- 递归解析 `#include` / `#import`，支持跨文件定义、声明、引用、悬停和补全
- Document Symbols、Workspace Symbols 和 semantic tokens
- 花括号、圆括号、方括号配对、自动闭合、折叠和基础不匹配诊断

## 开发

```powershell
npm install
npm run compile
npm run lint
```

在 VS Code 中按 `F5` 启动 Extension Development Host，然后打开任意 `.fsl` 或 `.h.fsl` 文件。

扩展默认会检测本机 `F:/The-Forge1/Common_3/Tools/ForgeShadingLanguage`。其他环境请设置 `fsl.forgeRoot`，或在启动 VS Code 前设置 `FSL_ROOT`。路径应指向包含 `includes`、`generators` 和 `fsl.py` 的 `ForgeShadingLanguage` 目录。

解析器不会要求代码能够成功编译；未完成函数、宏式声明和条件编译分支仍可参与符号索引，适合编辑过程中的不完整代码。
