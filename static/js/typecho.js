// Typecho页面的JavaScript逻辑

let selectedCategories = new Set();
let selectedTags = new Set();
let currentPath = '/';
let currentAccount = null;
let fileList = [];
let searchMatches = [];
let searchIndex = 0;

// 全局错误处理
window.onerror = function(message, source, lineno, colno, error) {
    console.error('全局JavaScript错误:', message, '在', source, '行', lineno, '列');
    if (error) {
        console.error('错误详情:', error);
    }
    return true;
};

// 全局未捕获的Promise错误处理
window.addEventListener('unhandledrejection', function(event) {
    console.error('未处理的Promise错误:', event.reason);
    event.preventDefault();
});

// 测试API调用函数（使用XMLHttpRequest）
function testApiCall() {
    console.log('开始测试API调用...');
    
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/test', true);
    
    xhr.onreadystatechange = function() {
        console.log('XMLHttpRequest状态变化:', xhr.readyState, xhr.status);
        
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    console.log('测试API响应数据:', xhr.responseText);
                    showAlert('测试API调用成功！', 'success');
                } catch (error) {
                    console.error('解析响应数据失败:', error);
                    showAlert('解析响应数据失败', 'danger');
                }
            } else {
                console.error('测试API调用失败，状态码:', xhr.status);
                showAlert(`测试API调用失败，状态码: ${xhr.status}`, 'danger');
            }
        }
    };
    
    xhr.onerror = function() {
        console.error('测试API调用网络错误');
        showAlert('测试API调用网络错误', 'danger');
    };
    
    xhr.ontimeout = function() {
        console.error('测试API调用超时');
        showAlert('测试API调用超时', 'danger');
    };
    
    xhr.timeout = 10000; // 10秒超时
    
    console.log('发送测试API请求...');
    xhr.send();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始初始化...');
    
    try {
        console.log('检查DOM元素...');
        console.log('category-tree元素:', document.getElementById('category-tree'));
        console.log('tag-list元素:', document.getElementById('tag-list'));
        console.log('article-title元素:', document.getElementById('article-title'));
        console.log('article-content元素:', document.getElementById('article-content'));
        console.log('preview-content元素:', document.getElementById('preview-content'));
        
        console.log('调用testApiCall...');
        testApiCall();
        console.log('调用loadTypechoConfig...');
        loadTypechoConfig();
        console.log('调用loadAlistAccounts...');
        loadAlistAccounts();
        console.log('调用setupEventListeners...');
        setupEventListeners();
        console.log('调用loadCategories...');
        loadCategories();
        console.log('调用loadTags...');
        loadTags();
    } catch (error) {
        console.error('初始化失败:', error);
        console.error('错误堆栈:', error.stack);
        showAlert(`初始化失败: ${error.message}`, 'danger');
    }
    
    // 监听窗口大小变化，更新标签导航按钮
    window.addEventListener('resize', () => {
        setTimeout(updateTabNavButtons, 100);
    });
    
    // 全局事件监听器，确保在任何情况下都能停止长按滚动
    document.addEventListener('mouseup', () => {
        stopTabScroll();
        stopFileListScroll();
    });
    
    document.addEventListener('touchend', () => {
        stopTabScroll();
        stopFileListScroll();
    });
    
    // 当页面失去焦点时也停止滚动
    window.addEventListener('blur', () => {
        stopTabScroll();
        stopFileListScroll();
    });
    
    console.log('初始化完成');
});

// 设置事件监听器
function setupEventListeners() {
    // 文章内容变化时更新预览
    document.getElementById('article-content').addEventListener('input', updatePreview);
    
    // 标题变化时自动匹配分类
    const titleInput = document.getElementById('article-title');
    if (titleInput) {
        titleInput.addEventListener('input', autoMatchCategory);
        titleInput.addEventListener('keyup', autoMatchCategory);
        titleInput.addEventListener('change', autoMatchCategory);
    }
    
    // 分类搜索
    document.getElementById('category-search').addEventListener('input', filterCategories);
    
    // 标签搜索
    document.getElementById('tag-search').addEventListener('input', filterTags);
    
    // 文件搜索
    document.getElementById('file-search').addEventListener('input', filterFiles);
    
    // Alist账户变化
    document.getElementById('alist-account').addEventListener('change', switchAlistAccount);
    
    // 展开/收起分类
    document.getElementById('toggle-categories').addEventListener('click', toggleCategories);
    
    // 站点设置按钮事件（如果存在）
    const siteConfigBtn = document.getElementById('site-config-btn');
    if (siteConfigBtn) {
        console.log('站点设置按钮已找到，添加事件监听器');
        siteConfigBtn.addEventListener('click', function(e) {
            console.log('站点设置按钮被点击');
            e.preventDefault();
            showSiteConfig();
        });
    } else {
        console.log('站点设置按钮未找到');
    }
    
    // 站点配置模态框事件监听器
    const siteConfigModal = document.getElementById('siteConfigModal');
    if (siteConfigModal) {
        siteConfigModal.addEventListener('hidden.bs.modal', function() {
            console.log('站点配置模态框关闭事件触发');
            // 强制清理背景遮罩
            setTimeout(() => {
                const backdrops = document.querySelectorAll('.modal-backdrop');
                console.log('找到背景遮罩数量:', backdrops.length);
                backdrops.forEach(backdrop => {
                    console.log('移除背景遮罩');
                    backdrop.remove();
                });
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }, 100);
        });
    }
}

// 紧急修复函数 - 清理模态框背景遮罩
function clearModalBackdrop() {
    console.log('执行紧急背景遮罩清理');
    const backdrops = document.querySelectorAll('.modal-backdrop');
    console.log('找到背景遮罩数量:', backdrops.length);
    backdrops.forEach(backdrop => {
        console.log('移除背景遮罩');
        backdrop.remove();
    });
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // 关闭所有打开的模态框
    const openModals = document.querySelectorAll('.modal.show');
    openModals.forEach(modal => {
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) {
            modalInstance.hide();
        }
    });
    
    console.log('背景遮罩清理完成');
}

// 文件列表滚动控制变量
let fileListScrollInterval = null;
let fileListScrollTimeout = null;

// 文件列表滚动控制函数
function scrollFileListUp() {
    const fileList = document.getElementById('file-list');
    if (fileList) {
        const scrollAmount = 50; // 每次滚动50px
        fileList.scrollTop = Math.max(0, fileList.scrollTop - scrollAmount);
        updateScrollButtons();
    }
}

function scrollFileListDown() {
    const fileList = document.getElementById('file-list');
    if (fileList) {
        const scrollAmount = 50; // 每次滚动50px
        const maxScroll = fileList.scrollHeight - fileList.clientHeight;
        fileList.scrollTop = Math.min(maxScroll, fileList.scrollTop + scrollAmount);
        updateScrollButtons();
    }
}

// 开始文件列表滚动（支持长按）
function startFileListScroll(direction) {
    // 防止默认行为和事件冒泡
    event.preventDefault();
    
    // 立即执行一次滚动
    if (direction === 'up') {
        scrollFileListUp();
    } else if (direction === 'down') {
        scrollFileListDown();
    }
    
    // 设置延迟，500ms后开始连续滚动
    fileListScrollTimeout = setTimeout(() => {
        fileListScrollInterval = setInterval(() => {
            if (direction === 'up') {
                scrollFileListUp();
            } else if (direction === 'down') {
                scrollFileListDown();
            }
        }, 100); // 每100ms滚动一次，比标签滚动更快
    }, 500);
}

// 停止文件列表滚动
function stopFileListScroll() {
    if (fileListScrollTimeout) {
        clearTimeout(fileListScrollTimeout);
        fileListScrollTimeout = null;
    }
    if (fileListScrollInterval) {
        clearInterval(fileListScrollInterval);
        fileListScrollInterval = null;
    }
}

// 更新滚动按钮的显示状态
function updateScrollButtons() {
    const fileList = document.getElementById('file-list');
    const scrollUpBtn = document.getElementById('scroll-up-btn');
    const scrollDownBtn = document.getElementById('scroll-down-btn');
    
    if (!fileList || !scrollUpBtn || !scrollDownBtn) {
        console.log('滚动按钮元素未找到');
        return;
    }
    
    const isScrollable = fileList.scrollHeight > fileList.clientHeight;
    const isAtTop = fileList.scrollTop <= 0;
    const isAtBottom = fileList.scrollTop >= fileList.scrollHeight - fileList.clientHeight - 1;
    
    console.log('滚动状态:', {
        scrollHeight: fileList.scrollHeight,
        clientHeight: fileList.clientHeight,
        scrollTop: fileList.scrollTop,
        isScrollable: isScrollable,
        isAtTop: isAtTop,
        isAtBottom: isAtBottom
    });
    
    // 如果内容不需要滚动，隐藏所有按钮
    if (!isScrollable) {
        scrollUpBtn.classList.add('hidden');
        scrollDownBtn.classList.add('hidden');
        console.log('内容无需滚动，隐藏所有按钮');
        return;
    }
    
    // 根据滚动位置显示/隐藏按钮
    if (isAtTop) {
        scrollUpBtn.classList.add('hidden');
    } else {
        scrollUpBtn.classList.remove('hidden');
    }
    
    if (isAtBottom) {
        scrollDownBtn.classList.add('hidden');
    } else {
        scrollDownBtn.classList.remove('hidden');
    }
}

// 调试函数 - 检查标签容器状态
function debugTabsState() {
    const tabsContainer = document.getElementById('alist-tabs');
    const tabsNav = document.getElementById('alist-tabs-nav');
    
    if (!tabsContainer) {
        console.log('标签容器未找到');
        return;
    }
    
    const computedStyle = window.getComputedStyle(tabsContainer);
    const tabCount = tabsContainer.children.length;
    
    console.log('标签容器调试信息:', {
        element: tabsContainer,
        tabCount: tabCount,
        clientWidth: tabsContainer.clientWidth,
        scrollWidth: tabsContainer.scrollWidth,
        scrollLeft: tabsContainer.scrollLeft,
        offsetWidth: tabsContainer.offsetWidth,
        overflowX: computedStyle.overflowX,
        display: computedStyle.display,
        flex: computedStyle.flex,
        scrollbarWidth: computedStyle.scrollbarWidth,
        navVisible: tabsNav ? tabsNav.style.display : 'nav not found'
    });
    
    // 强制重新计算导航按钮状态
    updateTabNavButtons();
}

