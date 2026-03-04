# Alist API 500错误修复

## 🎯 问题描述

添加登录系统后，Alist区域无法加载文件列表，浏览器控制台显示500 INTERNAL SERVER ERROR。

## 🔍 问题原因

在添加登录保护时，我为所有API路由都添加了`@login_required`装饰器。但是这个装饰器对于AJAX请求会产生问题：

1. **重定向问题**：`@login_required`在未登录时会尝试重定向到登录页面
2. **AJAX无法处理重定向**：导致500错误而不是正确的401未授权错误
3. **前端没有错误处理**：无法正确处理登录过期的情况

## ✅ 解决方案

### 1. 创建API专用的登录装饰器

**新增`@api_login_required`装饰器**：
```python
def api_login_required(f):
    """API登录验证装饰器，返回JSON错误而不是重定向"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return jsonify({'error': '未登录或会话已过期，请重新登录'}), 401
        return f(*args, **kwargs)
    return decorated_function
```

**优势**：
- ✅ 返回标准的401 HTTP状态码
- ✅ 返回JSON格式的错误信息
- ✅ 不会尝试重定向，适合AJAX请求

### 2. 更新所有API路由

**修改前**：
```python
@app.route('/api/alist/files', methods=['POST'])
@login_required  # 会导致重定向问题
def get_alist_files():
```

**修改后**：
```python
@app.route('/api/alist/files', methods=['POST'])
@api_login_required  # 返回JSON错误
def get_alist_files():
```

**受影响的API路由**：
- `/api/typecho/*` - 所有Typecho相关API
- `/api/alist/*` - 所有Alist相关API  
- `/api/txt/*` - TXT文件操作API
- `/api/process/*` - 链接处理API
- `/api/processed/*` - 处理结果API

### 3. 前端错误处理

**新增`checkAuthStatus`函数**：
```javascript
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
```

**在API调用中使用**：
```javascript
const response = await fetch('/api/alist/files', {...});

// 检查登录状态
if (!checkAuthStatus(response)) {
    return;
}

const files = await response.json();
```

## 🔧 修复内容

### 后端修复（app.py）
- ✅ 新增`api_login_required`装饰器
- ✅ 将14个API路由的装饰器从`@login_required`改为`@api_login_required`
- ✅ 保持页面路由继续使用`@login_required`

### 前端修复（main.js & typecho.js）
- ✅ 新增`checkAuthStatus`函数处理401错误
- ✅ 在关键API调用中添加状态检查
- ✅ 自动跳转到登录页面当会话过期时

## 🧪 测试验证

### 1. 正常使用测试
1. **重启Flask服务**
2. **登录系统**
3. **测试Alist功能**：
   - 选择账户
   - 加载文件列表
   - 进入文件夹
   - 复制文件链接

### 2. 会话过期测试
1. **清除浏览器cookies**或**等待24小时**
2. **刷新页面**（应该跳转到登录页面）
3. **直接访问API**（应该返回401错误而不是500错误）

## 📊 错误状态对比

| 场景 | 修复前 | 修复后 |
|------|--------|--------|
| 正常登录 | ✅ 正常 | ✅ 正常 |
| 会话过期 | ❌ 500错误 | ✅ 401错误 + 自动跳转 |
| AJAX请求 | ❌ 重定向冲突 | ✅ JSON错误响应 |
| 用户体验 | ❌ 页面白屏 | ✅ 友好的错误提示 |

## 🎯 预期效果

修复后，你应该能够：

1. **正常使用Alist功能**：
   - 文件列表正确加载
   - 文件夹导航正常
   - 文件链接复制成功

2. **优雅的会话处理**：
   - 会话过期时显示友好提示
   - 自动跳转到登录页面
   - 登录后可以继续使用

3. **更好的错误处理**：
   - 不再出现500错误
   - 明确的错误信息
   - 符合RESTful API标准

## 🛠️ 故障排除

如果问题仍然存在：

1. **检查Flask重启**：确保新代码已生效
2. **清除浏览器缓存**：避免旧JS代码干扰
3. **检查控制台日志**：查看具体错误信息
4. **验证会话状态**：确认已正确登录

---

💡 **关键修复**：区分页面路由和API路由的登录验证方式，解决了AJAX请求与重定向的冲突问题。
