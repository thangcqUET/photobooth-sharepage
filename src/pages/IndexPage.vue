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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> {{ brand.messages.download_photo || $t('BTN_DOWNLOAD') }}
          </button>
        </div>
      </div>

      <!-- Banner -->
      <div v-if="brand.banner.enabled" class="banner-section">
        <img v-if="brand.banner.image_url" :src="brand.banner.image_url" class="banner-image" />
        <div class="banner-content">
          <div class="banner-text">{{ brand.banner.text }}</div>
          <a v-if="brand.banner.link" :href="fixUrl(brand.banner.link)" target="_blank" rel="noopener" class="btn-banner" @click="trackEvent('banner_click', { link_url: brand.banner.link })">{{ brand.banner.cta_text }}</a>
        </div>
      </div>

      <!-- Individual photos strip -->
       <div v-if="stripItems.length > 0" class="strip-section">
         <div class="section-label">{{ brand.messages.more_photos || $t('LABEL_MORE_PHOTOS') }}</div>
         <div class="strip-scroll">
           <div v-for="item in stripItems" :key="item.id" class="strip-card">
             <div v-if="item.media_type === 'video'" class="strip-video-thumb">
               <img v-if="item.thumbnail" :src="'./' + item.thumbnail" class="strip-image" loading="lazy" @error="(e: Event) => { (e.target as HTMLElement).style.display='none' }" />
               <div class="strip-video-icon">
                 <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
               </div>
             </div>
             <img v-else :src="mediaUrl(item)" class="strip-image" loading="lazy" @error="onImgError" />
             <button class="strip-download" @click="downloadMedia(item)">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
             </button>
           </div>
         </div>
       </div>

      <!-- Share section -->
      <div v-if="brand.share.enabled" class="share-section">
        <div class="section-label">{{ brand.messages.share_cta || $t('BTN_SHARE') }}</div>
        <div class="share-actions">
          <button class="btn-primary btn-share" @click="shareNative">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg> {{ brand.share.title || $t('MSG_SHARE_TITLE') }}
          </button>
        </div>
        <div class="share-row">
          <button v-if="brand.share.show_facebook" class="btn-social" @click="shareFacebook">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
          </button>
          <button v-if="brand.share.show_messenger" class="btn-social" @click="shareMessenger">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg> Messenger
          </button>
          <button class="btn-social" @click="shareCopyLink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7h-4v2h4c1.65 0 3 1.35 3 3s-1.35 3-3 3h-4v2h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-6 8H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-2zm-3-4h8v2H8v-2z"/></svg> {{ copiedText || $t('MSG_COPY_LINK') }}
          </button>
        </div>
      </div>

      <!-- Footer -->
      <footer class="gallery-footer">
        <div class="footer-social">
          <a v-if="brand.social.facebook" :href="fixUrl(brand.social.facebook)" target="_blank" rel="noopener" class="footer-link" @click="trackEvent('social_click', { platform: 'facebook' })"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>
          <a v-if="brand.social.instagram" :href="fixUrl(brand.social.instagram)" target="_blank" rel="noopener" class="footer-link" @click="trackEvent('social_click', { platform: 'instagram' })"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></a>
          <a v-if="brand.social.tiktok" :href="fixUrl(brand.social.tiktok)" target="_blank" rel="noopener" class="footer-link" @click="trackEvent('social_click', { platform: 'tiktok' })"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></a>
          <a v-if="brand.social.website" :href="fixUrl(brand.social.website)" target="_blank" rel="noopener" class="footer-link" @click="trackEvent('social_click', { platform: 'website' })"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg></a>
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

declare global { interface Window { dataLayer?: Record<string, unknown>[] } }

const BUILD_TIME = __BUILD_TIME__
const route = useRoute()
const GTM_ID = (import.meta.env.VITE_GTM_ID as string) || ''

function trackEvent(event: string, data: Record<string, unknown> = {}) {
  if (GTM_ID && window.dataLayer) {
    window.dataLayer.push({ event, ...data })
  }
}

