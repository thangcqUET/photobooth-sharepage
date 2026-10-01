<template>
  <q-page class="event-page">

    <!-- Fatal error: manifest unreachable after max retries -->
    <div v-if="loadingPhase === 'error_fatal'" class="state-view">
      <div class="state-icon">&#x1F4E1;</div>
      <div class="state-text">{{ fatalErrorText }}</div>
      <div class="state-sub">{{ fatalErrorSub }}</div>
      <q-btn rounded unelevated color="grey-8" text-color="white" label="Thử lại" @click="restartLoading" />
    </div>

    <div v-show="loadingPhase !== 'error_fatal'" class="gallery-view">

      <!-- Header -->
      <header class="gallery-header">
        <template v-if="brandLoaded">
          <img v-if="brand.logo.image_url" :src="brand.logo.image_url" :style="{ width: brand.logo.width + 'px', height: brand.logo.height + 'px' }" class="header-logo" />
          <div class="header-brand">
            <div v-if="brand.partner_name" class="header-partner">{{ brand.partner_name }}</div>
            <div class="header-name">{{ brand.brand_name }}</div>
          </div>
        </template>
        <template v-else>
          <div class="header-logo-placeholder shimmer" style="width:48px;height:48px;border-radius:12px;flex-shrink:0;" />
          <div class="header-brand">
            <div class="header-partner"><span class="shimmer" style="display:inline-block;width:120px;height:20px;border-radius:4px;" /></div>
            <div class="header-name"><span class="shimmer" style="display:inline-block;width:80px;height:14px;border-radius:4px;" /></div>
          </div>
        </template>
      </header>

      <!-- Event title + bulk download -->
      <div class="event-title">
        <div class="event-name">{{ manifest?.event.name || 'Sự kiện' }}</div>
        <div v-if="manifest" class="event-meta">{{ formatDate(manifest.event.started_at) }} · {{ totalItems }} mục</div>
        <div v-if="manifest?.event.description" class="event-description">{{ manifest.event.description }}</div>

        <!-- Bulk zip download: one part or several parts -->
        <div v-if="manifestLoaded && totalItems > 0" class="bulk-section">
          <template v-if="zipParts.length <= 1">
            <a v-if="zipState[0]?.url" class="btn-download btn-download-wide" :href="zipState[0].url" :download="zipState[0].filename">
              <DownloadIcon /> Tải tất cả file · {{ humanSize(totalSize) }}
            </a>
            <button v-else class="btn-download btn-download-wide" :disabled="zipState[0]?.state === 'building'" @click="prepareZip(0)">
              <q-spinner-dots v-if="zipState[0]?.state === 'building'" size="18px" />
              <PackageIcon v-else />
              {{ zipState[0]?.state === 'building' ? `Đang chuẩn bị file... ${zipState[0]?.progress ?? 0}/${allItems.length}` : `Chuẩn bị file · ${humanSize(totalSize)}` }}
            </button>
            <div v-if="zipState[0]?.state === 'building'" class="zip-hint">Đang chuẩn bị file, vui lòng đợi rồi bấm “Tải tất cả file”.</div>
            <div v-if="zipError[0]" class="zip-error">{{ zipError[0] }}</div>
          </template>

          <template v-else>
            <div class="zip-parts-label">File lớn — tải theo từng phần ({{ zipParts.length }} phần):</div>
            <div class="zip-parts">
              <div v-for="(part, idx) in zipParts" :key="idx" class="zip-part">
                <a v-if="zipState[idx]?.url" class="btn-download" :href="zipState[idx].url" :download="zipState[idx].filename">
                  <DownloadIcon /> Tải phần {{ idx + 1 }} · {{ humanSize(partSize(part)) }}
                </a>
                <button v-else class="btn-download" :disabled="zipState[idx]?.state === 'building'" @click="prepareZip(idx)">
                  <q-spinner-dots v-if="zipState[idx]?.state === 'building'" size="18px" />
                  <PackageIcon v-else />
                  {{ zipState[idx]?.state === 'building' ? `Đang chuẩn bị phần ${idx + 1}... ${zipState[idx]?.progress ?? 0}/${part.length}` : `Chuẩn bị phần ${idx + 1} · ${humanSize(partSize(part))}` }}
                </button>
                <div v-if="zipError[idx]" class="zip-error">{{ zipError[idx] }}</div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="!manifestLoaded" class="grid">
        <div v-for="n in 4" :key="'skel-' + n" class="grid-card">
          <div class="shimmer" style="width:100%;aspect-ratio:1;border-radius:10px;" />
        </div>
      </div>

      <!-- Session collage list -->
      <template v-else>
        <div v-for="(session, si) in sessions" :key="session.job_identifier" class="session-card">
          <!-- Collage representative (lazy loaded) -->
          <div class="collage-wrap">
            <video
              v-if="repFor(session).media_type === 'video'"
              :src="mediaUrl(repFor(session))"
              :poster="repFor(session).thumbnail ? './' + repFor(session).thumbnail : undefined"
              controls
              muted
              playsinline
              preload="metadata"
              class="collage-media"
            />
            <template v-else>
              <div v-if="getImageState(repFor(session)) === 'loading'" class="img-placeholder shimmer" />
              <div v-else-if="getImageState(repFor(session)) === 'placeholder'" class="img-placeholder">
                <span>Đang đồng bộ...</span>
                <q-btn size="xs" flat dense label="Thử lại" @click="retryImage(repFor(session))" />
              </div>
              <img
                v-show="getImageState(repFor(session)) !== 'placeholder'"
                :src="mediaUrl(repFor(session))"
                :data-img-id="repFor(session).id"
                class="collage-media"
                loading="lazy"
                @load="onImgLoaded(repFor(session))"
                @error="onImgError(repFor(session))"
              />
            </template>
          </div>

          <div class="session-meta">
            <span class="session-label">Lượt chụp {{ sessions.length - si }}</span>
            <span v-if="session.created_at" class="session-time">{{ formatTime(session.created_at) }}</span>
          </div>

          <div class="session-actions">
            <a class="btn-download" :href="mediaUrl(repFor(session))" :download="downloadName(repFor(session))" @click="onDownloadClick($event, repFor(session))">
              <DownloadIcon /> Tải
            </a>
            <button class="btn-secondary" @click="toggleDetails(session.job_identifier)">
              {{ isExpanded(session.job_identifier) ? 'Thu gọn' : `Xem chi tiết (${session.items.length})` }}
            </button>
          </div>

          <!-- Details: all items of the session -->
          <div v-if="isExpanded(session.job_identifier)" class="details-grid">
            <div v-for="item in session.items" :key="item.id" class="detail-card">
              <video
                v-if="item.media_type === 'video'"
                :src="mediaUrl(item)"
                :poster="item.thumbnail ? './' + item.thumbnail : undefined"
                controls
                muted
                playsinline
                preload="metadata"
                class="detail-media"
              />
              <template v-else>
                <div v-if="getImageState(item) === 'loading'" class="img-placeholder shimmer" />
                <div v-else-if="getImageState(item) === 'placeholder'" class="img-placeholder">
                  <span>Đang đồng bộ...</span>
                  <q-btn size="xs" flat dense label="Thử lại" @click="retryImage(item)" />
                </div>
                <img
                  v-show="getImageState(item) !== 'placeholder'"
                  :src="mediaUrl(item)"
                  :data-img-id="item.id"
                  class="detail-media"
                  loading="lazy"
                  @load="onImgLoaded(item)"
                  @error="onImgError(item)"
                />
              </template>
              <a class="btn-download btn-download-small" :href="mediaUrl(item)" :download="downloadName(item)" @click="onDownloadClick($event, item)">
                <DownloadIcon /> Tải
              </a>
            </div>
          </div>
        </div>

        <div v-if="totalItems === 0" class="state-sub" style="padding:24px 4px;text-align:center;">Chưa có ảnh trong sự kiện này.</div>

        <div v-if="pendingImageCount > 0" class="sync-status">
          <q-spinner-dots color="grey-5" size="16px" />
          <span>{{ pendingImageCount }} ảnh đang được đồng bộ...</span>
        </div>
      </template>

      <!-- Footer -->
      <footer class="gallery-footer">
        <div v-if="brandLoaded" class="footer-social">
          <a v-if="brand.social.facebook" :href="fixUrl(brand.social.facebook)" target="_blank" rel="noopener" class="footer-link">Facebook</a>
          <a v-if="brand.social.instagram" :href="fixUrl(brand.social.instagram)" target="_blank" rel="noopener" class="footer-link">Instagram</a>
          <a v-if="brand.social.tiktok" :href="fixUrl(brand.social.tiktok)" target="_blank" rel="noopener" class="footer-link">TikTok</a>
          <a v-if="brand.social.website" :href="fixUrl(brand.social.website)" target="_blank" rel="noopener" class="footer-link">Website</a>
        </div>
        <div class="footer-text">{{ brandLoaded ? brand.footer_text : '&nbsp;' }}</div>
      </footer>
    </div>

    <div class="version-badge">{{ BUILD_TIME }}</div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, h } from 'vue'
