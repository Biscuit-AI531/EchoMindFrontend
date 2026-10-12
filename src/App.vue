<template>
  <div class="app-shell" :class="`view-${activeView}`">
    <aside class="navigation-rail" aria-label="主导航">
      <a class="brand" href="#" @click.prevent="activeView = 'chat'" aria-label="EchoMind 首页">
        <span class="brand-mark">E</span>
        <span class="brand-name">EchoMind</span>
      </a>
      <button class="new-chat-button" @click="activeView = 'chat'; clearConversation()">
        <AppIcon name="plus" />
        <span>新对话</span>
      </button>
      <span class="nav-caption">工作空间</span>
      <nav class="view-nav">
        <button
          v-for="view in views"
          :key="view.id"
          :aria-label="view.label"
          :class="{ active: activeView === view.id }"
          :aria-current="activeView === view.id ? 'page' : undefined"
          @click="activeView = view.id"
        >
          <AppIcon :name="view.icon" />
          <span>{{ view.label }}</span>
          <AppIcon class="nav-chevron" name="chevron" />
        </button>
      </nav>
      <div class="rail-bottom">
        <a class="docs-link" aria-label="API 文档" :href="docsUrl" target="_blank" rel="noreferrer">
          <AppIcon name="document" />
          <span>API 文档</span>
          <AppIcon name="northeast" />
        </a>
        <button class="user-button" aria-label="当前用户与会话配置" @click="openConnection">
          <span class="avatar">{{ userInitial }}</span>
          <span>
            <strong>{{ settings.userId || 'anonymous' }}</strong>
            <small>个人工作空间</small>
          </span>
          <AppIcon name="sliders" />
        </button>
      </div>
    </aside>
    <main class="workspace">
      <header class="topbar">
        <div class="page-breadcrumb">
          <span>工作空间</span>
          <AppIcon name="chevron" />
          <strong>{{ currentView.label }}</strong>
        </div>
        <a class="mobile-brand" href="#" @click.prevent="activeView = 'chat'" aria-label="EchoMind 首页">
          <span class="brand-mark">E</span>
          <span>EchoMind</span>
        </a>
        <div class="topbar-tools">
          <span class="connection-status" :title="statusText || healthLabel">
            <i :class="healthOk ? 'online' : 'offline'"></i>
            {{ healthOk ? '已连接' : healthLabel === '未检查' ? '连接中' : '未连接' }}
          </span>
          <div class="backend-tabs" aria-label="选择后端">
            <button
              v-for="backend in ['java', 'python']"
              :key="backend"
              :class="{ active: settings.backend === backend }"
              :aria-pressed="settings.backend === backend"
              @click="switchBackend(backend)"
            >
              {{ backend === 'java' ? 'Java' : 'Python' }}
            </button>
          </div>
          <button class="icon-button settings-button" aria-label="连接配置" title="连接配置" @click="openConnection">
            <AppIcon name="sliders" />
          </button>
        </div>
      </header>
      <div v-if="toast" class="toast" role="status">
        <AppIcon name="chat" />
        {{ toast }}
      </div>
      <section v-if="activeView === 'chat'" class="page-chat">
        <div class="chat-toolbar">
          <span class="conversation-label">
            {{ messages.length ? '当前对话' : '新对话' }}
            <span v-if="messages.length" class="conversation-count">{{ messages.length }} 条消息</span>
          </span>
          <div class="chat-toolbar-actions">
            <button class="icon-button" @click="clearConversation" aria-label="新对话" title="新对话">
              <AppIcon name="compose" />
            </button>
            <button class="trace-toggle" @click="inspectorDialog.showModal()">
              <AppIcon name="panel" />
              <span>运行详情</span>
            </button>
          </div>
        </div>
        <div class="conversation-layout" :class="{ 'has-conversation': messages.length }">
          <section class="conversation" :class="{ 'is-empty': !messages.length }" aria-label="客服对话">
            <div class="messages" ref="messageList" role="log" aria-label="对话消息" aria-live="polite" :aria-busy="busy && pendingAction === 'chat'">
              <div v-if="!messages.length" class="welcome">
                <div class="welcome-mark" aria-hidden="true">E</div>
                <h1>今天，需要解决什么？</h1>
                <p>从客户问题开始，让合适的 Agent 接手。</p>
              </div>
              <template v-else>
                <article v-for="item in messages" :key="item.id" :class="['message', item.role, { 'message-error': item.error }]">
                  <span v-if="item.role === 'assistant'" class="message-avatar">E</span>
                  <div class="message-content">
                    <div class="message-meta">
                      <strong>{{ item.role === 'user' ? '你' : 'EchoMind' }}</strong>
                      <span v-if="item.error" class="error-label">请求失败</span>
                      <small v-else-if="item.role === 'assistant'">{{ currentBackend.label }} Agent</small>
                    </div>
                    <p>{{ item.content }}</p>
                    <span v-if="item.meta && !item.error" class="agent-tag">
                      <AppIcon name="route" />
                      {{ item.meta }}
                    </span>
                    <details v-if="item.trace?.toolCalls?.length || item.trace?.toolsUsed?.length" class="message-trace">
                      <summary>
                        <AppIcon name="chevron" />
                        <span>工具调用</span>
                        <span class="count-tag">{{ item.trace.toolCalls?.length || 0 }}</span>
                      </summary>
                      <div v-for="(call, index) in item.trace.toolCalls" :key="`${item.id}-${index}`" class="trace-call-item">
                        <div class="trace-call-meta">
                          <strong>{{ call.tool_name || 'unknown_tool' }}</strong>
                          <span :class="call.success ? 'success' : 'danger'">{{ call.success ? '成功' : '失败' }}</span>
                        </div>
                        <pre>{{ formatJson(call.input || {}) }}</pre>
                      </div>
                      <p v-if="!item.trace.toolCalls?.length" class="muted">已调用：{{ item.trace.toolsUsed.join(' · ') }}</p>
                    </details>
                    <button
                      v-if="item.role === 'assistant' && !item.error"
                      class="icon-button copy-button"
                      @click="copyMessage(item.content)"
                      aria-label="复制回复"
                      title="复制回复"
                    >
                      <AppIcon name="copy" />
                    </button>
                  </div>
                </article>
                <div v-if="busy && pendingAction === 'chat'" class="thinking" role="status">
                  <span class="message-avatar">E</span>
                  <span class="thinking-dots">
                    <i></i>
                    <i></i>
                    <i></i>
                  </span>
                  <span>正在处理问题</span>
                </div>
              </template>
            </div>
            <div class="composer-area">
              <form class="composer" @submit.prevent="performAction('chat', sendMessage)">
                <textarea
                  ref="composerInput"
                  v-model="draft"
                  rows="2"
                  aria-label="客户问题"
                  placeholder="输入你的问题…"
                  @keydown.meta.enter.prevent="performAction('chat', sendMessage)"
                  @keydown.ctrl.enter.prevent="performAction('chat', sendMessage)"
                >
                </textarea>
                <div class="composer-bottom">
                  <span class="routing-label">
                    <AppIcon name="route" />
                    自动路由
                  </span>
                  <div class="send-controls">
                    <span class="keyboard-hint">⌘ / Ctrl + Enter</span>
                    <button
                      class="send-button"
                      type="submit"
                      :disabled="busy || !draft.trim()"
                      :aria-label="busy && pendingAction === 'chat' ? '处理中' : '发送'"
                      :title="busy && pendingAction === 'chat' ? '处理中' : '发送'"
                    >
                      <AppIcon :name="busy && pendingAction === 'chat' ? 'refresh' : 'arrow'" :class="{ spinning: busy && pendingAction === 'chat' }" />
                    </button>
                  </div>
                </div>
              </form>
              <div v-if="!messages.length" class="prompt-grid">
                <button v-for="prompt in prompts" :key="prompt.label" @click="usePrompt(prompt.text)">
                  <AppIcon :name="prompt.label === '退款申请' ? 'route' : prompt.label === '技术排查' ? 'sliders' : 'document'" />
                  <span>
                    <strong>{{ prompt.label }}</strong>
                    <small>{{ prompt.label === '退款申请' ? '了解订单与售后流程' : prompt.label === '技术排查' ? '排查登录与使用问题' : '解答开票相关问题' }}</small>
                  </span>
                  <AppIcon class="prompt-arrow" name="northeast" />
                </button>
              </div>
              <p class="composer-note">AI 生成的内容可能不准确，请结合业务规则核实。</p>
            </div>
          </section>
          <aside v-if="messages.length" class="inspector-desktop" aria-label="请求追踪与运行状态">
            <div class="inspector-heading">
              <AppIcon name="panel" />
              <h2>运行详情</h2>
            </div>
            <RequestInspector :last-response="lastResponse" :last-trace="lastTrace" :busy="busy && pendingAction === 'chat'" :monitor-data="monitorData" @refresh="loadMonitor" />
          </aside>
        </div>
      </section>
      <section v-else-if="activeView === 'knowledge'" class="page page-knowledge">
        <div class="page-heading">
          <div class="heading-copy">
            <span class="kicker">KNOWLEDGE OPERATIONS</span>
            <h1>知识库</h1>
            <p>管理业务知识，为每次回答提供依据。</p>
          </div>
          <div class="count-display">
            <strong>{{ knowledgeCount }}</strong>
            <span>知识片段</span>
          </div>
        </div>
        <div class="knowledge-layout">
          <section class="workspace-card search-workspace">
            <div class="card-heading">
              <div>
                <span class="kicker">RETRIEVAL</span>
                <h2>检索知识</h2>
              </div>
              <AppIcon name="search" />
            </div>
            <form class="search-line" @submit.prevent="performAction('search', searchKnowledge)">
              <input v-model="searchQuery" aria-label="检索问题" placeholder="例如：退款多久到账" />
              <button :disabled="busy || !searchQuery.trim()">
                <AppIcon name="search" />
                {{ busy && pendingAction === 'search' ? '检索中' : '搜索' }}
              </button>
            </form>
            <div v-if="searchResults.length" class="result-list">
              <article v-for="(item, index) in searchResults" :key="item.id || index" class="result-item">
                <span class="result-number">{{ String(index + 1).padStart(2, '0') }}</span>
                <div>
                  <div class="result-title">
                    <strong>{{ item.title || '未命名文档' }}</strong>
                    <small>相关度 {{ item.score ?? '—' }}</small>
                  </div>
                  <p>{{ item.content }}</p>
                </div>
              </article>
            </div>
            <div v-else class="workspace-empty">
              <AppIcon name="book" />
              <h3>{{ searched ? '暂未找到相关知识' : '搜索你的知识库' }}</h3>
              <p>{{ searched ? '尝试换一个问题，或添加更多知识文档。' : '输入客户问题，查看最相关的知识片段。' }}</p>
            </div>
          </section>
          <section class="workspace-card import-workspace">
            <div class="card-heading">
              <div>
                <span class="kicker">INGESTION</span>
                <h2>添加知识</h2>
              </div>
              <AppIcon name="document" />
            </div>
            <form @submit.prevent="performAction('import', submitKnowledge)">
              <label>
                <span>文档标题</span>
                <input v-model="docTitle" required placeholder="例如：退款补充政策" />
              </label>
              <label>
                <span>知识内容</span>
                <textarea v-model="docContent" required rows="7" placeholder="输入客服规范、产品说明或排障流程"></textarea>
              </label>
              <div class="side-actions">
                <button :disabled="busy || !docTitle.trim() || !docContent.trim()">
                  <AppIcon name="arrow" />
                  {{ busy && pendingAction === 'import' ? '添加中' : '添加文档' }}
                </button>
                <label class="upload-button" :class="{ disabled: busy }">
                  <AppIcon name="upload" />
                  上传文件
                  <input :disabled="busy" type="file" accept=".txt,.md,.json" @change="performAction('upload', handleUpload, $event)" />
                </label>
              </div>
              <p class="form-hint">支持 TXT、Markdown、JSON，最大 10 MB。</p>
            </form>
          </section>
        </div>
        <section class="workspace-card skills-workspace">
          <div class="card-heading">
            <div>
              <span class="kicker">LOADED SKILLS</span>
              <h2>已加载能力</h2>
            </div>
            <button class="text-button" :disabled="busy" @click="performAction('skills', reloadSkillSet)">
              <AppIcon name="refresh" />
              重新加载
            </button>
          </div>
          <div class="skill-table">
            <div v-for="skill in skillsData.skills" :key="skill.name" class="skill-item">
              <span class="skill-dot"></span>
              <strong>{{ skill.name }}</strong>
              <span>{{ skill.description || '业务规范能力' }}</span>
              <small>{{ skill.content_chars || 0 }} chars</small>
            </div>
            <p v-if="!skillsData.skills?.length" class="skills-empty">暂无已加载能力，连接服务后刷新查看。</p>
          </div>
        </section>
      </section>
      <section v-else class="page page-evaluation">
        <div class="page-heading">
          <div class="heading-copy">
            <span class="kicker">EVALUATION LAB</span>
            <h1>评测中心</h1>
            <p>检查意图识别、回复质量与回归结果。</p>
          </div>
          <button @click="performAction('evaluation', runEvaluation)" :disabled="busy">
            <AppIcon :name="busy && pendingAction === 'evaluation' ? 'refresh' : 'play'" :class="{ spinning: busy && pendingAction === 'evaluation' }" />
            {{ busy && pendingAction === 'evaluation' ? '评测运行中' : '运行评测' }}
          </button>
        </div>
        <div v-if="evalData" class="evaluation-content">
          <div class="evaluation-summary">
            <div class="score-hero">
              <span>PASS RATE · 通过率</span>
              <strong :class="{ 'no-score': evalData.valid_total === 0 }">{{ evalData.valid_total === 0 ? '无有效评分' : formatPercent(evalData.pass_rate) }}</strong>
              <small>{{ evalData.passed }} / {{ evalData.valid_total ?? evalData.total }} 有效用例通过</small>
            </div>
            <div>
              <span>通过用例</span>
              <strong>{{ evalData.passed }}</strong>
            </div>
            <div>
              <span>总数 / 评分失败</span>
              <strong>
                {{ evalData.total }}
                <small> / {{ evalData.evaluation_errors ?? 0 }}</small>
              </strong>
            </div>
            <div>
              <span>回归问题</span>
              <strong :class="evalData.regressions?.length ? 'danger' : 'success'">{{ evalData.regressions?.length || 0 }}</strong>
            </div>
          </div>
          <div class="evaluation-layout">
            <section class="workspace-card">
              <div class="card-heading">
                <div>
                  <span class="kicker">QUALITY SCORES</span>
                  <h2>平均评分</h2>
                </div>
              </div>
              <p v-if="!Object.keys(evalData.avg_scores || {}).length" class="muted">没有有效评分，请查看失败原因。</p>
              <div class="score-list">
                <div v-for="(value, key) in evalData.avg_scores" :key="key">
                  <span>{{ key }}</span>
                  <i>
                    <b :style="{ width: `${Math.max(0, Math.min(Number(value) * 100, 100))}%` }"></b>
                  </i>
                  <strong>{{ Number(value).toFixed(2) }}</strong>
                </div>
              </div>
            </section>
            <section class="workspace-card">
              <div class="card-heading">
                <div>
                  <span class="kicker">RECOMMENDATIONS</span>
                  <h2>优化建议</h2>
                </div>
              </div>
              <p v-if="evalData.regression_note" class="muted">{{ evalData.regression_note }}</p>
              <div v-if="evalData.recommendations?.length" class="recommendations">
                <p v-for="(item, index) in evalData.recommendations" :key="index">{{ item }}</p>
              </div>
              <p v-else class="muted">本次评测没有返回额外建议。</p>
              <div v-for="(result, index) in evalData.regressions || []" :key="index" class="evaluation-warning">
                <strong class="danger">回归问题</strong>
                <p>{{ typeof result === 'string' ? result : formatJson(result) }}</p>
              </div>
              <div v-for="result in (evalData.results || []).filter(item => item.metadata?.judge_failed)" :key="result.test_id" class="evaluation-warning">
                <strong class="danger">{{ result.test_id }}：评分失败</strong>
                <p>{{ result.metadata.judge_error || '模型未返回有效评分' }}</p>
                <small>{{ result.metadata.judge_attempts ?? '—' }} 次尝试</small>
              </div>
            </section>
          </div>
        </div>
        <div v-else class="evaluation-empty">
          <span class="empty-emblem">
            <AppIcon name="chart" />
          </span>
          <h2>{{ busy && pendingAction === 'evaluation' ? '正在检验每一份答案。' : '了解 Agent 的表现' }}</h2>
          <p>{{ busy && pendingAction === 'evaluation' ? '评测需要一些时间，结果返回后会显示在这里。' : '运行一次评测，了解 Agent 的表现与改进空间。' }}</p>
          <div class="evaluation-dimensions">
            <span>意图识别</span>
            <span>回复质量</span>
            <span>回归检测</span>
          </div>
        </div>
      </section>
    </main>
    <dialog ref="inspectorDialog" class="inspector-dialog" @click="closeOnBackdrop" aria-labelledby="inspector-title">
      <div class="drawer-heading">
        <div>
          <AppIcon name="panel" />
          <h2 id="inspector-title">运行详情</h2>
        </div>
        <button class="icon-button" aria-label="关闭运行详情" @click="inspectorDialog.close()">
          <AppIcon name="close" />
        </button>
      </div>
      <RequestInspector :last-response="lastResponse" :last-trace="lastTrace" :busy="busy && pendingAction === 'chat'" :monitor-data="monitorData" @refresh="loadMonitor" />
    </dialog>
    <dialog ref="connectionDialog" class="connection-dialog" @click="closeOnBackdrop" aria-labelledby="connection-title">
      <div class="dialog-heading">
        <div>
          <span class="kicker">CONNECTION</span>
          <h2 id="connection-title">连接配置</h2>
        </div>
        <button class="icon-button" aria-label="关闭连接配置" @click="connectionDialog.close()">
          <AppIcon name="close" />
        </button>
      </div>
      <p class="dialog-description">配置 {{ currentBackend.label }} 服务与当前会话。</p>
      <form @submit.prevent="saveConnection">
        <label>
          <span>服务地址</span>
          <input v-model="connectionDraft.endpoint" required placeholder="/api/python 或 http://localhost:8000" />
          <small>使用代理路径或完整的 HTTP / HTTPS 地址。</small>
        </label>
        <label>
          <span>用户 ID</span>
          <input v-model="connectionDraft.userId" placeholder="u1001" />
        </label>
        <label>
          <span>会话 ID</span>
          <input v-model="connectionDraft.conversationId" placeholder="留空以自动生成" />
        </label>
        <label v-if="settings.backend === 'python'">
          <span>API 访问 Token（启用鉴权时填写，仅本页保存）</span>
          <input v-model="connectionDraft.pythonToken" type="password" autocomplete="off" placeholder="不是模型 API Key" />
        </label>
        <div class="dialog-health">
          <i :class="healthOk ? 'online' : 'offline'"></i>
          <span>{{ healthOk ? '服务已连接' : healthLabel }}</span>
          <button type="button" class="text-button" @click="checkHealth">
            检查当前连接
            <AppIcon name="refresh" />
          </button>
        </div>
        <details v-if="statusText" class="connection-detail">
          <summary>查看连接详情</summary>
          <pre>{{ statusText }}</pre>
        </details>
        <div class="dialog-actions">
          <button type="button" class="quiet-button" @click="connectionDialog.close()">取消</button>
          <button type="submit">
            保存配置
            <AppIcon name="check" />
          </button>
        </div>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  addKnowledge,
  backendMeta,
  createInitialSettings,
  reloadSkills,
  requestChat,
  requestHealth,
  requestKnowledgeStats,
  requestMonitor,
  requestSearch,
  requestToolTrace,
  requestSkills,
  runEvaluation as requestEvaluation,
  saveSettings,
  uploadKnowledge
} from './lib/backends'