// 调试函数 - 检查文件列表滚动状态
function debugScrollState() {
    const fileList = document.getElementById('file-list');
    if (!fileList) {
        console.log('文件列表元素未找到');
        return;
    }
    
    const computedStyle = window.getComputedStyle(fileList);
    console.log('文件列表调试信息:', {
        element: fileList,
        offsetHeight: fileList.offsetHeight,
        scrollHeight: fileList.scrollHeight,
        clientHeight: fileList.clientHeight,
        scrollTop: fileList.scrollTop,
        overflowY: computedStyle.overflowY,
        height: computedStyle.height,
        maxHeight: computedStyle.maxHeight,
        display: computedStyle.display,
        position: computedStyle.position
    });
    
    // 强制设置滚动
    fileList.style.overflowY = 'auto';
    fileList.style.height = '100%';
    console.log('已强制设置滚动属性');
}

// 标签页滚动控制变量
let tabScrollInterval = null;
let tabScrollTimeout = null;

// 标签页滚动控制
function scrollTabs(direction) {
    const tabsContainer = document.getElementById('alist-tabs');
    if (!tabsContainer) return;
    
    const scrollAmount = 100; // 每次滚动100px
    const currentScroll = tabsContainer.scrollLeft;
    
    if (direction === 'prev') {
        tabsContainer.scrollLeft = Math.max(0, currentScroll - scrollAmount);
    } else if (direction === 'next') {
        const maxScroll = tabsContainer.scrollWidth - tabsContainer.clientWidth;
        tabsContainer.scrollLeft = Math.min(maxScroll, currentScroll + scrollAmount);
    }
    
    // 更新导航按钮状态
    setTimeout(() => updateTabNavButtons(), 100);
}

// 开始标签页滚动（支持长按）
function startTabScroll(direction) {
    // 防止默认行为和事件冒泡
    event.preventDefault();
    
    // 立即执行一次滚动
    scrollTabs(direction);
    
    // 设置延迟，500ms后开始连续滚动
    tabScrollTimeout = setTimeout(() => {
        tabScrollInterval = setInterval(() => {
            scrollTabs(direction);
        }, 150); // 每150ms滚动一次
    }, 500);
}

// 停止标签页滚动
function stopTabScroll() {
    if (tabScrollTimeout) {
        clearTimeout(tabScrollTimeout);
        tabScrollTimeout = null;
    }
    if (tabScrollInterval) {
        clearInterval(tabScrollInterval);
        tabScrollInterval = null;
    }
}

// 更新标签页导航按钮状态
function updateTabNavButtons() {
    const tabsContainer = document.getElementById('alist-tabs');
    const tabsNav = document.getElementById('alist-tabs-nav');
    const prevBtn = document.getElementById('prev-tab-btn');
    const nextBtn = document.getElementById('next-tab-btn');
    
    if (!tabsContainer || !tabsNav || !prevBtn || !nextBtn) return;
    
    // 更精确的判断：考虑到小数差异，至少要有5px的差异才显示导航
    const scrollDiff = tabsContainer.scrollWidth - tabsContainer.clientWidth;
    const needsNavigation = scrollDiff > 5;
    const isAtStart = tabsContainer.scrollLeft <= 1;
    const isAtEnd = tabsContainer.scrollLeft >= scrollDiff - 1;
    
    // 显示或隐藏导航按钮
    if (needsNavigation) {
        tabsNav.style.display = 'flex';
        prevBtn.disabled = isAtStart;
        nextBtn.disabled = isAtEnd;
    } else {
        tabsNav.style.display = 'none';
        // 确保滚动位置重置为0
        tabsContainer.scrollLeft = 0;
    }
    
    console.log('标签导航状态:', {
        needsNavigation,
        isAtStart,
        isAtEnd,
        scrollLeft: tabsContainer.scrollLeft,
        scrollWidth: tabsContainer.scrollWidth,
        clientWidth: tabsContainer.clientWidth,
        scrollDiff: scrollDiff
    });
}

// 加载Z-Blog配置
async function loadTypechoConfig() {
    try {
        const response = await fetch('/api/typecho/config');
        const config = await response.json();
        
        // 更新站点信息显示
        let baseUrl = config.api_url;
        // 确保baseUrl包含协议前缀
        if (baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrl = 'http://' + baseUrl;
        }
        const siteInfoElement = document.getElementById('site-info');
        if (siteInfoElement) {
            // 创建可点击的链接显示
            siteInfoElement.innerHTML = `当前站点: <a href="${baseUrl}" target="_blank" rel="noopener noreferrer" class="text-primary text-decoration-none" title="点击在新标签页中打开站点">${baseUrl}</a>`;
        }
    } catch (error) {
        console.error('加载Z-Blog配置失败:', error);
    }
}

// 显示站点配置对话框
function showSiteConfig() {
    console.log('showSiteConfig被调用');
    
    fetch('/api/typecho/config')
        .then(response => {
            console.log('API响应状态:', response.status);
            if (!checkAuthStatus(response)) {
                return;
            }
            return response.json();
        })
        .then(config => {
            if (!config) return;
            
            console.log('配置数据:', config);
            const baseUrl = config.api_url;
            
            const siteUrlElement = document.getElementById('site-url');
            const siteUsernameElement = document.getElementById('site-username');
            const sitePasswordElement = document.getElementById('site-password');
            const modalElement = document.getElementById('siteConfigModal');
            
            console.log('Elements found:', {
                siteUrl: !!siteUrlElement,
                siteUsername: !!siteUsernameElement,
                sitePassword: !!sitePasswordElement,
                modal: !!modalElement
            });
            
            if (!siteUrlElement || !siteUsernameElement || !sitePasswordElement || !modalElement) {
                console.error('某些必需的DOM元素未找到');
                showAlert('页面元素加载错误，请刷新页面重试', 'danger');
                return;
            }
            
            siteUrlElement.value = baseUrl;
            siteUsernameElement.value = config.username;
            sitePasswordElement.value = config.password;
            
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        })
        .catch(error => {
            console.error('加载站点配置失败:', error);
            showAlert('加载站点配置失败', 'danger');
        });
}

// 保存站点配置
function saveSiteConfig() {
    const baseUrl = document.getElementById('site-url').value.trim();
    const username = document.getElementById('site-username').value.trim();
    const password = document.getElementById('site-password').value.trim();
    
    if (!baseUrl || !username || !password) {
        showAlert('请填写完整的配置信息', 'warning');
        return;
    }
    
    const config = {
        api_url: baseUrl.replace(/\/$/, ''),
        username: username,
        password: password
    };
    
    fetch('/api/typecho/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showAlert('配置保存成功！');
            // 确保模态框正确关闭
            const modal = bootstrap.Modal.getInstance(document.getElementById('siteConfigModal'));
            if (modal) {
                modal.hide();
            }
            // 强制移除背景遮罩
            setTimeout(() => {
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => backdrop.remove());
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }, 300);
            
            loadTypechoConfig();
            loadCategories();
            loadTags();
        } else {
            showAlert('配置保存失败', 'danger');
        }
    })
    .catch(error => {
        console.error('保存配置失败:', error);
        showAlert('配置保存失败', 'danger');
    });
}

// 加载分类
async function loadCategories() {
    try {
        console.log('开始加载分类...');
        console.log('当前页面URL:', window.location.href);
        console.log('发起API请求:', '/api/typecho/categories');
        
        const response = await fetch('/api/typecho/categories');
        console.log('分类API响应状态:', response.status);
        console.log('分类API响应头:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            throw new Error(`HTTP错误！状态：${response.status}`);
        }
        
        const categoryTree = await response.json();
        console.log('接收到的分类树数据:', categoryTree);
        console.log('分类树数据类型:', typeof categoryTree);
        console.log('分类树数据是否为空:', Object.keys(categoryTree).length === 0);
        console.log('分类树数据中的根分类数量:', categoryTree[0] ? categoryTree[0].length : 0);
        
        if (!categoryTree || typeof categoryTree !== 'object') {
            console.error('分类数据格式错误:', categoryTree);
            showAlert('分类数据格式错误，请检查API连接', 'danger');
            return;
        }
        
        if (Object.keys(categoryTree).length === 0) {
            console.error('分类数据为空:', categoryTree);
            showAlert('未获取到分类数据，请检查Z-Blog站点设置', 'warning');
            return;
        }
        
        renderCategoryTree(categoryTree);
        console.log('分类渲染完成');
        showAlert('分类加载成功！', 'success');
    } catch (error) {
        console.error('加载分类失败:', error);
        console.error('错误堆栈:', error.stack);
        showAlert(`加载分类失败: ${error.message}`, 'danger');
    }
}

// 渲染分类树
function renderCategoryTree(tree, parentElement = null, parentId = 0) {
    console.log('开始渲染分类树...');
    console.log('渲染参数:', { tree, parentElement, parentId });
    
    const container = parentElement || document.getElementById('category-tree');
    console.log('分类树容器元素:', container);
    
    if (!container) {
        console.error('分类树容器元素未找到');
        showAlert('分类树容器元素未找到，请检查页面结构', 'danger');
        return;
    }
    
    if (!parentElement) {
        console.log('清空分类树容器');
        container.innerHTML = '';
    }
    
    const categories = tree[parentId] || [];
    console.log(`获取到父分类ID ${parentId} 的子分类数量: ${categories.length}`);
    console.log(`父分类ID ${parentId} 的子分类数据:`, categories);
    
    if (categories.length === 0) {
        console.log(`父分类ID ${parentId} 没有子分类`);
        return;
    }
    
    categories.forEach((category, index) => {
        console.log(`渲染第 ${index + 1} 个分类:`, category);
        
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.style.marginLeft = parentElement ? '20px' : '0px';
        
        const categoryId = category.ID || category.id || category.categoryId || category.category_id;
        const categoryName = category.Name || category.name || category.categoryName || category.category_name;
        
        console.log(`分类ID: ${categoryId}, 分类名称: ${categoryName}`);
        
        if (!categoryId || !categoryName) {
            console.error('分类ID或名称为空:', category);
            return;
        }
        
        categoryItem.innerHTML = `
            <div class="d-flex align-items-center">
                ${tree[categoryId] ? '<span class="expand-btn me-1" onclick="toggleCategory(this)">▶</span>' : '<span class="me-3"></span>'}
                <span class="category-name" data-id="${categoryId}" data-parent-id="${parentId}" data-name="${categoryName.replace(/"/g, '&quot;')}" onclick="selectCategory(${categoryId})" oncontextmenu="showCategoryContextMenu(event, ${categoryId}, '${categoryName.replace(/'/g, '\\\'').replace(/"/g, '&quot;')}', ${parentId})">${categoryName}</span>
            </div>
            <div class="children" style="display: none;"></div>
        `;
        
        console.log('创建分类元素:', categoryItem);
        container.appendChild(categoryItem);
        console.log('分类元素已添加到容器');
        
        // 递归渲染子分类
        if (tree[categoryId]) {
            console.log(`分类 ${categoryName} (ID: ${categoryId}) 有子分类，递归渲染`);
            renderCategoryTree(tree, categoryItem.querySelector('.children'), categoryId);
        } else {
            console.log(`分类 ${categoryName} (ID: ${categoryId}) 没有子分类`);
        }
    });
    
    console.log('分类树渲染完成');
}

