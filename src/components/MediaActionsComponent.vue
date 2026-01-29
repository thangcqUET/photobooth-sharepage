<template>
  <div>
    <div class="social-container q-mb-md">
      <div class="text-subtitle2 q-mb-sm">
        {{ requireFollow ? t('Follow one of the pages below to enable download:') : t('Channels (optional):') }}
      </div>
      <div class="social-grid">
        <div v-for="c in channels" :key="c.name" class="social-card" :style="{ borderColor: borderColorFor(c) }" @click="openChannel(c)">
          <div class="social-media">
            <template v-if="c.svg">
              <img :src="c.svg" class="social-svg" alt="" />
            </template>
            <template v-else>
              <q-icon :name="c.icon" class="social-icon" :style="{ color: c.color || 'inherit' }" />
            </template>
          </div>
          <div class="social-name">{{ c.name }}</div>
        </div>
      </div>
    </div>

    <div class="actions-wrapper">
      <div class="button-container q-gutter-x-md">
        <div class="btn-wrapper">
          <q-btn
            class="btn-download"
            :icon="mdiDownload"
            color="primary"
            size="md"
            @click="doDownload"
            :label="$t('Download')"
            :disable="!isFollowed"
            no-caps
            unelevated
          />
          <div v-if="requireFollow && !isFollowed" class="disabled-overlay" aria-hidden="true">
            <q-icon :name="mdiLock" size="20" class="overlay-lock" />
          </div>
        </div>

        <div class="btn-wrapper" v-if="isShareAvailable">
          <q-btn
            size="md"
            class="btn-share"
            :icon="mdiShare"
            @click="doShare"
            :disable="!isFollowed"
            color="primary"
            :label="$t('Share')"
            no-caps
            unelevated
          />
          <div v-if="requireFollow && !isFollowed" class="disabled-overlay" aria-hidden="true">
            <q-icon :name="mdiLock" size="20" class="overlay-lock" />
          </div>
        </div>
      </div>
    </div>

    <div v-if="requireFollow && !isFollowed" class="text-caption q-mt-sm" style="opacity: 0.8">
      {{ t('Follow one of the pages above, then return to this page to download the file.') }}
    </div>
  </div>
</template>

<style scoped>
.social-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
}
.social-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid var(--q-border, #ddd);
  cursor: pointer;
  transition: all 150ms ease;
  background: rgba(255, 255, 255, 0.02);
  width: 100%;
  box-sizing: border-box;
  min-height: 40px;
}
.social-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
}
.social-icon {
  font-size: 22px;
}
.social-media {
  display: flex;
  align-items: center;
  justify-content: center;
}
.social-svg {
  width: 20px;
  height: 20px;
  display: block;
}
.social-name {
  font-weight: 700;
  text-align: center;
}

.button-container {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 10px;
}
.btn-download,
.btn-share {
  min-width: 140px;
  padding: 10px 14px;
  border-radius: 10px;
  font-weight: 700;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
}
.btn-share {
  background: linear-gradient(90deg, #6dd3ff, #8e7bff);
  color: white;
}
.btn-download[disabled],
.btn-share[disabled],
.btn-download.q-btn--disabled,
.btn-share.q-btn--disabled {
  opacity: 0.7;
  box-shadow: none;
  filter: grayscale(20%);
  cursor: not-allowed !important;
}
.btn-download {
  background: linear-gradient(90deg, #4fc3a1, #2bb6f0);
  color: white;
}

.actions-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
}

.btn-wrapper {
  position: relative;
  display: inline-block;
}

.disabled-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(1px);
  border-radius: 10px;
  pointer-events: none;
}

.overlay-lock {
  color: rgba(255, 255, 255, 0.95);
  opacity: 0.95;
}
</style>

<script lang="ts">
import { useI18n } from 'vue-i18n'
</script>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { mimeToExtension } from 'src/models/types'
import { mdiShare } from '@quasar/extras/mdi-v7' //direct imports of icons instead embedding the whole font file
import { mdiDownload, mdiFacebook, mdiInstagram, mdiLock } from '@quasar/extras/mdi-v7'
import { useQuasar } from 'quasar'
// Resolve SVG asset URLs at runtime so Vite resolves them correctly
const tiktokSvg = new URL('../../assets/tiktok.svg', import.meta.url).href
const threadsSvg = new URL('../../assets/threads.svg', import.meta.url).href
const $q = useQuasar()
const { t } = useI18n()

interface Props {
  url: URL
}

const props = withDefaults(defineProps<Props>(), {
  // url: () => ""
})

// channels to show. Replace URLs with your actual pages.
// Use icon names (mdi-...) to avoid import issues; set brand colors for visual identity.
const channels = [
  { name: 'Facebook', url: 'https://www.facebook.com/share/181GAksvVg/', icon: mdiFacebook, color: '#1877F2' },
  { name: 'Instagram', url: 'https://www.instagram.com/moc_photobooth?igsh=MW8wM2xqOHhpMzE1cg==', icon: mdiInstagram, color: '#E1306C' },
  { name: 'TikTok', url: 'https://www.tiktok.com/@mocphotobooth_vn?_r=1&_t=ZS-93TJrk4uDMA', svg: tiktokSvg, color: '#ffffff' },
  { name: 'Threads', url: 'https://www.threads.com/@moc_photobooth', svg: threadsSvg, color: '#00AC66' },
]

const isShareAvailable = computed(() => {
  return window.location.protocol === 'https:' && typeof navigator !== 'undefined' && typeof navigator.share === 'function'
})

// Read build-time env flag to require follow before enabling download/share
const requireFollow = String(import.meta.env.VITE_REQUIRE_FOLLOW ?? 'true') === 'true'

const isFollowed = ref(!requireFollow)

