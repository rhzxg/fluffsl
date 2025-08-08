<img src=".\res\icon.png" style="zoom: 25%;" />

# fluffsl

Unofficial VS Code syntax highlighter for **The-Forge Shading Language (FSL)**.

This extension provides basic grammar highlighting for `.fsl` files used in [The Forge](https://github.com/ConfettiFX/The-Forge) rendering framework, making shader code more readable and easier to write.

## ✨ Features
- 🎨 Syntax highlighting for keywords, types, macros, and comments.
- 📂 Automatic detection of `.fsl` files.
- 🪶 Lightweight and fast — no extra dependencies.
- 📜 Easy to extend with custom grammar rules.

## 📦 Installation
1. Download the `.vsix` file from the [Releases](./releases) page.
2. Install it via command line:
   ```bash
   code --install-extension fluffsl-x.x.x.vsix
3. Install it via VS Code extension market:
   Search fluffsl and install.
## 🔧 Building the Extension
- To compile the extension and run it locally, follow these steps:
1. Run the following command to install all required Node.js dependencies:
```bash
   npm install
```

2. After the dependencies are installed, you need to compile the TypeScript code:
```bash
   npm run compile
```

3. To test the extension locally, use the following command to open a new instance of VS Code with your extension:
``` bash
   F5
```

​	This will start a new VS Code window (called the Extension Development Host) with the extension loaded, allowing you to test its functionality.