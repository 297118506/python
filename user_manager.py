#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
用户管理工具
用于添加、删除、修改用户账户
"""

import json
import hashlib
import getpass
import os
from datetime import datetime

USER_CONFIG_FILE = "user_config.json"

def hash_password(password):
    """生成密码哈希"""
    return hashlib.sha256(password.encode()).hexdigest()

def load_users():
    """加载用户配置"""
    if os.path.exists(USER_CONFIG_FILE):
        try:
            with open(USER_CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"加载用户配置失败: {e}")
            return {}
    return {}

def save_users(users):
    """保存用户配置"""
    try:
        with open(USER_CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(users, f, ensure_ascii=False, indent=2)
        print("用户配置已保存")
    except Exception as e:
        print(f"保存用户配置失败: {e}")

def list_users():
    """列出所有用户"""
    users = load_users()
    if not users:
        print("没有找到用户")
        return
    
    print("\n用户列表:")
    print("-" * 60)
    print(f"{'用户名':<15} {'角色':<10} {'创建时间':<20}")
    print("-" * 60)
    
    for username, info in users.items():
        print(f"{username:<15} {info.get('role', 'user'):<10} {info.get('created_at', 'Unknown'):<20}")

def add_user():
    """添加用户"""
    users = load_users()
    
    print("\n添加新用户")
    username = input("请输入用户名: ").strip()
    
    if not username:
        print("用户名不能为空")
        return
    
    if username in users:
        print("用户名已存在")
        return
    
    password = getpass.getpass("请输入密码: ")
    if not password:
        print("密码不能为空")
        return
    
    confirm_password = getpass.getpass("请确认密码: ")
    if password != confirm_password:
        print("两次输入的密码不一致")
        return
    
    role = input("请输入角色 (admin/user) [默认: user]: ").strip() or "user"
    if role not in ['admin', 'user']:
        print("角色只能是 admin 或 user")
        return
    
    users[username] = {
        "password": hash_password(password),
        "role": role,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    save_users(users)
    print(f"用户 {username} 添加成功")

def delete_user():
    """删除用户"""
    users = load_users()
    
    if not users:
        print("没有用户可删除")
        return
    
    print("\n删除用户")
    list_users()
    
    username = input("\n请输入要删除的用户名: ").strip()
    
    if not username:
        print("用户名不能为空")
        return
    
    if username not in users:
        print("用户不存在")
        return
    
    confirm = input(f"确定要删除用户 {username} 吗? (y/N): ").strip().lower()
    if confirm == 'y':
        del users[username]
        save_users(users)
        print(f"用户 {username} 已删除")
    else:
        print("取消删除")

def change_password():
    """修改用户密码"""
    users = load_users()
    
    if not users:
        print("没有用户")
        return
    
    print("\n修改用户密码")
    list_users()
    
    username = input("\n请输入要修改密码的用户名: ").strip()
    
    if not username:
        print("用户名不能为空")
        return
    
    if username not in users:
        print("用户不存在")
        return
    
    new_password = getpass.getpass("请输入新密码: ")
    if not new_password:
        print("密码不能为空")
        return
    
    confirm_password = getpass.getpass("请确认新密码: ")
    if new_password != confirm_password:
        print("两次输入的密码不一致")
        return
    
    users[username]["password"] = hash_password(new_password)
    save_users(users)
    print(f"用户 {username} 的密码已修改")

def init_default_user():
    """初始化默认用户"""
    users = load_users()
    
    if "admin" not in users:
        users["admin"] = {
            "password": hash_password("password"),
            "role": "admin",
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        save_users(users)
        print("默认管理员账户已创建: admin / password")
    else:
        print("默认管理员账户已存在")

def main():
    """主函数"""
    while True:
        print("\n" + "="*50)
        print("       多功能可视化管理平台 - 用户管理工具")
        print("="*50)
        print("1. 列出所有用户")
        print("2. 添加用户")
        print("3. 删除用户") 
        print("4. 修改密码")
        print("5. 初始化默认用户")
        print("0. 退出")
        print("-"*50)
        
        choice = input("请选择操作 (0-5): ").strip()
        
        if choice == '1':
            list_users()
        elif choice == '2':
            add_user()
        elif choice == '3':
            delete_user()
        elif choice == '4':
            change_password()
        elif choice == '5':
            init_default_user()
        elif choice == '0':
            print("再见!")
            break
        else:
            print("无效选择，请重新输入")

if __name__ == '__main__':
    main()
