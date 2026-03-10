export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  }
};

const API_TOKEN = "mytoken";
const ADMIN_PASS = "admin123";

async function handleRequest(request, env) {

  const url = new URL(request.url);
  const path = url.pathname;

  const token = env.API_TOKEN || API_TOKEN;
  const admin = env.ADMIN_PASS || ADMIN_PASS;

  /* 首页 */
  if (path === "/") {
    return new Response(editorPage(token), {
      headers: { "content-type": "text/html;charset=utf-8" }
    });
  }

  /* 写入 */
  if (path === "/set") {

    const reqToken = url.searchParams.get("token");
    if (reqToken !== token) {
      return json({ error: "unauthorized" }, 403);
    }

    const data = await request.json();
    let key = data.key || randomKey();
    let value = data.value;
    let ttl = parseInt(data.ttl || 0);

    if (!value) {
      return json({ error: "empty content" });
    }

    let meta = {};
    if (ttl > 0) {
      meta.expire = Date.now() + ttl * 1000;
    }

    await env.NOTE.put(key, value, { metadata: meta });
    await env.NOTE.put("view:" + key, "0");

    return json({
      success: true,
      key: key,
      url: "/" + key
    });
  }

  /* 最近笔记 */
  if (path === "/list") {

    const list = await env.NOTE.list({ limit: 50 });

    let html = `
    <h2>最近笔记</h2>
    <style>
    body{font-family:Arial;background:#111;color:#eee;padding:20px}
    a{color:#4ea1ff}
    </style>
    `;

    for (const k of list.keys) {
      if (k.name.startsWith("view:")) continue;
      html += `
      <div style="margin:6px">
      <a href="/${k.name}" target="_blank">${k.name}</a>
      </div>
      `;
    }

    return new Response(html, {
      headers: { "content-type": "text/html;charset=utf-8" }
    });
  }

  /* 管理后台 */
  if (path === "/admin") {

    const pass = url.searchParams.get("pass");
    if (pass !== admin) {
      return new Response("wrong password");
    }

    const list = await env.NOTE.list();

    let html = `
    <h2>KV Note Admin</h2>
    <style>
    body{font-family:Arial;background:#111;color:#eee;padding:20px}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #333;padding:8px;text-align:left}
    th{background:#222}
    a{color:#4ea1ff}
    </style>
    <table>
    <tr>
    <th>Key</th>
    <th>Views</th>
    <th>Expire</th>
    <th>Action</th>
    </tr>
    `;

    for (const k of list.keys) {
      if (k.name.startsWith("view:")) continue;
      const obj = await env.NOTE.getWithMetadata(k.name);
      if (!obj) continue;

      const meta = obj.metadata || {};
      if (meta.expire && Date.now() > meta.expire) {
        await env.NOTE.delete(k.name);
        await env.NOTE.delete("view:" + k.name);
        continue;
      }

      const views = await env.NOTE.get("view:" + k.name) || 0;
      let expireText = meta.expire ? new Date(meta.expire).toLocaleString() : "永久";

      html += `
      <tr>
      <td><a href="/${k.name}" target="_blank">${k.name}</a></td>
      <td>${views}</td>
      <td>${expireText}</td>
      <td>
      <a href="/${k.name}" target="_blank">Open</a> |
      <a href="/delete?pass=${admin}&key=${k.name}">Delete</a>
      </td>
      </tr>
      `;
    }

    html += "</table>";

    return new Response(html, {
      headers: { "content-type": "text/html;charset=utf-8" }
    });
  }

  /* 删除 */
  if (path === "/delete") {
    const pass = url.searchParams.get("pass");
    const key = url.searchParams.get("key");
    if (pass !== admin) {
      return new Response("wrong password");
    }

    await env.NOTE.delete(key);
    await env.NOTE.delete("view:" + key);

    return new Response("deleted");
  }

  /* 读取 */
  const key = decodeURIComponent(path.slice(1));
  const obj = await env.NOTE.getWithMetadata(key);

  if (!obj || !obj.value) {
    return new Response("该笔记已过期或不存在。", { status: 404 });
  }

  const meta = obj.metadata || {};
  if (meta.expire && Date.now() > meta.expire) {
    await env.NOTE.delete(key);
    await env.NOTE.delete("view:" + key);
    return new Response("该笔记已过期或不存在。", { status: 404 });
  }

  let views = await env.NOTE.get("view:" + key);
  views = parseInt(views || 0) + 1;
  await env.NOTE.put("view:" + key, String(views));

  if (
    key.endsWith(".md") ||
    obj.value.startsWith("#") ||
    obj.value.includes("```")
  ) {
    return markdownPage(obj.value, views);
  }

  if (key.endsWith(".html")) {
    return new Response(obj.value, {
      headers: { "content-type": "text/html;charset=utf-8" }
    });
  }

  if (key.endsWith(".json")) {
    return new Response(obj.value, {
      headers: { "content-type": "application/json;charset=utf-8" }
    });
  }

  return new Response(obj.value, {
    headers: { "content-type": "text/plain;charset=utf-8" }
  });
}

