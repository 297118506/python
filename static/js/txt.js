// TXT文件管理页面的JavaScript逻辑

let currentFilename = 'zylj.txt';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadContent();
});

// 设置事件监听器
function setupEventListeners() {
    // 内容变化时自动保存
    document.getElementById('txt-editor').addEventListener('input', autoSave);
}

// 加载内容
async function loadContent() {
    try {
        const response = await fetch('/api/txt/load');
        const result = await response.json();
        
        if (!result.error) {
            document.getElementById('txt-editor').value = result.content;
        }
    } catch (error) {
        console.error('加载内容失败:', error);
    }
}

// 自动保存
async function autoSave() {
    const content = document.getElementById('txt-editor').value;
    
    try {
        await fetch('/api/txt/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: content })
        });
    } catch (error) {
        console.error('自动保存失败:', error);
    }
}

// 保存内容（手动保存，会先清除原内容）
async function saveContent() {
    const content = document.getElementById('txt-editor').value;
    
    try {
        // 手动保存时先清除再保存
        await fetch('/api/txt/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: content, clear_first: true })
        });
        
        showAlert('保存成功！');
    } catch (error) {
        console.error('保存失败:', error);
        showAlert('保存失败', 'danger');
    }
}

// 粘贴剪贴板内容
async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('txt-editor').value = '';
        document.getElementById('txt-editor').value = text;
        autoSave();
        showAlert('粘贴成功！');
    } catch (error) {
        console.error('粘贴失败:', error);
        showAlert('粘贴失败，请手动粘贴', 'warning');
    }
}

// 清除内容
function clearContent() {
    document.getElementById('txt-editor').value = '';
    autoSave();
    showAlert('内容已清除');
}

// 复制内容
async function copyContent() {
    const content = document.getElementById('txt-editor').value;
    
    try {
        await navigator.clipboard.writeText(content);
        showAlert('复制成功！');
    } catch (error) {
        console.error('复制失败:', error);
        // 降级到传统方法
        copyToClipboard(content);
    }
}

// 显示设置对话框
function showSettings() {
    document.getElementById('filename-input').value = currentFilename;
    const modal = new bootstrap.Modal(document.getElementById('settingsModal'));
    modal.show();
}

// 保存设置
function saveSettings() {
    const filename = document.getElementById('filename-input').value.trim();
    
    if (!filename) {
        showAlert('请输入文件名', 'warning');
        return;
    }
    
    currentFilename = filename;
    bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
    showAlert('设置已保存');
    
    // 重新加载内容
    loadContent();
}