import AppIcon from './components/AppIcon.vue'
import RequestInspector from './components/RequestInspector.vue'

import { createRequestState } from './lib/requestState'

const settings = reactive(createInitialSettings())
const requestState = createRequestState(settings)
const activeView = ref('chat')
const messages = ref([])
const draft = ref('')
const busy = ref(false)
const healthOk = ref(false)
const healthLabel = ref('未检查')
const statusText = ref('')
const knowledgeCount = ref('-')
const searchQuery = ref('退款多久能到账')
const searchResults = ref([])
const docTitle = ref('')
const docContent = ref('')
const messageList = ref(null)
const composerInput = ref(null)
const connectionDialog = ref(null)
const inspectorDialog = ref(null)
const connectionDraft = reactive({ endpoint: '', userId: '', conversationId: '', pythonToken: '' })
const pendingAction = ref('')
const searched = ref(false)
const views = [
  { id: 'chat', label: '对话', icon: 'chat' },
  { id: 'knowledge', label: '知识库', icon: 'book' },
  { id: 'evaluation', label: '评测', icon: 'chart' }
]
const prompts = [
  { label: '退款申请', text: '我想申请退款，订单号是 #12345' },
  { label: '技术排查', text: '登录时提示错误，应该怎么排查？' },
  { label: '发票咨询', text: '发票多久可以开具？' }
]
const currentView = computed(() => views.find(view => view.id === activeView.value))
const monitorData = ref({ agent_stats: {}, tool_stats: {}, active_alerts: [], suggestions: [] })
const skillsData = ref({ count: 0, skills: [], errors: [] })
const lastResponse = ref(null)
const lastTrace = ref(null)
const evalData = ref(null)
const toast = ref('')
let toastTimer
let messageSequence = 0

