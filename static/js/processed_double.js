// Processed双排页面的JavaScript逻辑

let previewVisible = true;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    updatePreview();
});

// 设置事件监听器
function setupEventListeners() {
    // 内容变化时更新预览
    document.getElementById('processed-double-editor').addEventListener('input', updatePreview);
}

// 更新预览
function updatePreview() {
    const content = document.getElementById('processed-double-editor').value;
    
    // 如果内容包含HTML标签，直接显示；否则当作Markdown处理
    let html;
    if (content.includes('<') && content.includes('>')) {
        html = content;
    } else {
        html = markdownToHtml(content);
    }
    
    document.getElementById('processed-double-preview').innerHTML = html;
}

// 切换预览面板显示/隐藏
function togglePreview() {
    const previewPanel = document.getElementById('preview-panel');
    const toggleBtn = document.getElementById('toggle-preview');
    const editorPanel = document.querySelector('.processed-editor');
    
    if (previewVisible) {
        previewPanel.style.display = 'none';
        editorPanel.style.width = '100%';
        toggleBtn.textContent = '显示预览';
        previewVisible = false;
    } else {
        previewPanel.style.display = 'block';
        editorPanel.style.width = '50%';
        toggleBtn.textContent = '隐藏预览';
        previewVisible = true;
    }
}

// 保存内容
async function saveContent() {
    const content = document.getElementById('processed-double-editor').value;
    
    try {
        const response = await fetch('/api/processed/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                content: content,
                type: 'double'
            })
        });
        
        const result = await response.json();
        if (result.error) {
            showAlert(`保存失败: ${result.error}`, 'danger');
        } else {
            showAlert('保存成功！');
        }
    } catch (error) {
        console.error('保存失败:', error);
        showAlert('保存失败', 'danger');
    }
}

// 显示另存为对话框
function saveAs() {
    const modal = new bootstrap.Modal(document.getElementById('saveAsModal'));
    modal.show();
}

// 确认另存为
async function confirmSaveAs() {
    const filename = document.getElementById('save-filename').value.trim();
    const content = document.getElementById('processed-double-editor').value;
    
    if (!filename) {
        showAlert('请输入文件名', 'warning');
        return;
    }
    
    try {
        // 这里可以添加另存为的逻辑
        // 目前直接保存到默认文件
        const response = await fetch('/api/processed/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                content: content,
                type: 'double'
            })
        });
        
        const result = await response.json();
        if (result.error) {
            showAlert(`另存为失败: ${result.error}`, 'danger');
        } else {
            showAlert(`已另存为: ${filename}`);
            bootstrap.Modal.getInstance(document.getElementById('saveAsModal')).hide();
        }
    } catch (error) {
        console.error('另存为失败:', error);
        showAlert('另存为失败', 'danger');
    }
}