import { useRoute } from 'vue-router'
import { buildZip, ensureSizes, humanSize, partSize, splitIntoParts, type ZipItem } from '../util/downloadZip'

declare global { interface Window { dataLayer?: Record<string, unknown>[] } }

const BUILD_TIME = __BUILD_TIME__
const route = useRoute()

const eventId = computed(() => (route.query.event as string) || null)

function fixUrl(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

interface EventManifestItem extends ZipItem {
  urls?: string[]
}

interface EventManifestSession {
  job_identifier: string
  created_at: string | null
  items: EventManifestItem[]
}

interface EventManifest {
  event: { id: string; name: string; description?: string; status: string; started_at: string; ended_at: string | null }
  sessions: EventManifestSession[]
}

interface BrandData {
  brand_name: string
  partner_name: string
  logo: { image_url: string; width: number; height: number }
  social: { facebook: string; instagram: string; tiktok: string; website: string }
  footer_text: string
}

const DEFAULT_BRAND: BrandData = {
  brand_name: 'Mộc Photobooth',
  partner_name: '',
  logo: { image_url: '', width: 48, height: 48 },
  social: { facebook: '', instagram: '', tiktok: '', website: '' },
  footer_text: 'Powered by Mộc Photobooth',
}

const brand = ref<BrandData>({ ...DEFAULT_BRAND })
const brandLoaded = ref(false)

const manifest = ref<EventManifest | null>(null)
const manifestLoaded = ref(false)
const loadingPhase = ref<'skeleton' | 'retrying' | 'gallery' | 'error_fatal'>('skeleton')
const retryCount = ref(0)
const MAX_RETRIES = 40
const POLL_INTERVAL_MS = 3000
let refreshTimer: ReturnType<typeof setInterval> | null = null

type ImageState = 'loading' | 'loaded' | 'placeholder'
const imageStates = ref<Record<string, { state: ImageState; retries: number }>>({})
const IMAGE_MAX_RETRIES = 3
const IMAGE_RETRY_DELAYS = [2000, 5000, 10000]

const fatalErrorText = ref('')
const fatalErrorSub = ref('')

const expanded = ref<Record<string, boolean>>({})

type ZipPartState = { state: 'idle' | 'building' | 'ready'; progress: number; url?: string; filename?: string }
const zipState = ref<Record<number, ZipPartState>>({})
const zipError = ref<Record<number, string>>({})
const objectUrls: string[] = []

const sessions = computed<EventManifestSession[]>(() => manifest.value?.sessions ?? [])
const allItems = computed<EventManifestItem[]>(() => sessions.value.flatMap((s) => s.items))
const totalItems = computed(() => allItems.value.length)
const totalSize = computed(() => allItems.value.reduce((sum, item) => sum + (item.size ?? 0), 0))
const zipParts = computed(() => splitIntoParts(allItems.value as ZipItem[]))

const pendingImageCount = computed(() => {
  if (!manifestLoaded.value) return 0
  return allItems.value.filter((item) => item.media_type !== 'video' && getImageState(item) !== 'loaded').length
})

const DownloadIcon = () => h('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true' }, [
  h('path', { d: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z' }),
])

const PackageIcon = () => h('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true' }, [
  h('path', { d: 'M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z' }),
])

function isExpanded(id: string): boolean {
  return expanded.value[id] === true
}

function toggleDetails(id: string) {
  expanded.value[id] = !expanded.value[id]
}

function repFor(session: EventManifestSession): EventManifestItem {
  const rep =
    session.items.find((i) => i.media_type === 'collage' || i.media_type === 'animation') ??
    session.items.find((i) => i.media_type === 'image') ??
    session.items[0]
  return rep as EventManifestItem
}

function getImageState(item: EventManifestItem): ImageState {
  return imageStates.value[item.id]?.state ?? 'loading'
}

function initImageState(item: EventManifestItem) {
  if (!(item.id in imageStates.value)) {
    imageStates.value[item.id] = { state: 'loading', retries: 0 }
  }
}

function formatDate(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('vi-VN')
}

function formatTime(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

async function loadBrand() {
  try {
    const resp = await fetch(`brand/brand.json?v=${Date.now()}`)
    if (resp.ok) {
      const data = await resp.json()
      if (data.logo?.image_url) data.logo.image_url = `brand/${data.logo.image_url.split('/').pop()}`
      brand.value = { ...DEFAULT_BRAND, ...data, social: { ...DEFAULT_BRAND.social, ...(data.social || {}) } }
    }
  } catch { /* brand.json not available, use defaults */ }
  brandLoaded.value = true
}

async function fetchEvent() {
  if (!eventId.value) return
  try {
    const resp = await fetch(`events/event_${eventId.value}.json`)

    if (resp.ok) {
      const data = (await resp.json()) as EventManifest
      const items = data.sessions?.flatMap((s) => s.items) ?? []
      if (items.length > 0 || (data.event && data.sessions)) {
        manifest.value = data
        manifestLoaded.value = true
        loadingPhase.value = 'gallery'
        for (const item of items) initImageState(item)
        if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
        void ensureSizes(items as ZipItem[])
        return
      }
      loadingPhase.value = 'retrying'
      retryCount.value++
      return
    }

    if (resp.status === 404 || resp.status === 403) {
      if (retryCount.value < MAX_RETRIES) {
        loadingPhase.value = 'retrying'
        retryCount.value++
        fatalErrorText.value = 'Ảnh đang được đồng bộ lên máy chủ...'
        fatalErrorSub.value = `Vui lòng đợi (đã thử ${retryCount.value}/${MAX_RETRIES} lần)`
      } else {
        loadingPhase.value = 'error_fatal'
        fatalErrorText.value = 'Không thể tải ảnh'
        fatalErrorSub.value = 'Sự kiện chưa được xuất bản hoặc ảnh đang xử lý, vui lòng thử lại sau.'
        stopPolling()
      }
      return
    }

    throw new Error(`HTTP ${resp.status}`)
  } catch (err) {
    if (retryCount.value < MAX_RETRIES) {
      loadingPhase.value = 'retrying'
      retryCount.value++
      fatalErrorText.value = 'Đang kết nối...'
      fatalErrorSub.value = `Vui lòng đợi (đã thử ${retryCount.value}/${MAX_RETRIES} lần)`
    } else {
      loadingPhase.value = 'error_fatal'
      fatalErrorText.value = 'Không thể kết nối'
      fatalErrorSub.value = 'Vui lòng kiểm tra kết nối mạng và thử lại.'
      void err
      stopPolling()
    }
  }
}

function mediaUrl(item: EventManifestItem): string {
  return `./${item.path}`
}

function downloadName(item: EventManifestItem): string {
  return item.path.split('/').pop() || `moc-${item.id}.jpg`
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** iOS: keep the share sheet (save to Photos); other platforms let the real <a download> handle it. */
function onDownloadClick(event: MouseEvent, item: EventManifestItem) {
  if (!isIOS()) return
  event.preventDefault()
  void shareFile(mediaUrl(item), downloadName(item))
}

async function shareFile(url: string, name: string) {
  try {
    const resp = await fetch(url)
    const blob = await resp.blob()
    const file = new File([blob], name, { type: blob.type || 'image/jpeg' })
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] })
      return
    }
  } catch { /* fall through */ }
  window.open(url, '_blank')
}

