# EchoMind Frontend

独立 Vue 前端项目，可同时连接 EchoMind Python 版本和 EchoMind Java 版本。

项目目录：

```text
./EchoMindFrontend
```

## 功能

- 在页面中切换 Java / Python 后端。
- 统一适配 `/chat` 响应字段：
  - Python：`conv_id`、`agent_type`、`latency_ms`
  - Java：`conversation_id`、`agent_type`、`latency_ms`
- 支持聊天调试、健康检查、监控摘要、知识库检索、知识库文档导入、文件上传。
- 支持 Docker + Nginx 部署。

## 默认后端地址

| 后端 | 默认地址 |
|------|----------|
| Python | `http://localhost:8000` |
| Java | `http://localhost:8080` |

开发模式下，Vite 会代理：

| 前端路径 | 代理到 |
|----------|--------|
| `/api/python` | `http://localhost:8000` |
| `/api/java` | `http://localhost:8080` |

Docker 模式下，Nginx 会通过运行时注入的地址访问后端。默认仍指向宿主机上的 Python / Java 服务。

## 本地运行

安装依赖：

```bash
npm install
```

启动：

```bash
npm run dev
```

访问：

```text
http://localhost:5173
```

如果后端端口不是默认值，可以启动时覆盖：

```bash
VITE_PYTHON_API_URL=http://localhost:8000 \
VITE_JAVA_API_URL=http://localhost:8080 \
npm run dev
```

## Docker 部署

先分别配置 `../EchoMind/.env` 和 `../EchoMindJava/.env`，再启动完整服务：

```bash
docker compose up -d --build
```

前提是 `EchoMindFrontend` 的父目录下有这三个目录：

```text
../EchoMind
../EchoMindJava
./
```

访问前端：

```text
http://localhost
```

如果只想暴露前端端口，可改 `FRONTEND_PORT`，默认仍可通过 `80` 统一入口访问。

停止：

```bash
docker compose down
```

## 后端启动参考

Python 版默认：

```text
http://localhost:8000
```

Java 版默认：

```text
http://localhost:8080
```

两个后端不需要同时启动。前端页面里选择当前要调试的后端即可。


后端 Compose 服务通过 `env_file` 自动读取各自项目的 `.env`，普通启动不再需要额外 `--env-file`。
共享 Redis 的密码和前端端口仍由前端目录的 `.env`、shell 或显式 `--env-file` 提供；
Compose 中的 Redis 连接配置会覆盖后端文件内的 Redis 设置，保证两个后端连接同一个服务。
Python 文件中的 `EVAL_JUDGE_MODEL`、`EVAL_JUDGE_MAX_TOKENS` 等配置也会完整传入容器。
手动选择的后端不会因健康检查失败而改变；切换后端后，旧请求不能覆盖新页面的状态或回复。
