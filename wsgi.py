#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
WSGI入口文件
用于生产环境部署 (Gunicorn, uWSGI等)
"""

import os
import sys

# 添加当前目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from app import app

# 确保必要的文件存在
required_files = ['zylj.txt', 'processed_links.md', 'processed_links_double.md']
for file_path in required_files:
    full_path = os.path.join(current_dir, file_path)
    if not os.path.exists(full_path):
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write('')

# WSGI应用对象
application = app

if __name__ == "__main__":
    app.run()