const keyId = encodeURIComponent(props.url.toString())
const followInitiatedKey = `photobooth_follow_initiated:${keyId}`
const followDoneKey = `photobooth_followed:${keyId}`

function checkFollowState() {
  try {
    if (!requireFollow) {
      isFollowed.value = true
      return
    }
    if (localStorage.getItem(followDoneKey) === 'true') {
      isFollowed.value = true
      return
    }

    // if user clicked a channel before and then returned (focus), treat as followed
    if (localStorage.getItem(followInitiatedKey)) {
      // mark as done
      localStorage.removeItem(followInitiatedKey)
      localStorage.setItem(followDoneKey, 'true')
      isFollowed.value = true
      return
    }

    isFollowed.value = false
  } catch (e) {
    console.warn('localStorage not available', e)
  }
}

onMounted(() => {
  checkFollowState()
  window.addEventListener('focus', checkFollowState)
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', checkFollowState)
})

function buildTrackedUrl(orig: string, channelName?: string) {
  try {
    const u = new URL(orig)
    // don't override existing utm_source if present
    if (!u.searchParams.get('utm_source')) u.searchParams.set('utm_source', 'photobooth_sharepage')
    if (!u.searchParams.get('utm_medium')) u.searchParams.set('utm_medium', 'referral')
    if (!u.searchParams.get('utm_campaign')) u.searchParams.set('utm_campaign', 'photobooth')
    if (channelName && !u.searchParams.get('utm_content')) {
      u.searchParams.set('utm_content', channelName.toLowerCase().replace(/\s+/g, '_'))
    }
    return u.toString()
  } catch (e) {
    return orig
  }
}

function openChannel(c: { url: string; name?: string }) {
  try {
    // mark initiation, will be turned into followed when user returns (focus event)
    localStorage.setItem(followInitiatedKey, Date.now().toString())
  } catch (e) {
    console.warn('localStorage not available', e)
  }

  // build tracked URL and open in new tab/window
  const tracked = buildTrackedUrl(c.url, c.name)
  window.open(tracked, '_blank', 'noopener')
}

function borderColorFor(c: { color?: string }) {
  const col = (c && c.color) || ''
  const normalized = String(col).trim().toLowerCase()
  // if color is white-ish, and the app is in light mode, use the standard border color
  if ((normalized === '#fff' || normalized === '#ffffff' || normalized === 'white' || normalized === 'rgba(255,255,255,1)') && !$q.dark.isActive) {
    return 'var(--q-border, #ddd)'
  }
  return col || 'var(--q-border, #ddd)'
}

function getExtensionFromContentType(contentType: string | null) {
  if (!contentType) return null
  return mimeToExtension[contentType.toLowerCase()] || null
}

async function loadFile() {
  const response = await fetch(props.url)

  if (!response.ok) {
    throw new Error('failed to fetch file')
  }

  const blob = await response.blob()
  const contentType = blob.type || null
  const fileextensionDerivedFromContentType = getExtensionFromContentType(contentType)

  if (!fileextensionDerivedFromContentType) {
    throw new Error('cannot determine file type by http headers content-type. it is mandatory to use a server providing these information')
  }

  // try to parse filename from Content-Disposition header
  let filename = null
  try {
    const cd = response.headers.get('Content-Disposition')
    if (cd) {
      const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/.exec(cd)
      if (m && m[1]) filename = decodeURIComponent(m[1])
    }
  } catch (e) {
    // ignore
  }

  const outFilename = filename || `download.${fileextensionDerivedFromContentType}`

  return new File([blob], outFilename, { type: contentType || 'application/octet-stream' })
}

async function doDownload() {
  if (!isFollowed.value) {
    $q.notify({ message: t('Please follow one of the channels before downloading.'), color: 'warning' })
    return
  }

  $q.notify({
    message: t('Download started. Please wait until it finishes.'),
  })
  try {
    const file = await loadFile()

    const link = document.createElement('a')
    link.href = URL.createObjectURL(file)
    link.download = file.name
    link.click()
    link.remove() // Clean up
  } catch (error) {
    console.error(error)
    $q.notify({
      message: t('Could not download the file. Please try again.'),
      caption: t('Error'),
      color: 'negative',
    })
  }
}

async function doShare() {
  if (requireFollow && !isFollowed.value) {
    $q.notify({ message: t('Please follow one of the channels before sharing.'), color: 'warning' })
    return
  }
  let file
  if (window.location.protocol != 'https:') {
    $q.notify({
      message: t('The share functionality is only allowed for encrypted HTTPS hosts.'),
      caption: t('Error'),
      color: 'negative',
    })
    return
  }
  if (!navigator.share) {
    $q.notify({
      message: t('The share functionality is not supported by your browser.'),
      caption: t('Error'),
      color: 'negative',
    })
    return
  }

  try {
    file = await loadFile()
  } catch (error) {
    console.error(error)
    $q.notify({
      message: t('Could not download the file. Please try again.'),
      caption: t('Error'),
      color: 'negative',
    })
    return
  }

  const shareFile = {
    files: [file],
    title: 'Your photobooth shot',
    text: 'Check out this shot I took!',
  }
  const shareUrl = {
    url: props.url.toString(),
    title: 'Your photobooth shot',
    text: 'Check out this shot I took!',
  }

  if (navigator.canShare(shareFile)) {
    navigator
      .share(shareFile)
      .then(() => console.log('success'))
      .catch((error) => {
        console.log('failed', error)
      })
  } else if (navigator.canShare(shareUrl)) {
    navigator
      .share()
      .then(() => console.log('success'))
      .catch((error) => {
        console.log('failed', error)
      })
  } else {
    $q.notify({
      message: t('This device does not support sharing files.'),
      caption: t('Error'),
      color: 'negative',
    })
  }
}
</script>