async function prepareZip(partIndex: number) {
  const part = zipParts.value[partIndex]
  if (!part) return

  zipState.value[partIndex] = { state: 'building', progress: 0 }
  delete zipError.value[partIndex]

  try {
    const { data, failed } = await buildZip(part, (done) => {
      zipState.value[partIndex] = { state: 'building', progress: done }
    })

    const blob = new Blob([data as BlobPart], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    objectUrls.push(url)
    const suffix = zipParts.value.length > 1 ? `_part${partIndex + 1}` : ''
    const filename = `moc-event_${eventId.value ?? 'event'}${suffix}.zip`
    zipState.value[partIndex] = { state: 'ready', progress: part.length, url, filename }
    if (failed > 0) zipError.value[partIndex] = `${failed} tệp không tải được và đã bỏ qua.`
  } catch (err) {
    console.error('zip build failed', err)
    zipState.value[partIndex] = { state: 'idle', progress: 0 }
    zipError.value[partIndex] = 'Không tạo được ZIP, vui lòng thử lại.'
  }
}

function onImgLoaded(item: EventManifestItem) {
  imageStates.value[item.id] = { state: 'loaded', retries: 0 }
}

function onImgError(item: EventManifestItem) {
  const current = imageStates.value[item.id]
  if (!current) return

  const nextRetry = current.retries + 1

  if (nextRetry <= IMAGE_MAX_RETRIES) {
    imageStates.value[item.id] = { state: 'loading', retries: nextRetry }
    const delay = IMAGE_RETRY_DELAYS[nextRetry - 1] || 10000
    setTimeout(() => {
      const el = document.querySelector<HTMLImageElement>(`img[data-img-id="${item.id}"]`)
      if (el) el.src = mediaUrl(item) + '?retry=' + Date.now()
    }, delay)
  } else {
    imageStates.value[item.id] = { state: 'placeholder', retries: nextRetry }
  }
}

function retryImage(item: EventManifestItem) {
  imageStates.value[item.id] = { state: 'loading', retries: 0 }
  const el = document.querySelector<HTMLImageElement>(`img[data-img-id="${item.id}"]`)
  if (el) el.src = mediaUrl(item) + '?retry=' + Date.now()
}

function restartLoading() {
  retryCount.value = 0
  loadingPhase.value = 'skeleton'
  manifestLoaded.value = false
  manifest.value = null
  imageStates.value = {}
  if (!refreshTimer) {
    void fetchEvent()
    refreshTimer = setInterval(() => { if (!manifestLoaded.value) void fetchEvent() }, POLL_INTERVAL_MS)
  }
}

function stopPolling() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
}

