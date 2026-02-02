import './style.css'
import imglyRemoveBackground from "@imgly/background-removal"
import JSZip from "jszip"

// Elements
const uploadInput = document.getElementById('upload')
const simulatorArea = document.getElementById('simulator-content')
const downloadBtn = document.getElementById('download-btn')
const removeBgCheckbox = document.getElementById('removeBg')
const addStrokeCheckbox = document.getElementById('addStroke')

// State
let processedImages = [] // Store blobs/dataURLs of processed images

// Event Listeners
uploadInput.addEventListener('change', handleFileUpload)
downloadBtn.addEventListener('click', processAndDownload)

async function handleFileUpload(e) {
    const files = e.target.files
    if (!files.length) return

    // Clear previous simulator state
    simulatorArea.innerHTML = ''
    processedImages = []
    downloadBtn.textContent = '處理中...'
    downloadBtn.disabled = true

    try {
        for (const file of files) {
            await processSingleFile(file)
        }
        downloadBtn.textContent = '🚀 產出全套 ZIP 並打包'
        downloadBtn.disabled = false
    } catch (err) {
        console.error(err)
        alert('處理失敗: ' + err.message)
        downloadBtn.textContent = '重試'
        downloadBtn.disabled = false
    }
}

async function processSingleFile(file) {
    // Show loading in simulator
    const loadingMsg = document.createElement('div')
    loadingMsg.className = 'msg-row'
    loadingMsg.innerHTML = `
    <div class="avatar"></div>
    <div class="msg-bubble">
      <div class="spinner"></div> 正在去背與處理中...
    </div>
  `
    simulatorArea.appendChild(loadingMsg)

    // 1. AI Background Removal (or File Read)
    let imageBlob = file
    if (removeBgCheckbox.checked) {
        try {
            // Find the message bubble to update progress
            const bubble = loadingMsg.querySelector('.msg-bubble');
            const originalText = bubble.innerHTML;

            const config = {
                progress: (key, current, total) => {
                    // Update UI with progress
                    const percent = Math.round((current / total) * 100);
                    bubble.innerHTML = `<div class="spinner"></div> 下載模組中 (${percent}%)...`;
                    console.log(`Downloading ${key}: ${percent}%`);
                },
                debug: true
            };

            imageBlob = await imglyRemoveBackground(file, config);

            // Restore text
            bubble.innerHTML = originalText;
        } catch (e) {
            console.error("AI Removal Critical Failure:", e);
            alert(`AI 去背失敗 (請檢查網路或 Console 錯誤訊息):\n${e.message}`);
            // Fallback to original
            imageBlob = file;
        }
    }

    // 2. Load into Canvas for Stroke/Effects
    const imgBitmap = await createImageBitmap(imageBlob)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    // padding for stroke
    const padding = 20
    canvas.width = imgBitmap.width + padding * 2
    canvas.height = imgBitmap.height + padding * 2

    // Draw Image
    ctx.drawImage(imgBitmap, padding, padding)

    // 3. Add Stroke (Optional)
    if (addStrokeCheckbox.checked) {
        applyStroke(ctx, canvas, padding)
    }

    // Result
    const processedDataUrl = canvas.toDataURL('image/png')

    // Store for zip
    processedImages.push({
        originalName: file.name,
        dataUrl: processedDataUrl,
        width: canvas.width,
        height: canvas.height
    })

    // Update Simulator
    simulatorArea.removeChild(loadingMsg) // Remove loading

    const stickerMsg = document.createElement('div')
    stickerMsg.className = 'msg-row'
    stickerMsg.innerHTML = `
    <div class="avatar"></div>
    <div class="msg-bubble" style="background: transparent; box-shadow: none; padding: 0;">
      <img src="${processedDataUrl}" class="sticker-preview-img">
    </div>
  `
    simulatorArea.appendChild(stickerMsg)

    // Scroll to bottom
    simulatorArea.parentElement.scrollTop = simulatorArea.parentElement.scrollHeight
}

function applyStroke(ctx, canvas, padding) {
    // Simple Stroke Algorithm: Draw multiple times or use shadow
    // We need to operate on the image data for perfect outline or use shadow trick
    // Shadow trick is faster for simple "white border"

    // Create a temp canvas effectively
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const tCtx = tempCanvas.getContext('2d')

    // Draw the current image onto temp
    tCtx.drawImage(canvas, 0, 0)

    // Clear original
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw shadow stroke
    // 8-way offset
    const steps = 8
    const strokeWidth = 5 // Thicker stroke for stickers

    ctx.shadowColor = 'white'
    ctx.shadowBlur = 0

    // Draw base image repeatedly in a circle
    for (let i = 0; i < steps; i++) {
        const angle = (i * 2 * Math.PI) / steps
        const x = Math.cos(angle) * strokeWidth
        const y = Math.sin(angle) * strokeWidth
        ctx.drawImage(tempCanvas, x, y)
    }

    // Fill gaps? with more steps or just blur. 
    // Let's do another pass for corners

    // Finally draw original on top
    ctx.shadowColor = 'transparent'
    ctx.drawImage(tempCanvas, 0, 0)
}

async function processAndDownload() {
    if (processedImages.length === 0) return alert("沒有可下載的圖片")

    const zip = new JSZip()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    const specs = [
        { w: 240, h: 240, folder: 'main', prefix: 'main' },
        { w: 96, h: 74, folder: 'tab', prefix: 'tab' },
        { w: 370, h: 320, folder: 'stickers', prefix: '' }
    ]

    for (let i = 0; i < processedImages.length; i++) {
        const item = processedImages[i]
        const img = new Image()
        img.src = item.dataUrl
        await new Promise(r => img.onload = r)

        // Generate specs
        for (const spec of specs) {
            canvas.width = spec.w
            canvas.height = spec.h
            ctx.clearRect(0, 0, spec.w, spec.h)

            // Scale to fit with padding (10px as per original req)
            const padding = 10
            const scale = Math.min((spec.w - padding * 2) / item.width, (spec.h - padding * 2) / item.height)

            const dw = item.width * scale
            const dh = item.height * scale

            ctx.drawImage(img, (spec.w - dw) / 2, (spec.h - dh) / 2, dw, dh)

            const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))

            // Naming
            const fileIndex = (i + 1).toString().padStart(2, '0')
            const fileName = spec.prefix ? `${spec.prefix}.png` : `${fileIndex}.png`
            zip.file(`${spec.folder}/${fileName}`, blob)
        }
    }

    const content = await zip.generateAsync({ type: "blob" })
    const link = document.createElement('a')
    link.download = `Sticker_Pack_Premium.zip`
    link.href = URL.createObjectURL(content)
    link.click()
}
