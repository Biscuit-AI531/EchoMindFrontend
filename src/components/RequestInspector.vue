<template>
  <div class="request-inspector">
    <section class="inspector-section">
      <div class="inspector-section-heading">
        <h3>请求追踪</h3>
        <span class="state-label">
          <i :class="{ working: busy, complete: lastResponse && !busy }"></i>
          {{ busy ? '处理中' : lastResponse ? '已完成' : '待开始' }}
        </span>
      </div>
      <p class="inspector-intro">{{ busy ? '正在等待服务返回处理结果。' : lastResponse ? '本次请求的处理路径与路由结果。' : '发送一条消息，查看 Agent 的处理过程。' }}</p>
      <ol class="trace-steps" :class="{ complete: lastResponse && !busy }">
        <li>
          <span class="trace-step-icon">
            <AppIcon name="search" />
          </span>
          <div>
            <strong>意图识别</strong>
            <p>{{ lastResponse?.intent || '理解客户的问题' }}</p>
          </div>
        </li>
        <li>
          <span class="trace-step-icon">
            <AppIcon name="book" />
          </span>
          <div>
            <strong>知识检索</strong>
            <p>{{ lastResponse ? lastResponse.knowledgeUsed ? '已使用知识库' : '未使用知识库' : '查找相关业务知识' }}</p>
          </div>
        </li>
        <li>
          <span class="trace-step-icon">
            <AppIcon name="route" />
          </span>
          <div>
            <strong>Agent 路由</strong>
            <p>{{ lastResponse ? lastResponse.primaryAgent || lastResponse.agentType || '未返回 Agent' : '分配给合适的 Agent' }}</p>
          </div>
        </li>
        <li>
          <span class="trace-step-icon">
            <AppIcon name="chat" />
          </span>
          <div>
            <strong>生成回复</strong>
            <p>{{ busy ? '等待回复' : lastResponse ? lastResponse.escalated ? '已转人工处理' : '回复已生成' : '等待新的请求' }}</p>
          </div>
        </li>
      </ol>
      <div class="request-metrics">
        <div>
          <span>响应耗时</span>
          <strong>
            {{ lastResponse ? lastResponse.latencyMs : '—' }}
            <small v-if="lastResponse"> ms</small>
          </strong>
        </div>
        <div>
          <span>路由置信度</span>
          <strong>{{ lastResponse ? formatPercent(lastResponse.routingConfidence) : '—' }}</strong>
        </div>
      </div>
      <p v-if="lastResponse?.routingReason" class="routing-note">{{ lastResponse.routingReason }}</p>
      <details v-if="lastTrace?.trace" class="inspector-tools">
        <summary>
          <span>工具调用</span>
          <span class="count-tag">{{ lastTrace.trace.toolCalls?.length || 0 }}</span>
          <AppIcon name="chevron" />
        </summary>
        <div v-for="(call, index) in lastTrace.trace.toolCalls" :key="index" class="trace-call-item">
          <div class="trace-call-meta">
            <strong>{{ call.tool_name }}</strong>
            <span>{{ call.latency_ms ?? '—' }} ms</span>
          </div>
          <pre>{{ formatJson(call.input || {}) }}</pre>
        </div>
        <p v-if="!lastTrace.trace.toolCalls?.length" class="muted">{{ lastTrace.trace.toolsUsed?.length ? lastTrace.trace.toolsUsed.join(' · ') : '本次没有记录到工具输入。' }}</p>
      </details>
    </section>
    <section class="inspector-section">
      <div class="inspector-section-heading">
        <h3>运行状态</h3>
        <button class="icon-button" @click="$emit('refresh')" aria-label="刷新运行状态" title="刷新运行状态">
          <AppIcon name="refresh" />
        </button>
      </div>
      <div class="runtime-metrics">
        <div>
          <span>请求</span>
          <strong>{{ monitorData.loaded ? totalRequests : '—' }}</strong>
        </div>
        <div>
          <span>Agent</span>
          <strong>{{ monitorData.loaded ? agentCount : '—' }}</strong>
        </div>
        <div>
          <span>告警</span>
          <strong :class="{ danger: activeAlerts.length }">{{ monitorData.loaded ? activeAlerts.length : '—' }}</strong>
        </div>
      </div>
      <p v-if="activeAlerts.length" class="alert-note">
        <AppIcon name="alert" />
        {{ activeAlerts[0].detail || activeAlerts[0].title }}
      </p>
      <p v-else class="runtime-note">{{ monitorData.loaded ? '当前没有活跃告警' : '连接服务后查看运行状态' }}</p>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  lastResponse: { type: Object, default: null },
  lastTrace: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  monitorData: { type: Object, required: true }
})
defineEmits(['refresh'])
const activeAlerts = computed(() => props.monitorData.active_alerts || [])
const agentCount = computed(() => Object.keys(props.monitorData.agent_stats || {}).length)
const totalRequests = computed(() => Object.values(props.monitorData.agent_stats || {}).reduce((sum, item) => sum + Number(item.total || 0), 0))
function formatPercent(value) {
  const number = Number(value || 0)
  return `${(number <= 1 ? number * 100 : number).toFixed(1)}%`
}
function formatJson(value) { return JSON.stringify(value ?? {}, null, 2) }
</script>
