# dsh-sync · 跨电脑同步（DSH 插件）

在两台电脑之间接续 **DeepSeek Harness** 和 **WorkBuddy** 的工作。
逐项勾选工作区 / 对话，传到你自己的私有 GitHub 仓库。入口在 DSH 的**左侧边栏**。

数据不经过任何第三方服务 —— 走你自己的 GitHub 私有仓库。

## 安装

### 从 GitHub 直装

```bash
dsh plugin --profile desktop add github:lingrenjie7-star/dsh-sync
```

### 从 npm 装

```bash
dsh plugin --profile desktop add dsh-dntb
```

> `--profile desktop` 换成你实际在用的 profile 名（桌面端一般是 `desktop`，
> 浏览器端是 `web`）。不确定就 `dsh plugin --help` 看一眼。

装完**重启 DSH**，左侧边栏会出现「跨电脑同步」。

## 第一次使用

1. 左侧边栏打开「跨电脑同步」
2. **账号** 页粘贴一个有 `repo` 权限的 GitHub 令牌
3. **仓库** 页点「＋ 给这个软件新建仓库」（或「加入已有仓库」）
4. **同步** 页勾选工作区，点「↑ 上传到 GitHub」

另一台电脑：装同一个插件 → 连 GitHub → 仓库页**自动认出**同步仓库
（靠仓库里的 `dshwb-sync.json` 标识）→ 点「↓ 从 GitHub 下载」。

## 能同步什么

同一套引擎，内置两个软件的数据源：

| 软件 | 同步内容 | 默认落在哪里 |
|---|---|---|
| **DeepSeek Harness** | 工作区、对话、设置、技能 | `~/.dsh/` |
| **WorkBuddy** | 项目、对话、记忆文件 | `~/.workbuddy/` |

两边的数据会分开存放，各自显示在各自软件的左侧栏。

## 数据不在默认位置怎么办

上面那两个是**默认**路径。如果你的 DSH 数据放在别处
（比如 `D:\dsh`，或者改了 `DSH_HOME`），插件默认找不到它。

这时到 **选项** 页，找到对应软件那一行：

- 没检测到的会带一个 **「未检测到」** 标记，并说明原因
- 点 **「数据目录」** 右边的 **选择**，指到真实的数据目录
- 选完会立刻重新检测，软件就出现在同步页了

「工作区根目录」是另一回事 —— 那是你**项目**所在的父目录，用于换机时还原路径，
和数据目录（软件自己存数据的地方）不是同一个。

## 界面

| 页 | 作用 |
|---|---|
| 同步 | 按「工作区 → 对话」勾选，上传 / 下载 |
| 仓库 | 本机仓库、GitHub 上可加入的、「未识别」仓库认领 |
| 账号 | 连接 / 断开 GitHub，网络通道检测 |
| 选项 | 数据目录 / 工作区根目录、追加软件、诊断 |

## 同步后对话为什么能出现在左侧栏

两个软件的机制不一样，这是最容易踩坑的地方：

| | DSH | WorkBuddy |
|---|---|---|
| 界面数据源 | `~/.dsh/storages/workspace.json` | `~/.workbuddy/workbuddy.db`（sqlite） |
| 只放文件够不够 | 不够，要写 json | **不够，要写 sqlite 表** |

DSH 侧还有一层：「勾了工作区就带上它的对话」需要一张「对话 → 工作区」索引。
这张索引**同时来自本机和远端仓库** —— 新机器本机是空的，只看本机会把远端来的
对话当成「未勾选」跳过，表现为工作区同步过来了但里面是空的。

「**未识别**」标签页装的是那些没有标识文件、也没写同步标签的仓库
（多半是网页端手工建的）。指定归属后程序会把标识补写进仓库，
之后任何一台机器都能自动认出来。

## 仓库标识

建仓时会在仓库根写一个 `dshwb-sync.json`：

```json
{
  "schema": "dshwb-sync/marker@1",
  "repo": {
    "source": "dsh",
    "sourceLabel": "DeepSeek Harness",
    "owner": "you",
    "repoName": "dsh-sync-data"
  }
}
```

发现仓库时只读这个文件就能确定归属，**不靠名字猜**。
早期版本会「名字里带 dsh 就算 DSH 仓库」，那会把 DSH 的对话写进别人的项目仓库，已删掉。

## 相关仓库

- [wb-sync](https://github.com/lingrenjie7-star/wb-sync) — 同一功能的 WorkBuddy 扩展版本
- [desktop-sync](https://github.com/lingrenjie7-star/desktop-sync) — 桌面客户端（绿色版免安装，令牌用系统加密）

## 已知限制

- **令牌以明文保存**。插件跑在普通 Node 进程里，拿不到 Electron 的 `safeStorage`。
  界面会明确提示，不假装加密。机器不是你独占的话建议用桌面版。
- **需要 Web 组合**。宿主半边依赖 `webServer`，headless 组合下会告警退出。
- **不做后台自动同步**。同步永远由你点按钮触发。

## 许可证

[MIT](LICENSE)