// 切换分类展开/收起
function toggleCategory(btn) {
    const children = btn.parentElement.parentElement.querySelector('.children');
    if (children.style.display === 'none') {
        children.style.display = 'block';
        btn.textContent = '▼';
    } else {
        children.style.display = 'none';
        btn.textContent = '▶';
    }
}

// 选择分类
function selectCategory(categoryId) {
    const categoryElement = document.querySelector(`[data-id="${categoryId}"]`);
    
    if (selectedCategories.has(categoryId)) {
        selectedCategories.delete(categoryId);
        categoryElement.classList.remove('selected');
        console.log('取消选择分类 - ID:', categoryId, '名称:', categoryElement.getAttribute('data-name'));
    } else {
        selectedCategories.add(categoryId);
        categoryElement.classList.add('selected');
        console.log('选择分类 - ID:', categoryId, '名称:', categoryElement.getAttribute('data-name'));
        
        // 手动选择时也滚动到该分类（不需要闪烁效果）
        setTimeout(() => {
            categoryElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
            });
        }, 50);
    }
    
    // 更新选中样式（但跳过自动滚动，因为上面已经处理了）
    updateSelectedCategoriesWithoutScroll();
}

// 更新选中分类样式（不包含自动滚动）
function updateSelectedCategoriesWithoutScroll() {
    // 清除所有选中状态
    document.querySelectorAll('.category-name').forEach(el => {
        el.style.backgroundColor = '';
        el.style.color = '';
        el.style.padding = '';
        el.style.borderRadius = '';
        el.classList.remove('selected');
    });
    
    // 设置选中状态
    selectedCategories.forEach(categoryId => {
        const categoryElement = document.querySelector(`[data-id="${categoryId}"]`);
        if (categoryElement) {
            categoryElement.style.backgroundColor = '#007bff';
            categoryElement.style.color = 'white';
            categoryElement.style.padding = '2px 5px';
            categoryElement.style.borderRadius = '3px';
            categoryElement.classList.add('selected');
            
            // 确保父分类展开（如果是二级分类）
            const categoryItem = categoryElement.closest('.category-item');
            if (categoryItem && categoryItem.parentElement && 
                categoryItem.parentElement.classList.contains('children')) {
                const parentItem = categoryItem.parentElement.parentElement;
                if (parentItem) {
                    const children = parentItem.querySelector('.children');
                    const expandBtn = parentItem.querySelector('.expand-btn');
                    if (children && expandBtn) {
                        children.style.display = 'block';
                        expandBtn.textContent = '▼';
                    }
                }
            }
        }
    });
}

// 更新选中的分类样式
function updateSelectedCategories() {
    // 清除所有选中状态和可能的定时器
    document.querySelectorAll('.category-name').forEach(el => {
        el.style.backgroundColor = '';
        el.style.color = '';
        el.style.padding = '';
        el.style.borderRadius = '';
        el.classList.remove('selected');
        // 清除可能存在的定时器ID
        if (el.flashTimer) {
            clearTimeout(el.flashTimer);
            el.flashTimer = null;
        }
    });
    
    let firstSelectedElement = null;
    let selectedElements = [];
    
    // 设置选中状态
    selectedCategories.forEach(categoryId => {
        const categoryElement = document.querySelector(`[data-id="${categoryId}"]`);
        if (categoryElement) {
            categoryElement.style.backgroundColor = '#007bff';
            categoryElement.style.color = 'white';
            categoryElement.style.padding = '2px 5px';
            categoryElement.style.borderRadius = '3px';
            categoryElement.classList.add('selected');
            
            selectedElements.push(categoryElement);
            
            // 记录第一个选中的元素用于定位
            if (!firstSelectedElement) {
                firstSelectedElement = categoryElement;
            }
            
            // 确保父分类展开（如果是二级分类）
            const categoryItem = categoryElement.closest('.category-item');
            if (categoryItem && categoryItem.parentElement && 
                categoryItem.parentElement.classList.contains('children')) {
                const parentItem = categoryItem.parentElement.parentElement;
                if (parentItem) {
                    const children = parentItem.querySelector('.children');
                    const expandBtn = parentItem.querySelector('.expand-btn');
                    if (children && expandBtn) {
                        children.style.display = 'block';
                        expandBtn.textContent = '▼';
                    }
                }
            }
        }
    });
    
    // 自动滚动到第一个选中的分类，并为所有选中的分类添加闪烁效果
    if (firstSelectedElement && selectedCategories.size > 0) {
        setTimeout(() => {
            firstSelectedElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
            });
            
            // 为所有选中的分类添加同步闪烁效果
            selectedElements.forEach(element => {
                element.style.backgroundColor = '#28a745'; // 绿色闪烁
                element.flashTimer = setTimeout(() => {
                    element.style.backgroundColor = '#007bff'; // 恢复蓝色
                    element.flashTimer = null;
                }, 600);
            });
        }, 100);
    }
}

// 全部展开/收起分类
function toggleCategories() {
    const btn = document.getElementById('toggle-categories');
    const isExpanded = btn.textContent === '全部收起';
    
    document.querySelectorAll('.expand-btn').forEach(expandBtn => {
        const children = expandBtn.parentElement.parentElement.querySelector('.children');
        if (isExpanded) {
            children.style.display = 'none';
            expandBtn.textContent = '▶';
        } else {
            children.style.display = 'block';
            expandBtn.textContent = '▼';
        }
    });
    
    btn.textContent = isExpanded ? '全部展开' : '全部收起';
}

// 过滤分类
function filterCategories() {
    const keyword = document.getElementById('category-search').value.toLowerCase().trim();
    const allCategoryItems = document.querySelectorAll('.category-item');
    let matchedItems = [];
    let currentMatchIndex = 0;
    
    // 清除之前的高亮
    document.querySelectorAll('.category-name').forEach(name => {
        name.style.backgroundColor = '';
    });
    
    if (keyword === '') {
        // 如果搜索框为空，显示所有分类并收起展开状态
        allCategoryItems.forEach(item => {
            item.style.display = 'block';
            const children = item.querySelector('.children');
            const expandBtn = item.querySelector('.expand-btn');
            if (children && expandBtn) {
                children.style.display = 'none';
                expandBtn.textContent = '▶';
            }
        });
        
        // 清空匹配结果并禁用导航按钮
        window.categoryMatches = [];
        window.categoryMatchIndex = 0;
        updateCategoryNavigationButtons();
        return;
    }
    
    // 保持所有分类显示，只高亮匹配项
    allCategoryItems.forEach(item => {
        item.style.display = 'block';
        const categoryName = item.querySelector('.category-name');
        if (categoryName && categoryName.textContent.toLowerCase().includes(keyword)) {
            matchedItems.push(item);
            
            // 如果是子分类，自动展开父分类
            let parentItem = item.parentElement;
            while (parentItem) {
                if (parentItem.classList.contains('category-item')) {
                    const children = parentItem.querySelector('.children');
                    const expandBtn = parentItem.querySelector('.expand-btn');
                    if (children && expandBtn && children.contains(item)) {
                        children.style.display = 'block';
                        expandBtn.textContent = '▼';
                    }
                    break;
                }
                
                if (parentItem.classList.contains('children')) {
                    parentItem.style.display = 'block';
                    parentItem = parentItem.parentElement;
                } else {
                    break;
                }
            }
        }
    });
    
    // 保存匹配结果用于导航
    window.categoryMatches = matchedItems;
    window.categoryMatchIndex = 0;
    
    // 更新导航按钮状态
    updateCategoryNavigationButtons();
    
    // 高亮并定位到第一个匹配项
    if (matchedItems.length > 0) {
        highlightCategoryMatch(0);
    }
}

// 更新分类导航按钮状态
function updateCategoryNavigationButtons() {
    const prevBtn = document.getElementById('category-prev');
    const nextBtn = document.getElementById('category-next');
    const matches = window.categoryMatches || [];
    const currentIndex = window.categoryMatchIndex || 0;
    
    if (matches.length <= 1) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
    } else {
        prevBtn.disabled = currentIndex <= 0;
        nextBtn.disabled = currentIndex >= matches.length - 1;
    }
}

// 高亮指定索引的分类匹配项
function highlightCategoryMatch(index) {
    const matches = window.categoryMatches || [];
    if (index < 0 || index >= matches.length) return;
    
    // 清除之前的高亮
    document.querySelectorAll('.category-name').forEach(name => {
        if (name.style.backgroundColor === 'rgb(255, 243, 205)' || name.style.backgroundColor === '#fff3cd') {
            name.style.backgroundColor = '';
        }
    });
    
    // 高亮当前匹配项
    const currentMatch = matches[index];
    const categoryName = currentMatch.querySelector('.category-name');
    if (categoryName) {
        categoryName.style.backgroundColor = '#fff3cd';
        
        // 滚动到当前匹配项
        currentMatch.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
        });
    }
    
    // 更新索引和按钮状态
    window.categoryMatchIndex = index;
    updateCategoryNavigationButtons();
}

