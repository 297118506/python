// 文章列表管理
let currentLimit = 20;
let currentArticleId = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadArticles();
    setupEventListeners();
});

// 设置事件监听器
function setupEventListeners() {
    // 刷新按钮
    document.getElementById('refresh-btn').addEventListener('click', function() {
        loadArticles();
    });
    
    // 显示数量选择
    document.querySelectorAll('.limit-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            const limit = parseInt(this.dataset.limit);
            currentLimit = limit;
            document.getElementById('current-limit').textContent = limit;
            loadArticles();
        });
    });
    
    // 删除文章按钮
    document.getElementById('delete-article-btn').addEventListener('click', function() {
        if (currentArticleId) {
            const title = document.getElementById('articleDetailTitle').textContent;
            document.getElementById('delete-article-title').textContent = title;
            
            // 隐藏详情模态框，显示删除确认模态框
            const detailModal = bootstrap.Modal.getInstance(document.getElementById('articleDetailModal'));
            detailModal.hide();
            
            const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
            deleteModal.show();
        }
    });
    
    // 确认删除按钮
    document.getElementById('confirm-delete-btn').addEventListener('click', function() {
        if (currentArticleId) {
            deleteArticle(currentArticleId);
        }
    });
}

// 加载文章列表
async function loadArticles() {
    showLoading();
    hideError();
    
    try {
        console.log('开始加载文章列表，limit:', currentLimit);
        
        const response = await fetch('/api/typecho/posts?limit=' + currentLimit, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('文章列表API响应状态:', response.status);
        console.log('文章列表API响应头:', Object.fromEntries(response.headers.entries()));
        
        if (!checkAuthStatus(response)) {
            return;
        }
        
        if (!response.ok) {
            console.error('文章列表API响应错误:', response.status);
            showError(`API请求失败: ${response.status} ${response.statusText}`);
            return;
        }
        
        const data = await response.json();
        console.log('文章列表API响应数据:', data);
        
        if (data.success) {
            console.log('获取文章列表成功，文章数量:', data.posts.length);
            console.log('文章数据示例:', data.posts[0] || '无');
            
            // 根据发布时间对文章列表进行倒序排序
            const sortedPosts = data.posts.sort((a, b) => {
                // 获取发布时间
                const timeA = a.PostTime || a.post_time || a.dateCreated || 0;
                const timeB = b.PostTime || b.post_time || b.dateCreated || 0;
                
                // 转换为数字时间戳
                const timestampA = typeof timeA === 'number' ? timeA : parseInt(timeA) || 0;
                const timestampB = typeof timeB === 'number' ? timeB : parseInt(timeB) || 0;
                
                // 倒序排序
                return timestampB - timestampA;
            });
            
            console.log('排序后的文章列表:', sortedPosts);
            displayArticles(sortedPosts);
            updatePaginationInfo(sortedPosts.length);
        } else {
            console.error('获取文章列表失败:', data.message);
            showError(data.message || '加载文章列表失败');
        }
    } catch (error) {
        console.error('加载文章列表错误:', error);
        showError('网络错误，请检查连接');
    } finally {
        hideLoading();
    }
}

// 显示文章列表
function displayArticles(articles) {
    const container = document.getElementById('articles-container');
    const noArticles = document.getElementById('no-articles');
    
    if (!articles || articles.length === 0) {
        container.style.display = 'none';
        noArticles.style.display = 'block';
        return;
    }
    
    noArticles.style.display = 'none';
    container.style.display = 'block';
    container.innerHTML = '';
    
    articles.forEach(article => {
        const articleElement = createArticleElement(article);
        container.appendChild(articleElement);
    });
}

// 创建文章元素
function createArticleElement(article) {
    const articleDiv = document.createElement('div');
    articleDiv.className = 'article-item';
    
    // 处理日期
    const createDate = formatDate(article.PostTime || article.createDate || article.dateCreated);
    
    // 处理状态
    const status = article.Status === '1' ? 'publish' : 'draft';
    const statusText = getStatusText(status);
    const statusClass = getStatusClass(status);
    
    // 处理分类
    const categories = [];
    const categoriesHtml = '';
    
    // 处理标签
    const tags = article.TagsName ? article.TagsName.split(',').map(tag => tag.trim()) : [];
    const tagsHtml = tags.map(tag => 
        `<span class="article-tag">${escapeHtml(tag)}</span>`
    ).join('');
    
    // 处理摘要
    const excerpt = article.Intro || article.Content || '';
    // 解码HTML实体
    const decodedExcerpt = decodeHtmlEntities(excerpt);
    // 移除HTML标签，只保留文本内容
    const plainTextExcerpt = decodedExcerpt.replace(/<[^>]*>/g, '');
    const truncatedExcerpt = truncateHtml(plainTextExcerpt, 200);
    
    // 提取文章中的图片链接
    const imageLinks = [];
    const imgRegex = /<img\s+[^>]*src="([^"]+)"[^>]*>/g;
    let match;
    while ((match = imgRegex.exec(decodedExcerpt)) !== null) {
        imageLinks.push(match[1]);
        if (imageLinks.length >= 2) {
            break; // 只提取前两张图片
        }
    }
    
    // 生成图片缩略图HTML
    let imagesHtml = '';
    if (imageLinks.length > 0) {
        imagesHtml = '<div class="article-images">';
        imageLinks.forEach((link, index) => {
            imagesHtml += `<img src="${link}" alt="文章图片${index + 1}" class="article-image-thumbnail">`;
        });
        imagesHtml += '</div>';
    }
    
    // 处理文章ID
    const postId = article.ID || article.postid;
    
    // 处理文章标题
    const title = article.Title || article.title || '无标题';
    
    // 处理作者
    const author = article.AuthorID ? `用户${article.AuthorID}` : '未知';
    
    // 处理文章链接
    const link = article.Url || article.link || article.permaLink || '#';
    
    articleDiv.innerHTML = `
        <div class="article-title">
            <a href="#" onclick="showArticleDetail('${postId}'); return false;">
                ${escapeHtml(title)}
            </a>
        </div>
        <div class="article-meta">
            <i class="fas fa-calendar me-1"></i>
            发布时间: ${createDate}
            <span class="ms-3">
                <i class="fas fa-user me-1"></i>
                作者: ${escapeHtml(author)}
            </span>
            <span class="ms-3">
                <i class="fas fa-eye me-1"></i>
                ID: ${postId}
            </span>
        </div>
        ${categoriesHtml ? `<div class="article-categories">${categoriesHtml}</div>` : ''}
        ${tagsHtml ? `<div class="article-tags">${tagsHtml}</div>` : ''}
        ${imagesHtml}
        <div class="article-excerpt">${truncatedExcerpt}</div>
        <div class="article-actions">
            <span class="article-status ${statusClass}">${statusText}</span>
            <a href="#" class="btn btn-sm btn-outline-primary ms-2" onclick="showArticleDetail('${postId}'); return false;">
                <i class="fas fa-eye me-1"></i>
                查看详情
            </a>
            <a href="${link}" target="_blank" class="btn btn-sm btn-outline-success ms-2">
                <i class="fas fa-external-link-alt me-1"></i>
                访问文章
            </a>
        </div>
    `;
    
    return articleDiv;
}

