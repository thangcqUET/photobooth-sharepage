<template>
  <q-page class="session-page">

    <!-- Loading -->
    <div v-if="sessionLoading" class="state-view">
      <q-spinner-dots color="grey-6" size="60px" />
      <div class="state-text">{{ brand.messages.downloading || $t('MSG_LOADING') }}</div>
    </div>

    <!-- Error -->
    <div v-else-if="sessionError" class="state-view">
      <div class="state-icon">:|</div>
      <div class="state-text">{{ $t('MSG_SOMETHING_WRONG') }}</div>
      <div class="state-sub">{{ sessionError }}</div>
      <q-btn rounded unelevated color="grey-8" text-color="white" :label="$t('BTN_RETRY')" @click="fetchSession" />
    </div>

    <!-- Empty / Processing -->
    <div v-else-if="sessionItems.length === 0" class="state-view">
      <q-spinner-puff color="grey-6" size="60px" />
      <div class="state-text">{{ brand.messages.processing || $t('MSG_PROCESSING_PHOTOS') }}</div>
      <div class="state-sub">{{ $t('MSG_AUTO_REFRESH_SECONDS') }}</div>
    </div>

    <!-- Gallery -->
    <div v-else class="gallery-view">

      <!-- Header -->
      <header class="gallery-header">
        <img v-if="brand.logo.image_url" :src="brand.logo.image_url" :style="{width:brand.logo.width+'px',height:brand.logo.height+'px'}" class="header-logo" />
        <div class="header-brand">
          <div v-if="brand.partner_name" class="header-partner">{{ brand.partner_name }}</div>
          <div class="header-name">{{ brand.brand_name }}</div>
        </div>
      </header>

      <!-- Hero: collage/animation -->
      <div v-if="heroItem" class="hero-section">
        <img :src="mediaUrl(heroItem)" class="hero-image" @error="onImgError" />
        <div class="hero-actions">
          <button class="btn-primary" @click="downloadMedia(heroItem)">
            <span class="btn-icon">⬇</span> {{ brand.messages.download_photo || $t('BTN_DOWNLOAD') }}
          </button>
        </div>
      </div>

      <!-- Banner -->
      <div v-if="brand.banner.enabled" class="banner-section">
        <img v-if="brand.banner.image_url" :src="brand.banner.image_url" class="banner-image" />
        <div class="banner-content">
          <div class="banner-text">{{ brand.banner.text }}</div>
          <a v-if="brand.banner.link" :href="fixUrl(brand.banner.link)" target="_blank" rel="noopener" class="btn-banner">{{ brand.banner.cta_text }}</a>
        </div>
      </div>

      <!-- Individual photos strip -->
      <div v-if="stripItems.length > 0" class="strip-section">
        <div class="section-label">{{ brand.messages.more_photos || $t('LABEL_MORE_PHOTOS') }}</div>
        <div class="strip-scroll">
          <div v-for="item in stripItems" :key="item.id" class="strip-card">
            <img :src="mediaUrl(item)" class="strip-image" loading="lazy" @error="onImgError" />
            <button class="strip-download" @click="downloadMedia(item)">
              <span class="btn-icon">⬇</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Share section -->
      <div v-if="brand.share.enabled" class="share-section">
        <div class="section-label">{{ brand.messages.share_cta || $t('BTN_SHARE') }}</div>
        <div class="share-actions">
          <button class="btn-primary btn-share" @click="shareNative">
            <span class="btn-icon">📤</span> {{ brand.share.title || $t('MSG_SHARE_TITLE') }}
          </button>
        </div>
        <div class="share-row">
          <button v-if="brand.share.show_facebook" class="btn-social" @click="shareFacebook">
            <span class="btn-icon">📘</span> Facebook
          </button>
          <button v-if="brand.share.show_messenger" class="btn-social" @click="shareMessenger">
            <span class="btn-icon">💬</span> Messenger
          </button>
          <button class="btn-social" @click="shareCopyLink">
            <span class="btn-icon">🔗</span> {{ copiedText || $t('MSG_COPY_LINK') }}
          </button>
        </div>
      </div>

      <!-- Footer -->
      <footer class="gallery-footer">
        <div class="footer-social">
          <a v-if="brand.social.facebook" :href="fixUrl(brand.social.facebook)" target="_blank" rel="noopener" class="footer-link">FB</a>
          <a v-if="brand.social.instagram" :href="fixUrl(brand.social.instagram)" target="_blank" rel="noopener" class="footer-link">IG</a>
          <a v-if="brand.social.tiktok" :href="fixUrl(brand.social.tiktok)" target="_blank" rel="noopener" class="footer-link">TT</a>
          <a v-if="brand.social.website" :href="fixUrl(brand.social.website)" target="_blank" rel="noopener" class="footer-link">Web</a>
        </div>
        <div class="footer-text">{{ brand.footer_text }}</div>
      </footer>

    </div>

    <!-- Version badge -->
    <div class="version-badge">{{ BUILD_TIME }}</div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'

