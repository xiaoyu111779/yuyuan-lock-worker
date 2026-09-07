# 芋圆机 · 锁机邮件扳机（自部署）

让角色真的能把你的 App 锁上：芋圆机 → 这个 Worker → 一封邮件 → iPhone 快捷指令自动化 → one sec 开一段 strict block。
到点自动解；你回芋圆机求 ta，ta 松口就再发一封「解锁」邮件，用一次约 10 秒的短 block 盖掉当前的锁。

全程只发邮件给你自己，零成本，不经过作者服务器。

---

## 一、准备两个账号（各 3 分钟）

**1. Resend**（发邮件用）
1. 打开 https://resend.com 注册（用你的**iCloud 邮箱**注册，因为免费账号只能发给注册邮箱本人）。
2. 左侧 API Keys → Create API Key → 复制那串 `re_xxxx`（只显示一次）。

**2. Cloudflare**（跑 Worker 用）
- https://dash.cloudflare.com 注册，免费。

## 二、部署 Worker（两种方式选一种）

**方式 A · 后台粘代码（推荐，不用装任何东西）**
1. Cloudflare 后台 → Workers & Pages → Create → Create Worker → 名字随便（如 `yuyuan-lock`）→ Deploy。
2. 点 Edit code，把仓库里 `src/index.js` 的**全部内容**粘进去覆盖，Deploy。
3. 回到该 Worker → Settings → Variables and Secrets → 添加三个：
   - `RESEND_API_KEY` = 第一步复制的 `re_xxxx`（类型选 Secret）
   - `TO_EMAIL` = 你手机上收邮件的 iCloud 地址
   - `LOCK_TOKEN` = 你自己编一串密码（如 `mimi123`），等会芋圆机里要填同一串
4. 记下 Worker 地址：`https://yuyuan-lock.<你的子域>.workers.dev`。浏览器打开它，看到 `"ok":true,"hasKey":true,"hasTo":true` 就通了。

**方式 B · 一键部署按钮**

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xiaoyu111779/yuyuan-lock-worker)

部署完仍要去 Settings → Variables 填上面三个变量。

## 三、芋圆机里填

设置 → 手机联动 → 「ta 可以锁我的 App（邮件→one sec）」打开，填：
- 锁定服务地址：Worker 地址
- 口令：和 `LOCK_TOKEN` 一样

点「发一封测试」，手机应在几秒内收到主题 `YC-LOCK-1` 的邮件。

## 四、手机上建两条自动化（最关键的一步）

先装 **one sec**（App Store，免费）。打开 one sec → Block 标签 → 把你想被锁的 App（小红书、抖音、Safari…）设成默认选择；**别把 Safari/酒馆所在浏览器锁进去，不然锁了你就没法回芋圆机求 ta 了**——除非你就想这样。

**自动化 1 · 锁**
1. 快捷指令 App → 自动化 → ＋ → 往下找「**邮件**」。
2. 发件人填 `onboarding@resend.dev`（或你设的 FROM_EMAIL），主题包含填 `YC-LOCK-`，勾**立即运行**，下一步。
3. 新建空白自动化，依次加动作：
   - 「**从输入获取详细信息**」→ 选 **主题**（输入选 快捷指令输入）
   - 「**匹配文本**」→ 模式填 `\d+`（匹配主题里的数字）
   - 「**从匹配获取文本**」（可跳过，直接用匹配结果）
   - 「**⏳ Start Block Session**」（one sec 的动作）→ 时长选择变量，把上一步的**数字**拖进去（单位分钟）→ 打开 **Strict**；要锁的 App 用 one sec 里的默认选择或在动作里勾。
4. 完成。

**自动化 2 · 解锁（提前放）**
1. 同上，主题包含填 `YC-UNLOCK`，立即运行。
2. 动作只有一个：「⏳ Start Block Session」→ 时长填能填的最短（10 秒；如果最低只能 1 分钟就填 1 分钟）→ Strict 开。
   原理：one sec 新的 block 会接管旧的，一段极短的 block 跑完就等于解锁了。

## 五、注意
- 收邮件的必须是**推送**类账户（iCloud / Exchange / Outlook）。Gmail 在系统「邮件」App 里是定时拉取，会晚十几分钟。
- 自动化的「立即运行」一定要开，不然每次弹窗问你。
- 邮件会在收件箱攒起来，可在「邮件」App 里建一条规则自动归档 `YC-LOCK`。
- 锁着的时候芋圆机还能用的前提是浏览器没被锁。想要"锁全机"就把浏览器也锁上，那就只能等到点。