// 分类搜索导航
function navigateCategorySearch(direction) {
    const matches = window.categoryMatches || [];
    if (matches.length <= 1) return;
    
    const currentIndex = window.categoryMatchIndex || 0;
    let newIndex = currentIndex;
    
    if (direction === 'prev' && currentIndex > 0) {
        newIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < matches.length - 1) {
        newIndex = currentIndex + 1;
    }
    
    if (newIndex !== currentIndex) {
        highlightCategoryMatch(newIndex);
    }
}

// 加载标签
async function loadTags() {
    try {
        console.log('开始加载标签...');
        console.log('当前页面URL:', window.location.href);
        console.log('发起API请求:', '/api/typecho/tags');
        
        const response = await fetch('/api/typecho/tags');
        console.log('标签API响应状态:', response.status);
        console.log('标签API响应头:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            throw new Error(`HTTP错误！状态：${response.status}`);
        }
        
        const tags = await response.json();
        console.log('接收到的标签数据:', tags);
        
        if (!Array.isArray(tags)) {
            console.error('标签数据格式错误:', tags);
            showAlert('标签数据格式错误，请检查API连接', 'danger');
            return;
        }
        
        renderTags(tags);
        console.log('标签渲染完成');
    } catch (error) {
        console.error('加载标签失败:', error);
        showAlert(`加载标签失败: ${error.message}`, 'danger');
    }
}

// 渲染标签
function renderTags(tags) {
    const container = document.getElementById('tag-list');
    container.innerHTML = '';
    
    console.log('渲染标签 - 接收到的标签数据:', tags);
    console.log('渲染标签 - 标签数量:', tags.length);
    
    if (!tags || tags.length === 0) {
        console.log('渲染标签 - 无标签数据');
        container.innerHTML = '<p class="text-muted">暂无标签数据</p>';
        return;
    }
    
    tags.forEach((tag, index) => {
        console.log(`渲染标签 - 第 ${index + 1} 个标签数据:`, tag);
        
        const tagElement = document.createElement('span');
        tagElement.className = 'tag-item';
        
        // 尝试从不同属性中获取标签名称
        let tagName = tag.Name || tag.name || tag.TagName || tag.tag_name || tag.Title || tag.title;
        
        console.log(`渲染标签 - 提取的标签名称: ${tagName}`);
        
        if (tagName) {
            tagElement.textContent = tagName;
            tagElement.onclick = () => selectTag(tagName, tagElement);
            container.appendChild(tagElement);
        } else {
            console.warn(`渲染标签 - 无法提取标签名称，标签数据:`, tag);
        }
    });
    
    console.log('渲染标签 - 完成');
}

// 选择标签
function selectTag(tagName, element) {
    if (selectedTags.has(tagName)) {
        selectedTags.delete(tagName);
        element.classList.remove('selected');
    } else {
        selectedTags.add(tagName);
        element.classList.add('selected');
    }
}

// 自动选择视频标签
function autoSelectVideoTag() {
    const videoTagName = '视频';
    
    // 查找"视频"标签元素
    const tagElements = document.querySelectorAll('.tag-item');
    let videoTagElement = null;
    
    for (const element of tagElements) {
        if (element.textContent.trim() === videoTagName) {
            videoTagElement = element;
            break;
        }
    }
    
    if (videoTagElement) {
        // 如果找到了"视频"标签，选中它
        if (!selectedTags.has(videoTagName)) {
            selectedTags.add(videoTagName);
            videoTagElement.classList.add('selected');
        }
    } else {
        // 如果没有找到"视频"标签，添加到新增标签输入框
        const newTagsInput = document.getElementById('new-tags');
        if (newTagsInput) {
            const currentValue = newTagsInput.value.trim();
            if (currentValue) {
                if (!currentValue.includes(videoTagName)) {
                    newTagsInput.value = `${currentValue},${videoTagName}`;
                }
            } else {
                newTagsInput.value = videoTagName;
            }
        }
    }
}

// 过滤标签
function filterTags() {
    const keyword = document.getElementById('tag-search').value.toLowerCase().trim();
    const tags = document.querySelectorAll('.tag-item');
    let matchedTags = [];
    
    // 清除之前的高亮
    tags.forEach(tag => {
        tag.style.backgroundColor = '';
        tag.style.color = '';
    });
    
    if (keyword === '') {
        // 显示所有标签
        tags.forEach(tag => {
            tag.style.display = 'inline-block';
        });
        
        // 清空匹配结果并禁用导航按钮
        window.tagMatches = [];
        window.tagMatchIndex = 0;
        updateTagNavigationButtons();
        return;
    }
    
    // 保持所有标签显示，只高亮匹配项
    tags.forEach(tag => {
        tag.style.display = 'inline-block';
        if (tag.textContent.toLowerCase().includes(keyword)) {
            matchedTags.push(tag);
        }
    });
    
    // 保存匹配结果用于导航
    window.tagMatches = matchedTags;
    window.tagMatchIndex = 0;
    
    // 更新导航按钮状态
    updateTagNavigationButtons();
    
    // 高亮并定位到第一个匹配项
    if (matchedTags.length > 0) {
        highlightTagMatch(0);
    }
}

// 更新标签导航按钮状态
function updateTagNavigationButtons() {
    const prevBtn = document.getElementById('tag-prev');
    const nextBtn = document.getElementById('tag-next');
    const matches = window.tagMatches || [];
    const currentIndex = window.tagMatchIndex || 0;
    
    if (matches.length <= 1) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
    } else {
        prevBtn.disabled = currentIndex <= 0;
        nextBtn.disabled = currentIndex >= matches.length - 1;
    }
}

// 高亮指定索引的标签匹配项
function highlightTagMatch(index) {
    const matches = window.tagMatches || [];
    if (index < 0 || index >= matches.length) return;
    
    // 清除之前的高亮
    document.querySelectorAll('.tag-item').forEach(tag => {
        if (tag.style.backgroundColor === 'rgb(255, 243, 205)' || tag.style.backgroundColor === '#fff3cd') {
            tag.style.backgroundColor = '';
            tag.style.color = '';
        }
    });
    
    // 高亮当前匹配项
    const currentMatch = matches[index];
    if (currentMatch) {
        currentMatch.style.backgroundColor = '#fff3cd';
        currentMatch.style.color = '#856404';
        
        // 滚动到当前匹配项
        currentMatch.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
        });
    }
    
    // 更新索引和按钮状态
    window.tagMatchIndex = index;
    updateTagNavigationButtons();
}

// 标签搜索导航
function navigateTagSearch(direction) {
    const matches = window.tagMatches || [];
    if (matches.length <= 1) return;
    
    const currentIndex = window.tagMatchIndex || 0;
    let newIndex = currentIndex;
    
    if (direction === 'prev' && currentIndex > 0) {
        newIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < matches.length - 1) {
        newIndex = currentIndex + 1;
    }
    
    if (newIndex !== currentIndex) {
        highlightTagMatch(newIndex);
    }
}

// 自动匹配分类
function autoMatchCategory() {
    const title = document.getElementById('article-title').value.trim();
    if (!title) {
        // 清除之前的选择
        selectedCategories.clear();
        updateSelectedCategories();
        return;
    }
    
    const normalizedTitle = normalizeText(title);
    console.log('自动匹配分类 - 标题:', title, '标准化:', normalizedTitle);
    
    // 清除之前的选择
    selectedCategories.clear();
    
    // 查找匹配的分类
    let matchCount = 0;
    document.querySelectorAll('.category-name').forEach(el => {
        const categoryName = el.textContent.trim();
        const normalizedCategory = normalizeText(categoryName);
        
        // 检查是否是二级分类（有父级）- 通过检查是否在children容器内
        const categoryItem = el.closest('.category-item');
        const isSecondLevel = categoryItem && categoryItem.parentElement && 
                             categoryItem.parentElement.classList.contains('children');
        
        if (isSecondLevel) {
            const isMatch = normalizedCategory === normalizedTitle || 
                           normalizedCategory.includes(normalizedTitle) || 
                           normalizedTitle.includes(normalizedCategory);
            
            console.log('检查分类:', categoryName, '标准化:', normalizedCategory, '匹配:', isMatch);
            
            if (isMatch) {
                const categoryId = parseInt(el.getAttribute('data-id'));
                if (isNaN(categoryId)) {
                    console.error('无效的分类ID:', el.getAttribute('data-id'), '分类名:', categoryName);
                } else {
                    selectedCategories.add(categoryId);
                    matchCount++;
                    console.log('匹配成功 - 分类ID:', categoryId, '分类名:', categoryName);
                }
            }
        }
    });
    
    console.log('匹配完成 - 共匹配到', matchCount, '个分类');
    updateSelectedCategories();
}

// 标准化文本用于匹配
function normalizeText(text) {
    if (!text) return "";
    // 转换为小写并移除常见分隔符
    return text.toLowerCase().replace(/[\s_\-\.]+/g, '');
}

// 更新预览
function updatePreview() {
    const content = document.getElementById('article-content').value;
    let html;
    
    // 智能检测：如果内容包含HTML标签，直接使用，否则进行Markdown转换
    if (content.includes('<') && content.includes('>')) {
        html = content;
        console.log('检测到HTML内容，直接使用');
    } else {
        html = markdownToHtml(content);
        console.log('检测到Markdown内容，进行转换');
    }
    
    document.getElementById('preview-content').innerHTML = html;
}