/* 编辑器 */
function editorPage(token) {

return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>KV Note</title>

<style>
body{margin:0;background:#f6f8fa;color:#24292e;font-family:Arial;}
.top{padding:10px;background:white;border-bottom:1px solid #d0d7de;}
.container{display:flex;height:92vh;}
textarea{width:50%;border-right:1px solid #d0d7de;outline:none;padding:20px;background:white;color:#24292e;font-size:15px;}
.preview{width:50%;padding:20px;overflow:auto;border-left:1px solid #d0d7de;background:white;}
input{background:white;border:1px solid #d0d7de;color:#24292e;padding:5px;margin-right:10px;}
button{background:#2da44e;border:none;padding:6px 12px;color:white;cursor:pointer;border-radius:6px;}
button:hover{background:#2c974b;}
a{color:#0969da}
</style>

</head>

<body>

<div class="top">
访问码 <input id="key" placeholder="留空随机码">
过期时间 <input id="ttl" style="width:120px" placeholder="秒，例如3600">
<button onclick="save()">保存</button>
<button onclick="copy()">复制链接</button>
<span id="msg"></span>
</div>

<div class="container">
<textarea id="editor" placeholder="支持 Markdown 编辑..."></textarea>
<div class="preview" id="preview"></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script>
let lastURL=""
const editor=document.getElementById("editor")
editor.oninput=()=>{
document.getElementById("preview").innerHTML=marked.parse(editor.value)
}

async function save(){
const res=await fetch("/set?token=${token}",{
method:"POST",
headers:{'content-type':'application/json'},
body:JSON.stringify({
key:document.getElementById("key").value,
value:editor.value,
ttl:document.getElementById("ttl").value
})
})
const data=await res.json()
if(data.success){
lastURL=location.origin+data.url
document.getElementById("msg").innerHTML=
"保存成功 → <a href='"+data.url+"' target='_blank'>"+
lastURL+
"</a>"
}else{
document.getElementById("msg").innerText=data.error
}
}

function copy(){
if(!lastURL){
alert("请先保存")
return
}
navigator.clipboard.writeText(lastURL)
alert("链接已复制")
}
</script>

</body>
</html>
`;
}

/* Markdown 页面 */
function markdownPage(md, views) {
const html = `
<html>
<head>
<meta charset="UTF-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css/github-markdown.css">
<style>
body{background:#f6f8fa;}
.markdown-body{background:white;color:#24292e;max-width:900px;margin:auto;padding:40px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08);}
.views{opacity:.6;font-size:12px;}
#toc{margin-bottom:30px;}
</style>
</head>
<body class="markdown-body">
<div class="views">Views: ${views}</div>
<div id="toc"></div>
<div id="content"></div>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script>
const md=\`${md.replace(/`/g,"\\`")}\`
const html=marked.parse(md)
document.getElementById("content").innerHTML=html
const headers=document.querySelectorAll("#content h1,#content h2,#content h3")
let toc="<h3>目录</h3>"
headers.forEach((h,i)=>{
const id="h"+i
h.id=id
toc+=\`<div style="margin-left:\${(h.tagName[1]-1)*10}px"><a href="#\${id}">\${h.innerText}</a></div>\`
})
document.getElementById("toc").innerHTML=toc
</script>
</body>
</html>
`;
return new Response(html,{headers:{'content-type':'text/html;charset=utf-8'}});
}

/* 工具 */
function randomKey(){return crypto.randomUUID().slice(0,8);}
function json(data,status=200){
return new Response(JSON.stringify(data,null,2),{
status:status,
headers:{'content-type':'application/json'}
});
}