const currentBackend = computed(() => backendMeta(settings.backend, settings))
const docsUrl = computed(() => `${currentBackend.value.baseUrl}/docs`)
const userInitial = computed(() => (settings.userId || 'U').slice(0, 1).toUpperCase())

watch(() => settings.conversationId, persist)
onMounted(refreshConsole)
onBeforeUnmount(() => {
  requestState.invalidate()
  clearTimeout(toastTimer)
})

function persist() { saveSettings(settings) }

function performAction(name, action, ...args) {
  if (busy.value) return
  pendingAction.value = name
  return action(...args)
}

function openConnection() {
  connectionDraft.pythonToken = settings.pythonToken
  connectionDraft.endpoint = currentBackend.value.baseUrl
  connectionDraft.userId = settings.userId
  connectionDraft.conversationId = settings.conversationId
  connectionDialog.value.showModal()
}

function closeOnBackdrop(event) {
  const dialog = event.currentTarget
  if (event.target !== dialog) return
  const rect = dialog.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close()
}

function saveConnection() {
  const endpoint = connectionDraft.endpoint.trim().replace(/\/+$/, '')
  if (!endpoint || !(endpoint.startsWith('/') || /^https?:\/\//i.test(endpoint))) {
    showToast('请输入代理路径或 HTTP / HTTPS 服务地址')
    return
  }
  const changed = connectionDraft.pythonToken !== settings.pythonToken || endpoint !== currentBackend.value.baseUrl || connectionDraft.userId.trim() !== settings.userId || connectionDraft.conversationId.trim() !== settings.conversationId
  if (changed) {
    requestState.invalidate()
    busy.value = false
    messages.value = []
    lastResponse.value = null
    lastTrace.value = null
    searchResults.value = []
    searched.value = false
    evalData.value = null
    monitorData.value = { agent_stats: {}, tool_stats: {}, active_alerts: [], suggestions: [] }
    skillsData.value = { count: 0, skills: [], errors: [] }
    knowledgeCount.value = '—'
    healthOk.value = false
    healthLabel.value = '未检查'
    statusText.value = ''
  }
  const identityChanged = connectionDraft.userId.trim() !== settings.userId || endpoint !== currentBackend.value.baseUrl
  settings.endpoints[settings.backend] = endpoint
  settings.pythonToken = connectionDraft.pythonToken.trim()
  settings.userId = connectionDraft.userId.trim()
  settings.conversationId = identityChanged && connectionDraft.conversationId.trim() === settings.conversationId ? '' : connectionDraft.conversationId.trim()
  persist()
  connectionDialog.value.close()
  refreshConsole()
  showToast('连接配置已保存')
}

async function copyMessage(content) {
  try {
    await navigator.clipboard.writeText(content)
    showToast('回复已复制')
  } catch {
    showToast('复制失败，请手动选择回复文字')
  }
}

function switchBackend(type) {
  if (settings.backend === type) return
  searched.value = false
  requestState.invalidate()
  busy.value = false
  statusText.value = ''
  knowledgeCount.value = '-'
  monitorData.value = { agent_stats: {}, tool_stats: {}, active_alerts: [], suggestions: [] }
  skillsData.value = { count: 0, skills: [], errors: [] }
  evalData.value = null
  settings.backend = type
  persist()
  healthOk.value = false
  healthLabel.value = '未检查'
  messages.value = []
  searchResults.value = []
  lastResponse.value = null
  lastTrace.value = null
  refreshConsole()
}

async function refreshConsole() {
  await Promise.allSettled([checkHealth(), loadStats(), loadMonitor(), loadSkills()])
}

async function checkHealth() {
  const request = requestState.begin('health')

  try {
    const data = await requestHealth(request.backend, request.settings)
    if (!request.isCurrent()) return
    healthOk.value = data.status === 'ok'
    healthLabel.value = data.status || 'ok'
    statusText.value = JSON.stringify(data, null, 2)
  } catch (error) {
    if (!request.isCurrent()) return
    // 健康检查只更新状态，保留用户选择的后端。
    healthOk.value = false
    healthLabel.value = '不可用'
    statusText.value = error.message
  }
}

async function loadStats() {
  const request = requestState.begin('stats')
  try {
    const data = await requestKnowledgeStats(request.backend, request.settings)
    if (!request.isCurrent()) return
    knowledgeCount.value = data.total_chunks ?? data.totalChunks ?? '-'
  } catch {
    if (request.isCurrent()) knowledgeCount.value = '-'
  }
}

async function loadMonitor() {
  const request = requestState.begin('monitor')
  try {
    const data = await requestMonitor(request.backend, request.settings)
    if (request.isCurrent()) monitorData.value = { ...data, loaded: true }
  } catch {
    if (request.isCurrent()) monitorData.value = { agent_stats: {}, tool_stats: {}, active_alerts: [], suggestions: [] }
  }
}

async function loadSkills() {
  const request = requestState.begin('skills')
  try {
    const data = await requestSkills(request.backend, request.settings)
    if (request.isCurrent()) skillsData.value = data
  } catch {
    if (request.isCurrent()) skillsData.value = { count: 0, skills: [], errors: [] }
  }
}

async function reloadSkillSet() {
  const request = requestState.begin('action')
  busy.value = true
  try {
    const data = await reloadSkills(request.backend, request.settings)
    if (!request.isCurrent()) return
    skillsData.value = data
    showToast('Skills 已重新加载')
  } catch (error) {
    if (!request.isCurrent()) return
    statusText.value = error.message
    showToast('Skills 加载失败')
  } finally { if (request.isCurrent()) busy.value = false }
}

async function sendMessage() {
  const content = draft.value.trim()
  if (!content || busy.value) return
  messages.value.push({ id: createMessageId(), role: 'user', content })
  draft.value = ''
  lastResponse.value = null
  lastTrace.value = null
  nextTick(() => messageList.value?.scrollTo({ top: messageList.value.scrollHeight, behavior: 'smooth' }))
  const request = requestState.begin('action')
  busy.value = true
  try {
    const response = await requestChat(request.backend, request.settings, content)
    if (!request.isCurrent()) return
    if (response.conversationId && !settings.conversationId) {
      settings.conversationId = response.conversationId
      persist()
    }
    const trace = await loadToolTrace(response.requestId, request)
    if (!request.isCurrent()) return
    lastResponse.value = response
    lastTrace.value = trace
    const meta = [response.intent, response.primaryAgent || response.agentType, response.knowledgeUsed ? 'RAG' : '', response.escalated ? '转人工' : ''].filter(Boolean).join(' · ')
    messages.value.push({ id: createMessageId(), role: 'assistant', content: response.response, meta, trace: lastTrace.value?.trace || null })
    await loadMonitor()
  } catch (error) {
    if (!request.isCurrent()) return
    messages.value.push({ id: createMessageId(), role: 'assistant', content: error.message, meta: '请求失败', error: true })
  } finally {
    if (!request.isCurrent()) return
    busy.value = false
    await nextTick()
    messageList.value?.scrollTo({ top: messageList.value.scrollHeight, behavior: 'smooth' })
  }
}

function usePrompt(prompt) { draft.value = prompt; nextTick(() => composerInput.value?.focus()) }

function clearConversation() {
  requestState.invalidate()
  busy.value = false
  messages.value = []
  lastResponse.value = null
  lastTrace.value = null
  settings.conversationId = ''
  persist()
}

async function searchKnowledge() {
  if (!searchQuery.value.trim() || busy.value) return
  const request = requestState.begin('action')
  busy.value = true
  try {
    const data = await requestSearch(request.backend, request.settings, searchQuery.value, 5)
    if (!request.isCurrent()) return
    searchResults.value = data.results || []
    searched.value = true
    showToast(`检索完成，返回 ${searchResults.value.length} 条结果`)
  } catch (error) {
    if (!request.isCurrent()) return
    statusText.value = error.message
    showToast('检索失败，请检查连接')
  } finally { if (request.isCurrent()) busy.value = false }
}

async function submitKnowledge() {
  if (!docTitle.value.trim() || !docContent.value.trim() || busy.value) return
  const request = requestState.begin('action')
  busy.value = true
  try {
    const data = await addKnowledge(request.backend, request.settings, [{ title: docTitle.value.trim(), content: docContent.value.trim() }])
    if (!request.isCurrent()) return
    statusText.value = JSON.stringify(data, null, 2)
    await loadStats()
    if (!request.isCurrent()) return
    showToast('文档已添加')
  } catch (error) {
    if (!request.isCurrent()) return
    statusText.value = error.message
    showToast('文档导入失败')
  } finally { if (request.isCurrent()) busy.value = false }
}

async function handleUpload(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || busy.value) return
  if (file.size > 10 * 1024 * 1024) { showToast('文件不能超过 10 MB'); return }
  const request = requestState.begin('action')
  busy.value = true
  try {
    const data = await uploadKnowledge(request.backend, request.settings, file)
    if (!request.isCurrent()) return
    statusText.value = JSON.stringify(data, null, 2)
    await loadStats()
    if (!request.isCurrent()) return
    showToast(`${file.name} 导入成功`)
  } catch (error) {
    if (!request.isCurrent()) return
    statusText.value = error.message
    showToast('文件导入失败')
  } finally { if (request.isCurrent()) busy.value = false }
}