// 加载Alist账户
async function loadAlistAccounts() {
    try {
        const response = await fetch('/api/alist/accounts');
        const accounts = await response.json();
        
        const select = document.getElementById('alist-account');
        select.innerHTML = '<option>选择Alist账户</option>';
        
        accounts.forEach((account, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${account.server_url} (${account.username})`;
            select.appendChild(option);
        });
        
        // 如果有账户，默认选择第一个
        if (accounts.length > 0) {
            select.selectedIndex = 1;
            switchAlistAccount();
        } else {
            // 如果没有账户，清空文件列表和标签页
            document.getElementById('file-list').innerHTML = '<p class="text-muted text-center">请先配置Alist账户</p>';
            document.getElementById('alist-tabs').innerHTML = '';
        }
    } catch (error) {
        console.error('加载Alist账户失败:', error);
    }
}

// 切换Alist账户
async function switchAlistAccount() {
    const select = document.getElementById('alist-account');
    const accountIndex = select.value;
    
    if (accountIndex === '选择Alist账户') return;
    
    try {
        const response = await fetch('/api/alist/accounts');
        const accounts = await response.json();
        currentAccount = accounts[accountIndex];
        currentPath = '/';
        
        // 清空现有标签页
        alistTabs = {};
        currentActiveTab = null;
        
        // 创建根目录标签页
        const rootTabId = 'alist-tab-root';
        console.log('创建根目录标签页，账户:', currentAccount);
        createAlistTab(rootTabId, '根目录', '/', true);
    } catch (error) {
        console.error('切换账户失败:', error);
    }
}

// 加载文件列表
async function loadFileList() {
    if (!currentAccount) return;
    
    // 如果有活动标签页，更新标签页的文件列表
    if (currentActiveTab && alistTabs[currentActiveTab]) {
        await loadTabFileList(currentActiveTab);
        return;
    }
    
    // 否则使用原来的逻辑
    try {
        // 显示加载状态
        const container = document.getElementById('file-list');
        container.innerHTML = '<div class="text-center p-3"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><br><small class="text-muted">正在加载文件列表...</small></div>';
        
        console.log(`开始加载文件列表: ${currentPath}`);
        const response = await fetch('/api/alist/files', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                account: currentAccount,
                path: currentPath
            })
        });
        
        // 检查登录状态
        if (!checkAuthStatus(response)) {
            return;
        }
        
        const files = await response.json();
        if (files.error) {
            showAlert(`加载文件失败: ${files.error}`, 'danger');
            container.innerHTML = `<p class="text-danger text-center">加载失败: ${files.error}</p>`;
            return;
        }
        
        console.log(`文件列表加载完成: ${currentPath}，文件数量: ${files.length}`);
        fileList = files;
        renderFileList(files);
    } catch (error) {
        console.error('加载文件列表失败:', error);
        showAlert('加载文件列表失败', 'danger');
        const container = document.getElementById('file-list');
        container.innerHTML = `<p class="text-danger text-center">网络错误: ${error.message}</p>`;
    }
}

// 渲染文件列表
function renderFileList(files) {
    console.log('渲染文件列表，文件数量:', files.length);
    const container = document.getElementById('file-list');
    container.innerHTML = '';
    
    if (!files || files.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">该目录为空</p>';
        // 延迟更新滚动按钮状态，确保DOM已更新
        setTimeout(() => updateScrollButtons(), 10);
        return;
    }
    
    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.setAttribute('data-index', index);
        
        const isFolder = file.type === 1 || file.is_dir;
        const displayName = isFolder ? `[文件夹] ${file.name}` : file.name;
        
        fileItem.innerHTML = `<span class="${isFolder ? 'folder-item' : ''}">${displayName}</span>`;
        
        // 单击事件
        fileItem.addEventListener('click', () => {
            if (isFolder) {
                // 文件夹单击打开
                const newPath = currentPath.replace(/\/$/, '') + '/' + file.name;
                
                // 如果有活动标签页，保存当前滚动位置并更新标签页信息
                if (currentActiveTab && alistTabs[currentActiveTab]) {
                    saveCurrentTabScrollPosition(); // 保存当前滚动位置
                    alistTabs[currentActiveTab].path = newPath;
                    alistTabs[currentActiveTab].name = file.name;
                    alistTabs[currentActiveTab].files = []; // 清空文件列表以触发重新加载
                    alistTabs[currentActiveTab].scrollPosition = 0; // 重置滚动位置到顶部
                    alistTabs[currentActiveTab].selectedFile = null; // 清除选中文件状态
                    renderAlistTabs(); // 重新渲染标签页以更新名称
                }
                
                currentPath = newPath;
                loadFileList();
            } else {
                // 文件单击复制链接
                copyFileLink(file);
            }
        });
        
        // 右键菜单（文件夹和文件都支持）
        fileItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            // 清除之前的高亮选择
            clearFileHighlight();
            
            // 高亮当前选中的项目
            fileItem.classList.add('right-click-selected');
            
            // 保存当前选中的文件状态
            saveCurrentTabSelectedFile(file);
            
            // 显示相应的右键菜单
            if (isFolder) {
                showFolderContextMenu(e, file);
            } else {
                showFileContextMenu(e, file);
            }
        });
        
        container.appendChild(fileItem);
    });
    
    // 延迟更新滚动按钮状态，确保DOM已更新
    setTimeout(() => {
        updateScrollButtons();
        
        // 恢复当前标签页的选中文件高亮状态
        if (currentActiveTab) {
            restoreTabSelectedFile(currentActiveTab);
        }
        
        // 为文件列表添加滚动事件监听器（避免重复添加）
        const fileList = document.getElementById('file-list');
        if (fileList && !fileList.hasScrollListener) {
            fileList.addEventListener('scroll', () => {
                updateScrollButtons();
                // 实时保存当前标签页的滚动位置
                saveCurrentTabScrollPosition();
            });
            
            // 为文件列表添加点击事件，点击空白区域清除高亮
            fileList.addEventListener('click', (e) => {
                // 如果点击的不是文件项且不是右键菜单，则清除高亮
                if (!e.target.closest('.file-item') && !e.target.closest('.context-menu')) {
                    clearFileHighlight();
                }
            });
            
            fileList.hasScrollListener = true;
        }
    }, 10);
}

// 清除文件列表中的高亮选择
function clearFileHighlight() {
    const highlightedItems = document.querySelectorAll('.file-item.right-click-selected');
    highlightedItems.forEach(item => {
        item.classList.remove('right-click-selected');
    });
    
    // 清除当前标签页的选中文件记录
    if (currentActiveTab && alistTabs[currentActiveTab]) {
        alistTabs[currentActiveTab].selectedFile = null;
    }
}

// 保存当前标签页的选中文件状态
function saveCurrentTabSelectedFile(file) {
    if (currentActiveTab && alistTabs[currentActiveTab]) {
        const isFolder = file.type === 1 || file.is_dir;
        const displayName = isFolder ? `[文件夹] ${file.name}` : file.name;
        
        alistTabs[currentActiveTab].selectedFile = {
            name: file.name,
            displayName: displayName,
            type: file.type,
            isFolder: isFolder,
            path: file.path || file.name
        };
        console.log(`保存标签页 ${currentActiveTab} 选中文件:`, displayName);
    }
}

// 恢复标签页的选中文件高亮状态
function restoreTabSelectedFile(tabId) {
    if (!alistTabs[tabId] || !alistTabs[tabId].selectedFile) {
        return;
    }
    
    const selectedFileInfo = alistTabs[tabId].selectedFile;
    console.log(`恢复标签页 ${tabId} 选中文件:`, selectedFileInfo.displayName);
    
    // 延迟执行以确保DOM已渲染
    setTimeout(() => {
        const fileItems = document.querySelectorAll('.file-item');
        fileItems.forEach(item => {
            const displayText = item.textContent.trim();
            // 使用 displayName 进行匹配，这样文件夹和文件都能正确匹配
            if (displayText === selectedFileInfo.displayName) {
                item.classList.add('right-click-selected');
                console.log(`已恢复文件高亮: ${displayText}`);
            }
        });
    }, 50);
}

// 显示文件右键菜单
function showFileContextMenu(event, file) {
    // 移除已存在的菜单
    const existingMenu = document.querySelector('.file-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // 创建右键菜单
    const menu = document.createElement('div');
    menu.className = 'file-context-menu context-menu';
    menu.style.cssText = `
        position: fixed;
        left: ${event.pageX}px;
        top: ${event.pageY}px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 10000;
        min-width: 120px;
        font-size: 0.75rem;
    `;
    
    const menuItems = [
        {
            text: '复制链接',
            action: () => {
                copyFileLink(file);
            }
        }
    ];
    
    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        menuItem.style.cssText = `
            padding: 4px 8px;
            cursor: pointer;
            border-bottom: 1px solid #f0f0f0;
            font-size: 0.75rem;
            line-height: 1.2;
        `;
        menuItem.textContent = item.text;
        menuItem.addEventListener('click', () => {
            item.action();
            menu.remove();
        });
        
        menuItem.addEventListener('mouseenter', () => {
            menuItem.style.backgroundColor = '#f8f9fa';
        });
        
        menuItem.addEventListener('mouseleave', () => {
            menuItem.style.backgroundColor = '';
        });
        
        menu.appendChild(menuItem);
    });
    
    document.body.appendChild(menu);
    
    // 点击其他地方关闭菜单
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 0);
}

// 显示文件夹右键菜单
function showFolderContextMenu(event, folder) {
    // 移除已存在的菜单
    const existingMenu = document.querySelector('.folder-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // 创建菜单
    const menu = document.createElement('div');
    menu.className = 'folder-context-menu';
    menu.style.cssText = `
        position: fixed;
        top: ${event.clientY}px;
        left: ${event.clientX}px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 4px 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 1000;
        min-width: 150px;
    `;
    
    // 添加菜单项
    const openInNewTabItem = document.createElement('div');
    openInNewTabItem.className = 'context-menu-item';
    openInNewTabItem.textContent = '在新标签页中打开';
    openInNewTabItem.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        font-size: 14px;
    `;
    openInNewTabItem.addEventListener('mouseenter', () => {
        openInNewTabItem.style.backgroundColor = '#f0f0f0';
    });
    openInNewTabItem.addEventListener('mouseleave', () => {
        openInNewTabItem.style.backgroundColor = '';
    });
    openInNewTabItem.addEventListener('click', () => {
        openFolderInNewTab(folder);
        menu.remove();
    });
    
    menu.appendChild(openInNewTabItem);
    document.body.appendChild(menu);
    
    // 点击其他地方关闭菜单
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 0);
}

// 在新标签页中打开文件夹
function openFolderInNewTab(folder) {
    const newPath = currentPath.replace(/\/$/, '') + '/' + folder.name;
    const tabId = `alist-tab-${Date.now()}`;
    
    // 创建新标签页
    createAlistTab(tabId, folder.name, newPath, false); // false表示不切换到新标签页
}

// 全局变量存储标签页信息
let alistTabs = {};
let currentActiveTab = null;

// 创建Alist标签页
function createAlistTab(tabId, tabName, path, switchTo = true) {
    console.log('创建标签页:', tabId, tabName, path, '切换到新标签页:', switchTo);
    
    // 检查是否已存在相同路径的标签页
    for (let existingTabId in alistTabs) {
        if (alistTabs[existingTabId].path === path && alistTabs[existingTabId].account === currentAccount) {
            console.log('找到现有标签页:', existingTabId);
            if (switchTo) {
                switchToAlistTab(existingTabId);
            }
            return;
        }
    }
    
    // 创建标签页数据
    alistTabs[tabId] = {
        id: tabId,
        name: tabName,
        path: path,
        account: currentAccount,
        files: [],
        scrollPosition: 0,  // 添加滚动位置记忆
        selectedFile: null  // 添加选中文件记忆
    };
    
    // 渲染标签页UI
    console.log('准备渲染标签页UI');
    renderAlistTabs();
    
    // 切换到新标签页（如果需要）
    if (switchTo) {
        switchToAlistTab(tabId);
    } else {
        // 后台加载文件列表
        loadTabFileList(tabId);
    }
}

// 渲染标签页UI
function renderAlistTabs() {
    console.log('渲染标签页UI，当前标签页数量:', Object.keys(alistTabs).length);
    const tabsContainer = document.getElementById('alist-tabs');
    if (!tabsContainer) {
        console.error('找不到标签页容器 alist-tabs');
        return;
    }
    tabsContainer.innerHTML = '';
    
    // 确保至少有一个根目录标签页
    if (Object.keys(alistTabs).length === 0 && currentAccount) {
        const rootTabId = 'alist-tab-root';
        alistTabs[rootTabId] = {
            id: rootTabId,
            name: '根目录',
            path: '/',
            account: currentAccount,
            files: [],
            scrollPosition: 0,  // 添加滚动位置记忆
            selectedFile: null  // 添加选中文件记忆
        };
        currentActiveTab = rootTabId;
    }
    
    Object.values(alistTabs).forEach(tab => {
        const tabElement = document.createElement('div');
        tabElement.className = `alist-tab ${tab.id === currentActiveTab ? 'active' : ''}`;
        tabElement.setAttribute('data-tab-id', tab.id);
        
        // 标签页名称（截断长名称，最多显示3个字符）
        let displayName = tab.name;
        if (displayName.length > 3) {
            displayName = displayName.substring(0, 3) + '...';
        }
        
        tabElement.innerHTML = `
            <span class="alist-tab-name" title="${tab.name}">${displayName}</span>
            ${Object.keys(alistTabs).length > 1 ? `<button class="alist-tab-close" onclick="closeAlistTab('${tab.id}')" title="关闭">×</button>` : ''}
        `;
        
        // 点击切换标签页
        tabElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('alist-tab-close')) {
                switchToAlistTab(tab.id);
            }
        });
        
        tabsContainer.appendChild(tabElement);
    });
    
    // 延迟更新标签页导航按钮状态，确保DOM已更新
    setTimeout(() => {
        updateTabNavButtons();
        
        // 为标签容器添加滚动事件监听器（避免重复添加）
        if (!tabsContainer.hasScrollListener) {
            tabsContainer.addEventListener('scroll', updateTabNavButtons);
            tabsContainer.hasScrollListener = true;
        }
    }, 10);
}