// 显示文章详情
async function showArticleDetail(postId) {
    currentArticleId = postId;
    
    try {
        showAlert('正在加载文章详情...', 'info');
        
        if (!postId || postId === 'undefined') {
            showAlert('文章ID无效', 'error');
            return;
        }
        
        const response = await fetch(`/api/typecho/posts/${postId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!checkAuthStatus(response)) {
            return;
        }
        
        if (!response.ok) {
            console.error('文章详情API响应错误:', response.status);
            showAlert(`API请求失败: ${response.status} ${response.statusText}`, 'error');
            return;
        }
        
        const data = await response.json();
        console.log('文章详情API响应数据:', data);
        
        if (data.success) {
            displayArticleDetail(data.post);
        } else {
            showAlert(data.message || '加载文章详情失败', 'error');
        }
    } catch (error) {
        console.error('加载文章详情错误:', error);
        showAlert('网络错误，请检查连接', 'error');
    }
}

// 显示文章详情模态框
function displayArticleDetail(article) {
    const modal = document.getElementById('articleDetailModal');
    const title = document.getElementById('articleDetailTitle');
    const content = document.getElementById('articleDetailContent');
    
    // 处理文章标题
    const articleTitle = article.Title || article.title || '无标题';
    title.textContent = articleTitle;
    
    // 处理日期
    const createDate = formatDate(article.PostTime || article.dateCreated);
    const modifyDate = article.UpdateTime ? formatDate(article.UpdateTime) : null;
    
    // 处理状态
    const status = article.Status === '1' ? 'publish' : 'draft';
    const statusText = getStatusText(status);
    const statusClass = getStatusClass(status);
    
    // 处理分类
    const categories = [];
    const categoriesHtml = '';
    
    // 处理标签
    const tags = article.TagsName ? article.TagsName.split(',').map(tag => tag.trim()) : [];
    const tagsHtml = tags.map(tag => 
        `<span class="article-tag">${escapeHtml(tag)}</span>`
    ).join('');
    
    // 处理内容
    const articleContent = article.Intro || article.Content || '';
    const fullContent = articleContent;
    
    // 处理文章ID
    const postId = article.ID || article.postid;
    
    // 处理作者
    const author = article.AuthorID ? `用户${article.AuthorID}` : '未知';
    
    // 处理文章链接
    const link = article.Url || article.link || article.permaLink || '#';
    
    content.innerHTML = `
        <div class="row mb-4">
            <div class="col-md-6">
                <h6 class="text-muted">基本信息</h6>
                <p><strong>文章ID:</strong> ${postId}</p>
                <p><strong>作者:</strong> ${escapeHtml(author)}</p>
                <p><strong>状态:</strong> <span class="article-status ${statusClass}">${statusText}</span></p>
                <p><strong>发布时间:</strong> ${createDate}</p>
                ${modifyDate ? `<p><strong>修改时间:</strong> ${modifyDate}</p>` : ''}
            </div>
            <div class="col-md-6">
                <h6 class="text-muted">分类和标签</h6>
                <p><strong>分类:</strong> ${categoriesHtml || '<span class="text-muted">无</span>'}</p>
                <p><strong>标签:</strong> ${tagsHtml || '<span class="text-muted">无</span>'}</p>
                <p><strong>链接:</strong> <a href="${link}" target="_blank">${link}</a></p>
                <p><strong>评论:</strong> ${article.CommNums || 0}</p>
                <p><strong>浏览:</strong> ${article.ViewNums || 0}</p>
            </div>
        </div>
        <div class="mb-4">
            <h6 class="text-muted">文章内容</h6>
            <div class="article-content border rounded p-3" style="background: #f8f9fa;">
                ${fullContent ? decodeHtmlEntities(fullContent) : '<p class="text-muted">无内容</p>'}
            </div>
        </div>
    `;
    
    // 显示模态框
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// 删除文章
async function deleteArticle(postId) {
    try {
        if (!postId || postId === 'undefined') {
            showAlert('文章ID无效', 'error');
            return;
        }
        
        const response = await fetch(`/api/typecho/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!checkAuthStatus(response)) {
            return;
        }
        
        if (!response.ok) {
            console.error('删除文章API响应错误:', response.status);
            showAlert(`API请求失败: ${response.status} ${response.statusText}`, 'error');
            return;
        }
        
        const data = await response.json();
        console.log('删除文章API响应数据:', data);
        
        if (data.success) {
            showAlert('文章删除成功', 'success');
            
            // 隐藏删除确认模态框
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
            deleteModal.hide();
            
            // 重新加载文章列表
            loadArticles();
        } else {
            showAlert(data.message || '删除文章失败', 'error');
        }
    } catch (error) {
        console.error('删除文章错误:', error);
        showAlert('网络错误，请检查连接', 'error');
    }
}

