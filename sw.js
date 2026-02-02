<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <title>LINE 貼圖自動規格器</title>
    <link rel="manifest" href="manifest.json">
    <style>
        body { font-family: sans-serif; text-align: center; padding: 40px; background: #f4f4f4; }
        .box { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); display: inline-block; }
        button { background: #00c300; color: white; border: none; padding: 10px 20px; border-radius: 5px; margin: 10px; cursor: pointer; font-size: 16px; }
        button:hover { background: #009900; }
    </style>
</head>
<body>
    <div class="box">
        <h2>🐶 無毛狗貼圖處理工具</h2>
        <input type="file" id="upload" accept="image/png" multiple><br><br>
        <button onclick="process(240, 240, 'main')">1. 生成 Main (240x240)</button><br>
        <button onclick="process(370, 320, 'sticker')">2. 生成貼圖 (370x320)</button><br>
        <button onclick="process(96, 74, 'tab')">3. 生成標籤 (96x74)</button>
    </div>
    <canvas id="canvas" style="display:none;"></canvas>

    <script>
        if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js'); }

        function process(targetW, targetH, fileName) {
            const files = document.getElementById('upload').files;
            if (files.length === 0) return alert('請先選取你的無毛狗原圖');
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');

            Array.from(files).forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        canvas.width = targetW;
                        canvas.height = targetH;
                        ctx.clearRect(0, 0, targetW, targetH);
                        // 自動計算：留 10px 安全邊距
                        const padding = 10;
                        const scale = Math.min((targetW - padding * 2) / img.width, (targetH - padding * 2) / img.height);
                        const dw = img.width * scale;
                        const dh = img.height * scale;
                        ctx.drawImage(img, (targetW - dw) / 2, (targetH - dh) / 2, dw, dh);
                        // 轉成下載連結
                        const link = document.createElement('a');
                        link.download = `${fileName}.png`;
                        link.href = canvas.toDataURL("image/png");
                        link.click();
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            });
        }
    </script>
</body>
</html>