// 保存当前标签页的滚动位置
function saveCurrentTabScrollPosition() {
    if (!currentActiveTab || !alistTabs[currentActiveTab]) {
        return;
    }
    
    const fileList = document.getElementById('file-list');
    if (fileList) {
        alistTabs[currentActiveTab].scrollPosition = fileList.scrollTop;
        console.log(`保存标签页 ${currentActiveTab} 滚动位置:`, fileList.scrollTop);
    }
}

// 恢复标签页的滚动位置
function restoreTabScrollPosition(tabId) {
    if (!alistTabs[tabId]) {
        return;
    }
    
    const fileList = document.getElementById('file-list');
    if (fileList && typeof alistTabs[tabId].scrollPosition === 'number') {
        // 使用 setTimeout 确保在DOM更新后恢复滚动位置
        setTimeout(() => {
            fileList.scrollTop = alistTabs[tabId].scrollPosition;
            console.log(`恢复标签页 ${tabId} 滚动位置:`, alistTabs[tabId].scrollPosition);
            updateScrollButtons();
        }, 0);
    }
}

// 切换到指定标签页
function switchToAlistTab(tabId) {
    console.log('切换到标签页:', tabId);
    if (!alistTabs[tabId]) {
        console.error('标签页不存在:', tabId);
        return;
    }
    
    // 保存当前标签页的滚动位置
    saveCurrentTabScrollPosition();
    
    currentActiveTab = tabId;
    const tab = alistTabs[tabId];
    console.log('标签页信息:', tab);
    
    // 更新全局变量
    currentPath = tab.path;
    currentAccount = tab.account;
    
    // 更新UI
    renderAlistTabs();
    
    // 加载文件列表
    if (tab.files.length === 0) {
        console.log('标签页文件列表为空，开始加载');
        loadTabFileList(tabId);
    } else {
        console.log('使用缓存的文件列表，文件数量:', tab.files.length);
        renderFileList(tab.files);
        // 恢复滚动位置
        restoreTabScrollPosition(tabId);
    }
}

// 关闭标签页
function closeAlistTab(tabId) {
    if (Object.keys(alistTabs).length <= 1) {
        return; // 至少保留一个标签页
    }
    
    // 如果关闭的是当前活动标签页，需要找到前一个标签页
    let targetTabId = null;
    if (currentActiveTab === tabId) {
        const allTabIds = Object.keys(alistTabs);
        const currentIndex = allTabIds.indexOf(tabId);
        
        if (currentIndex > 0) {
            // 如果不是第一个标签，选择前一个标签
            targetTabId = allTabIds[currentIndex - 1];
        } else if (allTabIds.length > 1) {
            // 如果是第一个标签，选择下一个标签
            targetTabId = allTabIds[1];
        }
        
        console.log(`关闭标签页: ${tabId}, 当前索引: ${currentIndex}, 切换到: ${targetTabId}`);
    }
    
    delete alistTabs[tabId];
    
    // 如果关闭的是当前活动标签页，切换到目标标签页
    if (currentActiveTab === tabId && targetTabId) {
        switchToAlistTab(targetTabId);
    } else {
        renderAlistTabs();
    }
}

// 加载标签页的文件列表
async function loadTabFileList(tabId) {
    const tab = alistTabs[tabId];
    if (!tab) return;
    
    try {
        // 显示加载状态
        if (currentActiveTab === tabId) {
            const container = document.getElementById('file-list');
            container.innerHTML = '<div class="text-center p-3"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><br><small class="text-muted">正在加载文件列表...</small></div>';
        }
        
        console.log(`开始加载文件列表: ${tab.path}`);
        const response = await fetch('/api/alist/files', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                account: tab.account,
                path: tab.path
            })
        });
        
        // 检查登录状态
        if (!checkAuthStatus(response)) {
            return;
        }
        
        const files = await response.json();
        if (files.error) {
            console.error('加载文件失败:', files.error);
            showAlert(`加载文件失败: ${files.error}`, 'danger');
            if (currentActiveTab === tabId) {
                const container = document.getElementById('file-list');
                container.innerHTML = `<p class="text-danger text-center">加载失败: ${files.error}</p>`;
            }
            return;
        }
        
        console.log(`文件列表加载完成: ${tab.path}，文件数量: ${files.length}`);
        tab.files = files;
        
        // 如果这是当前活动标签页，更新显示
        if (currentActiveTab === tabId) {
            renderFileList(files);
            // 恢复滚动位置
            restoreTabScrollPosition(tabId);
        }
    } catch (error) {
        console.error('加载文件列表失败:', error);
        showAlert('加载文件列表失败', 'danger');
        if (currentActiveTab === tabId) {
            const container = document.getElementById('file-list');
            container.innerHTML = `<p class="text-danger text-center">网络错误: ${error.message}</p>`;
        }
    }
}

// 复制文件链接
async function copyFileLink(file) {
    try {
        const filePath = currentPath.replace(/\/$/, '') + '/' + file.name;
        const response = await fetch('/api/alist/file_link', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                account: currentAccount,
                file_path: filePath
            })
        });
        
        const result = await response.json();
        if (result.error) {
            showAlert(`获取链接失败: ${result.error}`, 'danger');
            return;
        }
        
        copyToClipboard(result.link);
    } catch (error) {
        console.error('复制文件链接失败:', error);
        showAlert('复制文件链接失败', 'danger');
    }
}

// 返回上级目录
function goUpDirectory() {
    if (currentPath === '/' || currentPath === '') return;
    
    const pathParts = currentPath.replace(/\/$/, '').split('/');
    pathParts.pop();
    const newPath = pathParts.join('/') || '/';
    
    // 如果有活动标签页，保存当前滚动位置并更新标签页信息
    if (currentActiveTab && alistTabs[currentActiveTab]) {
        saveCurrentTabScrollPosition(); // 保存当前滚动位置
        alistTabs[currentActiveTab].path = newPath;
        alistTabs[currentActiveTab].files = []; // 清空文件列表以触发重新加载
        alistTabs[currentActiveTab].scrollPosition = 0; // 重置滚动位置到顶部
        alistTabs[currentActiveTab].selectedFile = null; // 清除选中文件状态
        
        // 更新标签页名称
        if (newPath === '/') {
            alistTabs[currentActiveTab].name = '根目录';
        } else {
            alistTabs[currentActiveTab].name = newPath.split('/').pop();
        }
    }
    
    currentPath = newPath;
    loadFileList();
    
    // 重新渲染标签页以更新名称
    if (currentActiveTab) {
        renderAlistTabs();
    }
}

