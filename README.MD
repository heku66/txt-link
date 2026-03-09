#Cloudflare 部署步骤

1. 创建 KV

  进入：

 Cloudflare
 
→ Workers & Pages

→ KV

创建：

Namespace name

填写：NOTE

2. 创建 Worker

进入：

Workers & Pages
→ Create Worker

点击：Edit Code

把代码 全部替换为上面代码

3. 绑定 KV

进入：

Settings
→ Bindings

添加：

KV Namespace

变量名：

NOTE

Namespace：

选择刚创建的 KV。

4. 修改密码

代码顶部修改：

const API_TOKEN="CHANGE_ME"

const ADMIN_PASS="admin123"

例如：

API_TOKEN = ghtoken123

ADMIN_PASS = 888888

5. Deploy

点击：

Deploy

得到地址：

https://xxxx.workers.dev

# 使用方法

网页写笔记

访问：

https://xxxx.workers.dev

GitHub Action 推送
```
name: push

on:
  workflow_dispatch

jobs:

  push:

    runs-on: ubuntu-latest

    steps:

      - name: create data
        run: |
          echo "hello $(date)" > data.txt

      - name: push
        run: |
          curl -X POST \
          "https://xxx.workers.dev/set?token=ghtoken123&key=github" \
          --data-binary @data.txt
```

访问：

https://xxx.workers.dev/github

# 查看列表

https://xxx.workers.dev/list?pass=888888

# 删除

https://xxx.workers.dev/delete?pass=888888&key=test

六、TTL自动过期
```
GitHub Action：

curl -X POST \
"https://xxx.workers.dev/set?token=ghtoken123" \
-H "Content-Type: application/json" \
-d '{"key":"cache","value":"data","ttl":3600}'

#1小时自动删除。
```
# 访问 Markdown

保存：

README.md

访问：

https://xxx.workers.dev/README.md

自动渲染。
