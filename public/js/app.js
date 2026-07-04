const HISTORY_KEY = 'shortlink_history'
const MAX_HISTORY = 50

const form = document.getElementById('shortenForm')
const urlInput = document.getElementById('urlInput')
const shortenBtn = document.getElementById('shortenBtn')
const resultArea = document.getElementById('resultArea')
const resultUrl = document.getElementById('resultUrl')
const copyBtn = document.getElementById('copyBtn')
const toast = document.getElementById('toast')
const loadingArea = document.getElementById('loadingArea')
const errorArea = document.getElementById('errorArea')
const errorMsg = document.getElementById('errorMsg')
const previewCard = document.getElementById('previewCard')
const previewDomain = document.getElementById('previewDomain')
const previewTitle = document.getElementById('previewTitle')
const historySection = document.getElementById('historySection')
const historyList = document.getElementById('historyList')
const emptyHistory = document.getElementById('emptyHistory')
const historyCount = document.getElementById('historyCount')

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function setHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items))
}

function addToHistory(item) {
  const items = getHistory()
  items.unshift(item)
  if (items.length > MAX_HISTORY) items.pop()
  setHistory(items)
  renderHistory()
}

function removeFromHistory(index) {
  const items = getHistory()
  items.splice(index, 1)
  setHistory(items)
  renderHistory()
}

function timeAgo(dateStr) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'baru saja'
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  return `${Math.floor(diff / 86400)} hari lalu`
}

function renderHistory() {
  const items = getHistory()
  if (items.length === 0) {
    historySection.classList.add('hidden')
    return
  }
  historySection.classList.remove('hidden')
  emptyHistory.classList.add('hidden')
  historyCount.textContent = `${items.length} item`

  historyList.innerHTML = items.map((item, i) => `
    <li class="history-item-enter flex items-start sm:items-center gap-2 bg-[#111] rounded-lg p-3 sm:p-4">
      <div class="flex-1 min-w-0 flex flex-col gap-0.5 sm:gap-1">
        <a href="${item.shortUrl}" target="_blank" class="text-blue-400 font-medium text-xs sm:text-sm hover:underline truncate block">${item.shortUrl}</a>
        <p class="text-gray-500 text-xs truncate">${item.originalUrl}</p>
        <p class="text-gray-500 text-xs">${timeAgo(item.createdAt)}</p>
      </div>
      <button data-index="${i}" class="delete-btn text-gray-500 hover:text-red-400 transition-colors text-sm px-2 py-1 shrink-0" aria-label="Hapus">&times;</button>
    </li>
  `).join('')

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromHistory(parseInt(btn.dataset.index))
    })
  })
}

function showLoading() {
  loadingArea.classList.remove('hidden')
  resultArea.classList.add('hidden')
  errorArea.classList.add('hidden')
  shortenBtn.disabled = true
}

function hideLoading() {
  loadingArea.classList.add('hidden')
  shortenBtn.disabled = false
}

function showResult(shortUrl, originalUrl) {
  resultUrl.value = shortUrl
  resultArea.classList.remove('hidden')
  errorArea.classList.add('hidden')
  hideLoading()
}

function showError(msg) {
  errorMsg.textContent = msg
  errorArea.classList.remove('hidden')
  resultArea.classList.add('hidden')
  hideLoading()
}

function showToast() {
  toast.classList.remove('hidden')
  setTimeout(() => toast.classList.add('hidden'), 2000)
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    showToast()
  } catch {
    resultUrl.select()
    document.execCommand('copy')
    showToast()
  }
}

let previewTimeout = null

urlInput.addEventListener('input', () => {
  clearTimeout(previewTimeout)
  previewCard.classList.add('hidden')

  const url = urlInput.value.trim()
  if (!url) return

  previewTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`/api/preview?url=${encodeURIComponent(url)}`)
      if (!res.ok) return
      const data = await res.json()
      previewDomain.textContent = data.domain
      previewTitle.textContent = data.title || 'No title'
      previewCard.classList.remove('hidden')
    } catch {
      // silent fallback
    }
  }, 1000)
})

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const url = urlInput.value.trim()
  if (!url) return

  showLoading()

  try {
    const res = await fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })

    const data = await res.json()

    if (!res.ok) {
      showError(data.error || 'Gagal memperpendek URL')
      return
    }

    showResult(data.shortUrl, data.originalUrl)
    addToHistory({
      shortUrl: data.shortUrl,
      originalUrl: data.originalUrl,
      shortCode: data.shortCode,
      createdAt: new Date().toISOString(),
    })

    setTimeout(() => copyToClipboard(data.shortUrl), 100)
  } catch {
    showError('Gagal terhubung ke server. Coba lagi.')
  }
})

copyBtn.addEventListener('click', () => {
  copyToClipboard(resultUrl.value)
})

renderHistory()
