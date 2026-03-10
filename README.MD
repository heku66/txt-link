# KV Note – Cloudflare Workers 云笔记系统

一个基于 **Cloudflare Workers + KV** 的轻量级云笔记系统。

原项目链接：https://github.com/1143520/txt-link.git

使用ChatGPT生成了一些扩展支持：

- 支持API写入
- Markdown 笔记
- 实时预览
- 可定义过期时间
- 访问统计
- 管理后台
- 自动目录 TOC
- 最近笔记列表

整个系统 **无需服务器数据库，仅使用 Cloudflare KV 即可运行**。

---

# 功能特性

## Markdown 编辑器

- Markdown 实时预览
- 深色模式界面
- 支持中文
- 自动目录生成（TOC）

---

## TTL 过期时间

创建笔记时可设置：

```
过期时间（秒）
```

例如：

```
3600
```

表示：

```
1小时后过期
```

过期机制：

- 访问时自动检测
- 后台管理页面自动清理

无需定时任务。

---

## 访问统计

每个笔记自动统计访问次数：

```
Views: 23
```

---

## 最近笔记

访问：

```
/list
```

可以看到最近创建的笔记。

---

## 管理后台

访问：

```
/admin?pass=你的密码
```

后台显示：

```
Key | Views | Expire | Action
```

可进行：

- 查看笔记
- 删除笔记
- 查看过期时间
- 查看访问量

---

# 系统架构

```
Cloudflare Worker
│
├── KV Namespace
│
├── NOTE
│   ├── key
│   ├── metadata.private
│   └── metadata.expire
│
└── view:key
    └── 访问统计
```

示例：

```
NOTE
├── test
├── hello
└── view:test
```

---

# 安装步骤

## 1 创建 Worker

登录 Cloudflare：

```
https://dash.cloudflare.com/
```

进入：

```
Workers & Pages
```

点击：

```
Create Worker
```

---

## 2 创建 KV Namespace

进入：

```
Workers → KV
```

创建 KV：

```
NOTE
```

---

## 3 绑定 KV

在 Worker 设置中绑定：

```
KV Namespace
```

变量名：

```
NOTE
```

---

## 4 配置环境变量（可选）

在 Worker Variables 中配置：

```
API_TOKEN
ADMIN_PASS
```

例如：

```
API_TOKEN = mytoken
ADMIN_PASS = admin123
```

如果不配置，则使用代码中的默认值。

---

## 5 部署代码

将 Worker 代码 **复制到 Worker 编辑器并部署**。

---

# 使用方法

## 打开编辑器

访问：

```
https://你的域名/
```

界面：

```
访问码  [留空随机码]
过期时间 [秒，例如3600]
☑ 私密笔记
[保存]
```

---

## 创建笔记

输入 Markdown：

```
# Hello

这是我的第一篇笔记
```

点击：

```
保存
```

系统返回：

```
保存成功 → https://example.com/abc12345
```

---

## 访问笔记

访问：

```
/abc12345
```

如果是私密笔记：

```
/abc12345?token=API_TOKEN
```

---

# Markdown 示例

示例：

```
# 标题

## 子标题

- 列表
- 列表

代码示例：

    console.log("hello");
```

页面会自动生成：

```
目录
标题
子标题
```

---

# API 使用

## 创建笔记

```
POST /set?token=API_TOKEN
```

JSON：

```
{
  "key": "test",
  "value": "# Hello",
  "ttl": 3600,
  "private": false
}
```

返回：

```
{
  "success": true,
  "key": "test",
  "url": "/test"
}
```

---

# 访问统计

统计存储方式：

```
view:key
```

例如：

```
view:test
```

值：

```
23
```

---

# TTL 过期机制

KV 本身不支持精准 TTL。

系统实现方式：

```
创建笔记
↓
metadata.expire = timestamp
↓
访问时检查
↓
过期自动删除
```

优点：

- 无定时任务
- 无额外 Worker
- 成本最低

---

# 目录结构

```
Worker
│
├── /
│   编辑器
│
├── /set
│   创建笔记
│
├── /list
│   最近笔记
│
├── /admin
│   管理后台
│
└── /key
    阅读笔记
```

