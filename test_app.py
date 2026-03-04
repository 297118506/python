#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
简单的应用测试脚本
"""

import os
import sys
import json
import requests
from app import app

def test_app():
    """测试应用基本功能"""
    print("开始测试 Typecho Web 应用...")
    
    # 创建测试客户端
    with app.test_client() as client:
        # 测试首页
        print("1. 测试首页...")
        response = client.get('/')
        assert response.status_code == 200
        print("   ✓ 首页访问正常")
        
        # 测试Typecho页面
        print("2. 测试Typecho页面...")
        response = client.get('/typecho')
        assert response.status_code == 200
        print("   ✓ Typecho页面访问正常")
        
        # 测试TXT页面
        print("3. 测试TXT页面...")
        response = client.get('/txt')
        assert response.status_code == 200
        print("   ✓ TXT页面访问正常")
        
        # 测试Processed页面
        print("4. 测试Processed页面...")
        response = client.get('/processed')
        assert response.status_code == 200
        print("   ✓ Processed页面访问正常")
        
        # 测试Processed双排页面
        print("5. 测试Processed双排页面...")
        response = client.get('/processed_double')
        assert response.status_code == 200
        print("   ✓ Processed双排页面访问正常")
        
        # 测试API接口
        print("6. 测试API接口...")
        
        # 测试Typecho配置API
        response = client.get('/api/typecho/config')
        assert response.status_code == 200
        print("   ✓ Typecho配置API正常")
        
        # 测试Alist账户API
        response = client.get('/api/alist/accounts')
        assert response.status_code == 200
        print("   ✓ Alist账户API正常")
        
        # 测试TXT文件API
        response = client.get('/api/txt/load')
        # 可能返回错误，但不应该是500
        assert response.status_code in [200, 404]
        print("   ✓ TXT文件API正常")
    
    print("\n✅ 所有测试通过！应用运行正常。")

def check_files():
    """检查必要文件是否存在"""
    print("检查必要文件...")
    
    required_files = [
        'app.py',
        'requirements.txt',
        'templates/base.html',
        'templates/index.html',
        'templates/typecho.html',
        'templates/txt.html',
        'templates/processed.html',
        'templates/processed_double.html',
        'static/css/style.css',
        'static/js/main.js',
        'static/js/typecho.js',
        'static/js/txt.js',
        'static/js/processed.js',
        'static/js/processed_double.js'
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
        else:
            print(f"   ✓ {file_path}")
    
    if missing_files:
        print(f"\n❌ 缺少以下文件:")
        for file_path in missing_files:
            print(f"   ✗ {file_path}")
        return False
    else:
        print("\n✅ 所有必要文件存在")
        return True

def create_test_data():
    """创建测试数据文件"""
    print("创建测试数据文件...")
    
    # 创建数据文件
    test_files = ['zylj.txt', 'processed_links.md', 'processed_links_double.md']
    for file_path in test_files:
        if not os.path.exists(file_path):
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write('')
            print(f"   ✓ 创建 {file_path}")
        else:
            print(f"   ✓ {file_path} 已存在")
    
    # 创建示例配置文件
    if not os.path.exists('typecho_config.json'):
        config = {
            "api_url": "http://example.com/index.php/action/xmlrpc",
            "username": "admin",
            "password": "password"
        }
        with open('typecho_config.json', 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        print("   ✓ 创建示例 typecho_config.json")
    
    if not os.path.exists('alist_config.json'):
        config = []
        with open('alist_config.json', 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        print("   ✓ 创建示例 alist_config.json")

def main():
    """主函数"""
    print("=================================")
    print("Typecho Web 应用测试")
    print("=================================")
    
    # 检查文件
    if not check_files():
        print("\n❌ 文件检查失败，请确保所有文件已正确创建")
        sys.exit(1)
    
    # 创建测试数据
    create_test_data()
    
    # 测试应用
    try:
        test_app()
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        sys.exit(1)
    
    print("\n=================================")
    print("测试完成！应用可以正常运行。")
    print("使用 'python run.py' 启动应用")
    print("=================================")

if __name__ == '__main__':
    main()