const BUILD_TIME = __BUILD_TIME__
const route = useRoute()

const sessionId = computed(() => (route.query.session as string) || null)

function fixUrl(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

interface SessionManifestItem {
  id: string
  media_type: string
  path: string
}

interface BrandData {
  brand_name: string
  partner_name: string
  logo: { image_url: string; width: number; height: number }
  banner: { enabled: boolean; image_url: string; text: string; cta_text: string; link: string }
  share: { enabled: boolean; title: string; text: string; show_facebook: boolean; show_messenger: boolean }
  social: { facebook: string; instagram: string; tiktok: string; website: string }
  footer_text: string
  messages: Record<string, string>
}

const DEFAULT_BRAND: BrandData = {
  brand_name: 'Mộc Photobooth',
  partner_name: '',
  logo: { image_url: '', width: 48, height: 48 },
  banner: { enabled: false, image_url: '', text: '', cta_text: 'Xem ngay', link: '' },
  share: { enabled: true, title: 'Xem ảnh chụp của tôi tại Mộc Photobooth!', text: 'Ghé Mộc Photobooth để có những bức ảnh đẹp nhé!', show_facebook: true, show_messenger: false },
  social: { facebook: 'https://facebook.com/mocphotobooth', instagram: 'https://instagram.com/mocphotobooth', tiktok: 'https://tiktok.com/@mocphotobooth', website: 'https://mocphotobooth.vn' },
  footer_text: 'Powered by Mộc Photobooth',
  messages: {},
}

const brand = ref<BrandData>({ ...DEFAULT_BRAND })
const sessionItems = ref<SessionManifestItem[]>([])
const sessionLoading = ref(true)
const sessionError = ref<string | null>(null)
const copiedText = ref<string | null>(null)
let refreshTimer: ReturnType<typeof setInterval> | null = null

const heroItem = computed(() => sessionItems.value.find(i => i.media_type === 'collage' || i.media_type === 'animation'))
const stripItems = computed(() => sessionItems.value.filter(i => i.media_type !== 'collage' && i.media_type !== 'animation'))

async function loadBrand() {
  try {
    const resp = await fetch(`brand/brand.json?v=${encodeURIComponent(BUILD_TIME)}`)
    if (resp.ok) {
      const data = await resp.json()
      if (data.logo?.image_url) data.logo.image_url = `brand/${data.logo.image_url.split('/').pop()}`
      if (data.banner?.image_url) data.banner.image_url = `brand/${data.banner.image_url.split('/').pop()}`
      brand.value = { ...DEFAULT_BRAND, ...data, messages: { ...DEFAULT_BRAND.messages, ...(data.messages || {}) } }
    }
  } catch { /* brand.json not available, use defaults */ }
}

async function fetchSession() {
  if (!sessionId.value) return
  try {
    sessionError.value = null
    const resp = await fetch(`sessions/session_${sessionId.value}.json`)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    sessionItems.value = await resp.json()
    if (sessionItems.value.length > 0 && refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
  } catch (err) {
    sessionError.value = String(err)
  } finally {
    sessionLoading.value = false
  }
}

function mediaUrl(item: SessionManifestItem): string {
  return `./${item.path}`
}

function onImgError(e: Event) {
  (e.target as HTMLElement).style.display = 'none'
}

async function downloadMedia(item: SessionManifestItem) {
  const url = mediaUrl(item)
  try {
    const resp = await fetch(url)
    const blob = await resp.blob()
    const file = new File([blob], item.path.split('/').pop() || 'photo.jpg', { type: blob.type || 'image/jpeg' })

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] })
    } else {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = file.name
      a.click()
      URL.revokeObjectURL(a.href)
    }
  } catch {
    window.open(url, '_blank')
  }
}