// 复制全部链接
async function copyAllLinks() {
    // 优先使用当前活动标签页的数据，否则使用全局数据
    let activeFileList = fileList;
    let activePath = currentPath;
    let activeAccount = currentAccount;
    
    if (currentActiveTab && alistTabs[currentActiveTab]) {
        const activeTab = alistTabs[currentActiveTab];
        activeFileList = activeTab.files || [];
        activePath = activeTab.path;
        activeAccount = activeTab.account;
        console.log('复制全部链接 - 使用活动标签页数据:', currentActiveTab, '路径:', activePath, '文件数量:', activeFileList.length);
    } else {
        console.log('复制全部链接 - 使用全局数据:', '路径:', activePath, '文件数量:', activeFileList.length);
    }
    
    if (!activeAccount || activeFileList.length === 0) {
        showAlert('没有可复制的文件', 'warning');
        return;
    }
    
    const links = [];
    
    for (const file of activeFileList) {
        if (file.type === 1 || file.is_dir) continue; // 跳过文件夹
        
        const filePath = activePath.replace(/\/$/, '') + '/' + file.name;
        try {
            const response = await fetch('/api/alist/file_link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    account: activeAccount,
                    file_path: filePath
                })
            });
            
            const result = await response.json();
            if (!result.error) {
                links.push(result.link);
            }
        } catch (error) {
            console.error('获取文件链接失败:', error);
        }
    }
    
    if (links.length > 0) {
        copyToClipboard(links.join('\n'));
        showAlert(`已复制${links.length}个文件链接！`);
    } else {
        showAlert('没有可复制的文件链接', 'warning');
    }
}

// 文件搜索
function filterFiles() {
    const keyword = document.getElementById('file-search').value.toLowerCase().trim();
    const fileItems = document.querySelectorAll('.file-item');
    
    searchMatches = [];
    searchIndex = 0;
    
    // 清除之前的高亮
    fileItems.forEach(item => {
        item.style.backgroundColor = '';
        item.style.display = 'block';
    });
    
    if (keyword === '') {
        // 显示所有文件
        return;
    }
    
    // 查找匹配项并保持所有文件显示
    fileItems.forEach((item, index) => {
        const fileName = item.textContent.toLowerCase();
        if (fileName.includes(keyword)) {
            searchMatches.push(index);
        }
    });
    
    // 高亮并定位到第一个匹配项
    if (searchMatches.length > 0) {
        searchIndex = 0;
        highlightSearchResult();
        
        // 自动滚动到第一个匹配项
        const firstMatchItem = document.querySelector(`[data-index="${searchMatches[0]}"]`);
        if (firstMatchItem) {
            firstMatchItem.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
            });
        }
    }
}

// 搜索上一个
function searchPrev() {
    if (searchMatches.length === 0) return;
    searchIndex = (searchIndex - 1 + searchMatches.length) % searchMatches.length;
    highlightSearchResult();
    
    // 滚动到当前匹配项
    const currentItem = document.querySelector(`[data-index="${searchMatches[searchIndex]}"]`);
    if (currentItem) {
        currentItem.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
        });
    }
}

// 搜索下一个
function searchNext() {
    if (searchMatches.length === 0) return;
    searchIndex = (searchIndex + 1) % searchMatches.length;
    highlightSearchResult();
    
    // 滚动到当前匹配项
    const currentItem = document.querySelector(`[data-index="${searchMatches[searchIndex]}"]`);
    if (currentItem) {
        currentItem.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
        });
    }
}

// 高亮搜索结果
function highlightSearchResult() {
    // 清除之前的高亮
    document.querySelectorAll('.file-item').forEach(item => {
        item.style.backgroundColor = '';
    });
    
    // 高亮当前项
    if (searchMatches.length > 0) {
        const currentItem = document.querySelector(`[data-index="${searchMatches[searchIndex]}"]`);
        if (currentItem) {
            currentItem.style.backgroundColor = '#fff3cd';
            // 不在这里滚动，让调用者决定是否滚动
        }
    }
}

// 处理链接
async function processLinks() {
    try {
        // 先获取当前活动标签页的文件夹名称作为标题
        let activePath = currentPath;
        if (currentActiveTab && alistTabs[currentActiveTab]) {
            activePath = alistTabs[currentActiveTab].path;
            console.log('使用活动标签页路径作为标题:', activePath);
        }
        
        if (activePath !== '/') {
            const folderName = activePath.split('/').pop();
            document.getElementById('article-title').value = folderName;
            autoMatchCategory();
        }
        
        // 获取当前目录的所有文件链接并保存到TXT
        await copyAllLinksToTXT();
        
        // 处理链接
        const response = await fetch('/api/process/links', {
            method: 'POST'
        });
        
        const result = await response.json();
        if (result.error) {
            showAlert(`处理失败: ${result.error}`, 'danger');
            return;
        }
        
        document.getElementById('article-content').value = result.content;
        document.getElementById('preview-content').innerHTML = result.content;
        
        // 如果包含视频，自动选择视频标签
        if (result.has_videos) {
            autoSelectVideoTag();
            showAlert('链接处理完成！（已自动选择视频标签）');
        } else {
            showAlert('链接处理完成！');
        }
    } catch (error) {
        console.error('处理链接失败:', error);
        showAlert('处理链接失败', 'danger');
    }
}

// 处理链接（纯双排）
async function processLinksDouble() {
    try {
        // 先获取当前活动标签页的文件夹名称作为标题
        let activePath = currentPath;
        if (currentActiveTab && alistTabs[currentActiveTab]) {
            activePath = alistTabs[currentActiveTab].path;
            console.log('使用活动标签页路径作为标题（纯双排）:', activePath);
        }
        
        if (activePath !== '/') {
            const folderName = activePath.split('/').pop();
            document.getElementById('article-title').value = folderName;
            autoMatchCategory();
        }
        
        // 获取当前目录的所有文件链接并保存到TXT
        await copyAllLinksToTXT();
        
        // 处理链接（纯双排）
        const response = await fetch('/api/process/links_double', {
            method: 'POST'
        });
        
        const result = await response.json();
        if (result.error) {
            showAlert(`处理失败: ${result.error}`, 'danger');
            return;
        }
        
        document.getElementById('article-content').value = result.content;
        document.getElementById('preview-content').innerHTML = result.content;
        
        // 如果包含视频，自动选择视频标签（纯双排模式通常不包含视频，但为了一致性仍检查）
        if (result.has_videos) {
            autoSelectVideoTag();
            showAlert('纯双排链接处理完成！（已自动选择视频标签）');
        } else {
            showAlert('纯双排链接处理完成！');
        }
    } catch (error) {
        console.error('处理链接失败:', error);
        showAlert('处理链接失败', 'danger');
    }
}

// 复制所有链接到TXT文件
async function copyAllLinksToTXT() {
    // 优先使用当前活动标签页的数据，否则使用全局数据
    let activeFileList = fileList;
    let activePath = currentPath;
    let activeAccount = currentAccount;
    
    if (currentActiveTab && alistTabs[currentActiveTab]) {
        const activeTab = alistTabs[currentActiveTab];
        activeFileList = activeTab.files || [];
        activePath = activeTab.path;
        activeAccount = activeTab.account;
        console.log('使用活动标签页路径作为标题:', activePath);
    }
    
    if (!activeAccount || activeFileList.length === 0) {
        return;
    }
    
    const links = [];
    
    for (const file of activeFileList) {
        if (file.type === 1 || file.is_dir) continue;
        
        const filePath = activePath.replace(/\/$/, '') + '/' + file.name;
        try {
            const response = await fetch('/api/alist/file_link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    account: activeAccount,
                    file_path: filePath
                })
            });
            
            const result = await response.json();
            if (!result.error) {
                links.push(result.link);
            }
        } catch (error) {
            console.error('获取文件链接失败:', error);
        }
    }
    
    // 保存到TXT文件
    if (links.length > 0) {
        await fetch('/api/txt/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: links.join('\n') })
        });
    }
}

// 发布文章
async function publishArticle() {
    const title = document.getElementById('article-title').value.trim();
    const content = document.getElementById('article-content').value.trim();
    
    // 调试信息：输出要发布的内容
    console.log('发布文章 - 标题:', title);
    console.log('发布文章 - 内容长度:', content.length);
    console.log('发布文章 - 内容前100字符:', content.substring(0, 100));
    
    if (!title || !content) {
        showAlert('请填写文章标题和内容', 'warning');
        return;
    }
    
    // 强制清除所有闪烁效果，确保状态一致
    document.querySelectorAll('.category-name').forEach(el => {
        if (el.flashTimer) {
            clearTimeout(el.flashTimer);
            el.flashTimer = null;
            // 如果是选中的分类，确保显示为蓝色
            const categoryId = parseInt(el.getAttribute('data-id'));
            if (selectedCategories.has(categoryId)) {
                el.style.backgroundColor = '#007bff';
                el.style.color = 'white';
            }
        }
    });
    
    if (selectedCategories.size === 0) {
        showAlert('请至少选择一个分类', 'warning');
        return;
    }
    
    // 获取选中的分类ID和名称
    const categoryIds = [];
    const categoryNames = [];
    console.log('发布文章 - 选中的分类ID集合:', Array.from(selectedCategories));
    selectedCategories.forEach(categoryId => {
        const categoryElement = document.querySelector(`[data-id="${categoryId}"]`);
        if (categoryElement) {
            // 使用data-name属性获取原始分类名称，确保与服务器完全一致
            const categoryName = categoryElement.getAttribute('data-name') || categoryElement.textContent.trim();
            categoryIds.push(categoryId);
            categoryNames.push(categoryName);
            console.log('获取分类信息 - ID:', categoryId, '名称:', categoryName, '来源: data-name属性');
        } else {
            console.error('未找到分类元素 - ID:', categoryId);
        }
    });
    console.log('最终发送的分类ID数组:', categoryIds);
    console.log('最终发送的分类名称数组:', categoryNames);
    console.log('分类数组长度:', categoryNames.length);
    
    // 获取选中的标签和新标签
    const allTags = Array.from(selectedTags);
    const newTags = document.getElementById('new-tags').value.trim();
    if (newTags) {
        allTags.push(...newTags.split(',').map(tag => tag.trim()).filter(tag => tag));
    }
    
    const postStruct = {
        title: title,
        description: content,
        post_type: 'post',
        categories: categoryNames,
        mt_keywords: allTags.join(','),
        publish: true,
        custom_fields: [
            { key: 'protectme', value: '1', description: '这是一个自定义字段' }
        ]
    };
    
    try {
        const response = await fetch('/api/typecho/publish', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postStruct)
        });
        
        const result = await response.json();
        if (result.error) {
            showAlert(`发布失败: ${result.error}`, 'danger');
            return;
        }
        
        showAlert(`发布成功！文章 ID: ${result.post_id}`);
        
        // 清空表单
        document.getElementById('article-title').value = '';
        document.getElementById('article-content').value = '';
        document.getElementById('new-tags').value = '';
        document.getElementById('preview-content').innerHTML = '';
        
        // 清空选择
        selectedCategories.clear();
        selectedTags.clear();
        updateSelectedCategories();
        document.querySelectorAll('.tag-item').forEach(tag => {
            tag.classList.remove('selected');
        });
        
        // 自动关闭当前Alist标签页（如果有多个标签页的话）
        if (currentActiveTab && Object.keys(alistTabs).length > 1) {
            console.log('发布成功，关闭当前Alist标签页:', currentActiveTab);
            closeAlistTab(currentActiveTab);
        }
        
        // 重新加载标签
        loadTags();
    } catch (error) {
        console.error('发布文章失败:', error);
        showAlert('发布文章失败', 'danger');
    }
}