onMounted(async () => {
  await loadBrand()
  if (eventId.value) {
    void fetchEvent()
    refreshTimer = setInterval(() => { if (!manifestLoaded.value) void fetchEvent() }, POLL_INTERVAL_MS)
  }
})

onBeforeUnmount(() => {
  stopPolling()
  for (const url of objectUrls) URL.revokeObjectURL(url)
})
</script>

<style scoped>
.event-page {
  background: #F0F4F8;
  color: #2D2D2D;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.state-view {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100vh; gap: 12px; padding: 24px; text-align: center;
}
.state-icon { font-size: 64px; opacity: 0.6; }
.state-text { font-size: 1rem; font-weight: 500; opacity: 0.7; }
.state-sub { font-size: 0.8rem; opacity: 0.45; color: #6B8299; }

.shimmer {
  background: linear-gradient(90deg, #e2e8f0 25%, #f0f4f8 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.gallery-view { max-width: 640px; margin: 0 auto; padding: 24px 16px 40px; }

.gallery-header {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  background: rgba(255,255,255,0.7); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  border-radius: 16px; border: 1px solid rgba(0,0,0,0.05);
  padding: 16px 20px; margin-bottom: 16px;
  box-shadow: 0 2px 16px rgba(169,204,227,0.15);
}
.header-logo { border-radius: 12px; object-fit: contain; flex-shrink: 0; }
.header-brand { text-align: left; }
.header-partner { font-size: 1.2rem; font-weight: 700; line-height: 1.2; }
.header-name { font-size: 0.75rem; font-weight: 400; color: #6B8299; line-height: 1.3; }

.event-title { text-align: center; margin-bottom: 20px; }
.event-name { font-size: 1.3rem; font-weight: 700; }
.event-meta { font-size: 0.8rem; color: #6B8299; margin-top: 4px; }
.event-description { font-size: 0.92rem; color: #4B5563; margin-top: 8px; white-space: pre-line; }

/* ── Buttons ── */
.btn-download {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 14px 26px; border: none; border-radius: 26px;
  background: linear-gradient(135deg, #A9CCE3, #FED7C3);
  color: #2D2D2D; font-size: 1rem; font-weight: 700;
  cursor: pointer; transition: all .2s; text-decoration: none;
  box-shadow: 0 2px 16px rgba(169,204,227,0.35);
}
.btn-download svg { flex-shrink: 0; }
.btn-download:active { opacity: 0.85; transform: scale(0.97); }
.btn-download:disabled { opacity: 0.7; cursor: wait; }
.btn-download-wide { width: 100%; }
.btn-download-small { padding: 10px 18px; font-size: 0.9rem; width: 100%; margin-top: 8px; }

.btn-secondary {
  padding: 14px 22px; border: 1px solid rgba(169,204,227,0.5); border-radius: 26px;
  background: rgba(255,255,255,0.7); color: #2D2D2D; font-size: 0.95rem; font-weight: 600;
  cursor: pointer; transition: all .2s;
}
.btn-secondary:active { background: rgba(169,204,227,0.25); }

/* ── Bulk zip ── */
.bulk-section { margin-top: 14px; }
.zip-parts-label { font-size: 0.8rem; color: #6B8299; margin-bottom: 8px; }
.zip-parts { display: flex; flex-direction: column; gap: 8px; }
.zip-part { display: flex; flex-direction: column; align-items: stretch; }
.zip-hint { color: #6B8299; font-size: 0.75rem; margin-top: 6px; text-align: center; }
.zip-error { color: #B23A3A; font-size: 0.75rem; margin-top: 4px; }

/* ── Session card ── */
.session-card {
  background: #fff; border-radius: 16px; padding: 12px; margin-bottom: 18px;
  box-shadow: 0 2px 14px rgba(169,204,227,0.16);
}
.collage-wrap { border-radius: 12px; overflow: hidden; background: #e8ecf1; }
.collage-media { width: 100%; height: auto; display: block; background: #e8ecf1; }
.img-placeholder {
  width: 100%; min-height: 180px; display: flex; flex-direction: column; gap: 4px;
  align-items: center; justify-content: center; color: #6B8299; font-size: 0.75rem; text-align: center; padding: 8px; box-sizing: border-box;
}
.session-meta { display: flex; align-items: baseline; gap: 8px; margin: 10px 4px 8px; }
.session-label { font-size: 0.85rem; font-weight: 700; letter-spacing: 0.3px; color: #2D2D2D; text-transform: uppercase; }
.session-time { font-size: 0.78rem; color: #6B8299; }
.session-actions { display: flex; gap: 10px; }
.session-actions .btn-download { flex: 1; }
.session-actions .btn-secondary { flex: 1; }

/* ── Details grid ── */
.details-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;
  margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(169,204,227,0.5);
}
.detail-card { display: flex; flex-direction: column; }
.detail-media { width: 100%; height: auto; border-radius: 10px; display: block; background: #e8ecf1; }

.sync-status {
  display: flex; align-items: center; gap: 8px; justify-content: center;
  padding: 10px 12px; margin-top: 12px; background: rgba(255,255,255,0.6);
  border-radius: 10px; font-size: 0.78rem; color: #6B8299;
}

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.grid-card { position: relative; background: #fff; border-radius: 12px; padding: 6px; box-shadow: 0 2px 12px rgba(169,204,227,0.12); }

.gallery-footer {
  padding: 24px 0 32px; margin-top: 16px; text-align: center;
  border-top: 1px solid rgba(169,204,227,0.2);
}
.footer-social { display: flex; gap: 20px; justify-content: center; margin-bottom: 10px; }
.footer-link { color: #6B8299; text-decoration: none; font-size: 0.85rem; font-weight: 500; }
.footer-link:active { color: #2D2D2D; }
.footer-text { font-size: 0.7rem; opacity: 0.3; color: #6B8299; }

.version-badge {
  position: fixed; bottom: 4px; right: 6px; font-size: 10px;
  color: rgba(0,0,0,0.12); z-index: 9999; pointer-events: none;
}
</style>
