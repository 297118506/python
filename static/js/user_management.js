// 用户管理JavaScript逻辑

let users = {};
let currentDeleteUser = '';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadUsers();
});

// 加载用户列表
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        
        if (!checkAuthStatus(response)) {
            return;
        }
        
        if (response.status === 403) {
            showAlert('权限不足，只有管理员可以访问用户管理', 'danger');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return;
        }
        
        users = await response.json();
        renderUsers();
    } catch (error) {
        console.error('加载用户列表失败:', error);
        showAlert('加载用户列表失败', 'danger');
    }
}

// 渲染用户列表
function renderUsers() {
    const tbody = document.getElementById('user-table-body');
    
    if (Object.keys(users).length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">
                    <i class="fas fa-users me-2"></i>暂无用户数据
                </td>
            </tr>
        `;
        return;
    }
    
    const rows = Object.entries(users).map(([username, userInfo]) => {
        const roleIcon = userInfo.role === 'admin' ? 'fas fa-crown text-warning' : 'fas fa-user text-primary';
        const roleName = userInfo.role === 'admin' ? '管理员' : '普通用户';
        
        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="${roleIcon} me-2"></i>
                        <strong>${username}</strong>
                    </div>
                </td>
                <td>
                    <span class="badge bg-${userInfo.role === 'admin' ? 'warning' : 'primary'}">
                        ${roleName}
                    </span>
                </td>
                <td>
                    <small class="text-muted">
                        <i class="fas fa-calendar me-1"></i>
                        ${userInfo.created_at}
                    </small>
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-warning" 
                                onclick="showChangePasswordModal('${username}')" 
                                title="修改密码">
                            <i class="fas fa-key"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger" 
                                onclick="showDeleteUserModal('${username}')" 
                                title="删除用户"
                                ${username === getCurrentUsername() ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = rows.join('');
}

// 获取当前登录用户名
function getCurrentUsername() {
    // 从导航栏获取当前用户名
    const userSpan = document.querySelector('.navbar .me-2');
    if (userSpan) {
        const text = userSpan.textContent.trim();
        // 移除图标和空格，只保留用户名
        return text.replace(/^\s*[\s\S]*?\s+/, '').trim();
    }
    return '';
}

// 显示添加用户模态框
function showAddUserModal() {
    // 清空表单
    document.getElementById('addUserForm').reset();
    
    const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
    modal.show();
}

// 添加用户
async function addUser() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const role = document.getElementById('newUserRole').value;
    
    // 表单验证
    if (!username) {
        showAlert('请输入用户名', 'warning');
        return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showAlert('用户名只能包含字母、数字和下划线', 'warning');
        return;
    }
    
    if (!password) {
        showAlert('请输入密码', 'warning');
        return;
    }
    
    if (password.length < 6) {
        showAlert('密码长度至少6位', 'warning');
        return;
    }
    
    if (password !== confirmPassword) {
        showAlert('两次输入的密码不一致', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
                role: role
            })
        });
        
        if (!checkAuthStatus(response)) {
            return;
        }
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(result.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
            loadUsers(); // 重新加载用户列表
        } else {
            showAlert(result.error, 'danger');
        }
    } catch (error) {
        console.error('添加用户失败:', error);
        showAlert('添加用户失败', 'danger');
    }
}

// 显示修改密码模态框
function showChangePasswordModal(username) {
    document.getElementById('changePasswordUsername').value = username;
    document.getElementById('changePasswordForm').reset();
    document.getElementById('changePasswordUsername').value = username; // 重新设置，因为reset会清空
    
    const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    modal.show();
}

// 修改密码
async function changePassword() {
    const username = document.getElementById('changePasswordUsername').value;
    const newPassword = document.getElementById('newPasswordChange').value.trim();
    const confirmPassword = document.getElementById('confirmPasswordChange').value.trim();
    
    // 表单验证
    if (!newPassword) {
        showAlert('请输入新密码', 'warning');
        return;
    }
    
    if (newPassword.length < 6) {
        showAlert('密码长度至少6位', 'warning');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showAlert('两次输入的密码不一致', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/users/${username}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: newPassword
            })
        });
        
        if (!checkAuthStatus(response)) {
            return;
        }
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(result.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
        } else {
            showAlert(result.error, 'danger');
        }
    } catch (error) {
        console.error('修改密码失败:', error);
        showAlert('修改密码失败', 'danger');
    }
}

// 显示删除用户模态框
function showDeleteUserModal(username) {
    currentDeleteUser = username;
    document.getElementById('deleteUsername').textContent = username;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
    modal.show();
}

// 确认删除用户
async function confirmDeleteUser() {
    if (!currentDeleteUser) return;
    
    try {
        const response = await fetch(`/api/users/${currentDeleteUser}`, {
            method: 'DELETE'
        });
        
        if (!checkAuthStatus(response)) {
            return;
        }
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(result.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('deleteUserModal')).hide();
            loadUsers(); // 重新加载用户列表
        } else {
            showAlert(result.error, 'danger');
        }
    } catch (error) {
        console.error('删除用户失败:', error);
        showAlert('删除用户失败', 'danger');
    }
    
    currentDeleteUser = '';
}

// 表单验证增强
document.addEventListener('DOMContentLoaded', function() {
    // 添加用户表单实时验证
    const addForm = document.getElementById('addUserForm');
    if (addForm) {
        addForm.addEventListener('input', function(e) {
            if (e.target.id === 'newUsername') {
                const username = e.target.value;
                if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
                    e.target.classList.add('is-invalid');
                } else {
                    e.target.classList.remove('is-invalid');
                }
            }
            
            if (e.target.id === 'confirmPassword') {
                const password = document.getElementById('newPassword').value;
                const confirm = e.target.value;
                if (confirm && password !== confirm) {
                    e.target.classList.add('is-invalid');
                } else {
                    e.target.classList.remove('is-invalid');
                }
            }
        });
    }
    
    // 修改密码表单实时验证
    const changeForm = document.getElementById('changePasswordForm');
    if (changeForm) {
        changeForm.addEventListener('input', function(e) {
            if (e.target.id === 'confirmPasswordChange') {
                const password = document.getElementById('newPasswordChange').value;
                const confirm = e.target.value;
                if (confirm && password !== confirm) {
                    e.target.classList.add('is-invalid');
                } else {
                    e.target.classList.remove('is-invalid');
                }
            }
        });
    }
});