function initGTM() {
  if (!GTM_ID) return
  const s = document.createElement('script')
  s.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}')`
  document.head.appendChild(s)
  const n = document.createElement('noscript')
  n.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`
  document.body.appendChild(n)
}

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
  thumbnail?: string
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
  share: { enabled: false, title: 'Xem ảnh chụp của tôi tại Mộc Photobooth!', text: 'Ghé Mộc Photobooth để có những bức ảnh đẹp nhé!', show_facebook: true, show_messenger: false },
  social: { facebook: 'https://www.facebook.com/profile.php?id=61558483040026', instagram: 'https://www.instagram.com/moc_photobooth/', tiktok: 'https://www.tiktok.com/@mocptb_sukien', website: 'https://moc-photobooth.mocphotobooth.workers.dev/' },
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
const stripItems = computed(() => {
  const items = sessionItems.value.filter(i => i.media_type !== 'collage' && i.media_type !== 'animation')
  return [...items].sort((a, b) => {
    if (a.media_type === 'video' && b.media_type !== 'video') return -1
    if (a.media_type !== 'video' && b.media_type === 'video') return 1
    return 0
  })
})

async function loadBrand() {
  try {
    const resp = await fetch(`brand/brand.json?v=${Date.now()}`)
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
    trackEvent('page_view', { session_id: sessionId.value, item_count: sessionItems.value.length, brand_name: brand.value.brand_name })
  } catch (err) {
    sessionError.value = String(err)
    trackEvent('session_error', { error: String(err), session_id: sessionId.value })
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
  trackEvent('download_photo', { media_type: item.media_type, item_id: item.id })
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
  trackEvent('share_click', { method: 'native' })
  const pageUrl = window.location.href
  try {
    await navigator.share({ title: brand.value.share.title, text: brand.value.share.text, url: pageUrl })
  } catch {
    void shareCopyLink()
  }
}

function shareFacebook() {
  trackEvent('share_click', { method: 'facebook' })
  window.open(`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')
}

function shareMessenger() {
  trackEvent('share_click', { method: 'messenger' })
  window.open(`fb-messenger://share/?link=${encodeURIComponent(window.location.href)}`, '_blank')
}

async function shareCopyLink() {
  trackEvent('share_click', { method: 'copy_link' })
  try {
    await navigator.clipboard.writeText(window.location.href)
    copiedText.value = 'Đã copy!'
    setTimeout(() => { copiedText.value = null }, 2000)
  } catch { /* clipboard not available */ }
}

onMounted(async () => {
  initGTM()
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
.btn-primary svg { flex-shrink: 0; }
.btn-primary:active { opacity: 0.85; transform: scale(0.97); }

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
.strip-video-thumb {
  width: 116px; height: 116px; border-radius: 8px; position: relative;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  overflow: hidden;
}
.strip-video-thumb .strip-image {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover; border-radius: 8px;
}
.strip-video-icon {
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.9); z-index: 1;
}
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
.btn-social svg { flex-shrink: 0; }
.btn-social:active { background: rgba(169,204,227,0.25); }

/* ── Footer ── */

.gallery-footer {
  padding: 24px 0 32px; text-align: center;
  border-top: 1px solid rgba(169,204,227,0.2);
}
.footer-social { display: flex; gap: 20px; justify-content: center; margin-bottom: 10px; }
.footer-link {
  color: #6B8299; text-decoration: none; font-size: 0.85rem; font-weight: 500;
  transition: color .2s; display: inline-flex; align-items: center;
}
.footer-link svg { display: block; }
.footer-link:active { color: #2D2D2D; }
.footer-text { font-size: 0.7rem; opacity: 0.3; color: #6B8299; }

/* ── Version badge ── */

.version-badge {
  position: fixed; bottom: 4px; right: 6px; font-size: 10px;
  color: rgba(0,0,0,0.12); z-index: 9999; pointer-events: none;
}
</style>