async function shareNative() {
  const pageUrl = window.location.href
  try {
    await navigator.share({ title: brand.value.share.title, text: brand.value.share.text, url: pageUrl })
  } catch {
    void shareCopyLink()
  }
}

function shareFacebook() {
  window.open(`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')
}

function shareMessenger() {
  window.open(`fb-messenger://share/?link=${encodeURIComponent(window.location.href)}`, '_blank')
}

async function shareCopyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copiedText.value = 'Đã copy!'
    setTimeout(() => { copiedText.value = null }, 2000)
  } catch { /* clipboard not available */ }
}

onMounted(async () => {
  console.log('[sharepage] build:', BUILD_TIME)
  await loadBrand()
  if (sessionId.value) {
    void fetchSession()
    refreshTimer = setInterval(() => { if (sessionItems.value.length === 0 && !sessionError.value) void fetchSession() }, 3000)
  }
})

onBeforeUnmount(() => { if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null } })
</script>

<style scoped>
.session-page {
  background: #F0F4F8;
  color: #2D2D2D;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.handwritten { font-family: Caveat, cursive; font-weight: 500; unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }

/* ── States ── */

.state-view {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100vh; gap: 12px; padding: 24px; text-align: center;
  background: #F0F4F8;
}
.state-icon { font-size: 64px; opacity: 0.2; color: #6B8299; }
.state-text { font-size: 1rem; font-weight: 500; color: #2D2D2D; opacity: 0.7; }
.state-sub { font-size: 0.8rem; opacity: 0.45; color: #6B8299; }

/* ── Gallery ── */

.gallery-view { max-width: 420px; margin: 0 auto; padding: 24px 16px 40px; }

/* ── Header ── */

.gallery-header {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  background: rgba(255,255,255,0.7); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  border-radius: 16px; border: 1px solid rgba(0,0,0,0.05);
  padding: 16px 20px; margin-bottom: 20px;
  box-shadow: 0 2px 16px rgba(169,204,227,0.15);
}
.header-logo { border-radius: 12px; object-fit: contain; flex-shrink: 0; }
.header-brand { text-align: left; }
.header-partner { font-size: 1.2rem; color: #2D2D2D; font-weight: 700; line-height: 1.2; }
.header-name { font-size: 0.75rem; font-weight: 400; color: #6B8299; line-height: 1.3; }

/* ── Hero ── */

.hero-section { margin-bottom: 20px; }
.hero-image {
  width: 100%; display: block; border-radius: 12px;
  box-shadow: 0 4px 32px rgba(169,204,227,0.2);
  border: 4px solid #fff; box-sizing: border-box;
}
.hero-actions { display: flex; justify-content: center; margin-top: 14px; }

/* ── Buttons ── */

.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 12px 28px; border: none; border-radius: 24px;
  background: linear-gradient(135deg, #A9CCE3, #FED7C3);
  color: #2D2D2D; font-size: 0.95rem; font-weight: 600;
  cursor: pointer; transition: all .2s;
  box-shadow: 0 2px 16px rgba(169,204,227,0.35);
}
.btn-primary:active { opacity: 0.85; transform: scale(0.97); }
.btn-icon { font-size: 1.1em; }

/* ── Banner ── */

.banner-section {
  margin-bottom: 24px; border-radius: 12px; overflow: hidden; position: relative;
  background: linear-gradient(135deg, #A9CCE3, #FED7C3);
  box-shadow: 0 2px 16px rgba(169,204,227,0.15);
}
.banner-image {
  width: 100%; display: block; opacity: 0.35; position: absolute;
  top: 0; left: 0; height: 100%; object-fit: cover;
}
.banner-content { position: relative; padding: 20px 16px; text-align: center; }
.banner-text { font-size: 0.9rem; font-weight: 500; margin-bottom: 10px; color: #2D2D2D; }
.btn-banner {
  display: inline-block; padding: 8px 24px; border-radius: 20px;
  background: #fff; color: #2D2D2D; font-size: 0.85rem; font-weight: 600;
  text-decoration: none; box-shadow: 0 1px 8px rgba(0,0,0,0.06); transition: all .2s;
}
.btn-banner:active { opacity: 0.8; }

/* ── Strip ── */

.strip-section { margin-bottom: 24px; overflow: hidden; }
.section-label {
  font-size: 0.8rem; font-weight: 600; letter-spacing: 0.5px;
  margin-bottom: 10px; padding-left: 4px; color: #6B8299;
  text-transform: uppercase;
}
.strip-scroll {
  display: flex; gap: 10px; overflow-x: auto; overflow-y: hidden;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch; padding: 0 2px 14px 2px;
}
.strip-scroll::-webkit-scrollbar { display: none; }
.strip-card {
  flex: 0 0 130px; scroll-snap-align: start; position: relative;
  background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(169,204,227,0.12);
  padding: 7px; overflow: visible;
}
.strip-image { width: 116px; height: 116px; object-fit: cover; border-radius: 8px; display: block; }
.strip-download {
  position: absolute; bottom: -10px; right: -6px; width: 30px; height: 30px;
  border: 2px solid #fff; border-radius: 50%; background: #A9CCE3; color: #2D2D2D;
  font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all .2s;
}
.strip-download:active { transform: scale(0.9); }

/* ── Share ── */

.share-section {
  background: rgba(255,255,255,0.7); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  border-radius: 16px; border: 1px solid rgba(0,0,0,0.05);
  padding: 20px; margin-bottom: 24px; text-align: center;
  box-shadow: 0 2px 16px rgba(169,204,227,0.15);
}
.share-actions { margin: 10px 0 12px; }
.btn-share { background: linear-gradient(135deg, #A9CCE3, #FED7C3); color: #2D2D2D; }
.share-row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.btn-social {
  padding: 8px 16px; border: 1px solid rgba(169,204,227,0.3); border-radius: 20px;
  background: rgba(255,255,255,0.6); color: #2D2D2D; font-size: 0.8rem;
  cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
  transition: all .2s; backdrop-filter: blur(8px);
}
.btn-social:active { background: rgba(169,204,227,0.25); }

/* ── Footer ── */

.gallery-footer {
  padding: 24px 0 32px; text-align: center;
  border-top: 1px solid rgba(169,204,227,0.2);
}
.footer-social { display: flex; gap: 20px; justify-content: center; margin-bottom: 10px; }
.footer-link {
  color: #6B8299; text-decoration: none; font-size: 0.85rem; font-weight: 500;
  transition: color .2s;
}
.footer-link:active { color: #2D2D2D; }
.footer-text { font-size: 0.7rem; opacity: 0.3; color: #6B8299; }

/* ── Version badge ── */

.version-badge {
  position: fixed; bottom: 4px; right: 6px; font-size: 10px;
  color: rgba(0,0,0,0.12); z-index: 9999; pointer-events: none;
}
</style>
