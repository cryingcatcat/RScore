# WeChatRScore
## 🖼️ 效果示例

![示例图1：对单个好友的数据分析](examples/example_1.png)

![示例图2：对所有好友的数据分析](examples/example_2.png)
## ⚠️ 重要前提 

本项目的运行**强依赖**于另一个开源项目 `wechatDataBackup` 导出的数据。

必须首先使用该工具来导出你的微信聊天记录。

* **依赖项目地址:** [git-jiadong/wechatDataBackup](https://github.com/git-jiadong/wechatDataBackup/tree/main)

---

## 🚀 快速开始

### 步骤 1: 准备数据

请访问 [wechatDataBackup](https://github.com/git-jiadong/wechatDataBackup/tree/main) 项目，并按照其说明文档完成微信数据的导出。

### 步骤 2: 放置数据

1.  当 `wechatDataBackup` 成功运行后，你会得到一个名为 `User` 的文件夹。
2.  将这个 `User` 文件夹**完整地**复制并粘贴到本项目的根目录中。
3.  出于隐私原因，本项目根目录不包含 `/User` 文件夹。

项目目录结构现在应该如下所示：

```bash
[项目根目录]/
├── User/         <-- (这是从 wechatDataBackup 粘贴过来的文件夹)
│   ├── [用户ID_1]/  <-- (如wxid_12345abcde)
│   ├── [用户ID_2]/  <-- (你可能不止有一个账号）
│   └── ...
├── examples/
├── backend/      
├── frontend/
├── requirements.txt 
└── README.md
```

### 步骤 3: 安装依赖
```bash
pip install -r requirements.txt
```

### 步骤 4: 启动项目
```bash
cd C:\WeChatRScore\backend
python app.py
cd C:\WeChatRScore\frontend
npm start
```