async function runEvaluation() {
  const request = requestState.begin('action')
  busy.value = true
  try {
    const data = await requestEvaluation(request.backend, request.settings, null, {
      isCurrent: request.isCurrent,
      onProgress: job => {
        if (request.isCurrent()) statusText.value = `评测任务 ${job.job_id}：${job.status === 'queued' ? '排队中' : '运行中'}，已完成 ${job.completed}/${job.total} 组`
      }
    })
    if (!request.isCurrent()) return
    evalData.value = data
    showToast(data.status === 'failed' ? '评测执行失败，请查看结果' : data.status === 'partial' ? '评测部分完成，请查看失败原因' : '评测完成')
  } catch (error) {
    if (!request.isCurrent()) return
    statusText.value = error.message
    showToast('评测运行失败')
  } finally { if (request.isCurrent()) busy.value = false }
}

async function loadToolTrace(requestId, request = requestState.begin('trace')) {
  try {
    return await requestToolTrace(request.backend, request.settings, requestId)
  } catch {
    return null
  }
}

function formatPercent(value) {
  const number = Number(value || 0)
  return `${(number <= 1 ? number * 100 : number).toFixed(1)}%`
}

function formatJson(value) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return String(value ?? '')
  }
}

function createMessageId() {
  messageSequence += 1
  return `message-${Date.now()}-${messageSequence}`
}

function showToast(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2600)
}
</script>