// 管理Alist账户
function manageAlistAccounts() {
    loadAlistAccountsForManagement();
    const modal = new bootstrap.Modal(document.getElementById('alistAccountModal'));
    modal.show();
}

// 加载账户管理列表
async function loadAlistAccountsForManagement() {
    try {
        const response = await fetch('/api/alist/accounts');
        const accounts = await response.json();
        renderAlistAccountList(accounts);
    } catch (error) {
        console.error('加载账户列表失败:', error);
    }
}

// 渲染账户列表
function renderAlistAccountList(accounts) {
    const container = document.getElementById('alist-account-list');
    container.innerHTML = '';
    
    if (accounts.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">暂无账户，请点击"添加账户"按钮添加</p>';
        return;
    }
    
    accounts.forEach((account, index) => {
        const accountItem = document.createElement('div');
        accountItem.className = 'card mb-2';
        accountItem.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${account.server_url}</h6>
                        <small class="text-muted">用户名: ${account.username}</small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editAlistAccount(${index})">编辑</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteAlistAccount(${index})">删除</button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(accountItem);
    });
}

// 添加Alist账户
async function addAlistAccount() {
    const server = await showCategoryInputDialog('请输入Alist服务器地址:');
    if (!server) return;
    
    const username = await showCategoryInputDialog('请输入用户名:');
    if (!username) return;
    
    const password = await showCategoryInputDialog('请输入密码:');
    if (!password) return;
    
    try {
        // 先测试登录
        const testResponse = await fetch('/api/alist/test_login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                server: server,
                username: username,
                password: password
            })
        });
        
        const testResult = await testResponse.json();
        if (testResult.error) {
            showAlert(`登录测试失败: ${testResult.error}`, 'danger');
            return;
        }
        
        // 获取当前账户列表
        const response = await fetch('/api/alist/accounts');
        const accounts = await response.json();
        
        // 添加新账户
        accounts.push({
            server: server,
            username: username,
            password: password,
            token: testResult.token
        });
        
        // 保存账户列表
        const saveResponse = await fetch('/api/alist/accounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(accounts)
        });
        
        const saveResult = await saveResponse.json();
        if (saveResult.error) {
            showAlert(`保存失败: ${saveResult.error}`, 'danger');
            return;
        }
        
        showAlert('账户添加成功！');
        loadAlistAccountsForManagement();
        loadAlistAccounts(); // 重新加载主页面的账户列表
    } catch (error) {
        console.error('添加账户失败:', error);
        showAlert('添加账户失败', 'danger');
    }
}

// 编辑Alist账户
async function editAlistAccount(index) {
    try {
        const response = await fetch('/api/alist/accounts');
        const accounts = await response.json();
        const account = accounts[index];
        
        const server = await showCategoryInputDialog('请输入Alist服务器地址:', account.server);
        if (!server) return;
        
        const username = await showCategoryInputDialog('请输入用户名:', account.username);
        if (!username) return;
        
        const password = await showCategoryInputDialog('请输入密码:', account.password);
        if (!password) return;
        
        // 先测试登录
        const testResponse = await fetch('/api/alist/test_login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                server: server,
                username: username,
                password: password
            })
        });
        
        const testResult = await testResponse.json();
        if (testResult.error) {
            showAlert(`登录测试失败: ${testResult.error}`, 'danger');
            return;
        }
        
        // 更新账户信息
        accounts[index] = {
            server: server,
            username: username,
            password: password,
            token: testResult.token
        };
        
        // 保存账户列表
        const saveResponse = await fetch('/api/alist/accounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(accounts)
        });
        
        const saveResult = await saveResponse.json();
        if (saveResult.error) {
            showAlert(`保存失败: ${saveResult.error}`, 'danger');
            return;
        }
        
        showAlert('账户编辑成功！');
        loadAlistAccountsForManagement();
        loadAlistAccounts(); // 重新加载主页面的账户列表
    } catch (error) {
        console.error('编辑账户失败:', error);
        showAlert('编辑账户失败', 'danger');
    }
}

// 删除Alist账户
async function deleteAlistAccount(index) {
    if (!confirm('确定要删除该账户吗？')) return;
    
    try {
        const response = await fetch('/api/alist/accounts');
        const accounts = await response.json();
        
        accounts.splice(index, 1);
        
        const saveResponse = await fetch('/api/alist/accounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(accounts)
        });
        
        const saveResult = await saveResponse.json();
        if (saveResult.error) {
            showAlert(`删除失败: ${saveResult.error}`, 'danger');
            return;
        }
        
        showAlert('账户删除成功！');
        loadAlistAccountsForManagement();
        loadAlistAccounts(); // 重新加载主页面的账户列表
    } catch (error) {
        console.error('删除账户失败:', error);
        showAlert('删除账户失败', 'danger');
    }
}

// 分类右键菜单处理
function handleCategoryContextMenu(event) {
    // 如果点击的不是分类名称，则在空白处添加一级分类
    if (!event.target.classList.contains('category-name')) {
        event.preventDefault();
        showCategoryContextMenu(event, null, null, 0);
    }
}

// 显示分类右键菜单
function showCategoryContextMenu(event, categoryId, categoryName, parentId) {
    event.preventDefault();
    event.stopPropagation();
    
    // 移除已存在的右键菜单
    const existingMenu = document.getElementById('category-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // 创建右键菜单
    const menu = document.createElement('div');
    menu.id = 'category-context-menu';
    menu.className = 'context-menu';
    menu.style.cssText = `
        position: fixed;
        top: ${event.clientY}px;
        left: ${event.clientX}px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 3px 0;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 1000;
        min-width: 80px;
        font-size: 0.75rem;
    `;
    
    let menuItems = [];
    
    if (categoryId === null) {
        // 空白处右键 - 添加一级分类
        menuItems.push({
            text: '添加一级分类',
            action: () => addNewCategory(0)
        });
    } else {
        // 分类上右键 - 添加子分类
        menuItems.push({
            text: '添加子分类',
            action: () => addNewCategory(categoryId)
        });
    }
    
    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        menuItem.textContent = item.text;
        menuItem.style.cssText = `
            padding: 4px 8px;
            cursor: pointer;
            font-size: 0.75rem;
        `;
        
        menuItem.addEventListener('mouseenter', () => {
            menuItem.style.backgroundColor = '#f0f0f0';
        });
        
        menuItem.addEventListener('mouseleave', () => {
            menuItem.style.backgroundColor = '';
        });
        
        menuItem.addEventListener('click', () => {
            item.action();
            menu.remove();
        });
        
        menu.appendChild(menuItem);
    });
    
    document.body.appendChild(menu);
    
    // 点击其他地方关闭菜单
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 0);
}

// 添加新分类
async function addNewCategory(parentId) {
    // 创建自定义对话框来替代prompt()
    const categoryName = await showCategoryInputDialog('请输入分类名称:');
    if (!categoryName || !categoryName.trim()) {
        return;
    }
    
    try {
        const response = await fetch('/api/typecho/new_category', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: categoryName.trim(),
                parent_id: parentId
            })
        });
        
        const result = await response.json();
        if (result.error) {
            showAlert(`添加分类失败: ${result.error}`, 'danger');
            return;
        }
        
        showAlert('分类添加成功！');
        
        // 重新加载分类树
        await loadCategories();
    } catch (error) {
        console.error('添加分类失败:', error);
        showAlert('添加分类失败', 'danger');
    }
}

// 自定义分类输入对话框
function showCategoryInputDialog(message, defaultValue = '') {
    return new Promise((resolve) => {
        // 创建对话框元素
        const dialog = document.createElement('div');
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.backgroundColor = 'white';
        dialog.style.padding = '20px';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        dialog.style.zIndex = '10000';
        dialog.style.minWidth = '300px';
        
        // 创建消息元素
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        messageElement.style.marginBottom = '15px';
        
        // 创建输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.style.width = '100%';
        input.style.padding = '8px';
        input.style.marginBottom = '15px';
        input.style.border = '1px solid #ced4da';
        input.style.borderRadius = '4px';
        input.value = defaultValue;
        
        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '10px';
        
        // 创建取消按钮
        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.style.padding = '8px 16px';
        cancelButton.style.border = '1px solid #ced4da';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.backgroundColor = '#f8f9fa';
        cancelButton.style.cursor = 'pointer';
        
        // 创建确定按钮
        const confirmButton = document.createElement('button');
        confirmButton.textContent = '确定';
        confirmButton.style.padding = '8px 16px';
        confirmButton.style.border = '1px solid #007bff';
        confirmButton.style.borderRadius = '4px';
        confirmButton.style.backgroundColor = '#007bff';
        confirmButton.style.color = 'white';
        confirmButton.style.cursor = 'pointer';
        
        // 添加事件监听器
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(dialog);
            resolve(null);
        });
        
        confirmButton.addEventListener('click', () => {
            const value = input.value;
            document.body.removeChild(dialog);
            resolve(value);
        });
        
        // 添加键盘事件
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const value = input.value;
                document.body.removeChild(dialog);
                resolve(value);
            }
        });
        
        // 组装对话框
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);
        
        dialog.appendChild(messageElement);
        dialog.appendChild(input);
        dialog.appendChild(buttonContainer);
        
        // 添加到文档
        document.body.appendChild(dialog);
        
        // 自动聚焦输入框
        input.focus();
    });
}
