#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Typecho Web 管理平台启动脚本
支持生产环境和开发环境部署
"""

import os
import sys
from app import app

def main():
    """主函数"""
    # 确保必要的文件存在
    required_files = ['zylj.txt', 'processed_links.md', 'processed_links_double.md']
    for file_path in required_files:
        if not os.path.exists(file_path):
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write('')
    
    # 获取环境变量
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 6666))  # 默认端口改为6666
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    print(f"Starting Typecho Web Management Platform...")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Debug: {debug}")
    print(f"Visit: http://{host}:{port}")
    
    # 启动应用
    app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    main()