// 处理文章内容
function processArticleContent(content) {
    if (!content) return '';
    
    // 简单的Markdown到HTML转换（基础支持）
    let html = content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
    
    // 如果内容看起来像HTML，直接使用
    if (content.includes('<') && content.includes('>')) {
        html = content;
    }
    
    return html;
}

// 辅助函数
function formatDate(dateStr) {
    if (!dateStr) return '未知';
    try {
        // 检查dateStr是否为数字（时间戳）
        if (typeof dateStr === 'number' || !isNaN(parseInt(dateStr))) {
            const timestamp = parseInt(dateStr) * 1000; // 转换为毫秒
            const date = new Date(timestamp);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            // 尝试直接解析日期字符串
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                return '未知';
            }
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    } catch (e) {
        return '未知';
    }
}

function getStatusText(status) {
    const statusMap = {
        'publish': '已发布',
        'draft': '草稿',
        'pending': '待审核',
        'private': '私密'
    };
    return statusMap[status] || status;
}

function getStatusClass(status) {
    const classMap = {
        'publish': 'status-publish',
        'draft': 'status-draft',
        'pending': 'status-pending',
        'private': 'status-draft'
    };
    return classMap[status] || 'status-publish';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateHtml(html, maxLength) {
    if (!html) return '';
    
    // 移除HTML标签
    const text = html.replace(/<[^>]*>/g, '');
    
    if (text.length <= maxLength) {
        return html;
    }
    
    return text.substring(0, maxLength) + '...';
}

function updatePaginationInfo(count) {
    const info = document.getElementById('pagination-info');
    const countSpan = document.getElementById('loaded-count');
    
    countSpan.textContent = count;
    info.style.display = count > 0 ? 'block' : 'none';
}

function showLoading() {
    document.getElementById('loading-spinner').style.display = 'block';
    document.getElementById('articles-container').style.display = 'none';
    document.getElementById('no-articles').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading-spinner').style.display = 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    errorText.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    document.getElementById('error-message').style.display = 'none';
}

// 显示提示消息
function showAlert(message, type = 'info') {
    // 创建提示元素
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
    
    const iconMap = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle',
        'warning': 'fas fa-exclamation-triangle'
    };
    
    alertDiv.innerHTML = `
        <i class="${iconMap[type] || iconMap.info} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // 自动移除
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

// 检查认证状态（复用main.js中的函数）
function checkAuthStatus(response) {
    if (response.status === 401) {
        showAlert('登录已过期，即将跳转到登录页面', 'warning');
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);
        return false;
    }
    return true;
}

// 解码HTML实体
function decodeHtmlEntities(html) {
    if (!html) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}
